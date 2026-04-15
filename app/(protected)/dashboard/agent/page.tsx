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
            select: { id: true, premiumAmount: true, endDate: true, status: true, ownerUserId: true, lineOfBusiness: true },
        }),
        prisma.customerRelationship.findMany({
            where: { agentUserId: agentId },
            include: {
                customer: { select: { id: true, name: true, email: true, image: true } },
            },
        }),
        prisma.opportunity.findMany({
            where: { ownerAgentUserId: agentId },
            select: { status: true, estimatedPremium: true, wonPremium: true },
        }),
    ])

    const totalPolicies = policies.length
    const totalPremium = policies.reduce((sum, p) => sum + Number(p.premiumAmount || 0), 0)

    // Monthly growth
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const customersNow = relationships.length
    const customersBefore = relationships.filter((r) => new Date(r.createdAt) < thirtyDaysAgo).length
    const newCustomers = customersNow - customersBefore
    const monthlyGrowth = customersBefore === 0
        ? (newCustomers > 0 ? 100 : 0)
        : Math.round((newCustomers / customersBefore) * 100)

    // Pipeline / won revenue
    const pipelineValue = opportunities
        .filter((o) => o.status !== "won" && o.status !== "lost")
        .reduce((sum, o) => sum + Number(o.estimatedPremium ?? 0), 0)
    const wonRevenue = opportunities
        .filter((o) => o.status === "won")
        .reduce((sum, o) => sum + Number(o.wonPremium ?? o.estimatedPremium ?? 0), 0)

    // Renewals due this month
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const renewalsDue = policies.filter((p) => {
        if (!p.endDate) return false
        const end = new Date(p.endDate)
        return end >= now && end <= endOfMonth
    })

    // ── Action Queue ──────────────────────────────────────────────
    const actionQueue: ActionQueueItem[] = []

    // Expiring policies (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    for (const policy of policies) {
        if (!policy.endDate) continue
        const endDate = new Date(policy.endDate)
        if (endDate >= now && endDate <= thirtyDaysFromNow) {
            const ownerRel = relationships.find((r) => r.policyholderUserId === policy.ownerUserId)
            actionQueue.push({
                id: `expiring-${policy.id}`,
                type: "expiring_policy",
                clientId: ownerRel?.customer.id || policy.ownerUserId,
                clientName: ownerRel?.customer.name || "Client",
                description: `${policy.lineOfBusiness || "Policy"} expires ${endDate.toLocaleDateString("el-GR")}`,
                dueDate: endDate.toISOString(),
                urgency: (endDate.getTime() - now.getTime()) < 7 * 86_400_000 ? "high" : "medium",
                oneTapAction: "renew",
                policyId: policy.id,
            })
        }
    }

    // Clients with no policies
    for (const rel of relationships) {
        const clientPolicies = policies.filter((p) => p.ownerUserId === rel.policyholderUserId)
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
        mrr: totalPremium / 12,
        renewalsDueThisMonth: renewalsDue.length,
        renewalsDueAmount: renewalsDue.reduce((sum, p) => sum + Number(p.premiumAmount || 0), 0),
        commissionPipeline: pipelineValue * 0.15, // approximate
        monthlyGrowthPercent: monthlyGrowth,
    }

    // ── Portfolio Health ───────────────────────────────────────────
    const gapCounts = await prisma.gapInstance.groupBy({
        by: ["policyId"],
        where: { status: "open", policy: { createdByUserId: agentId } },
        _count: true,
    })
    const clientsWithGaps = new Set(
        policies
            .filter((p) => gapCounts.some((g) => g.policyId === p.id))
            .map((p) => p.ownerUserId)
    )
    const clientsWithPolicies = new Set(policies.map((p) => p.ownerUserId))
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

    for (const rel of relationships) {
        const clientPolicies = policies.filter((p) => p.ownerUserId === rel.policyholderUserId)
        const clientGaps = gapCounts
            .filter((g) => clientPolicies.some((p) => p.id === g.policyId))
            .reduce((sum, g) => sum + g._count, 0)

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
                endDate: p.endDate?.toISOString() || "",
                status: p.status || "active",
            })),
        })

        // Find next action due
        const clientActions = actionQueue.filter((a) => a.clientId === rel.customer.id)
        const nextAction = clientActions[0]
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
    const clientUserIds = relationships.map((r) => r.policyholderUserId)
    const criticalHighGaps = clientUserIds.length > 0
        ? await prisma.gapInstance.findMany({
            where: {
                status: { in: ["open", "detected"] },
                severity: { in: ["critical", "high"] },
                policy: { ownerUserId: { in: clientUserIds } },
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

    const dashboardData: AgentDashboardData = {
        actionQueue,
        revenue,
        portfolioHealth,
        clientsByUrgency,
        todaysFollowUps,
        gapsSummary,
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
