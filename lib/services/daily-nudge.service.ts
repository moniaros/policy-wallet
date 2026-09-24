import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { logger } from "@/lib/logger"
import { getTranslations } from "@/lib/i18n"
import { athensDate, nudgeForDate } from "@/lib/wellness/nudges"

/**
 * Prevention brief — ONE general habit nudge a day, by push, and only to a
 * person who turned it on. The same nudge for everyone; nothing personal is
 * read. The person's own outbound switch and monthly ceiling still apply
 * (the dispatcher's cadence gate), and the dedupe key makes a re-run a no-op.
 */
export async function runDailyNudge(now: Date = new Date()): Promise<{ optedIn: number; sent: number; errors: string[] }> {
    const summary = { optedIn: 0, sent: 0, errors: [] as string[] }
    const day = athensDate(now)
    const id = nudgeForDate(now)
    const el = getTranslations("el").wellness
    const en = getTranslations("en").wellness
    try {
        const users = await db.userNotificationSettings.findMany({ where: { dailyNudgeOptIn: true }, select: { userId: true } })
        summary.optedIn = users.length
        for (const { userId } of users) {
            try {
                await emit({
                    event: "daily_nudge",
                    userId,
                    title: { el: el.nudge.pushTitle, en: en.nudge.pushTitle },
                    message: { el: el.nudges[id], en: en.nudges[id] },
                    dedupeKey: `daily_nudge:${day}`,
                })
                summary.sent++
            } catch (err) {
                summary.errors.push(`user ${userId}: ${err}`)
            }
        }
    } catch (err) {
        const msg = `Daily nudge failed: ${err}`
        summary.errors.push(msg)
        logger("error", msg)
    }
    return summary
}
