import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * Every internal href literal must correspond to a real route.
 *
 * The agent's Getting Started checklist — the first surface a new advisor sees —
 * pointed two of its steps at "/settings", which does not exist. One of them was
 * "Upload your insurance license for verification": a new intermediary was sent
 * to a 404 while being asked to prove they are licensed. The real page is
 * /agent/settings, which hosts exactly those fields (agency name, licence
 * number) and had existed all along.
 *
 * A crawl of the rendered shell caught it; this keeps it caught without one.
 */
describe('every internal link points at a route that exists', () => {
    const routes = new Set(
        globSync('app/**/page.tsx').map((file) => {
            const r = file
                .replace(/^app/, '')
                .replace(/\/page\.tsx$/, '')
                .replace(/\/\((?:public|protected)\)/g, '')
            return r || '/'
        })
    )

    /**
     * Dynamic segments must match SHAPE, not merely exist. My first version read
     * `r.includes('[')` as a blanket allowance, which returns true for every
     * href the moment any dynamic route exists anywhere — the check passed the
     * very bug it was written for. Compile each route to a regex instead.
     */
    const matchers = [...routes].map(
        (r) => new RegExp('^' + r.replace(/\[\.\.\.[^\]]+\]/g, '.+').replace(/\[[^\]]+\]/g, '[^/]+') + '$')
    )
    const isServed = (href: string) => matchers.some((re) => re.test(href))

    it('finds the routes it is checking against', () => {
        // Guard the guard: a broken glob would make every assertion below vacuous.
        expect(routes.size).toBeGreaterThan(30)
        expect(routes.has('/wallet')).toBe(true)
        expect(routes.has('/agent/settings')).toBe(true)
    })

    it('has no href literal without a matching page', () => {
        const offenders: string[] = []
        for (const file of globSync('{components,app}/**/*.tsx')) {
            const src = readFileSync(file, 'utf-8')
            for (const m of src.matchAll(/href[=:]\s*["'](\/[a-z0-9\-/]*)["']/g)) {
                const href = m[1]
                if (href === '/' || href.startsWith('/api')) continue
                if (!isServed(href)) offenders.push(`${file}: ${href}`)
            }
        }
        expect(offenders, `links to nonexistent routes:\n${offenders.join('\n')}`).toEqual([])
    })

    it('sends the advisor onboarding checklist somewhere real', () => {
        const src = readFileSync('components/agent/GettingStartedChecklist.tsx', 'utf-8')
        expect(src).not.toMatch(/href: "\/settings"/)
        expect(src).toMatch(/href: "\/agent\/settings"/)
    })
})
