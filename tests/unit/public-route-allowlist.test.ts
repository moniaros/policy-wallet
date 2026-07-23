import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Page-level mirror of `audit:api-auth`.
 *
 * `proxy.ts` gates the whole app behind a hand-maintained public allowlist, so a
 * new page under `app/(public)` is invisible to anonymous users and crawlers
 * until someone remembers to add it. That has already bitten twice — the cron
 * routes (which Vercel counted as "successful" 307s while the renewal ladder was
 * dead) and the marketing pages in the SEO audit.
 *
 * This walks the real route folders and asserts each resolves to something the
 * allowlist admits, so forgetting the entry fails CI instead of production.
 */

const PUBLIC_DIR = join(process.cwd(), 'app', '(public)')
const PROXY = join(process.cwd(), 'proxy.ts')

/** Pull the two allowlists straight out of proxy.ts so the test can't drift from it. */
function readAllowlists(): { prefixes: string[]; exact: string[] } {
    const src = readFileSync(PROXY, 'utf8')

    const extract = (name: string): string[] => {
        const start = src.indexOf(`const ${name} = [`)
        if (start === -1) throw new Error(`Could not find ${name} in proxy.ts`)
        const end = src.indexOf(']', start)
        return [...src.slice(start, end).matchAll(/"([^"]+)"/g)].map((m) => m[1])
    }

    return { prefixes: extract('publicPrefixes'), exact: extract('publicExactRoutes') }
}

/**
 * Route paths served by `app/(public)`. Route groups `(x)` contribute nothing to
 * the URL; dynamic segments `[slug]` are represented by a placeholder so prefix
 * matching still works.
 */
function collectPublicRoutes(dir: string, urlPath = ''): string[] {
    const routes: string[] = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            const segment = entry.startsWith('(') && entry.endsWith(')')
                ? '' // route group — not part of the URL
                : `/${entry.startsWith('[') ? '__param__' : entry}`
            routes.push(...collectPublicRoutes(full, urlPath + segment))
        } else if (entry === 'page.tsx' || entry === 'page.ts') {
            routes.push(urlPath === '' ? '/' : urlPath)
        }
    }
    return routes
}

function isAllowed(route: string, { prefixes, exact }: { prefixes: string[]; exact: string[] }): boolean {
    if (exact.includes(route)) return true
    if (prefixes.some((p) => route.startsWith(p))) return true
    // A dynamic route such as /lexiko/__param__ is covered when its parent is
    // exact-listed (the prefix form usually covers it, this is the fallback).
    const parent = route.slice(0, route.lastIndexOf('/')) || '/'
    if (route.endsWith('/__param__') && (exact.includes(parent) || prefixes.some((p) => parent.startsWith(p)))) {
        return true
    }
    return false
}

describe('public route allowlist (proxy.ts)', () => {
    const allowlists = readAllowlists()
    const routes = collectPublicRoutes(PUBLIC_DIR)

    it('finds the public route tree', () => {
        expect(routes.length).toBeGreaterThan(5)
    })

    it('parses both allowlists out of proxy.ts', () => {
        expect(allowlists.exact).toContain('/')
        expect(allowlists.prefixes).toContain('/product')
    })

    it.each(routes)('%s is reachable anonymously', (route) => {
        expect(
            isAllowed(route, allowlists),
            `Route "${route}" exists under app/(public) but nothing in proxy.ts's ` +
            `publicPrefixes/publicExactRoutes admits it, so anonymous visitors and ` +
            `crawlers get a 307 to /auth/signin. Add it to the allowlist.`
        ).toBe(true)
    })
})
