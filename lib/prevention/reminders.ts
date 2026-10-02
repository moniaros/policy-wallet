import { db } from '@/lib/db'
import { emit } from '@/lib/notifications/dispatch'
import { preventionHubEnabled } from './flag'
import { athensDate } from '@/lib/wellness/nudges'
import { resolvePreventionPolicy } from './benefits'
import { actionsForPolicy } from './catalogue'
import { PREVENTION_POLICY_SELECT } from './service'
import { HEALTH_PROGRESS_CONSENT } from './types'

export async function runPreventionReminders(now = new Date()) {
    const result = { due: 0, reminded: 0, cancelled: 0, failed: 0 }
    if (!preventionHubEnabled()) return result
    const due = await db.preventionProgress.findMany({ where: { remindAt: { lte: new Date(`${athensDate(now)}T00:00:00Z`) }, remindedAt: null, status: { in: ['planned', 'later'] } }, take: 200, orderBy: { remindAt: 'asc' } })
    result.due = due.length
    for (const row of due) {
        try {
            const source = await db.policy.findFirst({ where: { id: row.policyId, ownerUserId: row.userId, status: { notIn: ['deleted','analyzing'] } }, select: PREVENTION_POLICY_SELECT })
            const policy = source ? resolvePreventionPolicy(source, now) : null
            const item = policy ? [...policy.items, ...actionsForPolicy(policy)].find(i => i.id === row.itemKey) : null
            const current = { id: row.id, updatedAt: row.updatedAt, remindAt: row.remindAt, remindedAt: null }
            if (!policy || policy.historical || !item || item.legacyCheckup || item.sourceVersion !== row.sourceVersion || (row.periodKey && row.periodKey !== item.period?.key) || (item.healthRelated && row.consentVersion !== HEALTH_PROGRESS_CONSENT)) {
                await db.preventionProgress.updateMany({ where: current, data: { remindAt: null } }); result.cancelled++; continue
            }
            // Conditional row lock + transaction serialises overlapping scans and user cancellation.
            await db.$transaction(async tx => {
                const claimed = await tx.preventionProgress.updateMany({ where: current, data: { remindedAt: now } })
                if (!claimed.count) return
                const sent = await emit({ event: 'prevention_reminder', userId: row.userId,
                    title: { el: 'Το μικρό βήμα που επιλέξατε', en: 'The small step you chose' },
                    message: { el: 'Ζητήσατε μια υπενθύμιση. Δείτε την επιλογή σας στην ενότητα Πρόληψη & παροχές.', en: 'You asked for a reminder. Review your choice in Prevention & benefits.' },
                    relatedObjectType: 'prevention', relatedObjectId: row.itemKey,
                    dedupeKey: `prevention:${row.id}:${row.remindAt!.toISOString().slice(0,10)}` })
                if (!sent.written && !sent.deduped) throw new Error('delivery_not_recorded')
                result.reminded++
            }, { timeout: 30000 })
        } catch { result.failed++ }
    }
    return result
}
