"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

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
}

export async function getInsightsData(): Promise<InsightsData | null> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const agentId = authResult.dbUser.id

    // 1. Customer stats
    const relationships = await db.customerRelationship.findMany({
        where: { agentUserId: agentId },
        include: {
            policyholder: {
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
    const policies = await db.policy.findMany({
        where: { ownerUserId: { in: customerIds } },
        select: {
            id: true,
            policyNumber: true,
            insurerName: true,
            lineOfBusiness: true,
            premiumAmount: true,
            endDate: true,
            ownerUserId: true,
            status: true,
        }
    })

    // Group by line of business
    const lobMap = new Map<string, { count: number; totalPremium: number }>()
    for (const p of policies) {
        const lob = p.lineOfBusiness || 'other'
        const existing = lobMap.get(lob) || { count: 0, totalPremium: 0 }
        existing.count++
        existing.totalPremium += (p.premiumAmount as number) || 0
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

    const customerMap = new Map(relationships.map(r => [r.policyholderUserId, r.policyholder?.name || 'Unknown']))

    const renewalTimeline = policies
        .filter(p => p.endDate >= now && p.endDate <= ninetyDaysOut)
        .map(p => ({
            policyId: p.id,
            policyNumber: p.policyNumber || 'N/A',
            insurerName: p.insurerName || 'Unknown',
            customerName: customerMap.get(p.ownerUserId) || 'Unknown',
            customerId: p.ownerUserId,
            lineOfBusiness: p.lineOfBusiness || 'other',
            endDate: p.endDate.toISOString(),
            daysUntilExpiry: Math.ceil((p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            premiumAmount: (p.premiumAmount as number) || 0,
        }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    // 4. Opportunity metrics
    const opportunities = await db.opportunity.findMany({
        where: {
            relationship: { agentUserId: agentId }
        },
        select: {
            id: true,
            status: true,
        }
    })

    const oppTotal = opportunities.length
    const oppOpen = opportunities.filter(o => o.status === 'open').length
    const oppContacted = opportunities.filter(o => o.status === 'contacted').length
    const oppQuoted = opportunities.filter(o => o.status === 'quoted').length
    const oppWon = opportunities.filter(o => o.status === 'won').length
    const oppLost = opportunities.filter(o => o.status === 'lost').length
    const conversionRate = oppTotal > 0 ? Math.round((oppWon / oppTotal) * 100) : 0

    // 5. Premium summary
    const totalPremium = policies.reduce((sum, p) => sum + ((p.premiumAmount as number) || 0), 0)
    const avgPremiumPerCustomer = totalCustomers > 0 ? totalPremium / totalCustomers : 0
    const avgPoliciesPerCustomer = totalCustomers > 0 ? policies.length / totalCustomers : 0

    // 6. Recent gaps across customers
    const recentGaps = await db.gapInstance.findMany({
        where: {
            policy: { ownerUserId: { in: customerIds } },
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
            totalPotentialValue: 0,
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
            customerName: customerMap.get(g.policy.ownerUserId) || 'Unknown',
            policyNumber: g.policy.policyNumber || 'N/A',
            detectedAt: g.detectedAt.toISOString(),
        })),
    }
}
