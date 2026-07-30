import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * Sentry's onboarding wizard scaffolds `/sentry-example-page` and
 * `/api/sentry-example-api` — a page whose purpose is to throw, and a route that
 * raises `SentryExampleAPIError` on every GET. Both shipped in a production
 * insurance application.
 *
 * They sat behind the proxy's auth redirect, so the world could not reach them,
 * but a signed-in customer could: a page that deliberately breaks, with a button
 * that generates errors. Every hit also spent Sentry quota and added noise to
 * the board the team uses to find real failures — the same board that took real
 * effort to get to zero unresolved issues.
 *
 * Nothing referenced them. The Sentry E2E specs test real routes' unauthenticated
 * behaviour, not the scaffold; robots.ts only existed to hide the page from
 * crawlers.
 */
describe('no vendor scaffold ships in the app', () => {
    it('the example page and route are gone', () => {
        expect(existsSync('app/sentry-example-page')).toBe(false)
        expect(existsSync('app/api/sentry-example-api')).toBe(false)
    })

    it('nothing references them any more', () => {
        const offenders: string[] = []
        for (const f of [
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('lib/**/*.ts'),
            ...globSync('components/**/*.tsx'),
            ...globSync('scripts/*.json'),
        ]) {
            if (/sentry-example/.test(strip(readFileSync(f, 'utf-8')))) offenders.push(f)
        }
        expect(offenders, `scaffold references:\n${offenders.join('\n')}`).toEqual([])
    })

    it('no route in the app exists only to throw', () => {
        const offenders: string[] = []
        for (const f of globSync('app/api/**/route.ts')) {
            const src = strip(readFileSync(f, 'utf-8'))
            // A handler whose body is a bare unconditional throw of a purpose-built
            // error, with no branch that can succeed.
            if (/export function (GET|POST)\(\)\s*\{\s*[^}]{0,120}throw new \w*Error\(/.test(src)) {
                offenders.push(f)
            }
        }
        expect(offenders, `routes that only throw:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the real Sentry specs still exist — they test real routes', () => {
        expect(globSync('tests/e2e/sentry-*.spec.ts').length).toBeGreaterThanOrEqual(3)
    })
})
