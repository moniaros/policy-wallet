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

    it('accompanies every protection score we render', () => {
        // Both surfaces show a 0-100 figure with a colour verdict; neither may
        // ship it bare.
        for (const f of [
            'components/dashboard/home/StatTiles.tsx',
            'components/coverage/ProtectionScoreCard.tsx',
        ]) {
            expect(readFileSync(f, 'utf-8'), `${f} renders a score with no methodology`).toContain(
                'ScoreMethodology'
            )
        }
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
