import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'
import { resolveCoverageAbsence } from '@/lib/wallet/policy-detail'

const view = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf-8')
const page = readFileSync('app/(protected)/wallet/[id]/page.tsx', 'utf-8')
const elCopy = el.wallet.policyDetailsPage
const enCopy = en.wallet.policyDetailsPage

/**
 * "No coverage details" has several causes and they need different answers:
 *
 *   never    nothing has been analysed yet          → run an analysis
 *   failed   the last run broke                      → retry, and if it fails
 *                                                     again the file may be unreadable
 *   blocked  the run was GATED, not run (Plus /      → upgrade, or grant consent —
 *            consent) — see analysis-blocked-state     NOT retry (see that spec)
 *   degraded completed_with_warnings                 → retry; the cause is transient
 *   empty    a clean run found no structured cover   → re-running the SAME file
 *                                                     gives the same nothing
 *
 * These all used to render one message: "re-analyse to show detailed coverage".
 * The state derivation is now a pure function (resolveCoverageAbsence) so it can
 * be asserted directly rather than by scraping the component source.
 */
describe('the coverage-absence message says which happened', () => {
    it('loads the latest run — with blockedReason — so the state is knowable at all', () => {
        expect(page).toMatch(/analysisRuns: \{/)
        expect(page).toMatch(/orderBy: \{ createdAt: 'desc' \}/)
        // blockedReason must travel with the run, else a gated run cannot be told
        // apart from a failure (the whole point of the blocked state).
        // B0.3 widened the select (id, finishedAt, attemptedRules) so the findings
        // can be dated to their run; blockedReason must still be in it.
        expect(page).toMatch(/select: \{ id: true, status: true, createdAt: true, finishedAt: true, blockedReason: true, attemptedRules: true \}/)
    })

    it('maps every AnalysisRunStatus to a state', () => {
        // queued/running have produced no verdict, so they read as "never".
        expect(resolveCoverageAbsence(undefined)).toBe('never')
        expect(resolveCoverageAbsence('queued')).toBe('never')
        expect(resolveCoverageAbsence('running')).toBe('never')
        expect(resolveCoverageAbsence('failed')).toBe('failed')
        expect(resolveCoverageAbsence('blocked')).toBe('blocked')
        // completed_with_warnings must NOT share the "empty" branch with a clean
        // completion — its copy would then say retrying will not help.
        expect(resolveCoverageAbsence('completed_with_warnings')).toBe('degraded')
        expect(resolveCoverageAbsence('completed')).toBe('empty')
    })

    it('renders the resolved copy, not the single old line', () => {
        expect(view).toMatch(/resolveCoverageAbsenceCopy\(/)
        expect(view).toMatch(/\{absenceCopy\.title\}/)
        expect(view).toMatch(/\{absenceCopy\.hint\}/)
        expect(view).not.toMatch(/\{detailsCopy\.reanalyzeToSeeCoverage\}/)
    })

    it('ships every state in both languages', () => {
        for (const key of ['analysisNeverRun', 'analysisNeverRunHint', 'analysisFailedTitle',
            'analysisFailedHint', 'analysisBlockedConsentTitle', 'analysisBlockedConsentHint',
            'analysisBlockedUpgradeTitle', 'analysisBlockedUpgradeHint', 'analysisDegradedTitle',
            'analysisDegradedHint', 'analysisFoundNothingTitle', 'analysisFoundNothingHint'] as const) {
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
