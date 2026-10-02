import { describe, expect, it } from 'vitest'
import { resolvePreventionPolicy } from '@/lib/prevention/benefits'
import { sanitizeExtractionSources, verifyExtractionSources } from '@/lib/services/ai/extraction-citations'
import { enrichExtractionPayload } from '@/lib/services/ai/extraction-enrichment'
import { actionsForPolicy } from '@/lib/prevention/catalogue'
import { CheckInInput, validReminderDate } from '@/lib/prevention/input'
const now = new Date('2026-10-02T10:00:00Z')
const base = { id: 'motor1', insurerName: 'Test insurer', policyNumber: 'M1', lineOfBusiness: 'motor', status: 'active', endDate: '2027-10-02' }
const perk = { perkType: 'discount', name: { el: 'Αιματολογικές εξετάσεις', en: 'Blood tests' }, description: { el: 'Έκπτωση σε εξετάσεις', en: 'Discount on tests' }, terms: { beneficiaries: 'Driver only', cost: '20% discount', frequency: 'Once a year' } }
const source = { page: 3, snippet: 'Blood tests at a discount', verified: true }
const acord = (perks: any[] = [perk]) => ({ perksAndBenefits: perks, extraction: { documentId: 'doc1', analysisRunId: 'run1', extractedAt: '2026-10-01', sources: { 'acordData.perksAndBenefits.0': source } } })
function read(data: any = acord(), extra: any = {}) { return resolvePreventionPolicy({ ...base, acordData: data, ...extra }, now) }
describe('cross-line benefits', () => {
    it('places health in motor without changing its policy identity or branch', () => {
        const policy = read(); const item = policy.items[0]
        expect(policy.domains).toEqual(['mobility','health']); expect(item.domains).toEqual(['health']); expect(item.policyId).toBe('motor1')
        expect(item.costType).toBe('discount'); expect(item.state).toBe('documented'); expect(item.runId).toBe('run1')
        expect(item.terms.find(t => t.key === 'beneficiaries')?.value).toBe('Driver only')
    })
    it('does not label a prevention perk free when cost is absent', () => { expect(read({perksAndBenefits:[{ ...perk, perkType: 'prevention', description: {}, terms: {} }]}).items[0].costType).toBe('not_stated') })
    it('an explicit discount overrides a free-service model tag and absent evidence cannot promise free service', () => { expect(read(acord([{...perk,perkType:'free_service'}])).items[0].costType).toBe('discount'); expect(read({perksAndBenefits:[{perkType:'free_service',name:{el:'Έλεγχος',en:'Check'}}]}).items[0].costType).toBe('not_stated') })
    it('never creates a benefit from the motor or health branch alone', () => { expect(read({}).items).toEqual([]); expect(read({}, { lineOfBusiness: 'health' }).items).toEqual([]) })
    it('keeps matching benefits on different policies distinct', () => { expect(read().items[0].id).not.toBe(read(acord(), { id: 'other' }).items[0].id) })
    it('has stable identity after reordering and a separate revision for changed terms', () => {
        const other = { ...perk, name: { el: 'Έλεγχος διαρροής', en: 'Leak inspection' } }
        expect(read(acord([other,perk])).items[1].id).toBe(read().items[0].id)
        const changed = read(acord([{ ...perk, terms: { ...perk.terms, cost: '10% discount' } }])).items[0]
        expect(changed.id).toBe(read().items[0].id); expect(changed.sourceVersion).not.toBe(read().items[0].sourceVersion)
    })
    it('different beneficiaries do not collapse into one entitlement', () => { expect(read(acord([perk, { ...perk, terms: { beneficiaries: 'Family' } }])).items).toHaveLength(2) })
    it('missing or rejected citations need clarification, not confidence percentages', () => {
        expect(read({ perksAndBenefits: [perk] }).items[0].state).toBe('clarify')
        expect(read({ ...acord(), extraction: { sources: { 'acordData.perksAndBenefits.0': { ...source, verified: false } } } }).items[0].state).toBe('clarify')
    })
    it('expired and cancelled benefits are historical and produce no generic action', () => {
        for (const extra of [{ endDate: '2025-01-01' }, { status: 'cancelled' }]) { const p = read(acord(),extra); expect(p.items[0].state).toBe('historical'); expect(actionsForPolicy(p)).toEqual([]) }
    })
    it('does not use newest unrelated document/run as provenance', () => { const item=read({ perksAndBenefits: [perk] }).items[0]; expect(item.documentId).toBeNull(); expect(item.runId).toBeNull() })
    it('legacy checkup is health even on motor and retains its progress adapter', () => { const p = read({ health: { annualCheckupIncluded: true } }); expect(p.items[0]).toMatchObject({ legacyCheckup: true, domains: ['health'] }) })
    it('explicit false and unknown checkup flags never mint benefits', () => { expect(read({ health: { annualCheckupIncluded: false } }).items).toEqual([]); expect(read({ health: {} }).items).toEqual([]) })
    it('does not duplicate a checkup perk and the older flag', () => { const p=read({ ...acord([{ ...perk, name: {el:'Check-up',en:'Check-up'} }]), health: { annualCheckupIncluded:true } }); expect(p.items).toHaveLength(1); expect(p.items[0].legacyCheckup).toBe(true) })
    it('blocks unsafe service links', () => { expect(read(acord([{...perk,contactUrl:'javascript:alert(1)'}])).items[0].contactUrl).toBeUndefined() })
})
describe('per-benefit citation boundary', () => {
    it('accepts bounded indexed terms, strips model verification, rejects arbitrary fields', () => {
        const out=sanitizeExtractionSources({ 'acordData.perksAndBenefits.0': {...source}, 'acordData.perksAndBenefits.99.terms.cost': source, 'acordData.perksAndBenefits.100': source, 'acordData.perksAndBenefits.0.admin':source })!
        expect(Object.keys(out)).toHaveLength(2); expect(out['acordData.perksAndBenefits.0'].verified).toBeUndefined()
        const checked = verifyExtractionSources(out, { pages:['Blood tests at a discount'], pageCount:1, sampledPages:1 } as any)
        expect(checked!['acordData.perksAndBenefits.0'].verified).toBe(true)
    })
    it('replacing perks without citations never inherits index evidence from an earlier array', () => {
        const out=enrichExtractionPayload({ acordData:{perksAndBenefits:[perk]} } as any, acord())
        expect(out.acordData.extraction.sources?.['acordData.perksAndBenefits.0']).toBeUndefined()
    })
    it('never trusts a model-created nested verification flag', () => {
        const out=enrichExtractionPayload({ acordData: acord() } as any)
        expect(out.acordData.extraction.sources?.['acordData.perksAndBenefits.0']?.verified).not.toBe(true)
    })
})
describe('optional factual check-in', () => {
    it('requires separate consent and rejects scores/medical values', () => {
        expect(CheckInInput.safeParse({consent:false,answers:{activityDays:3}}).success).toBe(false)
        expect(CheckInInput.safeParse({consent:true,answers:{systolic:180}}).success).toBe(false)
        expect(CheckInInput.safeParse({consent:true,answers:{score:70}}).success).toBe(false)
        expect(CheckInInput.safeParse({consent:true,answers:{activityDays:3,activityMinutes:180,bloodPressure:'not_sure'}}).success).toBe(true)
    })
    it('refuses impossible days and calendar dates', () => { expect(CheckInInput.safeParse({consent:true,answers:{activityDays:8}}).success).toBe(false); expect(validReminderDate('2027-02-30',{min:'2026-10-03',max:'2027-10-02'})).toBe(false) })
})
