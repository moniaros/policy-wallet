import { test, expect } from '@playwright/test'

/**
 * The insurer reference-data surfaces: the enriched /admin/insurers list and
 * the /admin/insurers/[insurerId] edit page.
 *
 * The detail route is new and no audit sweep discovers it — the responsive and
 * theme audits enumerate static routes, and dynamic-route discovery harvests
 * hrefs from list pages it already knows. So it is checked explicitly here:
 * console hygiene, the 22-checkbox lines-of-business fieldset at 320px (the
 * densest new layout in the app), and the save round-trip, whose
 * confidence-stamping and Prisma.DbNull handling are otherwise only covered at
 * unit level.
 */

const IGNORABLE = [
    /_vercel\//i,                  // insights + speed-insights: absent locally, verified present in prod
    /va\.vercel-scripts/i,
    /Download the React DevTools/i,
    /favicon\.ico/i,
    // .env.local ships a placeholder DSN by design; prod has a real encrypted
    // NEXT_PUBLIC_SENTRY_DSN and serves no placeholder.
    /Invalid Sentry Dsn/i,
    // Carries no URL, so it is unactionable; the response listener reports the
    // same failure with one.
    /Failed to load resource/i,
]

function isReal(text: string) {
    return !IGNORABLE.some((re) => re.test(text))
}

/** Next aborts prefetches it no longer needs; only /api failures are real. */
function isExpectedAbort(url: string, resourceType: string, failure: string) {
    if (!failure.includes('ERR_ABORTED')) return false
    if (url.includes('/api/')) return false
    if (url.includes('?_rsc=') || resourceType === 'document') return true
    return resourceType === 'fetch'
}

function watchForProblems(page: import('@playwright/test').Page, problems: string[]) {
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
}

test.describe.configure({ timeout: 120_000 })

test('the list renders the imported catalog with a clean console', async ({ page }) => {
    const problems: string[] = []
    watchForProblems(page, problems)

    await page.goto('/admin/insurers')
    await page.waitForLoadState('domcontentloaded')

    const heading = page.getByRole('heading', { name: 'Manage Insurers' })
    await expect(heading).toBeVisible()

    // The count is in the section heading; assert the catalog is actually
    // populated rather than an empty list rendering "successfully".
    const countHeading = await page.getByRole('heading', { name: /Current Insurers \(\d+\)/ }).textContent()
    const count = Number(countHeading?.match(/\((\d+)\)/)?.[1] ?? 0)
    expect(count, 'insurer catalog should be populated from the reference dataset').toBeGreaterThanOrEqual(20)

    // Greek canonical names and slugs both render (mojibake would fail here).
    await expect(page.getByText('ERGO Ασφαλιστική', { exact: true })).toBeVisible()
    await expect(page.getByText('ethniki-asfalistiki', { exact: true })).toBeVisible()

    await page.waitForTimeout(1500)
    expect(problems, `console problems on /admin/insurers:\n${problems.join('\n')}`).toEqual([])
})

test('the detail page renders every section with a clean console', async ({ page }) => {
    const problems: string[] = []
    watchForProblems(page, problems)

    await page.goto('/admin/insurers')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Manage' }).first().click()
    await page.waitForURL(/\/admin\/insurers\/[^/]+$/)

    for (const section of ['Identity', 'Contact', 'Head office', 'Operations', 'Notes']) {
        await expect(page.getByRole('heading', { name: new RegExp(`^${section}`) })).toBeVisible()
    }

    // The slug is reference data, never editable from the form.
    await expect(page.locator('#ins-slug')).toBeDisabled()

    // All 22 lines-of-business checkboxes render.
    await expect(page.locator('input[name="linesOfBusiness"]')).toHaveCount(22)

    // At least one confidence badge is present — the imported rows all carry a
    // confidence map, so zero badges would mean the map stopped being read.
    const badges = page.locator('span', { hasText: /^(verified_2026|stale|unverified|not_applicable|admin_edited)$/ })
    expect(await badges.count(), 'confidence badges should render for imported rows').toBeGreaterThan(0)

    await page.waitForTimeout(1500)
    expect(problems, `console problems on the insurer detail page:\n${problems.join('\n')}`).toEqual([])
})

test('the detail page fits 320px without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/admin/insurers')
    await page.getByRole('link', { name: 'Manage' }).first().click()
    await page.waitForURL(/\/admin\/insurers\/[^/]+$/)
    await page.waitForLoadState('domcontentloaded')

    const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }))
    expect(
        overflow.scrollWidth,
        `page scrolls sideways at 320px (scrollWidth ${overflow.scrollWidth} > ${overflow.clientWidth})`
    ).toBeLessThanOrEqual(overflow.clientWidth + 1)

    // The save control must be reachable, not pushed out of the viewport.
    const save = page.getByRole('button', { name: 'Save insurer' })
    await expect(save).toBeVisible()
    const box = await save.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(321)
})

test('saving an edit persists it and stamps the field admin_edited', async ({ page }) => {
    // Round-trips a real reference row (ΔΥΝΑΜΙΣ — a small record) and restores
    // the original value. The confidence label stays admin_edited afterwards by
    // design; re-running scripts/gen-insurer-seed-sql.ts restores it.
    await page.goto('/admin/insurers/seed_dynamis')
    await page.waitForLoadState('domcontentloaded')

    const claims = page.locator('#ins-claims-phone')
    await expect(claims).toBeVisible()
    const original = (await claims.inputValue()) ?? ''
    const probe = '+30 210 000 0001'

    await claims.fill(probe)
    await page.getByRole('button', { name: 'Save insurer' }).click()
    await page.waitForURL(/saved=1/)
    await expect(page.getByText('Saved.')).toBeVisible()

    // Persisted, not just echoed back by the form.
    await page.goto('/admin/insurers/seed_dynamis')
    await expect(page.locator('#ins-claims-phone')).toHaveValue(probe)

    // The edited field is now flagged as admin-corrected.
    const claimsLabel = page.locator('label[for="ins-claims-phone"]')
    await expect(claimsLabel).toContainText('admin_edited')

    // Untouched dataset provenance survives the same save.
    await expect(page.locator('label[for="ins-call-center"]')).toContainText('verified_2026')

    // Restore.
    await page.locator('#ins-claims-phone').fill(original)
    await page.getByRole('button', { name: 'Save insurer' }).click()
    await page.waitForURL(/saved=1/)
    await page.goto('/admin/insurers/seed_dynamis')
    await expect(page.locator('#ins-claims-phone')).toHaveValue(original)
})
