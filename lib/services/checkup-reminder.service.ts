import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { logger } from "@/lib/logger"
import { NON_LIVE_POLICY_STATUSES, resolvePolicyLifecycle } from "@/lib/policy-status"
import { INSURANCE_BRANCHES, branchFamilyId } from "@/lib/insurance/taxonomy"

const HEALTH_FAMILY_IDS: readonly string[] = INSURANCE_BRANCHES.map((b) => b.id).filter((id) => branchFamilyId(id) === "health")

/**
 * Spec v2 §14 BENEFIT_REMINDER: once a year, the owner of an in-force health
 * policy whose reading STATES an annual check-up, and who has not marked this
 * year's as done, is reminded. One per owner per year; silence in the
 * extraction sends nothing.
 */
export async function runCheckupReminderScan(now: Date = new Date()): Promise<{ policiesScanned: number; ownersNotified: number; errors: string[] }> {
    const summary = { policiesScanned: 0, ownersNotified: 0, errors: [] as string[] }
    const year = now.getFullYear()
    try {
        const policies = await db.policy.findMany({
            where: { status: { notIn: [...NON_LIVE_POLICY_STATUSES] }, lineOfBusiness: { in: [...HEALTH_FAMILY_IDS] } },
            select: { id: true, ownerUserId: true, lineOfBusiness: true, endDate: true, coverageEndDate: true, acordData: true },
        })
        summary.policiesScanned = policies.length
        const candidates = new Set<string>()
        for (const p of policies) {
            if ((p.acordData as any)?.health?.annualCheckupIncluded !== true) continue
            const l = resolvePolicyLifecycle(p as any, now)
            if (l.daysUntilExpiry !== null && l.daysUntilExpiry < 0) continue
            candidates.add(p.ownerUserId)
        }
        if (candidates.size === 0) return summary
        const done = await db.healthBenefitUsage.findMany({
            where: { userId: { in: [...candidates] }, benefit: "annual_checkup", year, status: "completed" },
            select: { userId: true },
        })
        const doneUsers = new Set(done.map((d) => d.userId))
        for (const userId of candidates) {
            if (doneUsers.has(userId)) continue
            await emit({
                event: "benefit_reminder",
                userId,
                title: { el: "Ο ετήσιος έλεγχος υγείας σας είναι διαθέσιμος", en: "Your annual health check-up is available" },
                message: {
                    el: "Το ασφαλιστήριο υγείας σας καταγράφει ετήσιο έλεγχο. Αν δεν τον έχετε κάνει φέτος, δείτε πώς κλείνετε ραντεβού στη σελίδα Ευεξία.",
                    en: "Your health policy records an annual check-up. If you have not used it this year, see how to book on the Wellness page.",
                },
                dedupeKey: `benefit_reminder:annual_checkup:${year}:${userId}`,
            })
            summary.ownersNotified++
        }
    } catch (err) {
        const msg = `Check-up reminder scan failed: ${err}`
        summary.errors.push(msg)
        logger("error", msg)
    }
    return summary
}
