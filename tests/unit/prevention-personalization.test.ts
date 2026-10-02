import { beforeEach, expect, it, vi } from 'vitest'
import { composeBenefits, type ContractDocument } from '@/lib/prevention/compose'
import { resolvePreventionPolicy } from '@/lib/prevention/benefits'
import { chooseNextStep } from '@/lib/prevention/personalization'
import { compareBenefitExtractions } from '@/lib/services/analysis/independent-verification'
import { verifyExtractionSources } from '@/lib/services/ai/extraction-citations'

// Synthetic identities; terms are independently checked against the supplied pair (PDF pp. 7, 53–55; renewal pp. 1–4).
const checkup = { perkType: 'prevention', name: { el: 'Προληπτικός έλεγχος', en: 'Annual check-up' }, description: { el: 'Μία φορά ανά ασφαλιστικό έτος.', en: 'Once per insurance year.' }, rules: { code: 'annual_checkup', frequencyBasis: 'insurance_year', usesPerPeriod: 1, exclusiveWith: ['prenatal_checkup'] }, terms: { beneficiaries: 'Insured A', frequency: 'Once per insurance year', network: 'Network A', conditions: 'Contact coordination centre; ID required' } }
const original: ContractDocument = { id: 'base', hash: 'hash-base', kind: 'policy_schedule', runId: 'r', verification: 'agreed', extraction: {
    insurerName: 'Demo insurer', policyNumber: 'DEMO-123', lineOfBusiness: 'health', startDate: '2024-05-22', endDate: '2025-05-22', premiumAmount: 100, coverageSummary: '',
    acordData: { benefitContract: { insuredName: 'Insured A', specialConditions: ['USA hospital expenses: additional 10% contribution'] }, perksAndBenefits: [checkup, { ...checkup, name: { el: 'Διαγνωστικές εξετάσεις', en: 'Diagnostic examinations' }, rules: { code: 'diagnostic_examinations', frequencyBasis: 'insurance_year', referralValidityDays: 30 }, terms: { beneficiaries: 'Insured A', limit: 'EUR 2000', cost: '0%', conditions: 'Medically necessary; valid referral' } }], extraction: { sources: { 'acordData.perksAndBenefits.0': { page: 7, snippet: 'Check-up YES', verified: true }, 'acordData.perksAndBenefits.0.terms.frequency': { page: 53, snippet: 'Once per insurance year', verified: true }, 'acordData.perksAndBenefits.1': { page: 7, snippet: 'Diagnostic examinations EUR 2000', verified: true }, 'acordData.benefitContract.specialConditions.0': { page: 15, snippet: 'additional 10%', verified: true } } } },
} }
const renewal: ContractDocument = { ...original, id: 'renewal', hash: 'hash-renewal', kind: 'renewal_notice', extraction: { ...original.extraction, startDate: '2026-05-22', endDate: '2027-05-22', acordData: { benefitContract: { insuredName: 'Insured A', paymentRequired: true, changes: [{ scope: 'Hospital waiting period after deductible change', operation: 'clarify', fullWordingIncluded: false, text: 'Revised terms referenced externally' }] }, perksAndBenefits: [], extraction: { sources: { 'acordData.benefitContract.changes.0': { page: 3, snippet: 'Revised terms', verified: true } } } } } }
const now = new Date('2026-10-02T10:00:00Z')
beforeEach(() => { vi.stubEnv('PREVENTION_HUB_ENABLED', '1'); vi.stubEnv('PREVENTION_PERSONALIZATION_ENABLED', '1') })
const compose = () => composeBenefits([renewal, original], now)
const items = () => resolvePreventionPolicy({ id: 'p', lineOfBusiness: 'health', status: 'active', endDate: '2027-05-22', acordData: { extraction: { benefitComposition: compose() } } }, now).items

it('preserves unmentioned benefits, distinguishes diagnostics, and retains special conditions', () => {
    const result = compose()
    expect(result.benefits).toHaveLength(2)
    expect(result.benefits[0].perk.rules).toMatchObject({ code: 'annual_checkup', exclusiveWith: ['prenatal_checkup'] })
    expect(result.benefits[1].perk.terms).toMatchObject({ limit: 'EUR 2000', cost: '0%' })
    expect(result.benefits[0].sources['terms.frequency']).toMatchObject({ documentId: 'base', page: 53 })
    expect(result.conditions.some(c => c.text.includes('additional 10%'))).toBe(true)
})
it('reports a missing intermediate period and incomplete amendment, without inferring a coverage lapse or payment', () => {
    expect(compose()).toMatchObject({ activation: 'unconfirmed', period: { key: '2026-05-22/2027-05-22' }, issues: expect.arrayContaining(['missing_period', 'missing_amendment']) })
})
it.each(['insurerName', 'policyNumber'])('does not inherit across conflicting %s', field => {
    const changed = structuredClone(original); (changed.extraction as any)[field] = 'Other'
    const result = composeBenefits([changed, renewal], now)
    expect(result.benefits).toHaveLength(0); expect(result.issues).toContain('identity_conflict')
})
it('does not assume the policyholder is the insured when identity is absent', () => {
    const changed = structuredClone(original); delete changed.extraction.acordData.benefitContract.insuredName
    const result = composeBenefits([changed, renewal], now)
    expect(result.benefits).toHaveLength(0); expect(result.issues).toContain('identity_unconfirmed')
})
it('conflicting terms require review and unrelated hospital amendments do not remove check-up', () => {
    const changed = structuredClone(renewal); changed.extraction.acordData.perksAndBenefits = [{ ...checkup, terms: { ...checkup.terms, network: 'Network B' } }]
    expect(composeBenefits([original, changed], now).benefits[0].state).toBe('conflicting')
    expect(composeBenefits([original, changed], now).benefits[0].conflicts).toEqual([expect.objectContaining({ field: 'network', priorValue: 'Network A', currentValue: 'Network B' })])
})
it('source versions are stable across repeat runs, and change when actual terms change', () => {
    expect(composeBenefits([original, renewal], new Date('2026-10-03')).sourceVersion).toBe(compose().sourceVersion)
    const changed = structuredClone(original); changed.extraction.acordData.perksAndBenefits[0].terms.network = 'Network B'
    expect(composeBenefits([changed, renewal]).sourceVersion).not.toBe(compose().sourceVersion)
})
it('insurance-year usage keeps the May anniversary, not January', () => {
    expect(items()[0].period).toEqual({ key: '2026-05-22/2027-05-22', start: '2026-05-22', end: '2027-05-22' })
    expect(items()[0].periods?.map(p => p.key)).toEqual(['2024-05-22/2025-05-22', '2026-05-22/2027-05-22'])
})
it.each(['removed', 'replaced', 'added'])('requires refresh when a document is %s', change => {
    const documents = [original, renewal].map(d => ({ id: d.id, documentHash: d.hash, documentKind: d.kind }))
    if (change === 'removed') documents.pop()
    if (change === 'replaced') documents[0].documentHash = 'new-hash'
    if (change === 'added') documents.push({ id: 'new', documentHash: 'new', documentKind: 'renewal_notice' })
    const result = resolvePreventionPolicy({ id: 'p', lineOfBusiness: 'health', status: 'active', endDate: '2027-05-22', documents, acordData: { extraction: { benefitComposition: compose() } } }, now)
    expect(result.sourceChanged).toBe(true); expect(result.items).toEqual([])
})
it('prioritizes the chosen plan, preserves opt-outs and separates step completion from reported use', () => {
    const [a,b] = items()
    const progress = [{ itemKey: b.id, sourceVersion: b.sourceVersion, status: 'planned', remindAt: null, helpful: null, barrier: 'time', plannedFor: '2026-10-05' }]
    expect(chooseNextStep([a,b], progress)?.item.id).toBe(b.id)
    expect(chooseNextStep([a], [{ ...progress[0], itemKey: a.id, status: 'dismissed', sourceVersion: 'older' }])).toBeNull()
    expect(chooseNextStep([a], [], [{ itemKey: a.id, periodKey: a.period!.key, sourceVersion: a.sourceVersion, status: 'used', usedOn: null }])).toBeNull()
    expect(chooseNextStep([a], [], [{ itemKey: a.id, periodKey: '2025-05-22/2026-05-22', sourceVersion: a.sourceVersion, status: 'used', usedOn: null }])).not.toBeNull()
})
it('compares independent benefit terms and flags cost disagreement', () => {
    const second = structuredClone(original.extraction); second.acordData.perksAndBenefits[1].terms.cost = '10%'
    expect(compareBenefitExtractions(original.extraction, second)['1.cost']).toBe('disagreed')
})
it('a scanned cited page with no text cannot refute a visual quotation', () => {
    expect(verifyExtractionSources({ field: { page: 1, snippet: 'A visual quote' } }, { pages: ['', 'Unrelated text'], pageCount: 2, sampledPages: 2, requiresVision: true })?.field.verified).toBeUndefined()
})
it('flag-off keeps the existing view without reading composed benefits', () => {
    vi.stubEnv('PREVENTION_PERSONALIZATION_ENABLED', '0'); expect(items()).toEqual([])
})
it('a renewal period is not treated as historical merely because the original policy column expired', () => {
 const policy=resolvePreventionPolicy({id:'p',lineOfBusiness:'health',status:'active',endDate:'2025-05-22',acordData:{extraction:{benefitComposition:compose()}}},now)
 expect(policy.historical).toBe(false);expect(policy.items[0].activationUnconfirmed).toBe(true)
})
