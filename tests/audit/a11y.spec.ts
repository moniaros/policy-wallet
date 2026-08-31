import fs from "node:fs"
import path from "node:path"
import AxeBuilder from "@axe-core/playwright"
import { test, expect } from "@playwright/test"
import { BASE, TARGET, OLD_ROUTES, ROUTE_MAP, THEMES, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * A3 — axe (WCAG 2.2 AA) plus the checks axe misses. Runs at desktop and
 * iphone-15, both themes. Old target records; new target asserts zero.
 *
 * Customs implemented here (the rest are enforced by construction + unit
 * guards and noted in the report): one h1 and no skipped heading levels;
 * a visible focus indicator on the first tab stops; focus order that never
 * leaps back up the page; an aria-live region wherever content lands
 * asynchronously (the toaster at minimum).
 */

type RouteA11y = {
    axe: { id: string; impact: string | null | undefined; nodes: number; help: string }[]
    customs: string[]
}

test.describe("A3 accessibility", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(!["desktop", "iphone-15"].includes(testInfo.project.name), "axe at one desktop + one phone width")
        await assertTarget(request)
    })

    for (const theme of THEMES) {
        test(`axe + customs (${theme})`, async ({ browser }, testInfo) => {
            test.setTimeout(600_000)
            const ctx = await auditContext(browser, testInfo.project.name, theme)
            const page = await ctx.newPage()
            const routes = TARGET === "old" ? [...OLD_ROUTES] : [...OLD_ROUTES].map((r) => ROUTE_MAP[r])
            const report: Record<string, RouteA11y> = {}

            for (const route of routes) {
                await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
                await settleDeterministic(page)

                const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
                const customs: string[] = []

                // one h1; heading levels never skip downward by more than one
                const headings = await page.evaluate(() =>
                    [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
                        .filter((h) => { const r = h.getBoundingClientRect(); return r.width > 1 && r.height > 1 })
                        .map((h) => Number(h.tagName[1]))
                )
                if (headings.filter((h) => h === 1).length !== 1) customs.push(`h1 count = ${headings.filter((h) => h === 1).length}`)
                for (let i = 1; i < headings.length; i++) {
                    if (headings[i] > headings[i - 1] + 1) { customs.push(`heading skip h${headings[i - 1]}→h${headings[i]}`); break }
                }

                // aria-live present (async content lands somewhere announced)
                const hasLive = await page.evaluate(() => !!document.querySelector('[aria-live], [role="status"], [role="alert"], [role="log"]'))
                if (!hasLive) customs.push("no aria-live/status/alert region")

                // focus: visible indicator + never leaping back up the page
                let prevY = -Infinity
                let prevLandmark = ""
                let focusProblems = 0
                for (let i = 0; i < 18; i++) {
                    await page.keyboard.press("Tab")
                    const info = await page.evaluate(() => {
                        const el = document.activeElement as HTMLElement | null
                        if (!el || el === document.body) return null
                        const r = el.getBoundingClientRect()
                        const cs = getComputedStyle(el)
                        const visible =
                            cs.outlineStyle !== "none" || cs.boxShadow !== "none" ||
                            // :focus-visible styles may apply on a child ring wrapper
                            !!el.querySelector('[class*="ring"], [class*="outline"]')
                        const landmark = el.closest("nav, main, header, footer")
                        const landmarkId = landmark ? landmark.tagName + (landmark.getAttribute("aria-label") || "") : "none"
                        return { y: r.top + window.scrollY, visible, landmarkId, label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 35) }
                    })
                    if (!info) break
                    if (!info.visible) { customs.push(`no visible focus on «${info.label}»`); focusProblems++ }
                    // reading order is judged WITHIN a landmark — crossing from a
                    // full-height sidebar into main legitimately moves up the page
                    if (info.landmarkId === prevLandmark && info.y < prevY - 250) { customs.push(`focus leaps up the page at «${info.label}»`); focusProblems++ }
                    prevY = info.y
                    prevLandmark = info.landmarkId
                    if (focusProblems >= 3) break
                }

                report[route] = {
                    axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
                    customs: [...new Set(customs)],
                }
            }
            await ctx.close()

            const outDir = path.join(process.cwd(), "docs/audit")
            fs.mkdirSync(outDir, { recursive: true })
            fs.writeFileSync(
                path.join(outDir, `a11y-${TARGET === "old" ? "baseline" : "new"}-${testInfo.project.name}-${theme}.json`),
                JSON.stringify({ target: TARGET, theme, project: testInfo.project.name, capturedAt: new Date().toISOString(), report }, null, 2)
            )

            if (TARGET === "new") {
                const problems: string[] = []
                for (const [route, r] of Object.entries(report)) {
                    for (const v of r.axe) problems.push(`${route}: axe ${v.id} (${v.impact}) ×${v.nodes} — ${v.help}`)
                    for (const c of r.customs) problems.push(`${route}: ${c}`)
                }
                expect(problems, problems.join("\n")).toEqual([])
            } else {
                const total = Object.values(report).reduce((n, r) => n + r.axe.length + r.customs.length, 0)
                expect(total, "probe sensitivity: the old build should yield a11y findings").toBeGreaterThan(0)
            }
        })
    }
})
