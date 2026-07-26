import { describe, it, expect } from 'vitest'
import { calculateMedicScore, complianceClear } from '@/lib/medic/score'
import { gateOpportunityQualified, gateRenewalActionable, buildRenewalPain } from '@/lib/medic/gates'
import { crossSellAdvisorReady } from '@/lib/medic/cross-sell-gate'
import { getMedicConfig, DEFAULT_MEDIC_CONFIG } from '@/lib/medic/config'
import type { MedicData } from '@/lib/medic/types'

/**
 * MEDIC score + gates (blueprint §E/§H) — mirrors the protection-score test
 * discipline: transparent weights, derived qualification, soft gates.
 */

const QUALIFIED: MedicData = {
    metrics: { valueAtRisk: 12000, confidence: 'high' },
    stakeholders: [
        { name: 'Μαρία', party: 'household', stance: 'economic_buyer', identified: true },
        { name: 'Νίκος', party: 'household', stance: 'champion', identified: true, evidenceRef: 'thread_1' },
    ],
    criteria: [
        { key: 'price', label: 'Ασφάλιστρο', met: true },
        { key: 'deductible', label: 'Απαλλαγή', met: true },
        { key: 'idd_needs', label: 'Απαιτήσεις & ανάγκες (IDD)', met: true, compliance: true, mandatory: true },
    ],
    decisionProcess: {
        compellingEvent: 'Λήξη ασφαλιστηρίου αυτοκινήτου',
        compellingEventAt: '2026-09-12',
        steps: [{ name: 'Προσφορά', ownerParty: 'advisor' }],
    },
    pain: { category: 'coverage_gap', summary: 'Χωρίς κάλυψη σεισμού', severity: 'high', validationState: 'confirmed' },
}

describe('calculateMedicScore — transparent 0/1/2 weights', () => {
    it('scores an empty snapshot 0 and reports everything missing', () => {
        const r = calculateMedicScore(null)
        expect(r.score).toBe(0)
        expect(r.qualified).toBe(false)
        expect(r.missing).toContain('pain_confirmed')
        expect(r.missing).toContain('metrics_value')
        expect(r.missing).toContain('economic_buyer')
    })

    it('scores the fully-evidenced snapshot 100 and qualifies it', () => {
        const r = calculateMedicScore(QUALIFIED)
        expect(r.ratings).toEqual({
            metrics: 2, economicBuyer: 2, decisionCriteria: 2,
            decisionProcess: 2, identifyPain: 2, champion: 2,
        })
        expect(r.score).toBe(100)
        expect(r.qualified).toBe(true)
        expect(r.missing).toEqual([])
    })

    it('AI-probable pain rates partial (1) and blocks qualification until confirmed', () => {
        const r = calculateMedicScore({ ...QUALIFIED, pain: { ...QUALIFIED.pain, validationState: 'probable' } })
        expect(r.ratings.identifyPain).toBe(1)
        expect(r.qualified).toBe(false)
        expect(r.missing).toEqual(['pain_confirmed'])
    })

    it('an unidentified economic buyer rates partial and blocks qualification', () => {
        const r = calculateMedicScore({
            ...QUALIFIED,
            stakeholders: [{ name: 'Άγνωστος', stance: 'economic_buyer' }],
        })
        expect(r.ratings.economicBuyer).toBe(1)
        expect(r.missing).toContain('economic_buyer')
    })

    it('a target outcome without a € figure rates metrics partial', () => {
        const r = calculateMedicScore({ ...QUALIFIED, metrics: { targetOutcome: 'Κάλυψη σεισμού' } })
        expect(r.ratings.metrics).toBe(1)
        expect(r.missing).toContain('metrics_value')
    })

    it('unmet mandatory criteria cap decisionCriteria at partial', () => {
        const r = calculateMedicScore({
            ...QUALIFIED,
            criteria: QUALIFIED.criteria!.map((c) => (c.mandatory ? { ...c, met: false } : c)),
        })
        expect(r.ratings.decisionCriteria).toBe(1)
        expect(r.complianceClear).toBe(false)
    })

    it('the qualification threshold comes from config, not a constant', () => {
        const strict = getMedicConfig({ qualifiedMinScore: 101 })
        expect(calculateMedicScore(QUALIFIED, strict).qualified).toBe(false)
        expect(DEFAULT_MEDIC_CONFIG.qualifiedMinScore).toBe(50)
    })
})

describe('complianceClear', () => {
    it('is vacuously true with no tagged criteria, false with an unmet one', () => {
        expect(complianceClear({})).toBe(true)
        expect(complianceClear({ criteria: [{ key: 'gdpr', label: 'GDPR', compliance: true, met: false }] })).toBe(false)
        expect(complianceClear({ criteria: [{ key: 'gdpr', label: 'GDPR', compliance: true, met: true }] })).toBe(true)
    })
})

describe('soft gates (§H) — warn by default, never a silent hard wall', () => {
    it('warn mode allows proceeding but reports what is missing', () => {
        const r = calculateMedicScore({})
        const gate = gateOpportunityQualified(r)
        expect(gate.mode).toBe('warn')
        expect(gate.allowed).toBe(true)
        expect(gate.missing.length).toBeGreaterThan(0)
    })

    it('block mode stops the transition; off mode skips entirely', () => {
        const r = calculateMedicScore({})
        expect(gateOpportunityQualified(r, getMedicConfig({ gateMode: 'block' })).allowed).toBe(false)
        expect(gateOpportunityQualified(r, getMedicConfig({ gateMode: 'off' })).allowed).toBe(true)
    })

    it('renewal gate: complete input passes; missing consent warns', () => {
        const ok = gateRenewalActionable({ expiresInWindow: true, ownerAssigned: true, consentToContact: true, knownFalsePositive: false })
        expect(ok.allowed).toBe(true)
        expect(ok.missing).toEqual([])
        const noConsent = gateRenewalActionable({ expiresInWindow: true, ownerAssigned: true, consentToContact: false, knownFalsePositive: false })
        expect(noConsent.missing).toEqual(['consent_to_contact'])
    })

    it('a known false positive is suppressed outright — a renewed policy never nags', () => {
        const r = gateRenewalActionable({ expiresInWindow: true, ownerAssigned: true, consentToContact: true, knownFalsePositive: true })
        expect(r.allowed).toBe(false)
        expect(r.missing).toEqual(['false_positive'])
    })
})

describe('cross-sell advisor-ready gate (§G promise 7 / §H row 3)', () => {
    it('ready only with confirmed pain + confident evidence + not dismissed', () => {
        const r = crossSellAdvisorReady({ gapValidationState: 'confirmed', extractionConfidence: 0.9, dismissed: false })
        expect(r).toEqual({ ready: true, missing: [] })
        expect(crossSellAdvisorReady({ gapValidationState: 'validated', extractionConfidence: 0.8, dismissed: false }).ready).toBe(true)
    })

    it('an AI-probable gap is NOT customer-eligible — it stays in the agent queue', () => {
        const r = crossSellAdvisorReady({ gapValidationState: 'probable', extractionConfidence: 0.9, dismissed: false })
        expect(r.ready).toBe(false)
        expect(r.missing).toEqual(['pain_confirmed'])
    })

    it('unknown confidence never passes — evidence-positive, not benefit-of-the-doubt', () => {
        const r = crossSellAdvisorReady({ gapValidationState: 'confirmed', extractionConfidence: null, dismissed: false })
        expect(r.ready).toBe(false)
        expect(r.missing).toEqual(['evidence_confidence'])
    })

    it('dismissed kills eligibility regardless of evidence', () => {
        const r = crossSellAdvisorReady({ gapValidationState: 'validated', extractionConfidence: 1, dismissed: true })
        expect(r.ready).toBe(false)
        expect(r.missing).toEqual(['dismissed'])
    })
})

describe('buildRenewalPain — renewal → opportunity Pain auto-link', () => {
    it('seeds a renewal_lapse pain at probable (the advisor still confirms)', () => {
        const p = buildRenewalPain({ policyName: 'Ασφάλεια αυτοκινήτου', expiresAt: '2026-09-12' })
        expect(p.category).toBe('renewal_lapse')
        expect(p.validationState).toBe('probable')
        expect(p.summary).toContain('Ασφάλεια αυτοκινήτου')
    })
})
