import { test, expect } from "@playwright/test"

/**
 * The consent banner must not disable the app underneath it.
 *
 * It is `fixed inset-x-0 bottom-0 z-[120]` — a FULL-WIDTH strip above
 * everything — while the visible card inside it is `max-w-4xl mx-auto`. Two
 * separate failures came out of that, both measured rather than guessed:
 *
 * - **Desktop.** The strip either side of the card is invisible and still on
 *   top. `elementFromPoint` over the wallet's add-policy button returned the
 *   banner wrapper, not the button — so the button looked perfectly clickable
 *   and did nothing. This is what made `wallet-batch-upload.spec.ts` time out
 *   with "waiting for element to be visible, enabled and stable".
 * - **Mobile.** The card is effectively full width, and it covered the entire
 *   bottom navigation — every navigation control on a phone, for every
 *   first-time visitor, on a product that is mobile-first.
 *
 * The banner is not modal: no scrim, and the rest of the page stays
 * interactive. So blocking these was an accident of stacking, not a decision.
 */
test.describe("consent banner", () => {
    test("does not intercept clicks on bottom-right controls (desktop)", async ({ page }, testInfo) => {
        test.skip(/Mobile|agent/i.test(testInfo.project.name), "Desktop policyholder flow")

        await page.setViewportSize({ width: 1280, height: 720 })
        await page.goto("/wallet")
        await page.waitForLoadState("networkidle")

        // The banner must actually be showing, or this proves nothing.
        await expect(page.getByRole("heading", { name: /Cookies/i })).toBeVisible()

        const fab = page.locator("#tour-fab").first()
        await expect(fab).toBeVisible()

        const reachable = await fab.evaluate((node) => {
            const b = node.getBoundingClientRect()
            const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
            return !!hit && (node.contains(hit) || hit.contains(node))
        })
        expect(reachable, "the consent banner wrapper is swallowing the click").toBe(true)

        // And it genuinely opens.
        await fab.click()
        await expect(page.getByTestId("wallet-menu-batch-upload")).toBeVisible()
    })

    test("leaves the mobile bottom navigation reachable", async ({ page }, testInfo) => {
        test.skip(/agent/i.test(testInfo.project.name), "Policyholder shell")

        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto("/wallet")
        await page.waitForLoadState("networkidle")
        await expect(page.getByRole("heading", { name: /Cookies/i })).toBeVisible()

        const result = await page.evaluate(() => {
            const nav = document.querySelector(".pw-above-consent.lg\\:hidden") as HTMLElement | null
            if (!nav) return { found: false, reachable: false }
            const b = nav.getBoundingClientRect()
            const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
            return { found: true, reachable: !!hit && nav.contains(hit) }
        })

        expect(result.found, "the bottom nav no longer carries .pw-above-consent").toBe(true)
        expect(result.reachable, "the consent banner is covering the bottom navigation").toBe(true)
    })
})
