import { db } from "../db"
import { emit } from "../notifications/dispatch"

/**
 * Achievement definitions for PolicyWallet gamification.
 * Achievements are checked on key events and awarded automatically.
 */

export interface Achievement {
    id: string
    titleEl: string
    titleEn: string
    descriptionEl: string
    descriptionEn: string
    icon: string
    category: "policies" | "analysis" | "social" | "engagement" | "milestone"
}

export const ACHIEVEMENTS: Achievement[] = [
    // Policies
    {
        id: "first_policy",
        titleEl: "Πρώτο Ασφαλιστήριο",
        titleEn: "First Policy",
        descriptionEl: "Ανεβάσατε το πρώτο σας ασφαλιστήριο",
        descriptionEn: "Uploaded your first policy",
        icon: "📋",
        category: "policies",
    },
    {
        id: "policy_collector",
        titleEl: "Συλλέκτης",
        titleEn: "Policy Collector",
        descriptionEl: "5+ ασφαλιστήρια στο wallet σας",
        descriptionEn: "5+ policies in your wallet",
        icon: "🗂️",
        category: "policies",
    },
    {
        id: "full_coverage",
        titleEl: "Πλήρης Κάλυψη",
        titleEn: "Full Coverage",
        descriptionEl: "Μηδέν κρίσιμα κενά κάλυψης",
        descriptionEn: "Zero critical coverage gaps",
        icon: "🛡️",
        category: "policies",
    },
    // Analysis
    {
        id: "ai_explorer",
        titleEl: "AI Explorer",
        titleEn: "AI Explorer",
        descriptionEl: "Τρέξατε 10+ αναλύσεις AI",
        descriptionEn: "Ran 10+ AI analyses",
        icon: "🤖",
        category: "analysis",
    },
    {
        id: "first_analysis",
        titleEl: "Πρώτη Ανάλυση",
        titleEn: "First Analysis",
        descriptionEl: "Ολοκληρώσατε την πρώτη σας AI ανάλυση",
        descriptionEn: "Completed your first AI analysis",
        icon: "🔬",
        category: "analysis",
    },
    {
        id: "gap_hunter",
        titleEl: "Κυνηγός Κενών",
        titleEn: "Gap Hunter",
        descriptionEl: "Αντιμετωπίστηκαν 5+ κενά κάλυψης",
        descriptionEn: "Resolved 5+ coverage gaps",
        icon: "🎯",
        category: "analysis",
    },
    // Social
    {
        id: "agent_connected",
        titleEl: "Συνδεδεμένος",
        titleEn: "Connected",
        descriptionEl: "Συνδεθήκατε με ασφαλιστικό σύμβουλο",
        descriptionEn: "Connected with an insurance advisor",
        icon: "🤝",
        category: "social",
    },
    {
        id: "social_butterfly",
        titleEl: "Κοινωνικός",
        titleEn: "Social Butterfly",
        descriptionEl: "3+ παραπομπές φίλων",
        descriptionEn: "3+ friend referrals",
        icon: "🦋",
        category: "social",
    },
    {
        id: "first_referral",
        titleEl: "Πρώτη Παραπομπή",
        titleEn: "First Referral",
        descriptionEl: "Παραπέμψατε τον πρώτο σας φίλο",
        descriptionEn: "Referred your first friend",
        icon: "💌",
        category: "social",
    },
    // Engagement
    {
        id: "streak_3",
        titleEl: "3 Ημέρες Σερί",
        titleEn: "3-Day Streak",
        descriptionEl: "Ενεργός 3 συνεχόμενες ημέρες",
        descriptionEn: "Active 3 consecutive days",
        icon: "🔥",
        category: "engagement",
    },
    {
        id: "streak_7",
        titleEl: "Εβδομαδιαίο Σερί",
        titleEn: "Weekly Streak",
        descriptionEl: "Ενεργός 7 συνεχόμενες ημέρες",
        descriptionEn: "Active 7 consecutive days",
        icon: "⭐",
        category: "engagement",
    },
    {
        id: "power_user",
        titleEl: "Power User",
        titleEn: "Power User",
        descriptionEl: "Engagement score 80+",
        descriptionEn: "Engagement score 80+",
        icon: "💪",
        category: "engagement",
    },
    // Milestones
    {
        id: "member_30d",
        titleEl: "1 Μήνας Μέλος",
        titleEn: "1 Month Member",
        descriptionEl: "Μέλος για 30 ημέρες",
        descriptionEn: "Member for 30 days",
        icon: "🗓️",
        category: "milestone",
    },
    {
        id: "member_1y",
        titleEl: "Ετήσιο Μέλος",
        titleEn: "1 Year Member",
        descriptionEl: "Μέλος για 1 χρόνο",
        descriptionEn: "Member for 1 year",
        icon: "🎂",
        category: "milestone",
    },
    {
        id: "premium_member",
        titleEl: "Premium Μέλος",
        titleEn: "Premium Member",
        descriptionEl: "Αναβαθμίσατε σε paid plan",
        descriptionEn: "Upgraded to a paid plan",
        icon: "💎",
        category: "milestone",
    },
]

/**
 * Check and award applicable achievements for a user.
 * Returns newly awarded achievement IDs.
 */
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
    const now = new Date()
    const awarded: string[] = []

    // Currently earned. `startsWith` deliberately spans the cutover: rows
    // written before the registry existed carry a per-achievement event type
    // (`achievement_first_policy`), and new ones carry `achievement_unlocked`.
    // Both hold the achievement id in relatedObjectId, so nobody re-earns a
    // badge they already have.
    const existing = await db.notificationEvent.findMany({
        where: {
            userId,
            eventType: { startsWith: "achievement_" },
        },
        select: { relatedObjectId: true },
    })
    const earned = new Set(existing.map((e) => e.relatedObjectId).filter(Boolean))

    // Helper to award if not already earned
    const award = async (id: string) => {
        if (earned.has(id)) return
        const achievement = ACHIEVEMENTS.find((a) => a.id === id)
        if (!achievement) return

        await emit({
            event: "achievement_unlocked",
            userId,
            // These definitions have carried Greek strings all along; the writer
            // only ever used the English ones, so a Greek user — the default —
            // was congratulated in English. The bus resolves to whichever
            // language the recipient actually reads.
            title: { el: `🏆 ${achievement.titleEl}`, en: `🏆 ${achievement.titleEn}` },
            message: { el: achievement.descriptionEl, en: achievement.descriptionEn },
            relatedObjectType: "achievement",
            relatedObjectId: id,
            // One achievement is awarded once, ever. The `earned` set above is
            // the fast path; this is the guarantee.
            dedupeKey: `achievement:${id}`,
        })
        awarded.push(id)
    }

    // Fetch user stats
    const [user, policyCount, analysisCount, resolvedGaps, criticalGaps, agentConn, referrals, subscription] =
        await Promise.all([
            db.user.findUnique({
                where: { id: userId },
                select: { createdAt: true, lastActiveAt: true },
            }),
            db.policy.count({ where: { ownerUserId: userId } }),
            db.policyAnalysisRun.count({ where: { userId, status: "completed" } }),
            db.gapInstance.count({
                // A resolved finding stays resolved for the achievement even after a
                // later run superseded its row (the prior status is kept on the row).
                where: { policy: { ownerUserId: userId }, OR: [{ status: "resolved" }, { priorStatus: "resolved" }] },
            }),
            db.gapInstance.count({
                where: {
                    policy: { ownerUserId: userId },
                    severity: "critical",
                    status: { in: ["open", "detected"] },
                },
            }),
            db.customerRelationship.findFirst({
                where: { policyholderUserId: userId, status: "active" },
                select: { id: true },
            }),
            db.invite.count({ where: { inviterUserId: userId, consumedAt: { not: null } } }),
            db.subscription.findFirst({
                where: { userId, status: "active" },
                include: { plan: true },
            }),
        ])

    if (!user) return awarded

    // Policy achievements
    if (policyCount >= 1) await award("first_policy")
    if (policyCount >= 5) await award("policy_collector")
    if (policyCount >= 1 && criticalGaps === 0) await award("full_coverage")

    // Analysis achievements
    if (analysisCount >= 1) await award("first_analysis")
    if (analysisCount >= 10) await award("ai_explorer")
    if (resolvedGaps >= 5) await award("gap_hunter")

    // Social achievements
    if (agentConn) await award("agent_connected")
    if (referrals >= 1) await award("first_referral")
    if (referrals >= 3) await award("social_butterfly")

    // Milestone achievements
    const daysSinceCreation = Math.floor(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceCreation >= 30) await award("member_30d")
    if (daysSinceCreation >= 365) await award("member_1y")
    if (subscription && Number(subscription.plan.price) > 0) await award("premium_member")

    return awarded
}

/**
 * Get all achievements for a user with locked/unlocked status.
 */
export async function getUserAchievements(userId: string): Promise<
    (Achievement & { unlocked: boolean; unlockedAt: Date | null })[]
> {
    const events = await db.notificationEvent.findMany({
        where: {
            userId,
            eventType: { startsWith: "achievement_" },
        },
        select: { relatedObjectId: true, createdAt: true },
    })

    const unlockedMap = new Map<string, Date>()
    for (const e of events) {
        if (e.relatedObjectId) {
            unlockedMap.set(e.relatedObjectId, e.createdAt)
        }
    }

    return ACHIEVEMENTS.map((a) => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null,
    }))
}
