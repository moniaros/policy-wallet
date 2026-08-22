/**
 * PRODUCTION journey smoke — outcomes, not status codes.
 *
 * "The gate checks code; journeys check the product" (CLAUDE.md): two changes
 * have passed a fully green gate and still broken production, because each
 * piece worked and the seam between them did not. This deploy touches every
 * authenticated surface at once — the register conversion (35 files), the
 * control-boundary token, the AppShell inset, the policy-page restructure and
 * the dashboard score — so it asserts what a signed-out visitor can actually
 * see, plus the rollback triggers the briefs name.
 *
 * ANONYMOUS on purpose. There are no test credentials in production and this
 * must never create or mutate production data.
 *
 * Run:  BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke
 */
import { test, expect } from "@playwright/test"

const PROD = "https://www.policywallet.gr"

// Public pages that render the shell and the Greek content layer.
const ROUTES = ["/", "/pricing", "/product/motor", "/product/health", "/branches", "/trust"]

test("every public route renders, in Greek, with no leaked internals", async ({ page }) => {
    test.setTimeout(10 * 60_000)
    const failures: string[] = []

    for (const route of ROUTES) {
        const res = await page.goto(PROD + route, { waitUntil: "domcontentloaded", timeout: 60_000 })
        const status = res?.status() ?? 0
        if (status >= 400) {
            failures.push(`${route}: HTTP ${status}`)
            continue
        }
        await page.waitForTimeout(1200)
        const text = (await page.evaluate(() => document.body.innerText || "")).replace(/\s+/g, " ")

        if (text.trim().length < 200) failures.push(`${route}: rendered almost nothing (${text.length} chars)`)
        // Rollback trigger: any fixture-shaped identifier in customer-facing text.
        if (/\bE2E[-\s]/i.test(text)) failures.push(`${route}: E2E fixture identifier in production copy`)
        if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) {
            failures.push(`${route}: a UUID is rendered as content`)
        }
        // The register conversion touched the branch content these pages render:
        // a broken replace would show up as a stray singular imperative.
        for (const informal of ["Δες ", "Ρώτησε ", "Κατάλαβε ", "Ανέβασε "]) {
            if (text.includes(informal)) failures.push(`${route}: informal «${informal.trim()}» survived the conversion`)
        }
    }

    expect(failures, `production smoke failures:\n${failures.join("\n")}`).toEqual([])
})

test("the authenticated surfaces redirect rather than erroring", async ({ page }) => {
    test.setTimeout(5 * 60_000)
    // A 500 here would mean the restructure broke server rendering; a redirect
    // to signin is the correct anonymous outcome.
    for (const route of ["/dashboard", "/wallet"]) {
        const res = await page.goto(PROD + route, { waitUntil: "domcontentloaded", timeout: 60_000 })
        expect(res?.status() ?? 0, `${route} returned a server error`).toBeLessThan(500)
        expect(page.url(), `${route} did not reach signin`).toContain("/auth/signin")
        const text = await page.evaluate(() => document.body.innerText || "")
        expect(text.length, `${route}: signin rendered nothing`).toBeGreaterThan(100)
    }
})
