import { preventionPersonalizationEnabled } from './flag'
import type { BenefitUseView } from './types'
import { db } from '@/lib/db'
import { resolvePreventionPolicy } from './benefits'
import { actionsForPolicy } from './catalogue'
import { athensDate } from '@/lib/wellness/nudges'
import { pickCheckupUsage } from '@/lib/wellness/checkup-benefit'
import type { ProgressView } from './types'

export const PREVENTION_POLICY_SELECT = { id: true, nickname: true, policyNumber: true, insurerName: true, lineOfBusiness: true, status: true, endDate: true, acordData: true,
    documents: { where: { supersededById: null }, select: { id: true, documentHash: true, documentKind: true } } } as const
/** Caller supplies the authenticated subject. No agent/grant expansion, no writes and no models. */
export async function loadPreventionHub(userId: string, now = new Date()) {
    const year = Number(athensDate(now).slice(0, 4))
    const personalized = preventionPersonalizationEnabled()
    const [rows, progress, legacy, checkin, benefitUses] = await Promise.all([
        db.policy.findMany({ where: { ownerUserId: userId, status: { not: 'deleted' } }, select: PREVENTION_POLICY_SELECT, orderBy: { createdAt: 'desc' } }),
        db.preventionProgress.findMany({ where: { userId, policy: { ownerUserId: userId, status: { not: 'deleted' } } } }),
        db.healthBenefitUsage.findMany({ where: { userId, benefit: 'annual_checkup', year: { in: [year - 1, year] } } }),
        db.preventionCheckIn.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { answers: true, createdAt: true } }),
        personalized ? db.preventionBenefitUse.findMany({ where: { userId, policy: { ownerUserId: userId, status: { not: 'deleted' } } } }) : Promise.resolve([]),
    ])
    const policies = rows.map(p => resolvePreventionPolicy(p, now))
    const progressViews: ProgressView[] = progress.map(p => ({ itemKey: p.itemKey, status: p.status, remindAt: p.remindAt?.toISOString().slice(0, 10) ?? null, sourceVersion: p.sourceVersion, barrier: p.barrier, helpful: p.helpful, periodKey: p.periodKey, knowsProcedure: p.knowsProcedure, plannedFor: p.plannedFor?.toISOString().slice(0, 10) ?? null }))
    for (const policy of policies) for (const item of policy.items) {
        if (!item.legacyCheckup) continue
        const old = pickCheckupUsage(legacy, policy.id, year)
        if (old) progressViews.push({ itemKey: item.id, status: old.status === 'completed' ? 'done' : old.intent === 'not_relevant' ? 'dismissed' : old.intent === 'later' ? 'later' : old.intent === 'considering' ? 'planned' : 'clear', remindAt: old.remindAt?.toISOString().slice(0, 10) ?? null, sourceVersion: null, barrier: null, helpful: null })
    }
    const uses: BenefitUseView[] = benefitUses.map(u => ({ itemKey: u.itemKey, periodKey: u.periodKey, sourceVersion: u.sourceVersion, status: u.status, usedOn: u.usedOn?.toISOString().slice(0,10) ?? null }))
    return { today: athensDate(now), personalized, uses, legacyUsageUnknown: personalized && legacy.length > 0, policies, actions: policies.flatMap(actionsForPolicy), progress: progressViews,
        checkin: checkin ? { answers: checkin.answers as Record<string, unknown>, createdAt: checkin.createdAt.toISOString() } : null }
}
