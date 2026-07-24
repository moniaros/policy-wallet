import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const client = readFileSync('app/(protected)/opportunities/OpportunitiesClient.tsx', 'utf-8')
const scoring = readFileSync('lib/services/gap-engine/opportunity-scoring.ts', 'utf-8')

/**
 * The opportunities table sorts an agent's day by a "likelihood" column.
 *
 * That score is a documented heuristic — gap severity 40%, profile completeness
 * 20%, engagement 20%, detection recency 20% — and nothing more. The product
 * records won/lost on every opportunity, so the outcome data to calibrate it
 * exists; the score does not use it. Presenting «Υψηλή» unqualified invites an
 * intermediary to read a prioritisation aid as a forecast.
 *
 * Same class as the priority badges and the risk grades: a heuristic shown as a
 * verdict. The fix is the same one — say what it is.
 */
describe('conversion likelihood says what it is built from', () => {
    it('names the four factors and denies the one it lacks', () => {
        expect(el.agentPages.opportunities.likelihoodNote).toMatch(/σοβαρότητα του κενού/)
        expect(el.agentPages.opportunities.likelihoodNote).toMatch(/όχι από ιστορικό πραγματικών πωλήσεων/)
        expect(en.agentPages.opportunities.likelihoodNote).toMatch(/gap severity/i)
        expect(en.agentPages.opportunities.likelihoodNote).toMatch(/not from your past conversion history/i)
    })

    it('renders the note on the table that sorts by it', () => {
        expect(client).toMatch(/opp_t\.likelihoodNote/)
    })

    it('still describes the same four factors the scorer actually uses', () => {
        // If the weighting changes, the note must change with it.
        for (const factor of ['gapSeverity', 'profileCompleteness', 'engagementScore', 'detectionRecency']) {
            expect(scoring, factor).toContain(factor)
        }
    })

    it('has no outcome feedback yet — the claim in the note is true', () => {
        // The note says the score is not built on conversion history. Assert
        // that stays honest: if won/lost ever feeds the scorer, update the copy.
        expect(scoring).not.toMatch(/['"]won['"]/)
    })
})
