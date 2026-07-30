import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from "node:fs"
import { globSync } from "../helpers/glob"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Follow a loading.tsx through to the component that actually renders it. */
function resolved(file: string, depth = 0): string {
    if (depth > 3) return ''
    const src = readFileSync(file, 'utf-8')
    let out = src
    for (const m of src.matchAll(/from ["']@\/(.+?)["']/g)) {
        for (const cand of [`${m[1]}.tsx`, `${m[1]}.ts`]) {
            if (existsSync(cand)) {
                out += '\n' + resolved(cand, depth + 1)
                break
            }
        }
    }
    return out
}

/**
 * `Skeleton` blocks are `aria-hidden="true"` by design — they carry no
 * information — and the primitive's own doc states the contract: composites
 * standing in for a whole route mark themselves `role="status" aria-busy="true"`
 * so a screen reader is told the region is loading.
 *
 * Every route skeleton did carry the role, but each contained only decorative
 * divs. A live region with no content announces nothing, so a screen-reader user
 * arriving on any route heard silence and could not tell loading from empty from
 * broken. The wallet detail page was worse: a bespoke composite that never
 * declared the region at all.
 *
 * axe over rendered routes structurally cannot catch this — by the time a page
 * is testable, its loading.tsx is gone.
 */
describe('every route loading state announces itself', () => {
    const files = globSync('app/**/loading.tsx')

    it('there are route loading states to check', () => {
        expect(files.length).toBeGreaterThanOrEqual(15)
    })

    it.each(files)('%s declares a busy status region', (file) => {
        const src = strip(resolved(file))
        expect(src).toMatch(/role="status"/)
        expect(src).toMatch(/aria-busy="true"/)
    })

    it.each(files)('%s puts text in that region', (file) => {
        expect(strip(resolved(file))).toMatch(/sr-only/)
    })

    it('every status region actually renders the announcement', () => {
        // Checking that `sr-only` merely APPEARS in the file passed a mutation
        // that deleted every call site — the string still existed inside the
        // helper's own definition. Count the regions and the renders instead.
        const shared = strip(readFileSync('components/ui/LoadingSkeleton.tsx', 'utf-8'))
        const regions = (shared.match(/role="status"/g) || []).length
        const announcements = (shared.match(/<LoadingAnnouncement \/>/g) || []).length
        expect(regions).toBeGreaterThan(0)
        expect(announcements, `${regions} status regions but ${announcements} announcements`).toBe(regions)
    })

    it('the announcement is bilingual, like the root error boundary', () => {
        const shared = strip(readFileSync('components/ui/LoadingSkeleton.tsx', 'utf-8'))
        expect(shared).toMatch(/Φόρτωση/)
        expect(shared).toMatch(/Loading/)
    })

    it('and the blocks themselves stay hidden — they carry no information', () => {
        expect(strip(readFileSync('components/ui/skeleton.tsx', 'utf-8'))).toMatch(/aria-hidden="true"/)
    })
})
