import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getGlossaryTerm, glossaryTerms } from '@/lib/glossary/content'
import { resolvePolicyGlossaryHints } from '@/lib/glossary/hints'

/**
 * The dictionary defines 14 insurance terms and backs a full public /lexiko
 * section — but only `exairesi` was ever wired into the product. So a
 * policyholder met «Απαλλαγή» and «Περίοδοι αναμονής» on their own policy with
 * no explanation, while the definition sat one route away as SEO content.
 *
 * Nine terms are now explained at the point of reading, each on the branch card
 * where the policyholder actually meets it: deductible and waiting period
 * (health), comprehensive cover / roadside / Green Card (motor), beneficiary and
 * surrender value (life), sum insured and underinsurance (home). These are the
 * ones that decide what someone is actually paid — the deductible is the slice
 * they bear themselves, the waiting period is the window in which a cover they
 * are already paying for does not yet respond, and underinsurance is why a
 * settled claim can still come up short.
 */
describe('the dictionary explains terms where the policyholder meets them', () => {
    // Verified in a browser per branch with real acordData: motor renders
    // Βαθμίδα κάλυψης / Οδική βοήθεια / Πράσινη κάρτα, life renders Δικαιούχοι /
    // Αξία εξαγοράς, home renders Ασφαλισμένη αξία / Σύγκριση αξιών, health
    // renders Απαλλαγή ανά ζημιά / Περίοδοι αναμονής.
    const ALL_KEYS = ['deductible', 'waitingPeriod', 'greenCard', 'roadside', 'comprehensive',
        'beneficiary', 'surrender', 'sumInsured', 'underinsurance'] as const

    it('resolves every hint with a real definition in both languages', () => {
        for (const lang of ['el', 'en'] as const) {
            const hints = resolvePolicyGlossaryHints(lang, {})
            for (const key of ALL_KEYS) {
                expect(hints[key], `${lang} ${key}`).toBeTruthy()
                expect(hints[key]!.definition.length, `${lang} ${key} definition`).toBeGreaterThan(40)
            }
        }
    })

    it('keeps the caller’s visible label as the heading', () => {
        // The hint must not rename the field it annotates — the policy says
        // "Απαλλαγή ανά ζημιά", the dictionary headword is just "Απαλλαγή".
        const hints = resolvePolicyGlossaryHints('el', { deductible: 'Απαλλαγή ανά ζημιά', waitingPeriod: 'Περίοδοι αναμονής' })
        expect(hints.deductible!.heading).toBe('Απαλλαγή ανά ζημιά')
        expect(hints.waitingPeriod!.heading).toBe('Περίοδοι αναμονής')
    })

    it('links to the live dictionary route for the reader’s language', () => {
        expect(resolvePolicyGlossaryHints('el', { deductible: 'd', waitingPeriod: 'w' }).deductible!.href)
            .toBe('/lexiko/apallagi')
        expect(resolvePolicyGlossaryHints('en', { deductible: 'd', waitingPeriod: 'w' }).deductible!.href)
            .toBe('/en/lexiko/apallagi')
    })

    it('every slug it depends on actually exists in the dictionary', () => {
        // A typo'd slug returns null and the hint silently disappears — the
        // label still renders, so nothing looks broken. Pin them all.
        for (const slug of ['apallagi', 'chronos-anamonis', 'prasini-karta', 'odiki-voitheia',
            'mikti-asfaleia', 'dikaiouchos', 'exagora', 'asfalismeno-kefalaio', 'ypasfalisi']) {
            expect(getGlossaryTerm(slug), slug).toBeTruthy()
        }
    })

    it('every branch card renders hints without importing the glossary', () => {
        for (const card of ['Health', 'Motor', 'Life', 'Home']) {
            const src = readFileSync(`components/wallet/coverage-details/${card}CoverageDetails.tsx`, 'utf-8')
            expect(src, `${card}: renders a hint`).toMatch(/hints\?\.\w+ \? <GlossaryHint/)
            expect(src, `${card}: must not bundle the 62KB glossary`).not.toMatch(/from "@\/lib\/glossary\/content"/)
        }
    })

    it('renders the hint in the health card, falling back to the plain label', () => {
        const src = readFileSync('components/wallet/coverage-details/HealthCoverageDetails.tsx', 'utf-8')
        expect(src).toMatch(/hints\?\.waitingPeriod \? <GlossaryHint hint=\{hints\.waitingPeriod\} \/> : healthCopy\.waitingPeriods/)
        expect(src).toMatch(/hints\?\.deductible \? <GlossaryHint hint=\{hints\.deductible\} \/> : healthCopy\.deductiblePerClaim/)
    })

    it('resolves server-side so the 62KB glossary never reaches the client', () => {
        // Verified in a browser too: no chunk loaded by /wallet/[id] contains a
        // glossary headword. This pins the boundary that keeps it that way.
        const card = readFileSync('components/wallet/coverage-details/HealthCoverageDetails.tsx', 'utf-8')
        expect(card).toMatch(/import type \{ PolicyGlossaryHints \}/)   // type-only
        expect(card).not.toMatch(/from "@\/lib\/glossary\/content"/)
        const tab = readFileSync('components/wallet/coverage-details/CoverageTabView.tsx', 'utf-8')
        expect(tab).not.toMatch(/from "@\/lib\/glossary\/content"/)
    })
})

/**
 * Renewal + lapse are the two terms that answer "what happens if I take no
 * action" — the literacy question a policyholder most needs help with, and the
 * one the renewals status labels («Έληξε», «Εκπνοή») never explained. Both are
 * now defined AND wired onto the policy-detail key-dates block.
 */
describe('renewal & lapse are explained where inaction has consequences', () => {
    it('defines both terms in both languages, answer-first', () => {
        for (const slug of ['ananeosi', 'ekpnoi']) {
            const term = getGlossaryTerm(slug)
            expect(term, slug).toBeTruthy()
            // shortDefinition is the 40–60 word extractable answer.
            expect(term!.shortDefinition.el.length, `${slug} el`).toBeGreaterThan(120)
            expect(term!.shortDefinition.en.length, `${slug} en`).toBeGreaterThan(120)
        }
    })

    it('the lapse definition states the material consequence (no cover for new losses)', () => {
        const el = getGlossaryTerm('ekpnoi')!.shortDefinition.el
        const en = getGlossaryTerm('ekpnoi')!.shortDefinition.en
        expect(el).toMatch(/δεν έχετε κάλυψη/)
        expect(en).toMatch(/no cover/)
    })

    it('resolves both as policy hints, linking to the live route', () => {
        const hEl = resolvePolicyGlossaryHints('el', {})
        expect(hEl.renewal, 'renewal el').toBeTruthy()
        expect(hEl.lapse, 'lapse el').toBeTruthy()
        expect(hEl.renewal!.href).toBe('/lexiko/ananeosi')
        expect(resolvePolicyGlossaryHints('en', {}).lapse!.href).toBe('/en/lexiko/ekpnoi')
    })

    it('wires the renewal hint onto the key-dates card, falling back to the plain label', () => {
        const src = readFileSync('components/wallet/policy-detail/KeyDatesCard.tsx', 'utf-8')
        expect(src).toMatch(/renewalHint \? <GlossaryHint hint=\{renewalHint\} \/> : copy\.renewalDateLabel/)
    })
})

/**
 * A dangling /lexiko cross-link is a silent literacy dead-end: the "Read more"
 * on a related term 404s. Every internal /lexiko/<slug> href must resolve.
 */
describe('glossary cross-links are not dead ends', () => {
    it('every related /lexiko link points to a term that exists', () => {
        for (const term of glossaryTerms) {
            for (const rel of term.related ?? []) {
                const m = rel.href.match(/^\/lexiko\/([a-z0-9-]+)$/)
                if (!m) continue // non-glossary links (/product, /guides) are out of scope here
                expect(getGlossaryTerm(m[1]), `${term.slug} → ${rel.href}`).toBeTruthy()
            }
        }
    })
})
