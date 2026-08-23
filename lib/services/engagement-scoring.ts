import { db } from "../db"
import { NON_LIVE_POLICY_STATUSES } from "../policy-status"

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
 * The raw per-user inputs the scoring math consumes. Gathering these is the
 * only part that touches the database; keeping the math pure lets the single
 * and batch paths share one implementation and stay in lock-step.
 */
interface EngagementFacts {
    lastActive: Date
    name: string | null
    phoneNumber: string | null
    email: string | null
    image: string | null
    pushToken: string | null
    activePolicies: number
    completedAnalyses: number
    hasActiveAgentConnection: boolean
    threadCount: number
    proposalCount: number
}

// ── Pure scoring math (no I/O) ───────────────────────────────────────

function scoreFromFacts(facts: EngagementFacts, now: Date): EngagementScore {
    // 1. Login recency (0-30)
    const daysSinceActive = Math.floor((now.getTime() - facts.lastActive.getTime()) / (1000 * 60 * 60 * 24))
    let loginRecency = 0
    if (daysSinceActive <= 1) loginRecency = 30
    else if (daysSinceActive <= 3) loginRecency = 25
    else if (daysSinceActive <= 7) loginRecency = 20
    else if (daysSinceActive <= 14) loginRecency = 12
    else if (daysSinceActive <= 30) loginRecency = 5
    else loginRecency = 0

    // 2. Policy count (0-20)
    let policyScore = 0
    if (facts.activePolicies >= 5) policyScore = 20
    else if (facts.activePolicies >= 3) policyScore = 15
    else if (facts.activePolicies >= 1) policyScore = 10
    else policyScore = 0

    // 3. Analysis usage (0-20)
    let analysisScore = 0
    if (facts.completedAnalyses >= 10) analysisScore = 20
    else if (facts.completedAnalyses >= 5) analysisScore = 15
    else if (facts.completedAnalyses >= 2) analysisScore = 10
    else if (facts.completedAnalyses >= 1) analysisScore = 5
    else analysisScore = 0

    // 4. Collaboration (0-15)
    let collaborationScore = 0
    if (facts.hasActiveAgentConnection) collaborationScore += 5
    if (facts.threadCount >= 3) collaborationScore += 5
    else if (facts.threadCount >= 1) collaborationScore += 3
    if (facts.proposalCount >= 1) collaborationScore += 5
    collaborationScore = Math.min(15, collaborationScore)

    // 5. Profile completeness (0-15)
    let profileScore = 0
    if (facts.name) profileScore += 3
    if (facts.phoneNumber) profileScore += 3
    if (facts.email && !facts.email.endsWith("@phone.policywallet.local")) profileScore += 3
    if (facts.image) profileScore += 3
    if (facts.pushToken) profileScore += 3
    profileScore = Math.min(15, profileScore)

    const total = loginRecency + policyScore + analysisScore + collaborationScore + profileScore

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

const INACTIVE_SCORE: EngagementScore = {
    total: 0,
    breakdown: { loginRecency: 0, policyCount: 0, analysisUsage: 0, collaboration: 0, profileCompleteness: 0 },
    riskLevel: "inactive",
}

/**
 * Calculate engagement score for a single user.
 */
export async function calculateEngagementScore(userId: string): Promise<EngagementScore> {
    const scores = await calculateEngagementScoresBatch([userId])
    return scores.get(userId) ?? INACTIVE_SCORE
}

/**
 * Calculate engagement scores for many users at once.
 *
 * The single-user path used to fire six queries per user; scoring an agent's
 * whole book one user at a time was an N×6 stampede. This gathers every factor
 * with a handful of set-based queries (groupBy / `in` lookups) regardless of
 * how many users are passed, then scores each in memory.
 *
 * Returns a Map keyed by userId. Users with no `User` row are omitted.
 */
export async function calculateEngagementScoresBatch(
    userIds: string[]
): Promise<Map<string, EngagementScore>> {
    const result = new Map<string, EngagementScore>()
    const ids = [...new Set(userIds)]
    if (ids.length === 0) return result

    const now = new Date()

    const [
        users,
        policyGroups,
        analysisGroups,
        activeRelationships,
        threadsCreated,
        participantRows,
        proposalRows,
    ] = await Promise.all([
        db.user.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                image: true,
                lastActiveAt: true,
                createdAt: true,
                pushToken: true,
            },
        }),
        db.policy.groupBy({
            by: ["ownerUserId"],
            // Policy.status is an ingestion state nothing recomputes, so
            // requiring exactly 'active' scored a user with three in-force
            // policies stored as 'expiring_soon' / 'action_needed' as having
            // none — and the churn win-back flow keyed off that score.
            where: {
                ownerUserId: { in: ids },
                status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
            },
            _count: { _all: true },
        }),
        db.policyAnalysisRun.groupBy({
            by: ["userId"],
            where: { userId: { in: ids }, status: "completed" },
            _count: { _all: true },
        }),
        db.customerRelationship.findMany({
            where: { policyholderUserId: { in: ids }, status: "active" },
            select: { policyholderUserId: true },
            distinct: ["policyholderUserId"],
        }),
        db.collaborationThread.findMany({
            where: { createdByUserId: { in: ids } },
            select: { id: true, createdByUserId: true },
        }),
        db.collaborationParticipant.findMany({
            where: { userId: { in: ids } },
            select: { threadId: true, userId: true },
        }),
        db.proposal.findMany({
            where: { relationship: { policyholderUserId: { in: ids } } },
            select: { relationshipId: true, relationship: { select: { policyholderUserId: true } } },
            distinct: ["relationshipId"],
        }),
    ])

    const policyCountByUser = new Map(policyGroups.map((g) => [g.ownerUserId, g._count._all]))
    const analysisCountByUser = new Map(analysisGroups.map((g) => [g.userId, g._count._all]))
    const activeAgentUsers = new Set(activeRelationships.map((r) => r.policyholderUserId))
    const usersWithProposals = new Set(proposalRows.map((p) => p.relationship.policyholderUserId))

    // Distinct threads per user across both "created" and "participant" roles —
    // a user who both created and joined the same thread must count it once.
    const threadIdsByUser = new Map<string, Set<string>>()
    const addThread = (userId: string, threadId: string) => {
        let set = threadIdsByUser.get(userId)
        if (!set) { set = new Set(); threadIdsByUser.set(userId, set) }
        set.add(threadId)
    }
    for (const t of threadsCreated) addThread(t.createdByUserId, t.id)
    for (const p of participantRows) addThread(p.userId, p.threadId)

    for (const user of users) {
        const facts: EngagementFacts = {
            lastActive: user.lastActiveAt || user.createdAt,
            name: user.name,
            phoneNumber: user.phoneNumber,
            email: user.email,
            image: user.image,
            pushToken: user.pushToken,
            activePolicies: policyCountByUser.get(user.id) ?? 0,
            completedAnalyses: analysisCountByUser.get(user.id) ?? 0,
            hasActiveAgentConnection: activeAgentUsers.has(user.id),
            threadCount: threadIdsByUser.get(user.id)?.size ?? 0,
            proposalCount: usersWithProposals.has(user.id) ? 1 : 0,
        }
        result.set(user.id, scoreFromFacts(facts, now))
    }

    return result
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

    const scores = await calculateEngagementScoresBatch(users.map((u) => u.id))

    let healthy = 0, atRisk = 0, churning = 0, inactive = 0
    for (const score of scores.values()) {
        switch (score.riskLevel) {
            case "healthy": healthy++; break
            case "at_risk": atRisk++; break
            case "churning": churning++; break
            case "inactive": inactive++; break
        }
    }

    return { total: users.length, healthy, atRisk, churning, inactive }
}
