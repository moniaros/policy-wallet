/**
 * T-015 baseline — priority 10, "the remaining surfaces": `/help`,
 * `/help/article/[slug]`, `/activity`, `/upgrade`,
 * `/upgrade/success`, `/benefits`, plus the two legacy redirects (`/coverage`,
 * `/home`) confirmed as redirects rather than measured as content, and
 * `/consent/ai` attempted with its outcome recorded either way (redirects
 * for an already-consented account — expected, not a defect).
 *
 * PAID tier (`e2e-ph@policywallet.test`). Each surface is captured once at
 * each width in whatever state the fixture matrix naturally produces; none of
 * these surfaces has a dedicated per-surface portfolio-state fixture.
 *
 * Run:  npx playwright test --project=measure remaining-surfaces-baseline
 */
import { test, expect, type Page } from "@playwright/test"
import { writeFileSync } from "fs"
import path from "path"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb, HEIGHT } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("remaining-surfaces")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

test("baseline: /help index (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/help", width)
        // minSections: 0 on every capture in this file — none of these pages is
        // confirmed to use `.pw-page-shell`/`section[id]`, and agent-view-baseline
        // .spec.ts already found that assuming otherwise silently refuses every
        // real capture of a page that structurally cannot produce a nonzero count.
        await captureSurface(page, dirs, "help-index-paid", width, [], { tier: "paid" }, 300, 0)
    }
})

test("baseline: /help/article/upload-policy (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/help/article/upload-policy", width)
        await captureSurface(page, dirs, "help-article-paid", width, [], { tier: "paid" }, 300, 0)
    }
})

test("baseline: /activity (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/activity", width)
        await captureSurface(page, dirs, "activity-paid", width, [], { tier: "paid" }, 300, 0)
    }
})

test("baseline: /upgrade (paid — already on top tier, no server redirect)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/upgrade", width)
        await captureSurface(page, dirs, "upgrade-paid", width, [], { tier: "paid" }, 300, 0)
    }
})

test("baseline: /upgrade/success (paid, no checkout session context)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/upgrade/success", width)
        await captureSurface(page, dirs, "upgrade-success-paid", width, [], { tier: "paid" }, 100, 0)
    }
})

test("baseline: /benefits (paid+)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/benefits", width)
        await captureSurface(page, dirs, "benefits-paid", width, [], { tier: "paid" }, 100, 0)
    }
})

/**
 * `/consent/ai` — redirects to `/dashboard` for any account that already has
 * `aiProcessingConsentVersion` set, which every long-lived E2E account does
 * (it has uploaded documents in dozens of other specs). This test records
 * whichever outcome actually happens rather than assuming one.
 */
test("probe: /consent/ai reachability (paid)", async ({ page }) => {
    test.setTimeout(3 * 60_000)
    await page.setViewportSize({ width: 390, height: HEIGHT[390] })
    await page.goto("/consent/ai", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(800)
    const finalUrl = page.url()
    writeFileSync(
        path.join(dirs.DATA, "consent-ai-reachability.json"),
        JSON.stringify({ requestedUrl: "/consent/ai", finalUrl, redirected: !finalUrl.endsWith("/consent/ai") }, null, 2)
    )
    console.log(`[measure] /consent/ai probe: landed on ${finalUrl}`)
})

/** Legacy redirects — confirm they still resolve, not measured as content. */
async function confirmRedirect(page: Page, from: string, expectedTo: string) {
    await page.goto(from, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(500)
    expect(page.url(), `${from} should redirect to ${expectedTo}`).toContain(expectedTo)
}

test("probe: /coverage redirects to /protection", async ({ page }) => {
    test.setTimeout(2 * 60_000)
    await page.setViewportSize({ width: 390, height: HEIGHT[390] })
    await confirmRedirect(page, "/coverage", "/protection")
})

test("probe: /home redirects to /dashboard", async ({ page }) => {
    test.setTimeout(2 * 60_000)
    await page.setViewportSize({ width: 390, height: HEIGHT[390] })
    await confirmRedirect(page, "/home", "/dashboard")
})
