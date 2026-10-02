import { BenefitCompositionSchema, BenefitRulesSchema } from './contracts'
import { preventionPersonalizationEnabled } from './flag'
import { athensDate } from '@/lib/wellness/nudges'
import { createHash } from 'node:crypto'
import { containsUnreadableMarker } from '@/lib/wallet/unreadable-value'
import { AREA_IDS, areaForLob, type AttentionAreaId } from '@/lib/protection/domains'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { resolvePolicyLifecycle } from '@/lib/policy-status'
import { policyLabel } from '@/lib/wallet/policy-identity'
import type { ExtractionSource } from '@/lib/services/ai/extraction-citations'
import type { Localized, PreventionItem, PreventionPolicy } from './types'

const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 24)
const text = (v: unknown): string => typeof v === 'string' && !containsUnreadableMarker(v) ? v.trim().slice(0, 1500) : ''
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const localized = (v: any): Localized => ({ el: text(v?.el), en: text(v?.en) })
const TERM_KEYS = ['beneficiaries', 'frequency', 'cost', 'limit', 'network', 'waitingPeriod', 'conditions', 'provider', 'tests'] as const
/** An explicit discount beats a model's free-service tag; unlocated free claims stay unresolved. */
function benefitCost(perk: any, source?: ExtractionSource): PreventionItem['costType'] {
    const wording = fold([text(perk?.terms?.cost), text(perk?.description?.el), text(perk?.description?.en), source?.snippet || ''].join(' '))
    if (perk?.perkType === 'discount' || /εκπτωσ|discount|προνομιακ|preferential/.test(wording)) return 'discount'
    const costSource = fold(source?.snippet || '')
    if (perk?.perkType === 'free_service' && source?.verified && /δωρεαν|χωρις (κοστος|χρεωση)|free|no (charge|cost)/.test(costSource)) return 'free_service'
    return 'not_stated'
}

export interface PolicyInput {
    id: string; nickname?: string | null; policyNumber?: string | null; insurerName?: string | null
    lineOfBusiness: string; status: string; endDate?: Date | string | null; acordData: unknown
    documents?: Array<{ id: string; documentHash: string | null; documentKind: string | null }>
}
/** Evidence belongs to the extraction envelope, never the newest document/run by coincidence. */
function evidence(acord: any) {
    return {
        documentId: text(acord?.extraction?.documentId) || null,
        runId: text(acord?.extraction?.analysisRunId) || null,
        extractedAt: text(acord?.extraction?.extractedAt) || null,
    }
}
function safeSource(v: any): ExtractionSource | undefined {
    if (!v || typeof v !== 'object') return undefined
    return { snippet: text(v.snippet) || undefined, page: Number.isInteger(v.page) && v.page > 0 ? v.page : undefined,
        verified: typeof v.verified === 'boolean' ? v.verified : undefined,
        verifiedPage: Number.isInteger(v.verifiedPage) ? v.verifiedPage : undefined }
}
/** Semantic placement is independent of the policy branch. Unknown placement stays with its policy area. */
export function benefitDomains(perk: any, fallback: AttentionAreaId): AttentionAreaId[] {
    const content = fold([perk?.name?.el, perk?.name?.en, perk?.description?.el, perk?.description?.en].filter(Boolean).join(' '))
    const found: AttentionAreaId[] = []
    if (/blood|check up|checkup|medical|health|αιματολογ|εξετασ|υγει|ιατρ/.test(content)) found.push('health')
    if (/leak|home|smoke|διαρρο|κατοικ|πυραν/.test(content)) found.push('residence')
    if (/roadside|vehicle|οδικ|οχημα/.test(content)) found.push('mobility')
    if (/cyber|digital|ψηφιακ|κυβερνο/.test(content)) found.push('lifestyle')
    const suggested = Array.isArray(perk?.preventionDomains) ? perk.preventionDomains.filter((d: any) => AREA_IDS.includes(d)) : []
    // Model tags can suggest placement, never eligibility, cost or an action.
    return [...new Set<AttentionAreaId>(found.length ? found : suggested.length ? suggested : [fallback])]
}
export function resolvePreventionPolicy(policy: PolicyInput, now = new Date()): PreventionPolicy {
    const acord = policy.acordData as any
    const area = areaForLob(normalizeBranch(policy.lineOfBusiness).id)?.id ?? 'lifestyle'
    const provenance = evidence(acord)
    const sources = acord?.extraction?.sources ?? {}
    const parsedComposition = preventionPersonalizationEnabled() ? BenefitCompositionSchema.safeParse(acord?.extraction?.benefitComposition) : null
    const composition = parsedComposition?.success ? parsedComposition.data : null
    // This view describes the documented benefit period, never whether renewal was paid.
    // Keep the shared Athens lifecycle resolver; do not mutate the policy/gap timeline.
    const lifecycle = resolvePolicyLifecycle(composition?.period ? { ...policy, endDate: composition.period.end, acordData: undefined } : policy, now)
    const historical = lifecycle.status === 'expired' || lifecycle.status === 'cancelled'
    // Document membership is checked on every read, including actions and reminder jobs.
    // A removed, replaced or newly attached source requires explicit reanalysis, never a page-load model call.
    const live = policy.documents?.filter(d => !d.documentKind || ['policy_schedule', 'renewal_notice', 'certificate', 'terms_and_conditions'].includes(d.documentKind))
    const sourceChanged = !!composition && !!live && (live.length !== composition.documents.length || composition.documents.some(d => !live.some(l => l.id === d.id && l.documentHash === d.hash)))
    if (sourceChanged) return { id: policy.id, label: policy.nickname || policyLabel(policy), historical, domains: [area], items: [], sourceChanged: true }
    const rawPerks = composition ? composition.benefits.map(b => b.perk) : acord?.perksAndBenefits
    const perks = Array.isArray(rawPerks) ? rawPerks.slice(0, 100) : []
    const items: PreventionItem[] = []
    for (const [index, perk] of perks.entries()) {
        const title = localized(perk?.name)
        if (!title.el && !title.en) continue
        const composite = composition?.benefits[index]
        const ref = composite?.sources.benefit
        const source = ref ? safeSource({ page: ref.page, snippet: ref.snippet, verified: ref.located }) : safeSource(sources[`acordData.perksAndBenefits.${index}`])
        const terms = TERM_KEYS.flatMap(key => {
            const value = text(perk?.terms?.[key])
            const ref = composite?.sources[`terms.${key}`]
            return value ? [{ key, value, source: ref ? safeSource({ page: ref.page, snippet: ref.snippet, verified: ref.located }) : safeSource(sources[`acordData.perksAndBenefits.${index}.terms.${key}`]), evidence: ref }] : []
        })
        if (text(perk?.usageLimit) && !terms.some(t => t.key === 'frequency')) terms.push({ key: 'frequency', value: text(perk.usageLimit), source: undefined, evidence: undefined })
        const domains = benefitDomains(perk, area)
        const identity = [fold(title.el || title.en), fold(text(perk?.terms?.beneficiaries)), fold(text(perk?.terms?.provider))]
        const id = `benefit:${policy.id}:${composite?.key ?? digest(identity)}`
        const parsedRules = BenefitRulesSchema.safeParse(perk.rules)
        const rules = parsedRules.success ? parsedRules.data : undefined
        const year = athensDate(now).slice(0, 4)
        const period = composition && rules?.frequencyBasis === 'insurance_year' ? composition.period : composition && rules?.frequencyBasis === 'calendar_year' ? { key: `calendar:${year}`, start: `${year}-01-01`, end: `${Number(year)+1}-01-01` } : null
        const item: PreventionItem = {
            id, policyId: policy.id, kind: 'benefit', title, description: localized(perk.description), domains,
            state: historical ? 'historical' : composite?.state === 'conflicting' ? 'conflicting' : source?.verified === true && source.snippet ? 'documented' : 'clarify',
            sourceVersion: composition ? digest([composition.sourceVersion, composite?.key, period?.key]) : digest([provenance, perk, source]),
            ...(composition ? { rules, period, periods: rules?.frequencyBasis === 'insurance_year' ? composite?.periods : period ? [period] : [], issues: composition.issues, activationUnconfirmed: true, conditions: composition.conditions, conflicts: composite?.conflicts } : {}), healthRelated: domains.includes('health'),
            costType: benefitCost(perk, source),
            terms, source, ...provenance,
            ...(ref ? { documentId: ref.documentId, runId: ref.runId, extractedAt: composition!.generatedAt } : {}),
            contactPhone: text(perk.contactPhone) || undefined,
            contactUrl: /^https:\/\//.test(text(perk.contactUrl)) ? text(perk.contactUrl) : undefined,
        }
        // Repeated extraction entries do not create repeated rights. Conflicting entries stay review-only.
        const prior = items.find(i => i.id === id)
        if (prior) { if (prior.sourceVersion !== item.sourceVersion) { prior.state = historical ? 'historical' : 'clarify'; prior.terms = []; prior.costType = 'not_stated'; prior.contactPhone = undefined; prior.contactUrl = undefined } }
        else items.push(item)
    }
    // Compatibility bridge: the old check-up remains the SAME progress/reminder record, on any branch.
    if (!composition && acord?.health?.annualCheckupIncluded === true) {
        const source = safeSource(sources['acordData.health.annualCheckupIncluded'])
        const checkup = acord.health.checkup ?? {}
        const terms = ['frequency','limitAmount','tests','network','waitingPeriodDays','conditions'].flatMap(key => {
            const raw = checkup[key]
            const value = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'number' ? String(raw) : text(raw)
            return value ? [{ key, value, source: safeSource(sources[`acordData.health.checkup.${key}`]) }] : []
        })
        const duplicate = items.find(i => /checkup|check up|τσεκ απ/.test(fold(i.title.el + ' ' + i.title.en)))
        if (duplicate) { duplicate.legacyCheckup = true }
        else items.push({ id: `checkup:${policy.id}`, policyId: policy.id, kind: 'benefit', legacyCheckup: true,
            title: { el: 'Παροχή check-up', en: 'Check-up benefit' }, description: { el: 'Δείτε τι αναφέρει το ασφαλιστήριο και πώς ζητείται η παροχή.', en: 'Review what the policy states and how to request the benefit.' },
            domains: ['health'], state: historical ? 'historical' : source?.verified && source.snippet ? 'documented' : 'clarify',
            sourceVersion: digest([provenance, checkup, source]), healthRelated: true, costType: 'not_stated', terms, source, ...provenance })
    }
    return { id: policy.id, label: policy.nickname || policyLabel(policy), historical, items,
        domains: [...new Set<AttentionAreaId>([area, ...items.flatMap(i => i.domains)])] }
}
