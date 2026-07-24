import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

const GU = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ'
// Final sigma (ς) MUST be here. Omitting it made the first casing sweep skip
// every value containing a word ending in ς — which in Greek is most genitives
// and masculine nominatives — leaving ~140 Title Case labels behind.
const GL = 'αβγδεζηθικλμνξοπρσςτυφχψωάέήίόύώϊϋΐΰ'
const isTitleCase = (w: string) => w.length >= 2 && GU.includes(w[0]) && [...w.slice(1)].every((c) => GL.includes(c))

/**
 * Greek uses sentence case, not English-style Title Case. Title Case on a Greek
 * UI label is the unmistakable tell of machine translation. The LOB/branch
 * taxonomy is exempt — those are double-quoted product-category names that are
 * market-standard Title Case in Greek insurance.
 */
describe('Greek UI labels use sentence case', () => {
    // Both quote styles. The first version of this test matched single quotes
    // only, so it passed while 66 double-quoted values stayed Title Case —
    // including the client-overview stat labels an agent reads on every visit.
    it('has no Title Case labels left, in either quote style', () => {
        const src = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
        const offenders: string[] = []
        // Coverage names ("Οδική Βοήθεια", "Νομική Προστασία") are market-standard
        // Title Case in Greek policy wordings — product names, not UI chrome.
        const coverageTaxonomy = src.slice(src.indexOf('policyTypes:'), src.indexOf('policyTypes:') + 2200)
        for (const m of src.matchAll(/(\w+):\s*(['"])([^'"]{3,60})\2/g)) {
            const [full, key, , val] = m
            if (/[.;!?,·:0-9A-Za-z/()→]/.test(val)) continue
            if (coverageTaxonomy.includes(full)) continue
            const words = val.split(' ')
            if (words.length < 2 || words.length > 4) continue
            if (!isTitleCase(words[0])) continue
            if (words.filter(isTitleCase).length >= 2) offenders.push(`${key}: ${val}`)
        }
        expect(offenders, `Title Case Greek labels:\n${offenders.join('\n')}`).toEqual([])
    })

    it('keeps final sigma in the lowercase set (the bug that hid 140 labels)', () => {
        expect(GL).toContain('ς')
    })

    // The first sweep scanned lib/i18n/translations only, so it reported clean
    // while 58 Title Case labels stayed live in the UI: components carry their
    // own inline `{ el: '…', en: '…' }` maps, and `lint:i18n-changed` inspects
    // only CHANGED files, so untouched ones are never checked at all. This
    // scans the rendered source, which is where the user actually reads Greek.
    it('has no Title Case in components inline el/en maps', () => {
        const files = globSync('{components,app}/**/*.tsx')
        // A capital is correct at the start and after any of these — '·' and '|'
        // join separate labels into one string; '&' starts a new noun phrase.
        const restarts = ['.', '!', '?', ':', '·', '|', '—', '–', '&']
        const proper = new Set(['Ελλάδα', 'Ελλάδας', 'PolicyWallet', 'Tokens', 'Token', 'AI', 'PDF', 'Stripe', 'Google'])
        const offenders: string[] = []
        for (const file of files) {
            for (const m of readFileSync(file, 'utf-8').matchAll(/el:\s*['"]([^'"]{4,})['"]/g)) {
                let atStart = true
                for (const tok of m[1].split(/\s+/)) {
                    const core = tok.replace(/^[«"'(]+|[»"')]+$/g, '')
                    if (!atStart && core.length > 2 && GU.includes(core[0]) && !proper.has(core) && core !== core.toUpperCase()) {
                        offenders.push(`${file}: ${m[1]}`)
                    }
                    atStart = restarts.some((r) => tok.endsWith(r))
                }
            }
        }
        expect(offenders, `Title Case Greek in inline maps:\n${offenders.join('\n')}`).toEqual([])
    })
})
