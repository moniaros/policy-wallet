import { describe, it, expect } from 'vitest'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { resolveCoverageAbsence } from '@/lib/wallet/policy-detail'

/**
 * A run that finishes `completed_with_warnings` had steps fail; sections are
 * missing. It collapsed into the same state as a CLEAN run that found nothing —
 * whose copy says "re-analysing the same file will most likely give the same
 * result".
 *
 * That sentence is right for a clean run: the document genuinely has no
 * structured coverage, so retrying wastes the reader's time. It is wrong for a
 * degraded one, where retrying is exactly the right move because the cause is
 * usually transient. So the page steered people away from the one action that
 * would have fixed their policy — while the AnalysisCard on the same route
 * already knew the run was degraded and was listing the missing sections.
 */
describe('a degraded analysis is not reported as an empty one', () => {
    it('has its own state', () => {
        expect(resolveCoverageAbsence('completed_with_warnings')).toBe('degraded')
    })

    it('no longer folds warnings into the clean-completion branch', () => {
        // A clean completion is "empty"; a degraded one must not share it.
        expect(resolveCoverageAbsence('completed')).toBe('empty')
        expect(resolveCoverageAbsence('completed_with_warnings')).not.toBe(
            resolveCoverageAbsence('completed'),
        )
    })

    it('a run still in flight remains "never", not "empty"', () => {
        // queued / running have produced no verdict; the fallthrough must not
        // start claiming one.
        expect(resolveCoverageAbsence('queued')).toBe('never')
        expect(resolveCoverageAbsence('running')).toBe('never')
    })
})

describe('the degraded copy says the opposite thing to the empty copy', () => {
    it('tells the reader retrying is worth it', () => {
        const elHint = el.wallet.policyDetailsPage.analysisDegradedHint
        const enHint = en.wallet.policyDetailsPage.analysisDegradedHint
        expect(elHint).toMatch(/αξίζει να δοκιμάσετε ξανά/)
        expect(enHint).toMatch(/worth retrying/i)
        // Negation-proof: /αξίζει/ alone matched happily inside «δεν αξίζει»,
        // so this guard passed a mutation that reversed the advice.
        expect(elHint).not.toMatch(/δεν αξίζει/)
        expect(enHint).not.toMatch(/not worth/i)
    })

    it('while the empty copy still says it will not help', () => {
        expect(en.wallet.policyDetailsPage.analysisFoundNothingHint).toMatch(/most likely give the same result/i)
        expect(el.wallet.policyDetailsPage.analysisFoundNothingHint).toMatch(/θα δώσει το ίδιο αποτέλεσμα/)
    })

    it('names why the detail is missing, rather than implying the document lacked it', () => {
        expect(el.wallet.policyDetailsPage.analysisDegradedTitle).toMatch(/δεν ολοκληρώθηκε κανονικά/)
        expect(en.wallet.policyDetailsPage.analysisDegradedTitle).toMatch(/did not finish cleanly/i)
    })

    it('all four states exist in both languages', () => {
        for (const t of [el, en]) {
            const p = t.wallet.policyDetailsPage as Record<string, unknown>
            for (const key of [
                'analysisNeverRun', 'analysisNeverRunHint',
                'analysisFailedTitle', 'analysisFailedHint',
                'analysisDegradedTitle', 'analysisDegradedHint',
                'analysisFoundNothingTitle', 'analysisFoundNothingHint',
            ]) {
                expect(typeof p[key], `${key} missing`).toBe('string')
            }
        }
    })
})
