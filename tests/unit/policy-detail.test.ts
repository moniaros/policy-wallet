import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import {
    calculatePolicyHealthScore,
    deriveClaimDeadlines,
    derivePolicyMeta,
    extractPolicySections,
    hasAutoRenewal,
    normalizeRemindersSent,
    normalizeRenewalHistory,
    pickLang,
} from '@/lib/wallet/policy-detail'

describe('extractPolicySections', () => {
    it('returns empty sections for null / undefined / non-object acordData', () => {
        for (const acord of [null, undefined, 'nope', 42]) {
            const sections = extractPolicySections(acord)
            expect(sections.exclusions).toEqual([])
            expect(sections.notableConditions).toEqual([])
            expect(sections.finePrintClauses).toEqual([])
            expect(sections.perks).toEqual([])
        }
    })

    it('returns empty sections for legacy policies without the newer keys', () => {
        const sections = extractPolicySections({ policy: { insurerName: 'Ethniki' }, coverages: [] })
        expect(sections.exclusions).toEqual([])
        expect(sections.notableConditions).toEqual([])
        expect(sections.finePrintClauses).toEqual([])
        expect(sections.perks).toEqual([])
    })

    it('trims exclusions and drops non-string entries', () => {
        const sections = extractPolicySections({ exclusions: [' war damage ', '', null, 7, 'racing'] })
        expect(sections.exclusions).toEqual(['war damage', 'racing'])
    })

    it('drops malformed conditions, fine print and perks', () => {
        const sections = extractPolicySections({
            notableConditions: [
                { conditionType: 'waiting_period', summary: { en: '30 days', el: '30 ημέρες' } },
                { conditionType: 'sub_limit' }, // no summary
                { summary: { en: 'orphan' } }, // no conditionType
                null,
            ],
            finePrintClauses: [
                { clause: 'Art. 12', riskLevel: 'critical', impactSummary: { en: 'x', el: 'χ' } },
                { riskLevel: 'warning' }, // no clause
                null,
            ],
            perksAndBenefits: [
                { perkType: 'assistance', name: { en: 'Roadside', el: 'Οδική' }, description: { en: '', el: '' } },
                { perkType: 'gift' }, // no name
                null,
            ],
        })
        expect(sections.notableConditions).toHaveLength(1)
        expect(sections.finePrintClauses).toHaveLength(1)
        expect(sections.perks).toHaveLength(1)
    })

    it('defaults missing fine-print section to empty string and unknown riskLevel to info', () => {
        const sections = extractPolicySections({
            finePrintClauses: [{ clause: 'Art. 3', riskLevel: 'catastrophic', impactSummary: { en: 'x', el: 'χ' } }],
        })
        expect(sections.finePrintClauses[0].section).toBe('')
        expect(sections.finePrintClauses[0].riskLevel).toBe('info')
    })
})

describe('derivePolicyMeta', () => {
    it('returns nulls when acordData or the envelope is missing', () => {
        expect(derivePolicyMeta(null)).toEqual({ renewalDate: null, premiumFrequency: null })
        expect(derivePolicyMeta({})).toEqual({ renewalDate: null, premiumFrequency: null })
    })

    it('reads valid renewalDate and premiumFrequency', () => {
        const meta = derivePolicyMeta({ policy: { renewalDate: '2027-03-01', premiumFrequency: 'quarterly' } })
        expect(meta.renewalDate).toBe('2027-03-01')
        expect(meta.premiumFrequency).toBe('quarterly')
    })

    it('rejects unparseable dates and unknown frequencies', () => {
        const meta = derivePolicyMeta({ policy: { renewalDate: 'soon', premiumFrequency: 'biweekly' } })
        expect(meta.renewalDate).toBeNull()
        expect(meta.premiumFrequency).toBeNull()
    })

    it('rejects non-string renewalDate', () => {
        expect(derivePolicyMeta({ policy: { renewalDate: 20270301 } }).renewalDate).toBeNull()
    })
})

describe('normalizeRenewalHistory', () => {
    it('returns [] when history is absent or not an array', () => {
        expect(normalizeRenewalHistory(null)).toEqual([])
        expect(normalizeRenewalHistory({ renewalHistory: 'x' })).toEqual([])
    })

    it('sorts newest end date first and fills fallback ids', () => {
        const history = normalizeRenewalHistory({
            renewalHistory: [
                { startDate: '2024-01-01', endDate: '2025-01-01' },
                { id: 'r2', startDate: '2025-01-01', endDate: '2026-01-01', sourceDocumentName: 'renewal.pdf' },
            ],
        })
        expect(history[0].id).toBe('r2')
        expect(history[0].sourceDocumentName).toBe('renewal.pdf')
        expect(history[1].id).toBe('renewal-0')
        expect(history[1].sourceDocumentName).toBeNull()
    })

    it('tolerates entries with missing dates', () => {
        const history = normalizeRenewalHistory({ renewalHistory: [{}, { endDate: '2026-01-01' }] })
        expect(history).toHaveLength(2)
        expect(history[0].endDate).toBe('2026-01-01')
        expect(history[1].startDate).toBeNull()
    })
})

describe('normalizeRemindersSent', () => {
    it('returns [] for non-array values', () => {
        expect(normalizeRemindersSent(null)).toEqual([])
        expect(normalizeRemindersSent('[]')).toEqual([])
        expect(normalizeRemindersSent({ milestone: 30 })).toEqual([])
    })

    it('keeps only well-formed milestones', () => {
        const milestones = normalizeRemindersSent([
            { milestone: 30, sentAt: '2026-06-01T08:00:00Z' },
            { milestone: '7', sentAt: '2026-06-24T08:00:00Z' }, // milestone not a number
            { milestone: 7 }, // no sentAt
            null,
            { milestone: 7, sentAt: '2026-06-24T08:00:00Z', extra: true },
        ])
        expect(milestones).toEqual([
            { milestone: 30, sentAt: '2026-06-01T08:00:00Z' },
            { milestone: 7, sentAt: '2026-06-24T08:00:00Z' },
        ])
    })
})

describe('deriveClaimDeadlines / hasAutoRenewal', () => {
    const conditions = [
        { conditionType: 'claim_deadline', summary: { en: '8 days', el: '8 ημέρες' } },
        { conditionType: 'notification_obligation', summary: { en: 'notify', el: 'ειδοποίηση' } },
        { conditionType: 'auto_renewal', summary: { en: 'renews', el: 'ανανεώνεται' } },
        { conditionType: 'waiting_period', summary: { en: '30 days', el: '30 ημέρες' } },
    ]

    it('keeps only deadline-type conditions', () => {
        expect(deriveClaimDeadlines(conditions).map((c) => c.conditionType)).toEqual([
            'claim_deadline',
            'notification_obligation',
        ])
    })

    it('detects auto-renewal', () => {
        expect(hasAutoRenewal(conditions)).toBe(true)
        expect(hasAutoRenewal(conditions.filter((c) => c.conditionType !== 'auto_renewal'))).toBe(false)
    })
})

describe('pickLang', () => {
    it('prefers the active language and falls back across languages', () => {
        expect(pickLang({ en: 'Hello', el: 'Γεια' }, 'el')).toBe('Γεια')
        expect(pickLang({ en: 'Hello' }, 'el')).toBe('Hello')
        expect(pickLang({ el: 'Γεια' }, 'en')).toBe('Γεια')
    })

    it('returns empty string for missing or malformed values', () => {
        expect(pickLang(undefined, 'el')).toBe('')
        expect(pickLang(null, 'en')).toBe('')
        expect(pickLang({} as { en?: string }, 'en')).toBe('')
    })
})

/**
 * The score used to deduct 10 points for every EXCLUSION. Exclusions are not
 * defects — they are the boundary that defines the cover. Every policy has them,
 * and this page's own exclusions card says so directly beneath the donut. A
 * carefully drafted wording listing twelve scored 0 ("needs attention") while a
 * vague one listing two scored 80 ("good"), so the product rewarded the worse
 * contract — and because the count comes from AI extraction, a better analysis
 * lowered the score.
 */
describe('calculatePolicyHealthScore', () => {
    it('starts at 100 with no findings and no verification', () => {
        expect(calculatePolicyHealthScore({ gapCount: 0, verified: false })).toEqual({
            score: 100,
            level: 'good',
        })
    })

    it('does not punish a policy for stating its exclusions', () => {
        // Twelve exclusions, nothing flagged as risky: still a clean policy.
        expect(
            calculatePolicyHealthScore({
                gapCount: 0,
                criticalClauseCount: 0,
                warningClauseCount: 0,
                verified: false,
            }).score
        ).toBe(100)
    })

    it('caps the verified bonus at 100', () => {
        expect(calculatePolicyHealthScore({ gapCount: 0, verified: true }).score).toBe(100)
    })

    it('weighs open gaps heaviest, then critical clauses, then warnings', () => {
        expect(calculatePolicyHealthScore({ gapCount: 1, verified: false }).score).toBe(85)
        expect(calculatePolicyHealthScore({ gapCount: 0, criticalClauseCount: 1, verified: false }).score).toBe(90)
        expect(calculatePolicyHealthScore({ gapCount: 0, warningClauseCount: 1, verified: false }).score).toBe(96)
    })

    it('adds 5 when the extraction is confirmed', () => {
        expect(calculatePolicyHealthScore({ gapCount: 1, criticalClauseCount: 2, verified: false }).score).toBe(65)
        expect(calculatePolicyHealthScore({ gapCount: 1, criticalClauseCount: 2, verified: true }).score).toBe(70)
    })

    it('clamps at zero', () => {
        expect(
            calculatePolicyHealthScore({ gapCount: 10, criticalClauseCount: 10, verified: false }).score
        ).toBe(0)
    })

    it('maps levels at the 40 / 70 boundaries', () => {
        expect(calculatePolicyHealthScore({ gapCount: 4, verified: false })).toMatchObject({
            score: 40,
            level: 'attention',
        })
        expect(calculatePolicyHealthScore({ gapCount: 2, verified: false })).toMatchObject({
            score: 70,
            level: 'moderate',
        })
    })
})

/**
 * The call site must feed it the flagged clauses, not the raw exclusion list —
 * the guard above only pins the function, and the defect lived in what was
 * passed to it.
 */
describe('the policy detail page scores on what it flagged, not on exclusions', () => {
    const VIEW = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')

    it('no longer passes the exclusion count', () => {
        expect(VIEW).not.toMatch(/exclusionCount: exclusions\.length/)
    })

    it('passes the critical and warning clause counts', () => {
        expect(VIEW).toMatch(/criticalClauseCount: finePrint\.filter\(\(c\) => c\.riskLevel === "critical"\)\.length/)
        expect(VIEW).toMatch(/warningClauseCount: finePrint\.filter\(\(c\) => c\.riskLevel === "warning"\)\.length/)
    })

    it('the exclusions card still says every policy has exclusions', () => {
        expect(el.wallet.policyDetailsPage.exclusionsReanalyzeHint).toMatch(/Κάθε ασφαλιστήριο περιλαμβάνει εξαιρέσεις/)
    })
})
