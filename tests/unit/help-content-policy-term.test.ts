import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { helpArticles } from '@/lib/help-content'

/**
 * The Greek help articles mixed «συμβόλαιο» (generic "contract") with the
 * dictionary's canonical «ασφαλιστήριο» (insurance policy) — even within one
 * article (title said «Συμβόλαιο», its own subtitle said «ασφαλιστήριά») — and
 * carried a recurring «Ασφαλιστήριου» genitive misspelling. Standardized on
 * «ασφαλιστήριο» to match the /lexiko dictionary and the rest of the product.
 */
const HELP = readFileSync('lib/help-content.ts', 'utf-8')

describe('Greek help content uses «ασφαλιστήριο» for the policy term', () => {
    it('contains no «συμβόλαιο» (use the canonical «ασφαλιστήριο»)', () => {
        expect(HELP).not.toMatch(/συμβόλαι/)
    })

    it('does not carry the «Ασφαλιστήριου» genitive misspelling', () => {
        // Correct genitive is «Ασφαλιστηρίου» (accent on the iota).
        expect(HELP).not.toMatch(/σφαλιστήριου/)
    })

    it('the first-upload article title now names the ασφαλιστήριο', () => {
        expect(helpArticles.el['upload-policy'].title).toContain('Ασφαλιστήριο')
    })
})
