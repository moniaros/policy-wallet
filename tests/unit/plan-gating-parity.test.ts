import { describe, expect, it } from 'vitest'
import { publicPricingContent } from '@/lib/pricing/public-pricing-content'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
import { FEATURE_GATES } from '@/lib/monetization/feature-gates'

/**
 * The parity test that did not exist — and its absence is how /pricing came to
 * contradict itself on one screen.
 *
 * `public-pricing-content.ts` is a git-tracked file with no code path tying it
 * to `plan-defaults.ts` or the DB entitlements JSON. The comparison table
 * matched the enforced limits by authoring discipline and a comment; the plan
 * cards did not, and nothing failed. The Free card advertised gap detection
 * (enforced: `gapAnalysisPerDay: 0`), the Plus card advertised gap & duplicate
 * detection, and the table below both said Family-only.
 *
 * THE DECIDED TRUTH THIS ASSERTS (D1 as amended 2026-08-30):
 *   - GAP detection is Family: `gapAnalysisPerDay` 0 / 0 / unlimited is the
 *     enforced gate, and no cheaper card may claim it.
 *   - DUPLICATE detection is UNGATED: it runs for every plan, and the only
 *     limit is the ceiling — the plan's policy count (3 / 10 / 25) bounds the
 *     comparison set at upload. There is deliberately no `FEATURE_GATES` entry:
 *     the old `duplicate_coverage_detection` declaration said `pro`, was never
 *     enforced anywhere, and misdescribed the product. Deleted, and the
 *     deletion is pinned here so it cannot quietly return as a paywall.
 *   - The CEILING ITSELF is asserted (the "limit as well as the gate"): each
 *     card's headline policy count must equal the enforced `policies` limit.
 *
 * Scope note, verified in code before this was written: duplicate detection
 * fires only where two documents name the SAME insured subject — a plate, an
 * address, a pet, a vessel (`policyAssetSubjectKey`). Health, life, cyber,
 * business and pension have no subject and are never compared, so no copy may
 * claim household-wide or cross-person duplicate detection on any tier.
 */

const content = publicPricingContent.policyholder
const plans = Object.fromEntries(content.plans.map((p) => [p.key, p]))

const featureText = (planKey: string) =>
    plans[planKey].features.map((f) => `${f.label.el} ${f.label.en}`).join(' | ')

const GAP_WORDING = /κενών|gap/i
const DUP_WORDING = /διπλών|διπλές|duplicate/i

describe('the pricing page states the enforced truth — gap gate, duplicate non-gate, and the ceiling', () => {
    it('the three consumer plans exist', () => {
        expect(Object.keys(plans).sort()).toEqual(['free', 'plus', 'pro'])
    })

    it('each card headline count equals the enforced policy ceiling', () => {
        for (const [key, limits] of Object.entries(DEFAULT_ENTITLEMENT_LIMITS)) {
            if (!(key in plans)) continue
            expect(
                featureText(key),
                `${key} card must state its enforced ceiling of ${limits.policies}`
            ).toMatch(new RegExp(`${limits.policies} ασφαλιστήρια`))
        }
    })

    it('no card below Family claims gap detection, and Family claims it', () => {
        expect(DEFAULT_ENTITLEMENT_LIMITS.free.gapAnalysisPerDay).toBe(0)
        expect(DEFAULT_ENTITLEMENT_LIMITS.plus.gapAnalysisPerDay).toBe(0)
        expect(DEFAULT_ENTITLEMENT_LIMITS.pro.gapAnalysisPerDay).toBeNull()
        for (const key of ['free', 'plus'] as const) {
            const offending = plans[key].features.filter(
                (f) => f.included && GAP_WORDING.test(`${f.label.el} ${f.label.en}`)
            )
            expect(
                offending.map((f) => f.label.el),
                `${key} card advertises gap detection, which is enforced Family-only`
            ).toEqual([])
        }
        expect(featureText('pro')).toMatch(GAP_WORDING)
    })

    it('duplicate detection appears with no tier qualifier — it is ungated, bounded only by the ceiling', () => {
        // Present and included on every card…
        for (const key of ['free', 'plus', 'pro'] as const) {
            const dup = plans[key].features.find((f) => DUP_WORDING.test(`${f.label.el} ${f.label.en}`))
            expect(dup, `${key} card must state duplicate detection`).toBeDefined()
            expect(dup!.included, `${key} card must include it`).toBe(true)
        }
        // …and the comparison table row is true for all three.
        const dupRow = content.comparisonRows.find(
            (r) => DUP_WORDING.test(`${r.name.el} ${r.name.en}`) && !GAP_WORDING.test(`${r.name.el} ${r.name.en}`)
        )
        expect(dupRow, 'the table needs a duplicate-only row — a combined gap-&-duplicate row forces one half to lie').toBeDefined()
        expect(dupRow!.values).toEqual({ free: true, plus: true, pro: true })
    })

    it('the gap table row is Family-only', () => {
        const gapRow = content.comparisonRows.find(
            (r) => GAP_WORDING.test(r.name.el) && !DUP_WORDING.test(r.name.el)
        )
        expect(gapRow, 'the table needs a gap-only row').toBeDefined()
        expect(gapRow!.values).toEqual({ free: false, plus: false, pro: true })
    })

    it('the deleted paywall declaration stays deleted', () => {
        expect(
            'duplicate_coverage_detection' in FEATURE_GATES,
            'duplicate_coverage_detection returned to FEATURE_GATES — it was deleted by decision ' +
                '(D1 as amended 2026-08-30): the capability runs for every plan, and a declared-but-' +
                'unenforced paywall is a false claim waiting for a renderer'
        ).toBe(false)
    })
})
