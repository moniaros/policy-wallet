import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getGlossaryTerm } from '@/lib/glossary/content'
import { resolvePolicyGlossaryHints } from '@/lib/glossary/hints'

/**
 * The dictionary defines 14 insurance terms and backs a full public /lexiko
 * section — but only `exairesi` was ever wired into the product. So a
 * policyholder met «Απαλλαγή» and «Περίοδοι αναμονής» on their own policy with
 * no explanation, while the definition sat one route away as SEO content.
 *
 * These two decide what someone is actually paid after a claim: the deductible
 * is the slice they bear themselves, and the waiting period is the window in
 * which a cover they are paying for does not yet respond. If any terms in the
 * product deserve explaining at the point of reading, it is these.
 */
describe('the dictionary explains terms where the policyholder meets them', () => {
    it('resolves both hints with real definitions in both languages', () => {
        for (const lang of ['el', 'en'] as const) {
            const hints = resolvePolicyGlossaryHints(lang, { deductible: 'D', waitingPeriod: 'W' })
            expect(hints.deductible, `${lang} deductible`).toBeTruthy()
            expect(hints.waitingPeriod, `${lang} waiting period`).toBeTruthy()
            expect(hints.deductible!.definition.length).toBeGreaterThan(40)
            expect(hints.waitingPeriod!.definition.length).toBeGreaterThan(40)
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

    it('the slugs it depends on actually exist in the dictionary', () => {
        // A typo'd slug returns null and the hint silently disappears.
        expect(getGlossaryTerm('apallagi')).toBeTruthy()
        expect(getGlossaryTerm('chronos-anamonis')).toBeTruthy()
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
