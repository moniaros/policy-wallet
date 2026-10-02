import { createHash } from 'node:crypto'
import { parseDocumentDate, toIsoDateString } from '@/lib/dates/document-date'
import { displayPolicyNumber, displayInsurerName } from '@/lib/wallet/policy-identity'
import { BenefitContractSchema, BenefitRulesSchema, type BenefitComposition, type ContractIssue, type EvidenceRef } from './contracts'
import type { AIPolicyExtractionResponse } from '@/lib/services/ai/ai-service.interface'

export interface ContractDocument {
    id: string; hash: string; kind: string; extraction: AIPolicyExtractionResponse
    runId: string | null; quality?: Omit<BenefitComposition['documents'][number], 'id' | 'hash' | 'kind' | 'status'>
    verification?: 'agreed' | 'needs_review' | 'unavailable'
}
const fold = (value: unknown) => typeof value === 'string' ? value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') : ''
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)
const date = (value: string) => toIsoDateString(parseDocumentDate(value))
function source(doc: ContractDocument, path: string): EvidenceRef | undefined {
    const found = doc.extraction.acordData?.extraction?.sources?.[path]
    if (!found?.snippet || !Number.isInteger(found.verifiedPage ?? found.page) || (found.verifiedPage ?? found.page) < 1) return undefined
    return { documentId: doc.id, documentHash: doc.hash, runId: doc.runId, page: found.verifiedPage ?? found.page, snippet: String(found.snippet).slice(0, 1500), located: found.verified }
}
function identity(doc: ContractDocument) {
    return [fold(displayInsurerName(doc.extraction.insurerName)), fold(displayPolicyNumber(doc.extraction.policyNumber)), fold(doc.extraction.acordData?.benefitContract?.insuredName)]
}

/** Compose facts, never eligibility. Missing or conflicting identity prevents inheritance. */
export function composeBenefits(input: ContractDocument[], now = new Date()): BenefitComposition {
    const docs = [...input].sort((a, b) => (date(a.extraction.startDate) ?? '').localeCompare(date(b.extraction.startDate) ?? '') || a.id.localeCompare(b.id))
    const anchor = [...docs].reverse().find(d => ['policy_schedule', 'renewal_notice', 'certificate'].includes(d.kind)) ?? docs.at(-1)
    const issues = new Set<ContractIssue>()
    const benefits = new Map<string, BenefitComposition['benefits'][number]>()
    const conditions: BenefitComposition['conditions'] = []
    const documents: BenefitComposition['documents'] = []
    let priorEnd: string | null = null
    if (!docs.some(d => d.kind === 'policy_schedule')) issues.add('missing_original')
    const anchorIdentity = anchor ? identity(anchor) : []
    for (const doc of docs) {
        const ids = identity(doc)
        const complete = ids.every(Boolean) && anchorIdentity.every(Boolean)
        const conflict = ids.some((v, i) => v && anchorIdentity[i] && v !== anchorIdentity[i])
        const matches = !conflict && complete
        if (conflict) issues.add('identity_conflict')
        else if (!complete) issues.add('identity_unconfirmed')
        const included = doc.id === anchor?.id || matches
        documents.push({ id: doc.id, hash: doc.hash, kind: doc.kind, status: included && matches ? 'included' : 'review', ...doc.quality })
        if (!included || conflict) continue
        const start = date(doc.extraction.startDate), end = date(doc.extraction.endDate)
        if (!start || !end || start >= end) issues.add('undated_document')
        if (start && priorEnd && new Date(start).getTime() - new Date(priorEnd).getTime() > 86_400_000) issues.add('missing_period')
        if (end) priorEnd = end
        if (doc.quality?.truncated || doc.quality?.failedPages?.length || doc.quality?.unreportedPages?.length) issues.add('partial_read')
        if (!doc.verification || doc.verification === 'unavailable') issues.add('verification_unavailable')
        if (doc.verification === 'needs_review') issues.add('verification_disagreed')
        const contract = BenefitContractSchema.safeParse(doc.extraction.acordData?.benefitContract)
        const changes = contract.success ? contract.data.changes ?? [] : []
        for (const [i, change] of changes.entries()) {
            const ref = source(doc, `acordData.benefitContract.changes.${i}`)
            if (!change.fullWordingIncluded || !ref) issues.add('missing_amendment')
            conditions.push({ text: change.text, source: ref })
            if (change.operation === 'remove' && change.code && change.code !== 'other' && change.fullWordingIncluded && ref?.located === true) {
                for (const [key, item] of benefits) if ((item.perk.rules as BenefitRulesSchemaType | undefined)?.code === change.code) benefits.delete(key)
            }
        }
        for (const [i, text] of (contract.success ? contract.data.specialConditions ?? [] : []).entries()) conditions.push({ text, source: source(doc, `acordData.benefitContract.specialConditions.${i}`) })
        const perks = doc.extraction.acordData?.perksAndBenefits
        for (const [index, perk] of (Array.isArray(perks) ? perks.slice(0, 100) : []).entries()) {
            if (!perk || typeof perk !== 'object' || !perk.name) continue
            const rules = BenefitRulesSchema.safeParse(perk.rules)
            const code = rules.success && rules.data.code !== 'other' ? rules.data.code : fold(perk.name.el || perk.name.en)
            if (!code) continue
            const key = hash([code, fold(perk.terms?.beneficiaries)])
            const refs: Record<string, EvidenceRef> = {}
            for (const field of ['', 'rules', ...Object.keys(perk.terms ?? {}).map(k => `terms.${k}`)]) {
                const ref = source(doc, `acordData.perksAndBenefits.${index}${field ? '.' + field : ''}`)
                if (ref) refs[field || 'benefit'] = ref
            }
            const prior = benefits.get(key)
            const item: BenefitComposition['benefits'][number] = { key, perk, sources: refs, state: refs.benefit?.located === true ? 'documented' : 'clarify' }
            if (!refs.benefit) issues.add('source_missing')
            if (prior) {
                const explicitReplacement = changes.some((c, i) => c.code === code && c.operation === 'replace' && c.fullWordingIncluded && source(doc, `acordData.benefitContract.changes.${i}`)?.located === true)
                const oldTerms = prior.perk.terms as Record<string, unknown> | undefined
                const newTerms = perk.terms as Record<string, unknown> | undefined
                const conflicts = Object.keys(newTerms ?? {}).filter(k => oldTerms?.[k] != null && fold(oldTerms[k]) !== fold(newTerms![k]))
                item.conflicts = explicitReplacement ? [] : [...(prior.conflicts ?? []), ...conflicts.map(k => ({ field: k, priorValue: String(oldTerms![k]), currentValue: String(newTerms![k]), priorSource: prior.sources[`terms.${k}`], currentSource: refs[`terms.${k}`] }))]
                if (item.conflicts.length) { item.state = 'conflicting'; issues.add('conflicting_terms') }
                item.perk = { ...prior.perk, ...perk, terms: { ...oldTerms, ...newTerms } }
                item.sources = { ...prior.sources, ...refs }
                item.periods = prior.periods
            }
            benefits.set(key, item)
        }
        if (start && end && start < end && ['policy_schedule', 'renewal_notice', 'certificate'].includes(doc.kind)) {
            for (const item of benefits.values()) {
                const period = { key: `${start}/${end}`, start, end }
                item.periods = [...(item.periods ?? []).filter(p => p.key !== period.key), period]
            }
        }
    }
    const start = anchor && date(anchor.extraction.startDate), end = anchor && date(anchor.extraction.endDate)
    const period = start && end && start < end ? { start, end, key: `${start}/${end}` } : null
    const sourceVersion = hash(docs.map(d => [d.id, d.hash, d.extraction.startDate, d.extraction.endDate, d.extraction.acordData?.perksAndBenefits, d.extraction.acordData?.benefitContract, d.extraction.acordData?.extraction?.sources, d.verification]))
    return { version: '1', sourceVersion, generatedAt: now.toISOString(), period, activation: 'unconfirmed', issues: [...issues], documents, benefits: [...benefits.values()], conditions }
}
type BenefitRulesSchemaType = { code: string }
