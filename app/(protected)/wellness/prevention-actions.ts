"use server"
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { getPolicyAccess } from '@/lib/policy-access'
import { db } from '@/lib/db'
import { preventionHubEnabled, preventionPersonalizationEnabled } from '@/lib/prevention/flag'
import { resolvePreventionPolicy } from '@/lib/prevention/benefits'
import { actionsForPolicy } from '@/lib/prevention/catalogue'
import { PREVENTION_POLICY_SELECT } from '@/lib/prevention/service'
import { ProgressInput, CheckInInput, BenefitUseInput, validReminderDate } from '@/lib/prevention/input'
import { HEALTH_PROGRESS_CONSENT } from '@/lib/prevention/types'
import { reminderWindow } from '@/lib/wellness/checkup-benefit'
import { athensDate } from '@/lib/wellness/nudges'
import { setCheckupIntent } from './actions'

export async function savePreventionProgress(input: unknown) {
    const { dbUser } = await getAuthenticatedUser()
    if (!preventionHubEnabled()) return { error: 'DISABLED' as const }
    const parsed = ProgressInput.safeParse(input)
    if (!parsed.success) return { error: 'INVALID' as const }
    const data = parsed.data
    const access = await getPolicyAccess(data.policyId, { id: dbUser.id, roles: dbUser.roles })
    if (!access.exists || !access.isOwner) return { error: 'NOT_FOUND' as const }
    const row = await db.policy.findFirst({ where: { id: data.policyId, ownerUserId: dbUser.id, status: { notIn: ['deleted', 'analyzing'] } }, select: PREVENTION_POLICY_SELECT })
    if (!row) return { error: 'NOT_FOUND' as const }
    const policy = resolvePreventionPolicy(row)
    const item = [...policy.items, ...actionsForPolicy(policy)].find(i => i.id === data.itemKey)
    if (!item || policy.historical) return { error: 'NOT_AVAILABLE' as const }
    if (item.sourceVersion !== data.sourceVersion) return { error: 'SOURCE_CHANGED' as const }
    if (item.healthRelated && data.healthConsent !== true && data.choice !== 'clear') return { error: 'CONSENT_REQUIRED' as const }
    if (data.plannedFor && !validReminderDate(data.plannedFor, reminderWindow())) return { error: 'INVALID_DATE' as const }
    if (data.remindAt && !validReminderDate(data.remindAt, reminderWindow())) return { error: 'INVALID_DATE' as const }
    if (item.legacyCheckup) {
        // The old table is canonical: no migration copies, no second reminder emitter.
        const choice = { planned: 'considering', done: 'done', later: 'later', dismissed: 'not_relevant', clear: 'clear' } as const
        return setCheckupIntent({ policyId: policy.id, choice: choice[data.choice], ...(data.remindAt ? { remindAt: data.remindAt } : {}) })
    }
    if (data.choice === 'clear') await db.preventionProgress.deleteMany({ where: { userId: dbUser.id, itemKey: item.id } })
    else {
        const fields = { policyId: policy.id, sourceVersion: item.sourceVersion, status: data.choice,
            consentVersion: item.healthRelated ? HEALTH_PROGRESS_CONSENT : null,
            remindAt: data.choice === 'later' || data.choice === 'planned' ? data.remindAt ? new Date(`${data.remindAt}T00:00:00Z`) : null : null,
            remindedAt: null, completedAt: data.choice === 'done' ? new Date() : null,
            barrier: data.barrier ?? null, helpful: data.helpful ?? null,
            ...(preventionPersonalizationEnabled() ? { periodKey: item.period?.key ?? null, knowsProcedure: data.knowsProcedure ?? null, plannedFor: data.plannedFor ? new Date(`${data.plannedFor}T00:00:00Z`) : null } : {}) }
        if (preventionPersonalizationEnabled() && item.rules?.code === 'annual_checkup') {
            // Explicitly choosing a new plan cancels the old emitter, but keeps its sent history.
            await db.$transaction(async tx => {
                await tx.healthBenefitUsage.updateMany({ where: { userId: dbUser.id, policyKey: policy.id, benefit: 'annual_checkup' }, data: { remindAt: null } })
                const delivered = fields.remindAt ? await tx.healthBenefitUsage.findFirst({ where: { userId: dbUser.id, policyKey: policy.id, benefit: 'annual_checkup', remindedAt: { not: null } }, orderBy: { remindedAt: 'desc' }, select: { remindedAt: true } }) : null
                const remindedAt = delivered?.remindedAt && athensDate(delivered.remindedAt) === data.remindAt ? delivered.remindedAt : null
                await tx.preventionProgress.upsert({ where: { userId_itemKey: { userId: dbUser.id, itemKey: item.id } }, create: { userId: dbUser.id, itemKey: item.id, ...fields, remindedAt }, update: { ...fields, remindedAt } })
            })
        } else await db.preventionProgress.upsert({ where: { userId_itemKey: { userId: dbUser.id, itemKey: item.id } }, create: { userId: dbUser.id, itemKey: item.id, ...fields }, update: fields })
    }
    revalidatePath('/wellness')
    return { ok: true as const }
}
export async function savePreventionCheckIn(input: unknown) {
    const { dbUser } = await getAuthenticatedUser()
    if (!preventionHubEnabled()) return { error: 'DISABLED' as const }
    const parsed = CheckInInput.safeParse(input)
    if (!parsed.success) return { error: 'INVALID' as const }
    await db.preventionCheckIn.create({ data: { userId: dbUser.id, consentVersion: HEALTH_PROGRESS_CONSENT, answers: parsed.data.answers } })
    revalidatePath('/wellness')
    return { ok: true as const }
}
export async function deletePreventionData() {
    const { dbUser } = await getAuthenticatedUser()
    await db.$transaction([
        db.preventionBenefitUse.deleteMany({ where: { userId: dbUser.id } }),
        db.preventionProgress.deleteMany({ where: { userId: dbUser.id } }),
        db.preventionCheckIn.deleteMany({ where: { userId: dbUser.id } }),
        db.healthBenefitUsage.deleteMany({ where: { userId: dbUser.id } }),
        db.healthRiskAssessment.deleteMany({ where: { userId: dbUser.id } }),
        db.healthShare.updateMany({ where: { userId: dbUser.id }, data: { status: 'revoked', snapshot: Prisma.DbNull, revokedAt: new Date() } }),
    ])
    revalidatePath('/wellness')
    return { ok: true as const }
}

export async function savePreventionBenefitUse(input: unknown) {
    const { dbUser } = await getAuthenticatedUser()
    if (!preventionPersonalizationEnabled()) return { error: 'DISABLED' as const }
    const parsed = BenefitUseInput.safeParse(input)
    if (!parsed.success) return { error: 'INVALID' as const }
    const data = parsed.data
    const access = await getPolicyAccess(data.policyId, { id: dbUser.id, roles: dbUser.roles })
    if (!access.exists || !access.isOwner) return { error: 'NOT_FOUND' as const }
    const row = await db.policy.findFirst({ where: { id: data.policyId, ownerUserId: dbUser.id, status: { notIn: ['deleted', 'analyzing'] } }, select: PREVENTION_POLICY_SELECT })
    if (!row) return { error: 'NOT_FOUND' as const }
    const item = resolvePreventionPolicy(row).items.find(i => i.id === data.itemKey)
    if (!item?.period || item.kind !== 'benefit' || item.state === 'historical') return { error: 'NOT_AVAILABLE' as const }
    const period = (item.periods?.length ? item.periods : [item.period]).find(p => p.key === data.periodKey)
    if (item.sourceVersion !== data.sourceVersion || !period) return { error: 'SOURCE_CHANGED' as const }
    if (item.healthRelated && data.healthConsent !== true && data.status !== 'clear') return { error: 'CONSENT_REQUIRED' as const }
    const today = athensDate(new Date())
    if (data.status === 'used' && period.start > today) return { error: 'INVALID_DATE' as const }
    if (data.usedOn && (data.status !== 'used' || data.usedOn >= period.end || !validReminderDate(data.usedOn, { min: period.start, max: today }))) return { error: 'INVALID_DATE' as const }
    const key = { userId: dbUser.id, itemKey: item.id, periodKey: period.key }
    if (data.status === 'clear') await db.preventionBenefitUse.deleteMany({ where: key })
    else {
        const values = { policyId: item.policyId, sourceVersion: item.sourceVersion, status: data.status, usedOn: data.usedOn ? new Date(`${data.usedOn}T00:00:00Z`) : null, consentVersion: item.healthRelated ? HEALTH_PROGRESS_CONSENT : null }
        await db.preventionBenefitUse.upsert({ where: { userId_itemKey_periodKey: key }, create: { ...key, ...values }, update: values })
    }
    revalidatePath('/wellness')
    return { ok: true as const }
}
