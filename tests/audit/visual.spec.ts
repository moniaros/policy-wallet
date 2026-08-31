import { test, expect } from "@playwright/test"
import { BASE, ROUTES, THEMES, auditContext, settleDeterministic, clockMasks, shotName, assertTarget } from "./helpers"

/**
 * A7 — visual truth (D0 proves the harness with it). Deterministic full-page
 * screenshots per route × theme × device project, against the committed
 * baseline under docs/screens/audit/. Server-clock strings are masked (the
 * client clock is frozen by settleDeterministic; the server's cannot be).
 *
 * First acceptance: run with --update-snapshots; the determinism proof is a
 * second plain run with zero diff.
 */

test.describe("visual baseline", () => {
    test.beforeEach(async ({ request }) => {
        await assertTarget(request)
    })

    for (const theme of THEMES) {
        test(`screens (${theme})`, async ({ browser }, testInfo) => {
            test.setTimeout(300_000)
            const ctx = await auditContext(browser, testInfo.project.name, theme)
            const page = await ctx.newPage()
            for (const route of ROUTES) {
                await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
                await settleDeterministic(page)
                await expect(page).toHaveScreenshot(shotName(route, theme), {
                    fullPage: true,
                    mask: clockMasks(page),
                    maskColor: "#8fcbb9",
                })
            }
            await ctx.close()
        })
    }
})
