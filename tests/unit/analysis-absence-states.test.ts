import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const view = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
const page = readFileSync('app/(protected)/wallet/[id]/page.tsx', 'utf-8')
const elCopy = el.wallet.policyDetailsPage
const enCopy = en.wallet.policyDetailsPage

/**
 * "No coverage details" has three causes and they need three answers:
 *
 *   never    nothing has been analysed yet          → run an analysis
 *   failed   the last run failed or was blocked     → retry, and if it fails
 *                                                     again the file may be
 *                                                     unreadable
 *   empty    a run completed and found no structured
 *            coverage in the document               → re-running the SAME file
 *                                                     gives the same nothing
 *
 * All three used to render one message: "re-analyse to show detailed coverage".
 * Right for the first, it hides a problem in the second, and in the third it
 * tells the reader to spend a metered analysis on a run that cannot help.
 *
 * Verified against seeded runs: no runs → «Δεν έχει γίνει ακόμη ανάλυση…»,
 * failed → «Η τελευταία ανάλυση δεν ολοκληρώθηκε», completed → «Η ανάλυση
 * ολοκληρώθηκε χωρίς αναλυτικές καλύψεις».
 */
describe('the coverage-absence message says which of the three happened', () => {
    it('loads the latest run so the state is knowable at all', () => {
        expect(page).toMatch(/analysisRuns: \{/)
        expect(page).toMatch(/orderBy: \{ createdAt: 'desc' \}/)
        expect(page).toMatch(/select: \{ status: true, createdAt: true \}/)
    })

    it('maps every AnalysisRunStatus to a state', () => {
        // queued/running have produced no verdict, so they read as "never".
        expect(view).toMatch(/if \(!last\) return "never"/)
        expect(view).toMatch(/last === "failed" \|\| last === "blocked"/)
        expect(view).toMatch(/last === "completed" \|\| last === "completed_with_warnings"/)
    })

    it('renders the branched copy, not the single old line', () => {
        expect(view).toMatch(/\{absenceCopy\.title\}/)
        expect(view).toMatch(/\{absenceCopy\.hint\}/)
        expect(view).not.toMatch(/\{detailsCopy\.reanalyzeToSeeCoverage\}/)
    })

    it('ships all three states in both languages', () => {
        for (const key of ['analysisNeverRun', 'analysisNeverRunHint', 'analysisFailedTitle',
            'analysisFailedHint', 'analysisFoundNothingTitle', 'analysisFoundNothingHint'] as const) {
            expect(elCopy[key], `el.${key}`).toBeTruthy()
            expect(enCopy[key], `en.${key}`).toBeTruthy()
            expect(elCopy[key], `el.${key} must be Greek`).toMatch(/[Ͱ-Ͽ]/)
        }
    })

    it('does not tell the reader to re-run when a run already found nothing', () => {
        // The whole point: analysis is metered, so "try again" must not be the
        // advice when trying again cannot change the outcome.
        expect(elCopy.analysisFoundNothingHint).toMatch(/το ίδιο αποτέλεσμα/)
        expect(enCopy.analysisFoundNothingHint).toMatch(/same result/i)
        // ...and it points somewhere that CAN help.
        expect(elCopy.analysisFoundNothingHint).toMatch(/σύμβουλ/)
        expect(enCopy.analysisFoundNothingHint).toMatch(/advisor/i)
    })

    it('the failure message admits the failure rather than implying a fresh start', () => {
        expect(elCopy.analysisFailedTitle).toMatch(/δεν ολοκληρώθηκε/)
        expect(enCopy.analysisFailedTitle).toMatch(/did not finish/i)
    })
})
