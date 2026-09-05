import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { ProtectionStatusHero } from '@/components/dashboard/home/ProtectionStatusHero'
import { ScoreMethodology } from '@/components/coverage/ScoreMethodology'
import { portfolioFacts, scoreSupport } from '@/lib/dashboard/portfolio-summary'

const LABELS = {
    kicker: 'Protection status',
    cta: 'Review my protection',
    emptyTitle: 'Let’s see how protected you are',
    emptyBody: 'Upload your first policy and we will map where you stand.',
    emptyCta: 'Add your first policy',
}

function renderHero(props: Partial<Parameters<typeof ProtectionStatusHero>[0]> = {}) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <ProtectionStatusHero
                    hasPolicies={true}
                    facts={[
                        { kind: "total", count: 12, label: "12 policies" },
                        { kind: "expiringSoon", count: 3, label: "3 expire soon" },
                        { kind: "neverAnalysed", count: 2, label: "2 not analysed" },
                    ]}
                    areasLine={null}
                    openRecommendationCount={0}
                    language="en"
                    labels={LABELS}
                    {...props}
                />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * THE PROTECTION SCORE IS GONE — this suite now guards its ABSENCE.
 *
 * The hero once rendered a number in a ring with a verdict word beside it:
 * «Καλή κάλυψη» over a single never-analysed policy, «Χρειάζεται βελτίωση»
 * over a wallet with no cover at all, `0` in a red ring for someone who had
 * simply not uploaded anything. The score — a breadth average presented as a
 * protection verdict, with severities unvalidated pending underwriter
 * review — was removed from the product in Aug 2026 (PW-MOBILE-TRANSFORM-01,
 * halt H-001). What renders instead is the factual composition: counts of
 * things the wallet contains, which cannot be a false statement about
 * anyone's protection.
 */
describe('protection status hero — no policies', () => {
    it('shows an invitation, never a number or a verdict', () => {
        renderHero({ hasPolicies: false, facts: [] })
        expect(screen.getByText(LABELS.emptyTitle)).toBeTruthy()
        expect(screen.queryByText('0')).toBeNull()
        expect(screen.queryByText('Needs improvement')).toBeNull()
    })

    it('routes its only action to the upload flow', () => {
        renderHero({ hasPolicies: false, facts: [] })
        const cta = screen.getByText(LABELS.emptyCta).closest('a')
        expect(cta?.getAttribute('href')).toBe('/wallet/add')
        expect(cta?.getAttribute('data-action')).toBe('upload')
    })
})

describe('protection status hero — the headline is the facts', () => {
    it('renders every fact, instrumented with data-count', () => {
        const { container } = renderHero()
        const heading = container.querySelector('#protection-status-heading')
        expect(heading?.textContent).toContain('12 policies')
        expect(heading?.textContent).toContain('3 expire soon')
        expect(heading?.textContent).toContain('2 not analysed')
        // The PLAN's registered keys (lib/instrumentation/count-keys.ts) — the
        // first pass stamped the raw fact kinds (`portfolio.total`), which
        // coined keys the plan never agreed.
        expect(container.querySelector('[data-count="portfolio.policyCount"]')?.textContent).toBe('12 policies')
        expect(container.querySelector('[data-count="portfolio.expiringCount"]')?.textContent).toBe('3 expire soon')
        expect(container.querySelector('[data-count="portfolio.neverAnalysedCount"]')?.textContent).toBe('2 not analysed')
    })

    it('renders no score: no number, no ring, no disclosure, no methodology', () => {
        const { container } = renderHero()
        // No SVG progress arc of any kind.
        expect(container.querySelectorAll('path[stroke-dasharray], circle[stroke-dasharray]').length).toBe(0)
        // No <details> disclosure — the score's last home on this surface.
        expect(container.querySelector('details')).toBeNull()
        // No score vocabulary at all.
        expect(container.textContent).not.toMatch(/score|σκορ|βαθμολογία|\/100|\d+%/i)
    })

    it('never renders a verdict word', () => {
        const { container } = renderHero()
        for (const verdict of ['Needs improvement', 'Good coverage', 'Needs attention', 'Καλή κάλυψη', 'Χρειάζεται βελτίωση']) {
            expect(container.textContent).not.toContain(verdict)
        }
    })

    it('the areas line renders as a counted fact, with the AI disclaimer at point of use', () => {
        const { container } = renderHero({ areasLine: '3 risk categories may need review', openRecommendationCount: 3 })
        const line = container.querySelector('[data-count="recommendation.openCount"]')
        expect(line?.textContent).toBe('3 risk categories may need review')
    })

    it('omits the AI disclaimer when only recorded facts render', () => {
        // The facts are counts of rows in the wallet; stamping them "AI-derived"
        // would be its own small dishonesty.
        const { container } = renderHero({ areasLine: null })
        expect(container.textContent).not.toMatch(/AI|τεχνητή νοημοσύνη/i)
    })

    it('routes its primary action to coverage insights', () => {
        const { container } = renderHero()
        const cta = container.querySelector('a[href="/protection"]')
        expect(cta).toBeTruthy()
        expect(cta?.getAttribute('data-action')).toBe('reviewCoverage')
    })
})

/**
 * The regulated methodology disclosure OUTLIVES the portfolio score: the
 * wallet's per-policy indicator (a different metric — completeness of one
 * policy's extraction, not a protection grade) still renders it, and its
 * not-advice line is compliance wording under IDD / Law 4583/2018.
 */
describe('score methodology disclosure (per-policy indicator)', () => {
    it('states what the indicator does not measure, and that it is not advice', () => {
        render(
            <ScoreMethodology
                copy={{
                    title: 'How is this calculated?',
                    body: 'We compare…',
                    limits: 'The indicator does NOT assess premiums, insurers, or wording.',
                    notAdvice: 'Not personalised insurance advice.',
                }}
            />
        )
        expect(screen.getByText(/does NOT assess premiums/)).toBeTruthy()
        expect(screen.getByText(/Not personalised insurance advice/)).toBeTruthy()
    })

    it('accompanies the per-policy indicator, the one 0-100 figure left', () => {
        expect(
            readFileSync('components/wallet/policy-detail/SummaryCard.tsx', 'utf-8'),
            'SummaryCard renders a score with no methodology'
        ).toMatch(/<ScoreMethodology/)
    })

    it.each(['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'])(
        '%s: per-policy methodology exists and states its limits',
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
 * The pure rules stay, because they are the honest core the removal kept:
 * what may be SAID about a portfolio is derived from what the wallet
 * contains. (`scoreSupport` no longer gates a render — nothing renders a
 * score — but it remains the single statement of when a breadth figure could
 * ever be supported, and agent-side consumers are out of this run's scope.)
 */
describe('scoreSupport / portfolioFacts', () => {
    it('withholds support when nothing has been analysed', () => {
        expect(scoreSupport({ total: 3, expired: 0, expiringSoon: 0, neverAnalysed: 3, analysisFailed: 0, unassessed: 0, assessed: 0 }))
            .toEqual({ supported: false, reason: 'nothing_analysed' })
    })

    it('withholds support when every policy has expired', () => {
        expect(scoreSupport({ total: 4, expired: 4, expiringSoon: 0, neverAnalysed: 0, analysisFailed: 0, unassessed: 0, assessed: 0 }))
            .toEqual({ supported: false, reason: 'no_active_cover' })
    })

    it('still supports a wallet where only SOME policies are unanalysed', () => {
        expect(scoreSupport({ total: 12, expired: 1, expiringSoon: 3, neverAnalysed: 2, analysisFailed: 1, unassessed: 0, assessed: 0 }))
            .toEqual({ supported: true })
    })

    it('leads with the total and omits zero-valued facts', () => {
        const facts = portfolioFacts({ total: 12, expired: 0, expiringSoon: 3, neverAnalysed: 2, analysisFailed: 0, unassessed: 0, assessed: 0 })
        expect(facts.map((f) => f.kind)).toEqual(['total', 'expiringSoon', 'neverAnalysed'])
        expect(facts[0].count).toBe(12)
    })
})
