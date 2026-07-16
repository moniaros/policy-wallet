export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getDashboardData } from "../../agent/actions"
import { getActivityFeed } from "../../activity/actions"
import { DashboardClient } from "../DashboardClient"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getPrimaryRole } from "@/lib/auth/role-routing"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { computeClientHealthScore } from "@/lib/agent/health-score"
import { classifyUrgencyTier } from "@/lib/agent/format"
import { db as prisma } from "@/lib/db"
import { computeAgentBookRevenue } from "@/lib/agent/revenue"
import { commissionOn } from "@/lib/agent/commission"
import { OPEN_GAP_STATUSES } from "@/lib/wallet/gap-status"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { getAgentPortalData } from "@/lib/services/agent-portal.service"
import { getAgentPolicyVisibilityWhere } from "@/lib/agent-visibility"
import type { AgentDashboardData, ActionQueueItem, ClientCardData, GapsSummary } from "@/components/agent/types"

export default async function DashboardPage() {
    const { dbUser } = await getAuthenticatedUser()
    const role = getPrimaryRole(dbUser.roles)

    if (role !== "agent") {
        redirect(role === "admin" ? "/admin/dashboard" : "/dashboard")
    }

    const data = await getDashboardData()
    if (!data) {
        return <div>Access Denied. Agent credentials required.</div>
    }

    const agentId = dbUser.id

    // Resolve agent tier
    const agentEntitlements = await resolveAgentEntitlements(agentId)
    const agentTier = agentEntitlements.tier

    // Fetch policies and customers
    const [policies, relationships, opportunities] = await Promise.all([
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
                customer: { select: { id: true, name: true, email: true, image: true } },
            },
        }),
        prisma.opportunity.findMany({
            where: { ownerAgentUserId: agentId },
            select: { status: true, estimatedPremium: true, estimatedCommission: true, wonPremium: true, lineOfBusiness: true },
        }),
    ])

    // Real per-line commission rates the agent configured on /commissions — the
    // Revenue Pulse used to invent a flat 15% (and call premium/12 "revenue").
    const agentProfile = await prisma.agentProfile.findUnique({
        where: { userId: agentId },
        select: { commissionRates: true },
    })
    const commissionRates = (agentProfile?.commissionRates as Record<string, number> | null) ?? {}

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
    const monthlyGrowth = customersBefore === 0
        ? (newCustomers > 0 ? 100 : 0)
        : Math.round((newCustomers / customersBefore) * 100)

    // Agent commission on the open pipeline, using the agent's real per-line
    // rates (mirrors /commissions' totalEstimated) — respecting any
    // per-opportunity estimatedCommission the system already stored.
    const commissionPipeline = opportunities
        .filter((o) => o.status !== "won" && o.status !== "lost")
        .reduce((sum, o) => sum + Number(o.estimatedCommission ?? commissionOn(commissionRates, o.lineOfBusiness, Number(o.estimatedPremium ?? 0))), 0)

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
            actionQueue.push({
                id: `expiring-${policy.id}`,
                type: "expiring_policy",
                clientId: ownerRel?.customer.id || policy.ownerUserId,
                clientName: ownerRel?.customer.name || "Client",
                description: `${lobLabel} expires ${endDate.toLocaleDateString("el-GR")}`,
                dueDate: endDate.toISOString(),
                urgency: (endDate.getTime() - now.getTime()) < 7 * 86_400_000 ? "high" : "medium",
                oneTapAction: "renew",
                policyId: policy.id,
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
                clientName: rel.customer.name || "Client",
                description: "No policies linked yet",
                dueDate: new Date().toISOString(),
                urgency: "low",
                oneTapAction: "complete_profile",
            })
        }
    }

    // Sort by urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    actionQueue.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    // ── Revenue Metrics ───────────────────────────────────────────
    const revenue = {
        mrr: monthlyCommission,
        renewalsDueThisMonth: renewalsDue.length,
        renewalsDueAmount: renewalsDue.reduce((sum, p) => sum + Number(p.premiumAmount || 0), 0),
        commissionPipeline,
        monthlyGrowthPercent: monthlyGrowth,
    }

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
    const protectionScores = await prisma.protectionScore.findMany({
        where: {
            userId: { in: relationships.map((r) => r.policyholderUserId) },
        },
        select: { userId: true, overallScore: true, gapCount: true },
    }).catch(() => [] as Array<{ userId: string; overallScore: number; gapCount: number }>)

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
        const nameParts = (rel.customer.name || "").split(" ")

        const clientCard: ClientCardData = {
            id: rel.customer.id,
            relationshipId: rel.id,
            name: nameParts[0] || "",
            surname: nameParts.slice(1).join(" ") || "",
            email: rel.customer.email,
            avatar: rel.customer.image || undefined,
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

    // ── Today's Follow-ups ────────────────────────────────────────
    const todaysFollowUps = actionQueue.filter((item) => {
        const due = new Date(item.dueDate)
        return due.toDateString() === now.toDateString()
    })

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
                        clientName: rel?.customer.name || "Client",
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
        revenue,
        portfolioHealth,
        clientsByUrgency,
        todaysFollowUps,
        gapsSummary,
        portalStats,
    }

    return (
        <DashboardClient
            dashboardData={dashboardData}
            recentActivity={recentActivity}
            agentTier={agentTier}
            agentName={dbUser.name?.split(" ")[0]}
            isEmailVerified={!!dbUser.emailVerified}
            userEmail={dbUser.email}
        />
    )
}
