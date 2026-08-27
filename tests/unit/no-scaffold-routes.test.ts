import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * A handler whose body is a bare unconditional throw of a purpose-built error,
 * with no branch that can succeed. Covers sync AND async handlers, with or
 * without parameters, on every method — the first version knew only
 * `export function GET()`, so `export async function GET(request: Request)`
 * (the other way a wizard writes the same scaffold) was invisible.
 */
const ONLY_THROW =
    /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{\s*[^}]{0,200}throw new \w*Error\(/
const onlyThrowHandler = (src: string) => ONLY_THROW.test(src)

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
            if (onlyThrowHandler(strip(readFileSync(f, 'utf-8')))) offenders.push(f)
        }
        expect(offenders, `routes that only throw:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the real Sentry specs still exist — they test real routes', () => {
        expect(globSync('tests/e2e/sentry-*.spec.ts').length).toBeGreaterThanOrEqual(3)
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the only-throw matcher against the
 * AUTHENTIC scaffold (app/api/sentry-example-api/route.ts as it shipped,
 * recovered at b1500fc7~1), the async/param variant the first matcher could
 * not see, and real handler shapes that must stay silent.
 */
describe('the only-throw matcher is proven on the authentic scaffold', () => {
    // Verbatim, comments and all — strip() runs first, as in the scan.
    const AUTHENTIC_SCAFFOLD = `import * as Sentry from "@sentry/nextjs";
export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring
export function GET() {
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
`

    it('flags the scaffold exactly as it shipped', () => {
        expect(onlyThrowHandler(strip(AUTHENTIC_SCAFFOLD))).toBe(true)
    })

    it('flags the async, parameter-taking spelling of the same scaffold', () => {
        const asyncVariant = AUTHENTIC_SCAFFOLD.replace(
            'export function GET() {',
            'export async function GET(request: Request) {',
        )
        expect(asyncVariant).toContain('async function GET(request: Request)')
        expect(onlyThrowHandler(strip(asyncVariant))).toBe(true)
    })

    it('stays silent on a real handler that can succeed', () => {
        const real = `export async function GET(request: Request) {
    const user = await requireApiUser()
    if (!user) return createApiError("UNAUTHORIZED", "Sign in", 401)
    return createApiResponse({ ok: true })
}
`
        expect(onlyThrowHandler(strip(real))).toBe(false)
        // A re-export shim (app/api/v1/contact) is not a handler at all.
        expect(onlyThrowHandler(strip('export { POST } from "@/app/api/contact/route"\n'))).toBe(false)
    })
})
