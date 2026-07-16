"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { commissionRate } from "@/lib/agent/commission"
import { isAgentRole } from "@/lib/auth/require-agent"

export interface CommissionSummary {
    totalEstimated: number
    totalWon: number
    byLob: Array<{
        lob: string
        estimatedPremium: number
        estimatedCommission: number
        wonPremium: number
        wonCommission: number
        opportunityCount: number
    }>
    monthlyTrend: Array<{
        month: string
        won: number
        estimated: number
    }>
}

export async function getCommissionDashboard(): Promise<CommissionSummary | null> {
    const { dbUser } = await getAuthenticatedUser()
    if (!isAgentRole(dbUser.roles)) return null

    // Get agent's commission rates
    const profile = await db.agentProfile.findUnique({
        where: { userId: dbUser.id },
        select: { commissionRates: true },
    })

    const rates = (profile?.commissionRates as Record<string, number> | null) ?? {}

    // Get all opportunities with monetary data
    const opportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: dbUser.id },
        select: {
            id: true,
            status: true,
            lineOfBusiness: true,
            estimatedPremium: true,
            estimatedCommission: true,
            wonPremium: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    // Group by LoB
    const lobMap = new Map<string, {
        estimatedPremium: number
        estimatedCommission: number
        wonPremium: number
        wonCommission: number
        count: number
    }>()

    let totalEstimated = 0
    let totalWon = 0

    for (const opp of opportunities) {
        const lob = opp.lineOfBusiness?.toLowerCase() || "other"
        const rate = commissionRate(rates, lob)

        const est = lobMap.get(lob) || { estimatedPremium: 0, estimatedCommission: 0, wonPremium: 0, wonCommission: 0, count: 0 }
        est.count++

        const estPremium = Number(opp.estimatedPremium ?? 0)
        const wonPremium = Number(opp.wonPremium ?? 0)

        if (opp.status !== "won" && opp.status !== "lost") {
            est.estimatedPremium += estPremium
            est.estimatedCommission += Number(opp.estimatedCommission ?? estPremium * rate)
            totalEstimated += Number(opp.estimatedCommission ?? estPremium * rate)
        }

        if (opp.status === "won") {
            est.wonPremium += wonPremium || estPremium
            est.wonCommission += (wonPremium || estPremium) * rate
            totalWon += (wonPremium || estPremium) * rate
        }

        lobMap.set(lob, est)
    }

    const byLob = Array.from(lobMap.entries())
        .map(([lob, data]) => ({ lob, ...data, opportunityCount: data.count }))
        .sort((a, b) => b.wonCommission + b.estimatedCommission - (a.wonCommission + a.estimatedCommission))

    // Monthly trend (last 6 months)
    const now = new Date()
    const monthlyTrend: CommissionSummary["monthlyTrend"] = []

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })

        let won = 0
        let estimated = 0

        for (const opp of opportunities) {
            const date = opp.updatedAt
            if (date >= d && date <= monthEnd) {
                const lob = opp.lineOfBusiness?.toLowerCase() || "other"
                const rate = commissionRate(rates, lob)
                const premium = Number(opp.wonPremium ?? opp.estimatedPremium ?? 0)

                if (opp.status === "won") won += premium * rate
                // Estimated bar honours any stored estimatedCommission, so the
                // trend reconciles with the "Pipeline Commission" KPI.
                else if (opp.status !== "lost") estimated += Number(opp.estimatedCommission ?? premium * rate)
            }
        }

        monthlyTrend.push({ month: label, won: Math.round(won), estimated: Math.round(estimated) })
    }

    return {
        totalEstimated: Math.round(totalEstimated),
        totalWon: Math.round(totalWon),
        byLob,
        monthlyTrend,
    }
}
