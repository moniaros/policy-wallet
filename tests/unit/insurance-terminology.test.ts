import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const values = (key: string) =>
    [...EL.matchAll(new RegExp(`\\b${key}:\\s*'([^']*)'`, 'g'))].map((m) => m[1])

/**
 * Terminology checked against the PolicyWallet dictionary
 * (policywallet.gr/lexiko). An insurance product that calls the same thing
 * three names reads as though nobody in insurance wrote it.
 */
describe('Greek insurance terminology', () => {
    it('names the agent role consistently', () => {
        // The role switcher and B2C copy said "Σύμβουλος"; the pricing page said
        // "Πράκτορας", so an agent switching roles saw a different job title
        // than the one on their own billing screen.
        const names = new Set(values('agent'))
        for (const n of names) {
            expect(n, `unexpected agent role name: ${n}`).toMatch(/[Σσ]ύμβουλος/)
        }
    })

    it('uses ζημιά, not αξίωση, for a per-claim deductible', () => {
        // Αξίωση is the legal-claim sense; Greek insurance practice is "ανά ζημιά".
        for (const v of values('deductiblePerClaim')) {
            expect(v).toMatch(/ζημι/)
            expect(v).not.toMatch(/Αξίωσ/)
        }
    })

    it('keeps the dictionary headwords for the terms that decide payouts', () => {
        // Απαλλαγή, Ασφαλισμένο κεφάλαιο and Εξαίρεση are the dictionary's own
        // headwords; drifting off them breaks the link to /lexiko.
        expect(values('deductible').every((v) => /Απαλλαγή/.test(v))).toBe(true)
        expect(values('sumInsured').every((v) => /Ασφαλισμένο κεφάλαιο/i.test(v))).toBe(true)
    })
})
