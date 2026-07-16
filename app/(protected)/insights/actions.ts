"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getAgentPolicyVisibilityWhere } from "@/lib/agent-visibility"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { isPremiumBearing } from "@/lib/wallet/premium-footprint"
import { isAgentRole } from "@/lib/auth/require-agent"

export interface InsightsData {
    portfolioHealth: {
        totalCustomers: number
        activeCustomers: number
        invitedCustomers: number
        inactiveCustomers: number
        activationRate: number
    }
    policyBreakdown: {
        lineOfBusiness: string
        count: number
        totalPremium: number
    }[]
    renewalTimeline: {
        policyId: string
        policyNumber: string
        insurerName: string
        customerName: string
        customerId: string
        lineOfBusiness: string
        endDate: string
        daysUntilExpiry: number
        premiumAmount: number
    }[]
    opportunityMetrics: {
        total: number
        open: number
        contacted: number
        quoted: number
        won: number
        lost: number
        conversionRate: number
        totalPotentialValue: number
        totalWonValue: number
    }
    premiumSummary: {
        totalPremium: number
        avgPremiumPerCustomer: number
        avgPoliciesPerCustomer: number
    }
    recentGaps: {
        id: string
        title: string
        severity: string
        customerName: string
        policyNumber: string
        detectedAt: string
    }[]
    renewalMetrics: {
        totalTracked: number
        pendingRenewals: number
        overdueRenewals: number
        renewedThisMonth: number
        lapsedThisMonth: number
        renewalRate: number
        premiumAtRisk: number
    }
}

export async function getInsightsData(): Promise<InsightsData | null> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null

    const agentId = authResult.dbUser.id

    // 1. Customer stats
    const relationships = await db.customerRelationship.findMany({
        where: { agentUserId: agentId },
        include: {
            customer: {
                select: { id: true, name: true, email: true }
            }
        }
    })

    const activeCustomers = relationships.filter(r => r.status === 'active').length
    const invitedCustomers = relationships.filter(r => r.status === 'pending_activation').length
    const inactiveCustomers = relationships.filter(r => r.status !== 'active' && r.status !== 'pending_activation').length
    const totalCustomers = relationships.length
    const activationRate = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0

    // 2. Policy breakdown
    const customerIds = relationships.map(r => r.policyholderUserId)
    // Book insights cover the agent's OWN book — policies they uploaded or
    // were granted. A relationship alone never exposes a customer's portfolio.
    const allPolicies = await db.policy.findMany({
        where: {
            ownerUserId: { in: customerIds },
            ...(await getAgentPolicyVisibilityWhere(agentId)),
        },
        select: {
            id: true,
            policyNumber: true,
            insurerName: true,
            lineOfBusiness: true,
            premiumAmount: true,
            endDate: true,
            ownerUserId: true,
            status: true,
            // Needed by resolvePolicyLifecycle: the real end date lives in the
            // extracted envelope, not the (placeholder-prone) endDate column.
            acordData: true,
        }
    })

    // Premium figures may only count policies actually in force — the stored
    // status is never updated to 'expired', so it cannot be trusted as a filter.
    const policies = allPolicies.filter((p) => isPremiumBearing(p))

    // Group by line of business
    const lobMap = new Map<string, { count: number; totalPremium: number }>()
    for (const p of policies) {
        const lob = p.lineOfBusiness || 'other'
        const existing = lobMap.get(lob) || { count: 0, totalPremium: 0 }
        existing.count++
        existing.totalPremium += Number(p.premiumAmount ?? 0)
        lobMap.set(lob, existing)
    }

    const policyBreakdown = Array.from(lobMap.entries())
        .map(([lineOfBusiness, data]) => ({
            lineOfBusiness,
            count: data.count,
            totalPremium: data.totalPremium,
        }))
        .sort((a, b) => b.count - a.count)

    // 3. Renewal timeline (next 90 days)
    const now = new Date()
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const customerMap = new Map(relationships.map(r => [r.policyholderUserId, r.customer?.name || 'Unknown']))

    const renewalTimeline = policies
        .map(p => ({ p, endDate: resolvePolicyLifecycle(p, now).endDate }))
        .filter((entry): entry is { p: typeof entry.p; endDate: Date } =>
            entry.endDate !== null && entry.endDate >= now && entry.endDate <= ninetyDaysOut
        )
        .map(({ p, endDate }) => ({
            policyId: p.id,
            policyNumber: p.policyNumber || 'N/A',
            insurerName: p.insurerName || 'Unknown',
            customerName: customerMap.get(p.ownerUserId) || 'Unknown',
            customerId: p.ownerUserId,
            lineOfBusiness: p.lineOfBusiness || 'other',
            endDate: endDate.toISOString(),
            daysUntilExpiry: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            premiumAmount: Number(p.premiumAmount ?? 0),
        }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    // 4. Opportunity metrics — grouped counts + summed estimate in the DB
    // instead of loading every opportunity row and running five filter passes.
    const oppGroups = await db.opportunity.groupBy({
        by: ['status'],
        where: { relationship: { agentUserId: agentId } },
        _count: { _all: true },
        _sum: { estimatedPremium: true },
    })
    const countByStatus = (s: string) => oppGroups.find(g => g.status === s)?._count._all ?? 0
    const oppTotal = oppGroups.reduce((n, g) => n + g._count._all, 0)
    const oppOpen = countByStatus('open')
    const oppContacted = countByStatus('contacted')
    const oppQuoted = countByStatus('quoted')
    const oppWon = countByStatus('won')
    const oppLost = countByStatus('lost')
    const conversionRate = oppTotal > 0 ? Math.round((oppWon / oppTotal) * 100) : 0

    const totalPotentialValue = oppGroups
        .filter(g => g.status !== 'won' && g.status !== 'lost')
        .reduce((sum, g) => sum + Number(g._sum.estimatedPremium ?? 0), 0)

    // Won value needs a per-row (wonPremium ?? estimatedPremium) coalesce that
    // groupBy can't express — fetch just the won rows (a small subset).
    const wonOpps = await db.opportunity.findMany({
        where: { relationship: { agentUserId: agentId }, status: 'won' },
        select: { wonPremium: true, estimatedPremium: true },
    })
    const totalWonValue = wonOpps
        .reduce((sum, o) => sum + Number(o.wonPremium ?? o.estimatedPremium ?? 0), 0)

    // 5. Premium summary
    const totalPremium = policies.reduce((sum, p) => sum + (Number(p.premiumAmount ?? 0)), 0)
    const avgPremiumPerCustomer = totalCustomers > 0 ? totalPremium / totalCustomers : 0
    const avgPoliciesPerCustomer = totalCustomers > 0 ? policies.length / totalCustomers : 0

    // 6. Recent gaps across customers — only on policies the agent may see
    // (their own uploads or owner-granted). Exposing gap titles + policy
    // numbers of un-granted policies is the leak #95 closed everywhere else.
    const recentGaps = await db.gapInstance.findMany({
        where: {
            policy: { ownerUserId: { in: customerIds }, ...(await getAgentPolicyVisibilityWhere(agentId)) },
            status: { in: ['detected', 'open'] }
        },
        include: {
            definition: { select: { title: true } },
            policy: {
                select: {
                    policyNumber: true,
                    ownerUserId: true,
                }
            }
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
    })

    // 7. Renewal metrics
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalTracked, pendingRenewals, overdueRenewals, renewedThisMonth, lapsedThisMonth, atRiskRenewals] = await Promise.all([
        db.policyRenewal.count({ where: { agentUserId: agentId } }),
        db.policyRenewal.count({ where: { agentUserId: agentId, status: "pending" } }),
        db.policyRenewal.count({ where: { agentUserId: agentId, status: "overdue" } }),
        db.policyRenewal.count({
            where: { agentUserId: agentId, status: "completed", outcomeAt: { gte: monthStart } },
        }),
        db.policyRenewal.count({
            where: { agentUserId: agentId, outcome: "lapsed", outcomeAt: { gte: monthStart } },
        }),
        db.policyRenewal.findMany({
            where: { agentUserId: agentId, status: { in: ["pending", "overdue"] } },
            include: { policy: { select: { premiumAmount: true } } },
        }),
    ])

    const premiumAtRisk = atRiskRenewals.reduce(
        (sum, r) => sum + (r.policy.premiumAmount ? Number(r.policy.premiumAmount) : 0), 0
    )
    const totalResolved = renewedThisMonth + lapsedThisMonth
    const renewalRate = totalResolved > 0 ? Math.round((renewedThisMonth / totalResolved) * 100) : 0

    return {
        portfolioHealth: {
            totalCustomers,
            activeCustomers,
            invitedCustomers,
            inactiveCustomers,
            activationRate,
        },
        policyBreakdown,
        renewalTimeline,
        opportunityMetrics: {
            total: oppTotal,
            open: oppOpen,
            contacted: oppContacted,
            quoted: oppQuoted,
            won: oppWon,
            lost: oppLost,
            conversionRate,
            totalPotentialValue: Math.round(totalPotentialValue),
            totalWonValue: Math.round(totalWonValue),
        },
        premiumSummary: {
            totalPremium,
            avgPremiumPerCustomer,
            avgPoliciesPerCustomer,
        },
        recentGaps: recentGaps.map(g => ({
            id: g.id,
            title: g.definition?.title || 'Coverage Gap',
            severity: g.severity,
            customerName: g.policy ? customerMap.get(g.policy.ownerUserId) || 'Unknown' : 'Unknown',
            policyNumber: g.policy?.policyNumber || 'N/A',
            detectedAt: g.detectedAt.toISOString(),
        })),
        renewalMetrics: {
            totalTracked,
            pendingRenewals,
            overdueRenewals,
            renewedThisMonth,
            lapsedThisMonth,
            renewalRate,
            premiumAtRisk: Math.round(premiumAtRisk),
        },
    }
}
