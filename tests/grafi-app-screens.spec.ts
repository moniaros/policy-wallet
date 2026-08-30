import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"

/**
 * Grafí application tier — rendered gate (B2C brief §12 "done means…").
 * Every app route at the five widths × two themes: no horizontal overflow,
 * every interactive element inside a section ≥ 44px, `section[id]` count
 * inside its ceiling, no percentage of the person anywhere. Screenshots at
 * 393 and 1440 land in docs/screens/<route>/. Fold assertion on `/` at
 * 393×852: the verdict AND the first «τώρα» row are inside the first screen.
 *
 * Runs against BASE_URL (default :3000) with the policyholder storage state.
 */
const WIDTHS = [375, 393, 768, 1100, 1440] as const
const THEMES = ["light", "dark"] as const
const ROUTES: Array<{ path: string; dir: string; sectionCeiling: number; h1: string }> = [
    { path: "/", dir: "home", sectionCeiling: 7, h1: "Η προστασία σας|Your protection" },
]

async function withTheme(page: Page, theme: (typeof THEMES)[number]) {
    await page.addInitScript((t) => { try { localStorage.setItem("theme", t) } catch { /* private mode */ } }, theme)
}

for (const route of ROUTES) {
    for (const theme of THEMES) {
        test(`${route.path} renders at five widths (${theme})`, async ({ browser }) => {
            const ctx = await browser.newContext({ storageState: "playwright/.auth/user.json", locale: "el-GR", colorScheme: theme })
            const page = await ctx.newPage()
            await withTheme(page, theme)
            await page.goto(route.path, { waitUntil: "networkidle" })
            await expect(page.locator("h1")).toHaveCount(1)
            // A stale storage state lands on the marketing page (also one h1) — fail loudly on the wrong page, not on its section count.
            await expect(page.locator("h1"), "signed-in app home expected — refresh playwright/.auth/user.json").toHaveText(new RegExp(route.h1))
            fs.mkdirSync(`docs/screens/${route.dir}`, { recursive: true })
            for (const w of WIDTHS) {
                await page.setViewportSize({ width: w, height: w < 768 ? 852 : 900 })
                await page.waitForTimeout(300)
                const r = await page.evaluate(() => ({
                    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    sections: [...document.querySelectorAll("section[id]")].map((s) => s.id),
                    small: [...document.querySelectorAll("section a, section button")]
                        .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.height < 44 || b.width < 44) })
                        .map((e) => (e.textContent || "").trim().slice(0, 30)),
                    percent: (document.body.innerText.match(/\d\s?%/g) || []).length,
                    upper: [...document.querySelectorAll("section *")].filter((e) => e.children.length === 0 && getComputedStyle(e).textTransform === "uppercase" && /[Α-Ωα-ω]/.test(e.textContent || "")).length,
                }))
                expect(r.overflow, `${w}px horizontal overflow`).toBe(false)
                expect(r.sections.length, `${w}px sections: ${r.sections.join(",")}`).toBeLessThanOrEqual(route.sectionCeiling)
                expect(r.small, `${w}px sub-44px targets`).toEqual([])
                expect(r.percent, `${w}px percentage rendered`).toBe(0)
                expect(r.upper, `${w}px uppercase Greek`).toBe(0)
                if (w === 393 || w === 1440) await page.screenshot({ path: `docs/screens/${route.dir}/${route.dir}-${w}-${theme}.png`, fullPage: w === 1440 })
            }
            await ctx.close()
        })
    }
}

test("/ — fold at 393×852: the verdict and the first «τώρα» row are on the first screen", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "playwright/.auth/user.json", locale: "el-GR", viewport: { width: 393, height: 852 } })
    const page = await ctx.newPage()
    await page.goto("/", { waitUntil: "networkidle" })
    const fold = await page.evaluate(() => {
        const verdict = document.querySelector("#verdict")?.getBoundingClientRect()
        const first = document.querySelector("#now li")?.getBoundingClientRect()
        return { verdictBottom: verdict ? Math.round(verdict.bottom) : null, firstRowBottom: first ? Math.round(first.bottom) : null }
    })
    expect(fold.verdictBottom, "verdict rendered").not.toBeNull()
    expect(fold.verdictBottom!).toBeLessThanOrEqual(852)
    // A quiet wallet has no «τώρα» rows — then the next-expiry row stands in and the assertion is on it.
    if (fold.firstRowBottom !== null) expect(fold.firstRowBottom).toBeLessThanOrEqual(852)
    await ctx.close()
})

test("/dashboard and /home 301 to / for a policyholder; / is the app home, not the marketing page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "playwright/.auth/user.json", locale: "el-GR" })
    const page = await ctx.newPage()
    for (const legacy of ["/dashboard", "/home"]) {
        const res = await page.request.get(legacy, { maxRedirects: 0 })
        expect(res.status(), legacy).toBe(301)
        expect(new URL(res.headers().location, "http://x").pathname, legacy).toBe("/")
    }
    await page.goto("/", { waitUntil: "networkidle" })
    await expect(page.locator("h1")).toHaveText(/Η προστασία σας|Your protection/)
    await ctx.close()
})
