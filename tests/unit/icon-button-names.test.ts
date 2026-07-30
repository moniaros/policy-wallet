import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * An icon-only <button> with no accessible name is announced as "button".
 *
 * The desktop axe sweep at 1440px found five and I named them — but CustomerList
 * renders a SECOND set of call/email buttons for its mobile card layout, below
 * xl, which that sweep could never see. Re-running the same audit at 375px found
 * them. ClientDetailView's back arrow came out of the source sweep that followed,
 * since /customers/[id] was not in the crawled route list at all.
 *
 * The lesson generalises past this file: a fix applied to one breakpoint's
 * implementation does not reach the other's.
 */
describe('icon-only buttons have accessible names', () => {
    const sources = globSync('{components,app}/**/*.tsx').map(
        (f) => [f, readFileSync(f, 'utf-8')] as const
    )

    it('finds buttons to check (guard against a vacuous pass)', () => {
        const total = sources.reduce((n, [, s]) => n + (s.match(/<button/g)?.length ?? 0), 0)
        expect(total).toBeGreaterThan(100)
    })

    it('has no <button> whose only content is an icon and which carries no name', () => {
        const offenders: string[] = []
        for (const [file, src] of sources) {
            // <button …> <SomeIcon … /> </button>, with no aria-label/aria-labelledby/title
            const re = /<button(?![^>]*(?:aria-label|aria-labelledby|title)=)[^>]*>\s*<[A-Z]\w*[^>]*\/>\s*<\/button>/g
            for (const m of src.matchAll(re)) {
                offenders.push(`${file}: ${m[0].replace(/\s+/g, ' ').slice(0, 90)}`)
            }
        }
        expect(offenders, `unnamed icon buttons:\n${offenders.join('\n')}`).toEqual([])
    })

    it('names both breakpoint variants of the client call/email actions', () => {
        const src = readFileSync('components/agent/CustomerList.tsx', 'utf-8')
        // One pair for the table row, one for the mobile card.
        expect(src.match(/aria-label=\{t\.a11yLabels\.callClient\}/g)?.length).toBe(2)
        expect(src.match(/aria-label=\{t\.a11yLabels\.emailClient\}/g)?.length).toBe(2)
    })
})
