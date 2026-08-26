import { test, expect, type Page, type Locator } from "@playwright/test"
import { dismissCookieBanner } from "../helpers/ui"

/**
 * GROWTH-HOOKS-01 measurement matrix — the hook ticker at 320/390/430, EL and
 * EN, reduced-motion on and off.
 *
 * What is measured (the goal's own acceptance):
 *   - zero clipped strings: no hook line overflows its own box, and the
 *     ticker never widens the page;
 *   - zero sub-44px interactive targets (links, dots, pause) at every width;
 *   - the reduced-motion contract END TO END: on /guides the rotating ticker
 *     renders as the static stack under prefers-reduced-motion, with every
 *     hook exposed and no dead pause control (the jsdom half of this contract
 *     is tests/unit/ticker-a11y.test.tsx; this is the real-browser half);
 *   - the homepage ticker is ALWAYS static (D-G05: HeroSlides already rotates
 *     there — a second rotator is forbidden).
 *
 * Anonymous by construction: the ticker is public marketing surface, so the
 * project-level storageState is overridden with an empty one.
 */

test.use({ storageState: { cookies: [], origins: [] } })

const WIDTHS = [320, 390, 430] as const

const SURFACES = [
    { path: "/", locale: "el", expectedMode: "static" },
    { path: "/en", locale: "en", expectedMode: "static" },
    { path: "/guides", locale: "el", expectedMode: "rotating" },
    { path: "/en/guides", locale: "en", expectedMode: "rotating" },
] as const

const TICKER = '[data-growth="hook-ticker"]'

async function assertNoClippedStrings(ticker: Locator) {
    // Measure the SETTLED layout: mid-font-swap, fallback metrics run ~2px
    // wider and report a phantom overflow that no reader ever sees. A clip
    // that survives fonts.ready is real; one that does not was the swap.
    await ticker.page().evaluate(async () => {
        await (document as Document).fonts.ready
        await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    // Measure the RESTING layout. A prior interaction leaves the cursor parked
    // over the ticker, and the links' hover affordance nudges the arrow by
    // translate-x-0.5 — exactly 2px, absorbed by the wrapper's 24px padding.
    // That is a deliberate micro-interaction, not a clipped string.
    await ticker.page().mouse.move(0, 0)
    await ticker.page().evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))))
    const clipped = await ticker.evaluate((root) => {
        const out: string[] = []
        const check = (el: Element, label: string) => {
            // +1 tolerates subpixel rounding; anything more is a real clip.
            if (el.scrollWidth > el.clientWidth + 1) {
                out.push(`${label}: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`)
            }
        }
        check(root, "ticker root")
        root.querySelectorAll("[data-hook-id]").forEach((link) => {
            check(link, `link ${link.getAttribute("data-hook-id")}`)
            link.querySelectorAll("span").forEach((span, i) =>
                check(span, `${link.getAttribute("data-hook-id")} span[${i}]`)
            )
        })
        return out
    })
    expect(clipped, "clipped hook strings").toEqual([])
}

async function assertNoSub44Targets(ticker: Locator, { expectTargets }: { expectTargets: number }) {
    const targets = ticker.locator("a, button")
    const count = await targets.count()
    expect(count, "interactive target count").toBe(expectTargets)
    const undersized: string[] = []
    for (let i = 0; i < count; i++) {
        const target = targets.nth(i)
        // Only targets a person can actually hit count — inert/hidden cells
        // in the rotating deck are out of the tab order by design.
        if (!(await target.isVisible())) continue
        const inertAncestor = await target.evaluate((el) => !!el.closest("[inert]"))
        if (inertAncestor) continue
        const box = await target.boundingBox()
        const name = (await target.getAttribute("data-hook-id")) ?? (await target.textContent())?.trim().slice(0, 30) ?? `#${i}`
        if (!box || box.width < 44 || box.height < 44) {
            undersized.push(`${name}: ${box ? `${box.width}x${box.height}` : "no box"}`)
        }
    }
    expect(undersized, "sub-44px targets").toEqual([])
}

for (const surface of SURFACES) {
    for (const width of WIDTHS) {
        test(`${surface.path} @ ${width}px (${surface.locale}) — no clipping, no sub-44px targets, motion honoured`, async ({ page }) => {
            await page.setViewportSize({ width, height: 850 })

            // ── reduced-motion OFF: the surface's declared mode renders ──
            await page.emulateMedia({ reducedMotion: "no-preference" })
            await page.goto(surface.path)
            await dismissCookieBanner(page)

            const ticker = page.locator(TICKER)
            await expect(ticker).toHaveCount(1)
            await ticker.scrollIntoViewIfNeeded()
            await expect(ticker).toHaveAttribute("data-mode", surface.expectedMode)

            // all four hooks are in the DOM whatever the mode
            await expect(ticker.locator("[data-hook-id]")).toHaveCount(4)

            await assertNoClippedStrings(ticker)
            if (surface.expectedMode === "rotating") {
                // 4 hook links + 4 dots + pause
                await assertNoSub44Targets(ticker, { expectTargets: 9 })
                // the pause control is visible, labelled, and operable
                const pause = ticker.getByRole("button", {
                    name: surface.locale === "el" ? "Παύση εναλλαγής" : "Pause the rotation",
                })
                await expect(pause).toBeVisible()
                await pause.click()
                await expect(
                    ticker.getByRole("button", {
                        name: surface.locale === "el" ? "Συνέχεια εναλλαγής" : "Resume the rotation",
                    })
                ).toBeVisible()
                // exactly one hook exposed; the rest inert and aria-hidden
                await expect(ticker.locator('.col-start-1[aria-hidden="true"]')).toHaveCount(3)
                await expect(ticker.locator(".col-start-1[inert]")).toHaveCount(3)
            } else {
                // static: 4 links, no controls, nothing hidden
                await assertNoSub44Targets(ticker, { expectTargets: 4 })
                await expect(ticker.locator("button")).toHaveCount(0)
                // no CONTENT hidden — decorative aria-hidden icons are fine,
                // a hidden hook link is not
                await expect(ticker.locator('[aria-hidden="true"] [data-hook-id], [data-hook-id][aria-hidden="true"]')).toHaveCount(0)
            }

            // ── reduced-motion ON: every surface renders the static stack ──
            await page.emulateMedia({ reducedMotion: "reduce" })
            await page.reload()
            await dismissCookieBanner(page)
            const reduced = page.locator(TICKER)
            await expect(reduced).toHaveAttribute("data-mode", "static")
            await expect(reduced.locator("[data-hook-id]")).toHaveCount(4)
            await expect(reduced.locator('[aria-hidden="true"] [data-hook-id], [data-hook-id][aria-hidden="true"]')).toHaveCount(0)
            await expect(reduced.locator("button")).toHaveCount(0)
            await reduced.scrollIntoViewIfNeeded()
            await assertNoClippedStrings(reduced)
            await assertNoSub44Targets(reduced, { expectTargets: 4 })
        })
    }
}
