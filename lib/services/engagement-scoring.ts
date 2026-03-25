import { db } from "../db"

/**
 * Engagement scoring algorithm for PolicyWallet users.
 *
 * Score range: 0-100 based on 5 factors:
 * - Login recency (0-30): how recently the user was active
 * - Policy count (0-20): number of active policies
 * - Analysis usage (0-20): completed AI analyses
 * - Collaboration (0-15): agent connection + threads + proposals
 * - Profile completeness (0-15): filled profile fields
 */

interface EngagementScore {
    total: number
    breakdown: {
        loginRecency: number
        policyCount: number
        analysisUsage: number
        collaboration: number
        profileCompleteness: number
    }
    riskLevel: "healthy" | "at_risk" | "churning" | "inactive"
}

/**
 * Calculate engagement score for a single user.
 */
export async function calculateEngagementScore(userId: string): Promise<EngagementScore> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
            preferredLanguage: true,
            lastActiveAt: true,
            createdAt: true,
            roles: true,
            pushToken: true,
        },
    })

    if (!user) {
        return {
            total: 0,
            breakdown: { loginRecency: 0, policyCount: 0, analysisUsage: 0, collaboration: 0, profileCompleteness: 0 },
            riskLevel: "inactive",
        }
    }

    const now = new Date()

    // 1. Login recency (0-30)
    let loginRecency = 0
    const lastActive = user.lastActiveAt || user.createdAt
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceActive <= 1) loginRecency = 30
    else if (daysSinceActive <= 3) loginRecency = 25
    else if (daysSinceActive <= 7) loginRecency = 20
    else if (daysSinceActive <= 14) loginRecency = 12
    else if (daysSinceActive <= 30) loginRecency = 5
    else loginRecency = 0

    // 2. Policy count (0-20)
    const activePolicies = await db.policy.count({
        where: { ownerUserId: userId, status: "active" },
    })
    let policyScore = 0
    if (activePolicies >= 5) policyScore = 20
    else if (activePolicies >= 3) policyScore = 15
    else if (activePolicies >= 1) policyScore = 10
    else policyScore = 0

    // 3. Analysis usage (0-20)
    const completedAnalyses = await db.policyAnalysisRun.count({
        where: { userId, status: "completed" },
    })
    let analysisScore = 0
    if (completedAnalyses >= 10) analysisScore = 20
    else if (completedAnalyses >= 5) analysisScore = 15
    else if (completedAnalyses >= 2) analysisScore = 10
    else if (completedAnalyses >= 1) analysisScore = 5
    else analysisScore = 0

    // 4. Collaboration (0-15)
    let collaborationScore = 0

    const hasAgentConnection = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: userId,
            status: "active",
        },
        select: { id: true },
    })
    if (hasAgentConnection) collaborationScore += 5

    const threadCount = await db.collaborationThread.count({
        where: {
            OR: [
                { createdByUserId: userId },
                { participants: { some: { userId } } },
            ],
        },
    })
    if (threadCount >= 3) collaborationScore += 5
    else if (threadCount >= 1) collaborationScore += 3

    const proposalCount = await db.proposal.count({
        where: {
            relationship: { policyholderUserId: userId },
        },
    })
    if (proposalCount >= 1) collaborationScore += 5

    collaborationScore = Math.min(15, collaborationScore)

    // 5. Profile completeness (0-15)
    let profileScore = 0
    if (user.name) profileScore += 3
    if (user.phoneNumber) profileScore += 3
    if (user.email && !user.email.endsWith("@phone.policywallet.local")) profileScore += 3
    if (user.image) profileScore += 3
    if (user.pushToken) profileScore += 3
    profileScore = Math.min(15, profileScore)

    const total = loginRecency + policyScore + analysisScore + collaborationScore + profileScore

    // Risk level
    let riskLevel: EngagementScore["riskLevel"] = "healthy"
    if (total <= 15 || daysSinceActive > 30) riskLevel = "inactive"
    else if (total <= 30 || daysSinceActive > 14) riskLevel = "churning"
    else if (total <= 50 || daysSinceActive > 7) riskLevel = "at_risk"

    return {
        total,
        breakdown: {
            loginRecency,
            policyCount: policyScore,
            analysisUsage: analysisScore,
            collaboration: collaborationScore,
            profileCompleteness: profileScore,
        },
        riskLevel,
    }
}

/**
 * Calculate and cache engagement scores for all active users.
 * Returns summary counts by risk level.
 */
export async function calculateAllEngagementScores(): Promise<{
    total: number
    healthy: number
    atRisk: number
    churning: number
    inactive: number
}> {
    const users = await db.user.findMany({
        where: { roles: { not: "admin" } },
        select: { id: true },
        take: 5000,
    })

    let healthy = 0, atRisk = 0, churning = 0, inactive = 0

    for (const user of users) {
        const score = await calculateEngagementScore(user.id)

        switch (score.riskLevel) {
            case "healthy": healthy++; break
            case "at_risk": atRisk++; break
            case "churning": churning++; break
            case "inactive": inactive++; break
        }
    }

    return { total: users.length, healthy, atRisk, churning, inactive }
}
