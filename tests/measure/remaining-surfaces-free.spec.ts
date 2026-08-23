/**
 * T-015 baseline — remaining surfaces, FREE tier half.
 * `/upgrade` is the free tier's own CTA target — this is the primary audience
 * for that page, unlike the paid capture in remaining-surfaces-baseline.spec.ts.
 * `/benefits` is "Paid+" gated per SURFACES.md; probed to record what actually
 * happens for a free account rather than assuming a redirect.
 *
 * Run:  npx playwright test --project=measure-free remaining-surfaces-free
 */
import { test } from "@playwright/test"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb, HEIGHT } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph-free@policywallet.test"
const dirs = evidenceDirs("remaining-surfaces")

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, FREE_SPECS))
})

test("baseline: /upgrade (free — primary audience)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/upgrade", width)
        // minSections: 0 — see remaining-surfaces-baseline.spec.ts's comment.
        await captureSurface(page, dirs, "upgrade-free", width, [], { tier: "free" }, 300, 0)
    }
})

test("probe: /benefits reachability (free — Paid+ gated per SURFACES.md)", async ({ page }) => {
    test.setTimeout(3 * 60_000)
    await page.setViewportSize({ width: 390, height: HEIGHT[390] })
    await page.goto("/benefits", { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForTimeout(800)
    console.log(`[measure] /benefits (free) landed on ${page.url()}`)
    // Whatever it renders — gate screen, redirect, or the same page as paid —
    // capture it as content evidence rather than only logging the URL.
    await captureSurface(page, dirs, "benefits-free-probe", 390, [], { tier: "free" }, 50, 0)
})
