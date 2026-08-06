import { describe, it, expect } from 'vitest'
import { normalizeHeaderPath } from "@/lib/nav/header-path"

/**
 * Regression guard for a live production defect: the homepage language
 * switcher linked to `/index` (307 to sign-in) and `/en/index` (404).
 *
 * Cause: `usePathname()` reports the PRERENDER FILE path for statically
 * generated routes, so the root route yields "/index" rather than the "/" a
 * visitor sees. It only became visible once the homepage stopped rendering
 * inside a Suspense boundary — which moved the header into the server
 * prerender — so nothing in the test suite caught it and the switcher shipped
 * broken. These assertions pin the normalisation the toggle depends on.
 */
describe('normalizeHeaderPath', () => {
    it('maps the prerender artifacts back to the URLs a visitor sees', () => {
        expect(normalizeHeaderPath('/index')).toBe('/')
        expect(normalizeHeaderPath('/en/index')).toBe('/en')
    })

    it('leaves real paths untouched', () => {
        for (const path of ['/', '/en', '/pricing', '/en/pricing', '/product/motor', '/lexiko/apallagi']) {
            expect(normalizeHeaderPath(path)).toBe(path)
        }
    })

    it('falls back to the root when the pathname is unavailable', () => {
        expect(normalizeHeaderPath(null)).toBe('/')
        expect(normalizeHeaderPath(undefined)).toBe('/')
        expect(normalizeHeaderPath('')).toBe('/')
    })

    it('derives a language pair that never points at a dead URL', () => {
        // Mirrors the component: elPath/enPath are derived from the normalised
        // pathname, and neither may end up as an /index variant.
        const pair = (raw: string | null) => {
            const pathname = normalizeHeaderPath(raw)
            const elPath =
                pathname === '/en' ? '/' : pathname.startsWith('/en/') ? pathname.slice(3) : pathname
            const enPath = elPath === '/' ? '/en' : `/en${elPath}`
            return { elPath, enPath }
        }

        expect(pair('/index')).toEqual({ elPath: '/', enPath: '/en' })
        expect(pair('/en/index')).toEqual({ elPath: '/', enPath: '/en' })
        expect(pair('/pricing')).toEqual({ elPath: '/pricing', enPath: '/en/pricing' })
        expect(pair('/en/pricing')).toEqual({ elPath: '/pricing', enPath: '/en/pricing' })

        for (const raw of ['/index', '/en/index', '/', '/en', '/pricing', '/en/pricing']) {
            const { elPath, enPath } = pair(raw)
            expect(elPath, `${raw} produced an /index href`).not.toContain('/index')
            expect(enPath, `${raw} produced an /index href`).not.toContain('/index')
        }
    })
})
