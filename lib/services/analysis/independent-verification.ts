import { logger } from '@/lib/logger'
import type { AIPolicyExtractionResponse, AITokenUsage } from '../ai/ai-service.interface'
import type { ValidatedAIDocument } from '@/lib/ingestion/validated-document'
import type { AIServiceType } from '../ai/ai-service.factory'
import { displayPolicyNumber, displayInsurerName } from '@/lib/wallet/policy-identity'
import { isUnreadableValue } from '@/lib/wallet/unreadable-value'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { parseDocumentDate, toIsoDateString } from '@/lib/dates/document-date'

export const CONSEQUENTIAL_FIELDS = ['insurerName', 'policyNumber', 'lineOfBusiness', 'startDate', 'endDate', 'premiumAmount'] as const
export type VerificationField = typeof CONSEQUENTIAL_FIELDS[number]
export type IndependentVerification = {
    version: '1'; status: 'agreed' | 'needs_review' | 'unavailable'; checkedAt: string;
    fields: Partial<Record<VerificationField, 'agreed' | 'disagreed' | 'missing'>>;
    provider?: string; model?: string; reason?: string;
    benefits?: Record<string, 'agreed' | 'disagreed' | 'missing'>;
    /** Agreement is not measured accuracy or human confirmation. */
    humanConfirmed: false;
}
function value(extraction: AIPolicyExtractionResponse, field: VerificationField): string | null {
    if (extraction.extractionMeta?.missingCriticalFields.includes(field)) return null
    if (field === 'premiumAmount') return Number.isFinite(extraction.premiumAmount) && extraction.premiumAmount >= 0 ? extraction.premiumAmount.toFixed(2) : null
    const raw = field === 'policyNumber' ? displayPolicyNumber(extraction.policyNumber) : field === 'insurerName' ? displayInsurerName(extraction.insurerName) : extraction[field]
    if (!raw || isUnreadableValue(raw)) return null
    if (field === 'startDate' || field === 'endDate') return toIsoDateString(parseDocumentDate(raw))
    if (field === 'lineOfBusiness') return normalizeBranch(raw).id
    return raw.normalize('NFKC').trim().toLocaleLowerCase('el-GR').replace(/\s+/g, ' ')
}
export function compareExtractions(first: AIPolicyExtractionResponse, second: AIPolicyExtractionResponse): IndependentVerification['fields'] {
    return Object.fromEntries(CONSEQUENTIAL_FIELDS.map(field => {
        const a = value(first, field), b = value(second, field)
        return [field, a === null || b === null ? 'missing' : a === b ? 'agreed' : 'disagreed']
    }))
}

/** One bounded second reading; never replaces the primary facts or creates a finding. */
export async function independentlyVerify(input: { document: ValidatedAIDocument; extraction: AIPolicyExtractionResponse; primaryProvider: AIServiceType; userId: string; ownerUserId: string; policyId: string; providerAllowed: boolean; includeBenefits?: boolean }): Promise<{ result: IndependentVerification; usage?: AITokenUsage }> {
    const base = { version: '1' as const, checkedAt: new Date().toISOString(), fields: {}, humanConfirmed: false as const }
    const unavailable = (reason: string) => ({ result: { ...base, status: 'unavailable' as const, reason } })
    const requested = process.env.AGENT_VERIFICATION_PROVIDER
    if (!input.providerAllowed) return unavailable('provider_not_authorized')
    if (!requested || !['gemini', 'openai', 'anthropic'].includes(requested) || requested === input.primaryProvider) return unavailable('independent_provider_unavailable')
    const { db } = await import('@/lib/db')
    const subjects = await db.user.findMany({ where: { id: { in: [...new Set([input.userId, input.ownerUserId])] } }, select: { id: true, aiProcessingConsentVersion: true } })
    if (subjects.length !== new Set([input.userId, input.ownerUserId]).size || subjects.some(s => !s.aiProcessingConsentVersion)) return unavailable('consent_required')
    const { getAIService } = await import('../ai/ai-service.factory')
    const service = getAIService(requested as AIServiceType)
    if (!service.isAvailable()) return unavailable('independent_provider_unavailable')
    const { reserveTokens, releaseTokenReservation } = await import('@/lib/token-tracking')
    const reservation = 102_000 // Conservative bounded document extraction estimate, separate from the primary run.
    const gate = await reserveTokens(input.userId, reservation)
    if (!gate.allowed) return unavailable('quota_required')
    try {
        // The second reader gets the original, not the first model's answer.
        const second = await service.extractPolicyData(input.document, { userId: input.userId, policyId: input.policyId, provider: requested as AIServiceType, maxOutputTokens: 6000 })
        const fields = compareExtractions(input.extraction, second)
        const benefits = input.includeBenefits ? compareBenefitExtractions(input.extraction, second) : undefined
        return { result: { ...base, fields, ...(benefits ? { benefits } : {}), status: [...Object.values(fields), ...Object.values(benefits ?? {})].every(v => v === 'agreed') ? 'agreed' : 'needs_review', provider: requested, model: second.usage?.model }, usage: second.usage }
    } catch { return unavailable('provider_failed') }
    finally {
        if (gate.source === 'subscription') await releaseTokenReservation(input.userId, reservation).catch(() => logger('error', 'agent_verification_reservation_release_failed', { userId: input.userId }))
    }
}

/** Compare independent readings of benefit identity and consequential terms, never model confidence. */
export function compareBenefitExtractions(first: AIPolicyExtractionResponse, second: AIPolicyExtractionResponse): Record<string, 'agreed' | 'disagreed' | 'missing'> {
    const normalize = (v: unknown) => JSON.stringify(v ?? null).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, '')
    const items = (e: AIPolicyExtractionResponse) => Array.isArray(e.acordData?.perksAndBenefits) ? e.acordData.perksAndBenefits : []
    const a = items(first), b = items(second)
    const result: Record<string, 'agreed' | 'disagreed' | 'missing'> = { count: a.length === b.length ? 'agreed' : 'disagreed' }
    a.forEach((perk: any, index: number) => {
        const key = perk.rules?.code && perk.rules.code !== 'other' ? perk.rules.code : normalize(perk.name?.el || perk.name?.en)
        const matches = b.filter((p: any) => (p.rules?.code && p.rules.code !== 'other' ? p.rules.code : normalize(p.name?.el || p.name?.en)) === key)
        const other = matches.length === 1 ? matches[0] : undefined
        for (const field of ['beneficiaries', 'cost', 'limit', 'frequency', 'network', 'waitingPeriod', 'conditions', 'tests']) {
            const left = perk.terms?.[field], right = other?.terms?.[field]
            if (left == null && right == null) continue
            result[`${index}.${field}`] = left == null || right == null ? 'missing' : normalize(left) === normalize(right) ? 'agreed' : 'disagreed'
        }
        result[`${index}.rules`] = !other ? 'missing' : normalize(perk.rules) === normalize(other.rules) ? 'agreed' : 'disagreed'
    })
    return result
}
