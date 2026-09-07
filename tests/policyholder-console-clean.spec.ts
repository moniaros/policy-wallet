import { test, expect } from '@playwright/test'

/**
 * Console hygiene for the policyholder story surfaces.
 *
 * The B2C home-as-a-story and «Καλύψεις & κενά» rebuilds (Sept 2026) touched
 * /dashboard, /protection (both lenses), the new /recommendations page,
 * /notifications and the wallet. A React key warning, a hydration mismatch or
 * a failed request shows up here and nowhere else — the measure specs assert
 * layout and facts, not console output. Twin of agent-console-clean.spec.ts;
 * runs in the `chromium` project (policyholder session).
 *
 * Local-only noise is filtered explicitly rather than by a broad allowlist, so
 * a real error can never hide behind the filter.
 */

const IGNORABLE = [
    /_vercel\//i,                  // insights + speed-insights: absent locally, verified present in prod
    /va\.vercel-scripts/i,
    /Download the React DevTools/i,
    /favicon\.ico/i,
    // .env.local ships a placeholder DSN by design; prod has a real encrypted
    // NEXT_PUBLIC_SENTRY_DSN and serves no placeholder.
    /Invalid Sentry Dsn/i,
]

function isReal(text: string) {
    return !IGNORABLE.some((re) => re.test(text))
}

/** See agent-console-clean.spec.ts — only ERR_ABORTED, only page routes. */
function isExpectedAbort(url: string, resourceType: string, failure: string) {
    if (!failure.includes('ERR_ABORTED')) return false
    if (url.includes('/api/')) return false
    if (url.includes('?_rsc=') || resourceType === 'document') return true
    return resourceType === 'fetch'
}

IGNORABLE.push(/Failed to load resource/i)

const SURFACES = [
    '/dashboard',
    '/protection',
    '/protection?lens=risk',
    '/protection?status=finding&family=mobility',
    '/recommendations',
    '/notifications',
    '/wallet',
]

test.describe.configure({ timeout: 120_000 })

for (const path of SURFACES) {
    test(`${path} loads with a clean console`, async ({ page }) => {
        const problems: string[] = []

        page.on('console', (msg) => {
            if ((msg.type() === 'error' || msg.type() === 'warning') && isReal(msg.text())) {
                problems.push(`[${msg.type()}] ${msg.text()}`)
            }
        })
        page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))
        page.on('requestfailed', (req) => {
            const failure = req.failure()?.errorText ?? 'failed'
            if (isReal(req.url()) && !isExpectedAbort(req.url(), req.resourceType(), failure)) {
                problems.push(`[requestfailed:${req.resourceType()}] ${req.url()} — ${failure}`)
            }
        })
        page.on('response', (res) => {
            if (res.status() >= 400 && isReal(res.url())) {
                problems.push(`[http ${res.status()}] ${res.url()}`)
            }
        })

        await page.goto(path)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2500)

        expect(problems, `console problems on ${path}:\n${problems.join('\n')}`).toEqual([])
    })
}
