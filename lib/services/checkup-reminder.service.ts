import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { logger } from "@/lib/logger"
import { getTranslations } from "@/lib/i18n"
import { policyLabel } from "@/lib/wallet/policy-identity"
import { athensDate } from "@/lib/wellness/nudges"

/**
 * Prevention brief P1 — the follow-up the PERSON chose. Daily: every
 * check-up row whose `remindAt` has arrived, not yet reminded, not done and
 * not marked «not relevant», gets one `benefit_reminder` and is stamped.
 *
 * It reads live state, so a changed date or a «done» cancels by
 * construction. The 15 January send to everyone was retired 2026-09-24: a
 * reminder nobody asked for is not the person's choice.
 */
export async function runCheckupReminderScan(now: Date = new Date()): Promise<{ due: number; reminded: number; errors: string[] }> {
    const summary = { due: 0, reminded: 0, errors: [] as string[] }
    const today = new Date(`${athensDate(now)}T00:00:00Z`)
    try {
        const due = await db.healthBenefitUsage.findMany({
            where: {
                benefit: "annual_checkup",
                remindAt: { lte: today },
                remindedAt: null,
                status: { not: "completed" },
                OR: [{ intent: null }, { intent: { not: "not_relevant" } }],
            },
            select: { id: true, userId: true, policyKey: true, remindAt: true },
        })
        summary.due = due.length
        for (const row of due) {
            try {
                const policy = row.policyKey
                    ? await db.policy.findFirst({ where: { id: row.policyKey, ownerUserId: row.userId }, select: { insurerName: true, policyNumber: true } })
                    : null
                const label = policy ? policyLabel(policy) : ""
                const el = getTranslations("el").wellness.benefit
                const en = getTranslations("en").wellness.benefit
                await emit({
                    event: "benefit_reminder",
                    userId: row.userId,
                    title: { el: el.reminderTitle, en: en.reminderTitle },
                    message: { el: el.reminderBody.replace("{label}", label).replace("  ", " "), en: en.reminderBody.replace("{label}", label).replace("  ", " ") },
                    dedupeKey: `benefit_reminder:${row.id}:${row.remindAt!.toISOString().slice(0, 10)}`,
                })
                await db.healthBenefitUsage.update({ where: { id: row.id }, data: { remindedAt: now } })
                summary.reminded++
            } catch (err) {
                summary.errors.push(`row ${row.id}: ${err}`)
            }
        }
    } catch (err) {
        const msg = `Check-up reminder scan failed: ${err}`
        summary.errors.push(msg)
        logger("error", msg)
    }
    return summary
}
