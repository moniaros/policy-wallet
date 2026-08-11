import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { ProtectionStatusHero } from '@/components/dashboard/home/ProtectionStatusHero'
import { ScoreMethodology } from '@/components/coverage/ScoreMethodology'

const LABELS = {
    kicker: 'Protection status',
    cta: 'Review my protection',
    reasonKicker: 'Biggest factor',
    provisionalBadge: 'Provisional estimate',
    provisionalHint: 'Based only on the gaps detected so far.',
    emptyTitle: 'Let’s see how protected you are',
    emptyBody: 'Upload your first policy and we will map where you stand.',
    emptyCta: 'Add your first policy',
    indeterminateTitle: 'We don’t know enough about you yet',
    indeterminateBody: 'Answer a few short questions about your life.',
    indeterminateCta: 'Complete my profile',
    methodologyTitle: 'How is this score calculated?',
    methodologyBody: 'We compare the lines of insurance expected for your profile…',
    methodologyLimits: 'The score does NOT assess premiums, insurers, or wording.',
    methodologyNotAdvice: 'Not personalised insurance advice.',
}

function renderHero(props: Partial<Parameters<typeof ProtectionStatusHero>[0]> = {}) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <ProtectionStatusHero
                    state="scored"
                    score={62}
                    ringToneClass="stroke-amber-500"
                    verdict="Needs improvement"
                    deltaLabel={null}
                    deltaDirection={null}
                    keyReason={null}
                    areasLine={null}
                    policyLine={null}
                    language="en"
                    labels={LABELS}
                    {...props}
                />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * The dashboard once rendered `0` inside a red ring under "Χρειάζεται προσοχή"
 * for anyone with no policies — a verdict on someone's protection when the
 * product knows nothing about it. The hero inherits StatTiles' honesty
 * contract: no number, no arc, no verdict and no methodology unless a real
 * figure renders.
 */
describe('protection status hero — no policies', () => {
    it('shows an invitation, never a number or a verdict', () => {
        renderHero({ state: 'empty', score: null, verdict: null })
        expect(screen.getByText(LABELS.emptyTitle)).toBeTruthy()
        expect(screen.queryByText('0')).toBeNull()
        expect(screen.queryByText('Needs improvement')).toBeNull()
    })

    it('draws no progress arc and offers no methodology with no score', () => {
        const { container } = renderHero({ state: 'empty', score: null, verdict: null })
        expect(container.querySelectorAll('path[stroke-dasharray]').length).toBe(0)
        expect(screen.queryByText(LABELS.methodologyTitle)).toBeNull()
    })
})

/**
 * A cached score computed from a life we know almost nothing about is a verdict
 * on our own ignorance, not on their cover. Indeterminate renders "not enough
 * information" — an em dash, not a number, and no methodology for a figure that
 * is not on screen.
 */
describe('protection status hero — indeterminate', () => {
    it('renders no number and no verdict, and routes to the profile', () => {
        const { container } = renderHero({ state: 'indeterminate', score: null, verdict: null })
        expect(screen.getByText(LABELS.indeterminateTitle)).toBeTruthy()
        // "—", not "0": scored-zero and not-scored are different claims.
        expect(screen.getByText('—')).toBeTruthy()
        expect(screen.queryByText('0')).toBeNull()
        expect(container.querySelectorAll('path[stroke-dasharray]').length).toBe(0)
        expect(screen.queryByText(LABELS.methodologyTitle)).toBeNull()
        const cta = screen.getByText(LABELS.indeterminateCta).closest('a')
        expect(cta?.getAttribute('href')).toBe('/insights/risk-profile')
    })
})

/**
 * Two different formulas can produce the figure: the weighted category engine,
 * or a flat per-severity penalty fallback. They are not the same measure and can
 * differ materially for the same portfolio, so the fallback says so.
 */
describe('protection status hero — provisional fallback', () => {
    it('labels the fallback estimate as provisional', () => {
        renderHero({ state: 'provisional', score: 62, verdict: 'Needs improvement' })
        expect(screen.getByText('Provisional estimate')).toBeTruthy()
        expect(screen.getByText(LABELS.provisionalHint)).toBeTruthy()
    })

    it('does not label the real engine score as provisional', () => {
        renderHero({ state: 'scored', score: 62, verdict: 'Needs improvement' })
        expect(screen.queryByText('Provisional estimate')).toBeNull()
    })
})

/**
 * Movement claims need two determinate assessments behind them. With nothing to
 * compare against, the hero must render NO delta chip — "±0 since —" would be a
 * fabricated comparison.
 */
describe('protection status hero — score movement', () => {
    it('renders no delta chip when there is nothing to compare', () => {
        const { container } = renderHero({ deltaLabel: null, deltaDirection: null })
        expect(container.textContent).not.toMatch(/since/)
    })

    it('renders the delta chip when a real comparison exists', () => {
        renderHero({ deltaLabel: '+6 since 12 Jul 2026', deltaDirection: 'up' })
        expect(screen.getByText('+6 since 12 Jul 2026')).toBeTruthy()
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
        // score (dashboard hero + coverage card) AND the per-policy health donut
        // — must ship with a methodology disclosure, never bare.
        for (const f of [
            'components/dashboard/home/ProtectionStatusHero.tsx',
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
