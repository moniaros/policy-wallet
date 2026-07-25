import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getGlossaryTerm } from '@/lib/glossary/content'
import { resolvePolicyGlossaryHints } from '@/lib/glossary/hints'

/**
 * "Sublimit" («Υποόριο») is a payout-critical term surfaced on the policy detail
 * as a notable condition (`sub_limit: 'Υποόριο κάλυψης'`) — a lower cap on a
 * specific cover, within the overall sum insured. It was NOT in the /lexiko
 * dictionary and, unlike deductible / waiting period / sum insured, had no
 * in-product glossary hint. Added the dictionary entry + wired the hint so the
 * term is explained where a policyholder actually reads it.
 */
describe('sublimit (Υποόριο) is defined in the dictionary and explained in-product', () => {
    it('the dictionary defines the ypoorio (sublimit) term, bilingually', () => {
        const term = getGlossaryTerm('ypoorio')
        expect(term).toBeTruthy()
        expect(term!.term.el).toBe('Υποόριο')
        expect(term!.term.en).toBe('Sublimit')
        // A real definition in both locales, not a stub.
        expect(term!.shortDefinition.el.length).toBeGreaterThan(60)
        expect(term!.shortDefinition.en.length).toBeGreaterThan(60)
        expect(term!.faq.length).toBeGreaterThan(0)
    })

    it('resolvePolicyGlossaryHints wires a sublimit hint that keeps the UI label', () => {
        const hints = resolvePolicyGlossaryHints('el', { sublimit: 'Υποόριο κάλυψης' })
        expect(hints.sublimit).toBeTruthy()
        expect(hints.sublimit!.heading).toBe('Υποόριο κάλυψης')
        expect(hints.sublimit!.href).toBe('/lexiko/ypoorio')
        expect(hints.sublimit!.definition.length).toBeGreaterThan(0)
    })

    it('ExclusionsCard renders a glossary hint for matching condition types', () => {
        const src = readFileSync('components/wallet/policy-detail/ExclusionsCard.tsx', 'utf-8')
        expect(src).toContain('conditionHints')
        expect(src).toMatch(/condHint \? <GlossaryHint/)
    })
})
