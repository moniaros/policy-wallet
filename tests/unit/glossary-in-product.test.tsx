import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { GlossaryHint } from '@/components/insurance/GlossaryHint'
import { resolveGlossaryHint } from '@/lib/glossary/hints'

/**
 * PolicyWallet ships a full Greek insurance dictionary at /lexiko and none of it
 * was reachable from inside the product: a policyholder reading their own policy
 * saw "Εξαίρεση" as a bare label. Those terms decide what gets paid.
 */
describe('glossary hints inside the product', () => {
    it('resolves a real term from the same source as the public pages', () => {
        const hint = resolveGlossaryHint('exairesi', 'el')
        expect(hint).toBeTruthy()
        expect(hint!.definition.length).toBeGreaterThan(40)
        expect(hint!.href).toBe('/lexiko/exairesi')
    })

    it('points at the English term page for English readers', () => {
        expect(resolveGlossaryHint('apallagi', 'en')!.href).toBe('/en/lexiko/apallagi')
    })

    it('returns null for an unknown slug rather than throwing', () => {
        expect(resolveGlossaryHint('not-a-term', 'el')).toBeNull()
    })

    it('renders the definition and a link to the full entry', () => {
        render(<GlossaryHint hint={resolveGlossaryHint('exairesi', 'el')!} />)
        expect(screen.getByRole('link', { name: 'Περισσότερα' })).toBeTruthy()
    })

    it('keeps the glossary module out of the client bundle', () => {
        // The policy-detail tree is a client component; importing the glossary
        // there would ship all twelve terms, both locales, bodies and FAQs.
        const hint = readFileSync('components/insurance/GlossaryHint.tsx', 'utf-8')
        expect(hint).not.toContain('@/lib/glossary/content')
        const card = readFileSync('components/wallet/policy-detail/ExclusionsCard.tsx', 'utf-8')
        expect(card).not.toContain('@/lib/glossary/content')
    })

    it('is actually wired into the exclusions card', () => {
        const card = readFileSync('components/wallet/policy-detail/ExclusionsCard.tsx', 'utf-8')
        expect(card).toContain('GlossaryHint')
        // Grafí G8: resolved in lib/app/policy-detail-model.ts, rendered under the checklist on PolicyDetailScreen.
        const page = readFileSync('lib/app/policy-detail-model.ts', 'utf-8')
        expect(page).toContain('resolveGlossaryHint("exairesi"')
        expect(readFileSync('app/(protected)/policies/[id]/PolicyDetailScreen.tsx', 'utf-8')).toContain('GlossaryHint')
    })
})
