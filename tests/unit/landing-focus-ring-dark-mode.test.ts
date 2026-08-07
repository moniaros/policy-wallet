import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A focus ring that only has a light-mode colour fails in dark mode, and no
 * automated accessibility scanner will tell you.
 *
 * The hero chips and the eight FAQ summaries shipped with
 * `focus-visible:outline-[#29685B]` and no dark counterpart. On the dark page
 * background that measures **2.74:1** — under the 3:1 floor WCAG 2.1 SC 1.4.11
 * sets for focus indicators — on the one control the whole hero asks a keyboard
 * user to operate. axe-core reported zero violations throughout, because it has
 * no focus-indicator-contrast rule at all. With `dark:` variants added, the
 * same measurement reads 15.98:1 and 20.49:1.
 *
 * The invariant: in the landing tree, any focus-ring colour that is set for
 * light mode must have a dark-mode partner. It does not check the contrast
 * number — that needs a browser, and lives in the round-6 verification script —
 * it checks that the pair exists at all, which is the part that gets forgotten.
 */
describe('landing focus rings are defined for both colour schemes', () => {
    const dir = 'components/landing'
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.tsx'))
        .map((name) => join(dir, name))

    it('scans a real component tree', () => {
        expect(files.length).toBeGreaterThan(5)
    })

    it('every light-mode focus outline colour has a dark-mode counterpart', () => {
        // Tokenise on class boundaries rather than regex-matching inside the
        // source. A substring match is wrong here: `dark:peer-focus-visible:…`
        // also contains `focus-visible:…` starting after the `peer-`, so a
        // lookbehind for `dark:` reports the dark variant as a light one. That
        // exact false positive is why this is written token-first.
        const RING = /^(dark:)?((?:peer-|group-)?focus-visible:outline-\[#[0-9a-fA-F]{3,8}\])$/

        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            const light = new Set<string>()
            const dark = new Set<string>()

            for (const token of src.split(/[\s"'`{}]+/)) {
                const m = RING.exec(token)
                if (!m) continue
                // Key on the variant without its colour: the pair must differ in
                // colour, so comparing full tokens would never match.
                const key = m[2].replace(/outline-\[#[0-9a-fA-F]{3,8}\]$/, 'outline')
                ;(m[1] ? dark : light).add(key)
            }

            for (const key of light) {
                expect
                    .soft(
                        dark.has(key),
                        `${file}: "${key}-[#…]" is set for light mode with no dark: counterpart — the ring will be measured against the dark page background`
                    )
                    .toBe(true)
            }
        }
    })
})
