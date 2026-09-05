import { test, expect, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { applyPortfolioState, type PortfolioState } from "./dashboard-fixtures"
import { settle, overlappingHitAreas } from "./metrics"
import { withDb } from "./surface-harness"

/** R4 diagnosis — overlapping hit areas with boxes, B2C typical at 320/430. Project: measure-dash. */
const OUT = path.join(process.cwd(), "docs", "evidence", "dashboard-b4", "data", "r4-diag")
const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"

async function open(page: Page, width: number) {
    await page.setViewportSize({ width, height: HEIGHT[width] })
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url()).not.toContain("/auth/")
}

test("R4 diag: B2C typical overlaps", async ({ page }) => {
    test.setTimeout(10 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await withDb((db) => applyPortfolioState(db, DASH_EMAIL, "typical" as PortfolioState))
    for (const width of [320, 430]) {
        await open(page, width)
        const overlaps = await overlappingHitAreas(page)
        const withShell = await overlappingHitAreas(page, { includeShell: true })
        writeFileSync(path.join(OUT, `b2c-typical-${width}.json`), JSON.stringify({ pageFlow: overlaps, includingShell: withShell }, null, 2))
        console.log(`[r4 diag] typical@${width}: ${overlaps.length} page-flow pairs; ${withShell.length} including shell: ` + JSON.stringify(withShell.slice(0, 3)))
    }
})
