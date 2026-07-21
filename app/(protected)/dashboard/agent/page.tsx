export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getActivityFeed } from "../../activity/actions"
import { DashboardClient } from "../DashboardClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { computeClientHealthScore } from "@/lib/agent/health-score"
import { classifyUrgencyTier } from "@/lib/agent/format"
import { db as prisma } from "@/lib/db"
import { computeAgentBookRevenue, MAX_PLAUSIBLE_ANNUAL_PREMIUM } from "@/lib/agent/revenue"
import { commissionOn } from "@/lib/agent/commission"
import { OPEN_GAP_STATUSES } from "@/lib/wallet/gap-status"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { getAgentPortalData } from "@/lib/services/agent-portal.service"
import { getAgentPolicyVisibilityWhere, getVisiblePolicyCountsByOwner } from "@/lib/agent-visibility"
import { presentCustomerIdentity } from "@/lib/agent-consent"
import type { AgentDashboardData, ActionQueueItem, ClientCardData, GapsSummary, CrossSellOpportunityItem, AgentTaskItem } from "@/components/agent/types"

export default async function DashboardPage() {
    const { dbUser } = await getAuthenticatedUser()
    const role = getPrimaryRole(dbUser.roles)

    if (role !== "agent") {
        redirect(role === "admin" ? "/admin/dashboard" : "/dashboard")
    }

    // getAuthenticatedUser() already redirected anonymous callers and the role
    // is verified above, so the previous getDashboardData() auth/null gate was
    // redundant — and it re-queried the whole book (summary + priorities) only
    // to discard the result. Dropped it: two DB round-trips saved per load.
    const agentId = dbUser.id

    // Resolve agent tier
    const agentEntitlements = await resolveAgentEntitlements(agentId)
    const agentTier = agentEntitlements.tier

    // Day boundaries for the agent's own pending-task widget (due today +
    // overdue). Computed here so the task query can join the parallel batch.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    // Fetch policies and customers
    const [policies, relationships, opportunities, agentProfile, analysisRunCount, agentTasks] = await Promise.all([
        prisma.policy.findMany({
            where: { createdByUserId: agentId },
            // policyNumber/insurerName/acordData feed resolvePolicyLifecycle — the
            // real end date lives in the extracted envelope, not the endDate column.
            select: {
                id: true,
                premiumAmount: true,
                endDate: true,
                status: true,
                ownerUserId: true,
                lineOfBusiness: true,
                policyNumber: true,
                insurerName: true,
                acordData: true,
            },
        }),
        prisma.customerRelationship.findMany({
            where: { agentUserId: agentId },
            include: {
                // password/emailVerified are consent signals for the identity
                // rule (lib/agent-consent) — never serialized to the client.
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        password: true,
                        emailVerified: true,
                    },
                },
            },
        }),
        prisma.opportunity.findMany({
            where: { ownerAgentUserId: agentId },
            // customer name/id (via the relationship) feeds the cross-sell widget;
            // the money/lob fields feed both commissionPipeline and cross-sell.
            select: {
                id: true,
                status: true,
                estimatedPremium: true,
                estimatedCommission: true,
                wonPremium: true,
                lineOfBusiness: true,
                relationship: { select: { customer: { select: { id: true, name: true } } } },
            },
        }),
        // commissionRates feeds Revenue Pulse; the other fields drive the
        // getting-started checklist's profile/license/commission signals.
        prisma.agentProfile.findUnique({
            where: { userId: agentId },
            select: {
                commissionRates: true,
                agencyName: true,
                phone: true,
                logoUrl: true,
                brandColor: true,
                licenseNumber: true,
                documents: true,
            },
        }),
        // hasAnalysis: has the agent ever initiated an AI analysis? (run.userId —
        // the same signal the analysis-quota gate counts, covering both their own
        // uploads and grant-shared customer policies).
        prisma.policyAnalysisRun.count({ where: { userId: agentId } }),
        // The agent's OWN pending tasks that are due today or overdue
        // (userTask.userId === agentId). Bounded to the soonest 5.
        prisma.userTask.findMany({
            where: { userId: agentId, status: "pending", dueDate: { lte: endOfToday } },
            orderBy: { dueDate: "asc" },
            take: 5,
            select: { id: true, title: true, dueDate: true, priority: true },
        }),
    ])

    // Real per-line commission rates the agent configured on /commissions — the
    // Revenue Pulse used to invent a flat 15% (and call premium/12 "revenue").
    const commissionRates = (agentProfile?.commissionRates as Record<string, number> | null) ?? {}

    // ── Identity consent (lib/agent-consent) ─────────────────────
    // Visible-policy counts feed both the identity rule and the protection-
    // score privacy gate below. Every customer name/avatar this page emits
    // goes through presentName/presentCustomerIdentity — an unconsented real
    // account shows the email the agent typed, never its real name.
    const visiblePolicyCounts = await getVisiblePolicyCountsByOwner(
        agentId,
        relationships.map((r) => r.policyholderUserId)
    ).catch(() => new Map<string, number>())
    const relByCustomerId = new Map(relationships.map((r) => [r.customer.id, r]))
    const presentName = (customerId: string | null | undefined, fallback = "Client") => {
        const rel = customerId ? relByCustomerId.get(customerId) : undefined
        if (!rel) return fallback
        return presentCustomerIdentity(
            rel,
            rel.customer,
            visiblePolicyCounts.get(rel.policyholderUserId) ?? 0
        ).name
    }

    const totalPolicies = policies.length
    // In-force book revenue, DEDUPED by policy number (re-uploads of the same
    // policy are one exposure, not three) and guarded against mis-extracted
    // premiums (a sum-insured captured as premiumAmount). Without this, three
    // duplicate uploads tripled the premium total and MRR. See
    // computeAgentBookRevenue.
    const bookRevenue = computeAgentBookRevenue(policies, commissionRates)
    const totalPremium = bookRevenue.dedupedPremium

    // Monthly growth
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const customersNow = relationships.length
    const customersBefore = relationships.filter((r) => new Date(r.createdAt) < thirtyDaysAgo).length
    const newCustomers = customersNow - customersBefore
    // Suppress the vanity "+100%": going from 1→2 clients is real but a "+100%"
    // growth chip on a near-empty book is misleading, not motivating. Require a
    // meaningful prior-period base before reporting a percentage at all.
    const MIN_PRIOR_CLIENTS_FOR_GROWTH = 3
    const monthlyGrowth = customersBefore < MIN_PRIOR_CLIENTS_FOR_GROWTH
        ? 0
        : Math.round((newCustomers / customersBefore) * 100)

    // Agent commission on the open pipeline, using the agent's real per-line
    // rates (mirrors /commissions' totalEstimated) — respecting any
    // per-opportunity estimatedCommission the system already stored.
    const commissionPipeline = opportunities
        .filter((o) => o.status !== "won" && o.status !== "lost")
        .reduce((sum, o) => sum + Number(o.estimatedCommission ?? commissionOn(commissionRates, o.lineOfBusiness, Number(o.estimatedPremium ?? 0))), 0)

    // ── Cross-sell opportunities (Pro+) ────────────────────────────
    // Read the ALREADY-PERSISTED cross-sell opportunity rows — never re-run the
    // bulk cross-sell engine on a dashboard load (that re-analyses every
    // customer). Cross-sell rows are the only opportunities the system prices
    // (estimatedCommission set); gap-request opportunities carry none, so a
    // positive estimatedCommission on an open/contacted row cleanly isolates
    // them. Server-gated on crossSellIntelligence: below-Pro agents get an empty
    // list (no data to un-blur), mirroring the pipelineAnalytics gate below.
    const crossSellOpportunities: CrossSellOpportunityItem[] = agentEntitlements.limits.crossSellIntelligence
        ? opportunities
            .filter((o) =>
                (o.status === "open" || o.status === "contacted") &&
                Boolean(o.lineOfBusiness) &&
                Number(o.estimatedCommission ?? 0) > 0
            )
            .map((o) => ({
                id: o.id,
                customerId: o.relationship?.customer?.id ?? "",
                customerName: presentName(o.relationship?.customer?.id),
                lineOfBusiness: o.lineOfBusiness as string,
                estimatedCommission: Number(o.estimatedCommission ?? 0),
            }))
            .sort((a, b) => b.estimatedCommission - a.estimatedCommission)
            .slice(0, 5)
        : []

    // Estimated MONTHLY commission income from the in-force book (deduped +
    // guarded above) — the agent's actual recurring revenue, not premium / 12.
    const monthlyCommission = bookRevenue.monthlyCommission

    // Resolve the REAL end date per policy (renewal history → extracted
    // envelope → column) — the raw endDate column is placeholder-prone, so
    // renewal/expiry detection must use the lifecycle date, matching insights
    // and the portal. Null = unknown duration → not treated as due/expiring.
    const now = new Date()
    const resolvedEndByPolicy = new Map(policies.map((p) => [p.id, resolvePolicyLifecycle(p, now).endDate]))

    // Renewals due this month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const renewalsDue = policies.filter((p) => {
        const end = resolvedEndByPolicy.get(p.id)
        return Boolean(end && end >= now && end <= endOfMonth)
    })

    // Index the book once so every section below is a Map/Set lookup instead
    // of a repeated linear scan — this page used to do O(P·R)/O(R·P)/O(P·G) JS
    // joins (find/filter/some inside loops), which explode on a large book.
    const relByPolicyholder = new Map(relationships.map((r) => [r.policyholderUserId, r]))
    const policiesByOwner = new Map<string, typeof policies>()
    for (const p of policies) {
        const arr = policiesByOwner.get(p.ownerUserId)
        if (arr) arr.push(p)
        else policiesByOwner.set(p.ownerUserId, [p])
    }

    // ── Action Queue ──────────────────────────────────────────────
    const actionQueue: ActionQueueItem[] = []

    // Expiring policies (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    for (const policy of policies) {
        const endDate = resolvedEndByPolicy.get(policy.id)
        if (!endDate) continue
        if (endDate >= now && endDate <= thirtyDaysFromNow) {
            const ownerRel = relByPolicyholder.get(policy.ownerUserId)
            const lobLabel = policy.lineOfBusiness || "Policy"
            // Commission at stake if this renewal lapses = renewal premium ×
            // the agent's per-line rate. Guard mis-extractions (a sum-insured
            // captured as premium) the same way the book-revenue figure does —
            // an implausible premium yields no revenue-at-risk, not a bogus one.
            const premium = Number(policy.premiumAmount ?? 0)
            const revenueAtRisk = Number.isFinite(premium) && premium > 0 && premium <= MAX_PLAUSIBLE_ANNUAL_PREMIUM
                ? commissionOn(commissionRates, policy.lineOfBusiness, premium)
                : undefined
            actionQueue.push({
                id: `expiring-${policy.id}`,
                type: "expiring_policy",
                clientId: ownerRel?.customer.id || policy.ownerUserId,
                clientName: presentName(ownerRel?.customer.id),
                description: `${lobLabel} expires ${endDate.toLocaleDateString("el-GR")}`,
                dueDate: endDate.toISOString(),
                urgency: (endDate.getTime() - now.getTime()) < 7 * 86_400_000 ? "high" : "medium",
                oneTapAction: "renew",
                policyId: policy.id,
                revenueAtRisk,
            })
        }
    }

    // Clients with no policies
    for (const rel of relationships) {
        const clientPolicies = policiesByOwner.get(rel.policyholderUserId) ?? []
        if (clientPolicies.length === 0 && rel.status === "active") {
            actionQueue.push({
                id: `incomplete-${rel.id}`,
                type: "incomplete_profile",
                clientId: rel.customer.id,
                clientName: presentName(rel.customer.id),
                description: "No policies linked yet",
                dueDate: new Date().toISOString(),
                urgency: "low",
                oneTapAction: "complete_profile",
            })
        }
    }

    // Composite sort: urgency tier first (keep the "act now" ordering
    // interpretable), then revenue-at-risk descending WITHIN a tier so the
    // high-urgency-high-commission renewals rise to the top. Items with no
    // revenue-at-risk (incomplete profiles) fall to the back of their tier.
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    actionQueue.sort((a, b) => {
        const tier = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        if (tier !== 0) return tier
        return (b.revenueAtRisk ?? 0) - (a.revenueAtRisk ?? 0)
    })

    // Total agent commission riding on the queued renewals — surfaced as
    // "€X in renewals at risk" in the Action Queue header.
    const revenueAtRiskTotal = actionQueue.reduce((sum, i) => sum + (i.revenueAtRisk ?? 0), 0)

    // ── Revenue Metrics ───────────────────────────────────────────
    // The Revenue Pulse card is a paid entitlement (pipelineAnalytics, Starter+).
    // The AgentPlanGate blur was cosmetic — the real figures still shipped in the
    // free agent's payload. Withhold them server-side: below-tier agents get a
    // zeroed shape (same type) behind the upgrade gate, no real data to un-blur.
    const revenue = agentEntitlements.limits.pipelineAnalytics
        ? {
            mrr: monthlyCommission,
            renewalsDueThisMonth: renewalsDue.length,
            renewalsDueAmount: renewalsDue.reduce((sum, p) => sum + Number(p.premiumAmount || 0), 0),
            commissionPipeline,
            monthlyGrowthPercent: monthlyGrowth,
        }
        : { mrr: 0, renewalsDueThisMonth: 0, renewalsDueAmount: 0, commissionPipeline: 0, monthlyGrowthPercent: 0 }

    // ── Portfolio Health ───────────────────────────────────────────
    const gapCounts = await prisma.gapInstance.groupBy({
        by: ["policyId"],
        where: { status: { in: [...OPEN_GAP_STATUSES] }, policy: { createdByUserId: agentId } },
        _count: true,
    })
    const gapCountByPolicy = new Map(gapCounts.map((g) => [g.policyId, g._count]))
    // Intersect with the CURRENT client set: a policy whose owner is no longer a
    // relationship (orphaned / uploaded for a non-client) must not push the
    // numerator past customersNow → the percentages below could exceed 100%.
    const clientsWithGaps = new Set(
        policies
            .filter((p) => gapCountByPolicy.has(p.id) && relByPolicyholder.has(p.ownerUserId))
            .map((p) => p.ownerUserId)
    )
    const clientsWithPolicies = new Set(
        policies.filter((p) => relByPolicyholder.has(p.ownerUserId)).map((p) => p.ownerUserId)
    )
    const activeRelationships = relationships.filter((r) => r.status === "active")

    const portfolioHealth = {
        totalClients: customersNow,
        coverageGapPercent: customersNow > 0
            ? Math.round((clientsWithGaps.size / customersNow) * 100)
            : 0,
        completeProfilePercent: customersNow > 0
            ? Math.round((clientsWithPolicies.size / customersNow) * 100)
            : 0,
        atRiskCount: actionQueue.filter((i) => i.urgency === "high").length,
    }

    // ── Protection Scores (batch fetch from cache) ──────────────
    // PRIVACY: protection scores are derived from the customer's ENTIRE
    // portfolio. Serving them for relationship customers with no visible
    // policy would leak portfolio-derived data the customer never shared —
    // same rule as /api/v1/customers/protection-scores and agent-portal.
    const scoreEligibleIds = relationships
        .map((r) => r.policyholderUserId)
        .filter((id) => (visiblePolicyCounts.get(id) ?? 0) > 0)

    const protectionScores = scoreEligibleIds.length > 0
        ? await prisma.protectionScore.findMany({
            where: {
                userId: { in: scoreEligibleIds },
            },
            select: { userId: true, overallScore: true, gapCount: true },
        }).catch(() => [] as Array<{ userId: string; overallScore: number; gapCount: number }>)
        : []

    const scoresByUserId = new Map(
        protectionScores.map((s) => [s.userId, s])
    )

    // ── Clients by Urgency ────────────────────────────────────────
    const clientsByUrgency: AgentDashboardData["clientsByUrgency"] = {
        needs_attention: [],
        on_track: [],
        inactive: [],
    }

    const actionsByClient = new Map<string, ActionQueueItem[]>()
    for (const a of actionQueue) {
        const arr = actionsByClient.get(a.clientId)
        if (arr) arr.push(a)
        else actionsByClient.set(a.clientId, [a])
    }

    for (const rel of relationships) {
        const clientPolicies = policiesByOwner.get(rel.policyholderUserId) ?? []
        const clientGaps = clientPolicies.reduce((sum, p) => sum + (gapCountByPolicy.get(p.id) ?? 0), 0)

        const healthScore = computeClientHealthScore({
            policyCount: clientPolicies.length,
            openGapsCount: clientGaps,
            lastInteractionDate: rel.lastInteractionAt?.toISOString() || null,
            profileComplete: clientPolicies.length > 0,
            activationStatus: rel.status,
        })

        const urgencyTier = classifyUrgencyTier({
            activationStatus: rel.status === "active" ? "activated" : rel.status === "pending_activation" ? "invited" : "inactive",
            openGapsCount: clientGaps,
            lastInteractionDate: rel.lastInteractionAt?.toISOString() || null,
            policyCount: clientPolicies.length,
            policies: clientPolicies.map((p) => ({
                endDate: resolvedEndByPolicy.get(p.id)?.toISOString() || "",
                status: p.status || "active",
            })),
        })

        // Find next action due
        const nextAction = actionsByClient.get(rel.customer.id)?.[0]
        // Identity through the consent presenter — an unconsented real account
        // shows its email (which the agent typed), never its real name/avatar.
        const identity = presentCustomerIdentity(
            rel,
            rel.customer,
            visiblePolicyCounts.get(rel.policyholderUserId) ?? 0
        )
        const nameParts = identity.name.split(" ")

        const clientCard: ClientCardData = {
            id: rel.customer.id,
            relationshipId: rel.id,
            name: nameParts[0] || "",
            surname: nameParts.slice(1).join(" ") || "",
            email: rel.customer.email,
            avatar: identity.image || undefined,
            policyCount: clientPolicies.length,
            healthScore,
            urgencyTier,
            nextActionDue: nextAction?.dueDate || null,
            nextActionLabel: nextAction?.description || null,
            activationStatus: rel.status === "active" ? "activated" : rel.status === "pending_activation" ? "invited" : "inactive",
            protectionScore: scoresByUserId.get(rel.policyholderUserId)?.overallScore ?? null,
            gapCount: scoresByUserId.get(rel.policyholderUserId)?.gapCount ?? 0,
        }

        clientsByUrgency[urgencyTier].push(clientCard)
    }

    // ── Pending tasks (real UserTasks assigned to the agent) ──────
    // Driven by actual UserTask rows (agent's own, due today or overdue) — not
    // a re-slice of the synthetic action queue. `overdue` = due before today.
    const pendingTasks: AgentTaskItem[] = agentTasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        overdue: Boolean(task.dueDate && task.dueDate < startOfToday),
        priority: task.priority === "high" || task.priority === "low" ? task.priority : "medium",
    }))

    // ── Activity Feed ─────────────────────────────────────────────
    const feed = await getActivityFeed(10)
    const recentActivity = feed.map((f) => {
        let type = "policy_added"
        if (f.type.includes("join") || f.type.includes("invite") || f.type.includes("questionnaire")) type = "customer_invited"
        if (f.type.includes("renewal") || f.type.includes("updated")) type = "renewal_completed"
        if (f.type.includes("claim") || f.type.includes("won") || f.type.includes("lost")) type = "claim_filed"
        const details =
            typeof f.title === "string"
                ? f.title
                : typeof f.title === "object" && f.title
                    ? (f.title as { en?: string; el?: string }).en || (f.title as { en?: string; el?: string }).el || "Action recorded"
                    : "Action recorded"

        return {
            id: f.id,
            type,
            customerName: f.customerName || "System",
            timestamp: f.timestamp.toISOString(),
            details,
        }
    })

    // ── Gaps Summary (critical/high gaps across clients) ────────────
    // PRIVACY: only gaps on policies the agent may see (their own uploads or
    // owner-granted) — a relationship is not consent to read the customer's
    // whole portfolio. Same rule as agent-portal.service (see #95).
    const clientUserIds = relationships.map((r) => r.policyholderUserId)
    const gapsVisibilityWhere = await getAgentPolicyVisibilityWhere(agentId)
    const criticalHighGaps = clientUserIds.length > 0
        ? await prisma.gapInstance.findMany({
            where: {
                status: { in: [...OPEN_GAP_STATUSES] },
                severity: { in: ["critical", "high"] },
                policy: { ownerUserId: { in: clientUserIds }, ...gapsVisibilityWhere },
            },
            select: {
                severity: true,
                policy: { select: { ownerUserId: true } },
            },
        }).catch(() => [])
        : []

    const gapsByClient = new Map<string, { critical: number; high: number }>()
    for (const gap of criticalHighGaps) {
        const ownerId = gap.policy?.ownerUserId
        if (!ownerId) continue
        const entry = gapsByClient.get(ownerId) || { critical: 0, high: 0 }
        if (gap.severity === "critical") entry.critical++
        else entry.high++
        gapsByClient.set(ownerId, entry)
    }

    const gapsSummary: GapsSummary | null = gapsByClient.size > 0
        ? {
            criticalClientsCount: [...gapsByClient.values()].filter((v) => v.critical > 0).length,
            highClientsCount: [...gapsByClient.values()].filter((v) => v.high > 0 && v.critical === 0).length,
            totalGapsCount: criticalHighGaps.length,
            topClients: [...gapsByClient.entries()]
                .sort((a, b) => (b[1].critical * 10 + b[1].high) - (a[1].critical * 10 + a[1].high))
                .slice(0, 3)
                .map(([userId, counts]) => {
                    const rel = relationships.find((r) => r.policyholderUserId === userId)
                    return {
                        clientId: rel?.customer.id || userId,
                        clientName: presentName(rel?.customer.id),
                        criticalGaps: counts.critical,
                        highGaps: counts.high,
                    }
                }),
        }
        : null

    // B2B portal KPI strip (book-of-business metrics)
    const portalStats = await getAgentPortalData(agentId)
        .then((portal) => portal.stats)
        .catch(() => null)

    const dashboardData: AgentDashboardData = {
        actionQueue,
        revenueAtRiskTotal,
        revenue,
        portfolioHealth,
        clientsByUrgency,
        pendingTasks,
        crossSellOpportunities,
        gapsSummary,
        portalStats,
    }

    // ── Getting-started checklist signals (all derived from real data) ──────
    // A license was PROVIDED when either a license document was uploaded during
    // onboarding (documents[].type === "license") or a license number is on file
    // (agent settings). verificationStatus is unusable here — it defaults to
    // "pending" and is never null, so it can't distinguish "not started".
    const profileDocuments = Array.isArray(agentProfile?.documents)
        ? (agentProfile.documents as Array<{ type?: string }>)
        : []
    const checklistSignals = {
        // agencyName + a contact phone + some branding (logo or brand color).
        profileComplete:
            Boolean(agentProfile?.agencyName) &&
            Boolean(agentProfile?.phone) &&
            Boolean(agentProfile?.logoUrl || agentProfile?.brandColor),
        licenseUploaded:
            profileDocuments.some((d) => d?.type === "license") ||
            Boolean(agentProfile?.licenseNumber),
        hasClients: customersNow > 0,
        hasAnalysis: analysisRunCount > 0,
        // At least one per-line rate actually configured (default is {} / all 0).
        commissionRatesSet: Object.values(commissionRates).some((r) => Number(r) > 0),
    }

    return (
        <DashboardClient
            dashboardData={dashboardData}
            recentActivity={recentActivity}
            agentTier={agentTier}
            agentName={dbUser.name?.split(" ")[0]}
            isEmailVerified={!!dbUser.emailVerified}
            userEmail={dbUser.email}
            checklistSignals={checklistSignals}
        />
    )
}
