import { test, expect } from '@playwright/test'

/**
 * Console hygiene for the agent qualification surfaces.
 *
 * The MEDIC work touched /opportunities, /insights, /renewals and the agent
 * dashboard, plus the opportunity modal's scorecard + edit strip. A React key
 * warning, a hydration mismatch or a failed request shows up here and nowhere
 * else — the journey specs assert behaviour, not console output.
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
    // NEXT_PUBLIC_SENTRY_DSN and serves no placeholder (checked against the
    // live site, not assumed).
    /Invalid Sentry Dsn/i,
]

function isReal(text: string) {
    return !IGNORABLE.some((re) => re.test(text))
}

/**
 * Next.js prefetches route payloads (`?_rsc=`) on hover/viewport and aborts
 * them when the navigation doesn't happen; a document request superseded by a
 * client-side navigation aborts the same way. Neither is a resource failure.
 */
function isExpectedAbort(url: string, resourceType: string, failure: string) {
    if (!failure.includes('ERR_ABORTED')) return false
    return url.includes('?_rsc=') || resourceType === 'document'
}

/** A bare "Failed to load resource" console line carries no URL — the response
 *  listener reports the same failure with one, so drop the useless duplicate. */
IGNORABLE.push(/Failed to load resource/i)

const SURFACES = ['/dashboard/agent', '/opportunities', '/insights', '/renewals', '/customers']

// These pages run heavy aggregation against a remote pooler; /insights alone
// can exceed the 30s default. Set at file level — an in-body test.setTimeout()
// did not take effect here.
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
        // The bare console message for a 404 carries no URL, which makes it
        // unactionable; report the response so a failure names the resource.
        page.on('response', (res) => {
            if (res.status() >= 400 && isReal(res.url())) {
                problems.push(`[http ${res.status()}] ${res.url()}`)
            }
        })

        await page.goto(path)
        // networkidle hangs on pages holding an open connection; settle instead.
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2500)

        expect(problems, `console problems on ${path}:\n${problems.join('\n')}`).toEqual([])
    })
}

// The modal + scorecard console check lives in agent-journey.spec.ts's MEDIC
// ladder block, which creates its own opportunity fixture. Placing it here
// would have found an empty list and skipped — a silent non-check.
