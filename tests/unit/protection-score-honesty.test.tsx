import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { StatTiles } from '@/components/dashboard/home/StatTiles'
import { ScoreMethodology } from '@/components/coverage/ScoreMethodology'

const LABELS = {
    activePolicies: 'Active policies',
    protectionScore: 'Protection score',
    scoreSummary: 'Needs attention',
    gapsCount: '3 coverage gaps',
    scoreUnavailable: 'No data yet',
    scoreUnavailableHint: 'Add a policy to have your score calculated.',
    provisional: 'Provisional estimate',
    provisionalHint: 'Based only on the gaps detected so far.',
    methodologyTitle: 'How is this score calculated?',
    methodologyBody: 'We compare the lines of insurance expected for your profile…',
    methodologyLimits: 'The score does NOT assess premiums, insurers, or wording.',
    methodologyNotAdvice: 'Not personalised insurance advice.',
}

/**
 * The dashboard rendered `0` inside a red ring under "Χρειάζεται προσοχή" for
 * anyone with no policies — a verdict on someone's protection when the product
 * knows nothing about it. The same bug was fixed on /coverage-insights in
 * 65183b7; /dashboard kept it, and /dashboard is where people land.
 */
describe('protection score — no policies', () => {
    it('shows no number and no verdict when there is nothing to score', () => {
        // activeCount is 3 so a stray "0" can only have come from the score.
        render(<StatTiles activeCount={3} healthScore={null} openGapCount={0} labels={LABELS} />)
        expect(screen.getByText('No data yet')).toBeTruthy()
        // "—", not "0": scored-zero and not-scored are different claims.
        expect(screen.getByText('—')).toBeTruthy()
        expect(screen.queryByText('0')).toBeNull()
        expect(screen.queryByText('Needs attention')).toBeNull()
    })

    it('draws no coloured progress arc with no score', () => {
        const { container } = render(
            <StatTiles activeCount={0} healthScore={null} openGapCount={0} labels={LABELS} />
        )
        const arcs = container.querySelectorAll('path[stroke-dasharray]')
        expect(arcs.length).toBe(0)
    })

    it('does not offer a methodology explainer for a score that does not exist', () => {
        render(<StatTiles activeCount={3} healthScore={null} openGapCount={0} labels={LABELS} />)
        expect(screen.queryByText('How is this score calculated?')).toBeNull()
    })
})

/**
 * Two different formulas can produce the figure: the weighted category engine,
 * or a flat per-severity penalty fallback. They are not the same measure and can
 * differ materially for the same portfolio, so the fallback says so.
 */
describe('protection score — provisional fallback', () => {
    it('labels the fallback estimate as provisional', () => {
        render(<StatTiles activeCount={2} healthScore={62} openGapCount={3} isProvisional labels={LABELS} />)
        expect(screen.getByText('Provisional estimate')).toBeTruthy()
        expect(screen.getByText('Based only on the gaps detected so far.')).toBeTruthy()
    })

    it('does not label the real engine score as provisional', () => {
        render(<StatTiles activeCount={2} healthScore={62} openGapCount={3} labels={LABELS} />)
        expect(screen.queryByText('Provisional estimate')).toBeNull()
        expect(screen.getByText('3 coverage gaps')).toBeTruthy()
    })
})

describe('score methodology disclosure', () => {
    it('states what the score does not measure, and that it is not advice', () => {
        render(
            <ScoreMethodology
                copy={{
                    title: LABELS.methodologyTitle,
                    body: LABELS.methodologyBody,
                    limits: LABELS.methodologyLimits,
                    notAdvice: LABELS.methodologyNotAdvice,
                }}
            />
        )
        expect(screen.getByText(/does NOT assess premiums/)).toBeTruthy()
        expect(screen.getByText(/Not personalised insurance advice/)).toBeTruthy()
    })

    it('accompanies every score we render', () => {
        // Every 0-100 figure with a colour verdict — the portfolio protection
        // score (dashboard tile + coverage card) AND the per-policy health donut
        // — must ship with a methodology disclosure, never bare.
        for (const f of [
            'components/dashboard/home/StatTiles.tsx',
            'components/coverage/ProtectionScoreCard.tsx',
            'components/wallet/policy-detail/SummaryCard.tsx',
        ]) {
            // Require the actual JSX render, not merely the imported symbol —
            // an import alone leaves the score bare on screen.
            expect(readFileSync(f, 'utf-8'), `${f} renders a score with no methodology`).toMatch(
                /<ScoreMethodology/
            )
        }
    })
})

/**
 * The per-policy health donut is a 0-100 score with a verdict; it must explain
 * what it measures and disown adequacy / claim-outcome readings, the same as the
 * portfolio score. Exclusions must NOT lower it (every policy has them — the
 * engine comment records the prior bug where they did).
 */
describe('per-policy health score is explained, not bare', () => {
    it.each(['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'])(
        '%s: health-score methodology exists and states its limits',
        (file) => {
            const src = readFileSync(file, 'utf-8')
            expect(src).toMatch(/methodologyTitle:/)
            expect(src).toMatch(/methodologyBody:/)
            const isEl = file.includes('el.ts')
            if (isEl) {
                expect(src).toContain('ούτε αν μια ζημιά θα αποζημιωθεί')
                expect(src).toContain('Οι εξαιρέσεις δεν μειώνουν τον δείκτη')
            } else {
                expect(src).toMatch(/nor whether a loss will be paid/)
                expect(src).toMatch(/Exclusions do not lower it/)
            }
        }
    )
})

/**
 * Governance: the score's own explanation must disown the two misreadings a
 * policyholder is most likely to make — that a high score means they are safely
 * insured, or that a low score means a claim will be refused. The score measures
 * the BREADTH of cover held, not its adequacy or any claim outcome.
 */
describe('score methodology disowns the dangerous misreadings', () => {
    it('EN: a high score is not "adequately insured" and a low score is not "claim rejected"', () => {
        const en = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
        const limits = /scoreMethodologyLimits:\s*'([^']*)'/.exec(en)?.[1] || ''
        expect(limits).toMatch(/high score does not mean you are adequately insured/i)
        expect(limits).toMatch(/low score does not mean a claim will be rejected/i)
        expect(limits.toLowerCase()).toContain('breadth')
    })
    it('EL: high score ≠ επαρκή ασφάλιση, low score ≠ απορριφθεί απαίτηση', () => {
        const el = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
        const limits = /scoreMethodologyLimits:\s*'([^']*)'/.exec(el)?.[1] || ''
        expect(limits).toContain('Υψηλή βαθμολογία δεν σημαίνει επαρκή ασφάλιση')
        expect(limits).toContain('δεν σημαίνει ότι μια απαίτηση θα απορριφθεί')
    })
})

/**
 * "Ευκαιρίες εξοικονόμησης" / "Savings opportunities" headed a check that only
 * counts branches holding more than one active policy. Two cars, or life cover
 * for two people, is not evidence of savings — and "no savings opportunities
 * today" asserts a price comparison the product never performed.
 */
describe('overlap check must not claim savings', () => {
    it.each(['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'])(
        '%s does not headline the overlap check as savings',
        (file) => {
            const src = readFileSync(file, 'utf-8')
            const kicker = /savingsKicker:\s*'([^']*)'/.exec(src)?.[1] || ''
            expect(kicker.toLowerCase()).not.toMatch(/savings|εξοικονόμησ/)
            const none = /noSavings:\s*'([^']*)'/.exec(src)?.[1] || ''
            expect(none.toLowerCase()).not.toMatch(/savings|εξοικονόμησ/)
        }
    )
})
