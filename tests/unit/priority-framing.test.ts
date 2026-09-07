import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const recCards = readFileSync('components/coverage/RecommendationCards.tsx', 'utf-8')
// CoverageInsightsClient was retired with the «Καλύψεις & κενά» story rebuild
// (2026-09-07): /protection no longer renders a priority tier anywhere — its
// gap list explains provenance, never priority — so the note is owed only
// where a priority still renders: the recommendations list and the home.
const home = readFileSync('app/(protected)/dashboard/PolicyholderHome.tsx', 'utf-8')

/**
 * The gap engine emits a profile-based PRIORITY, not a risk grade — the report
 * itself omits severity as unvalidated. The dashboard widget said so; the two
 * surfaces where a user actually acts did not, so "Κρίσιμη προτεραιότητα" and
 * «Κρίσιμο κενό» read there as verdicts on the person's risk.
 *
 * This is the same failure as the one already recorded for verdict copy: fixing
 * the symptom on one screen and leaving the others. Every surface that shows a
 * priority now carries the same sentence.
 */
describe('every surface showing a priority explains what it is', () => {
    it('states the qualification identically in both languages', () => {
        expect(el.dashboard.home.recPriorityNote).toMatch(/δεν αποτελούν οριστική αξιολόγηση κινδύνου/)
        expect(en.dashboard.home.recPriorityNote).toMatch(/not a definitive risk assessment/i)
        // Same meaning as the dashboard widget's note — one concept, one claim.
        expect(el.dashboard.home.recPriorityNote).toEqual(el.dashboard.home.severityNote)
    })

    it('appears on all three surfaces', () => {
        expect(recCards, 'recommendations list').toMatch(/home\.recPriorityNote/)

        expect(home, 'dashboard gaps widget').toMatch(/severityNote/)
    })
})

/**
 * The scale mixed two registers: "Critical" and "High priority" are tiers,
 * "Recommended" and "Nice to have" are judgements. Telling a policyholder a
 * coverage gap is "nice to have" is precisely the personalised assessment the
 * product's own methodology disclaimer says it does not make.
 */
describe('the priority scale is one consistent set of tiers', () => {
    it('has four tiers, all phrased as priority levels', () => {
        for (const lang of [el, en]) {
            const scale = [
                lang.dashboard.home.recPriorityCritical,
                lang.dashboard.home.recPriorityHigh,
                lang.dashboard.home.recPriorityMedium,
                lang.dashboard.home.recPriorityLow,
            ]
            expect(scale.every(Boolean)).toBe(true)
            expect(new Set(scale).size).toBe(4)
        }
        // Every Greek tier ends in the same noun, so the set reads as one scale.
        for (const tier of ['recPriorityCritical', 'recPriorityHigh', 'recPriorityMedium', 'recPriorityLow'] as const) {
            expect(el.dashboard.home[tier], tier).toMatch(/προτεραιότητα$/)
        }
        for (const tier of ['recPriorityCritical', 'recPriorityHigh', 'recPriorityMedium', 'recPriorityLow'] as const) {
            expect(en.dashboard.home[tier], tier).toMatch(/priority$/)
        }
    })

    it('no longer calls a coverage gap optional or nice to have', () => {
        // Match RENDERED labels, not the comment that records the old wording —
        // three assertions this session have tripped on their own explanation.
        const rendered = recCards.replace(/\/\*[\s\S]*?\*\//g, '')
        expect(rendered).not.toMatch(/en: "Nice to have"/)
        expect(rendered).not.toMatch(/el: "Προαιρετικό"/)
        expect(Object.values(el.dashboard.home).filter((v) => v === 'Προαιρετικό')).toEqual([])
        expect(Object.values(en.dashboard.home).filter((v) => v === 'Nice to have')).toEqual([])
    })

    it('resolves labels from translations rather than an inline bilingual map', () => {
        expect(recCards).toMatch(/const URGENCY_KEYS = \{/)
        expect(recCards).not.toMatch(/URGENCY_LABELS/)
    })

    it('uses a real scale label in the example card too', () => {
        // The empty-state preview showed "Συνιστάται", which is off-scale.
        expect(recCards).toMatch(/urgencyLabel=\{home\.recPriorityMedium\}/)
    })
})
