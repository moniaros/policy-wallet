import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The Greek UI mixed «συμβόλαιο» (contract) and «ασφαλιστήριο» for the same
 * concept — "policy" — 151 vs 59. Owner ratified «ασφαλιστήριο» (the /lexiko
 * dictionary headword, and the word printed on actual Greek policy documents),
 * so the whole UI is standardized on it. «σύμβαση» (a legal contract/agreement,
 * e.g. «ασφαλιστική σύμβαση») is a DIFFERENT word and is intentionally kept.
 */
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

describe('policy term is «ασφαλιστήριο», never «συμβόλαιο»', () => {
    it('no «συμβόλαι…» form remains in the Greek UI', () => {
        expect(EL).not.toMatch(/συμβόλαι/i)
        expect(EL).not.toMatch(/συμβολαί/i)
    })

    it('EN policy-meaning labels say "policy"/"Insurer", not "contract"', () => {
        expect(EN).toContain('downloadContract: "Download policy"')
        expect(EN).not.toContain('contractInsurer: "Contract Insurer"')
        // The legal-concept usage in the proposal disclaimer is intentionally kept.
        expect(EN).toMatch(/not a binding insurance contract/)
    })
})
