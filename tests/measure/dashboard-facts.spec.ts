import { test, expect, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { applyPortfolioState, type PortfolioState } from "./dashboard-fixtures"
import { settle, overlappingHitAreas, smallTapTargets, renderedCounts, factRowGeometry } from "./metrics"
import { withDb } from "./surface-harness"

/**
 * The «Συνοπτική εικόνα» facts row — one clean round.
 *
 * Owner report 2026-09-07: seven items in one row of ~110px columns, the longest
 * label seven lines deep. The page-overflow probe saw nothing (nothing overflowed),
 * so this spec reads the CELLS: layout, cells per row, label lines, hairlines at
 * row starts, metric baselines, fonts, hit-area overlaps and tap targets inside
 * #overview — at five widths, on the widest and the narrowest wallet.
 *
 * A ROUND = one run of this spec. CLEAN = zero failed assertions. The owner asked
 * for three consecutive clean rounds; docs/evidence/dashboard-facts/<MEASURE_RUN>/
 * holds each round's JSON and crops, and the geometry fields must be identical
 * across the three (tests/measure/dashboard-facts-rounds.mjs compares them).
 *
 * Run (serial, ONE worker — the dash account's whole wallet is the fixture):
 *   MEASURE_RUN=round-1 npx playwright test tests/measure/dashboard-facts.spec.ts --project=measure-dash --workers=1
 */
test.describe.configure({ mode: "serial", timeout: 240_000 })

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "dashboard-facts")
const RUN = process.env.MEASURE_RUN || "current"
const OUT = path.join(EVIDENCE, RUN)
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const FIXTURES: PortfolioState[] = ["seven-facts", "two-facts"]
const WIDTHS: Array<[number, number]> = [[390, 844], [768, 1024], [1024, 768], [1280, 900], [1440, 900]]
/** Columns the card's width admits at each viewport (the card is 314 / 518 / 678px inside at 1024 / 1280 / 1440). */
const COLUMNS: Record<number, number> = { 1024: 2, 1280: 3, 1440: 4 }

test.beforeAll(() => mkdirSync(OUT, { recursive: true }))

async function openDashboard(page: Page, width: number, height: number) {
    await page.setViewportSize({ width, height })
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
        await settle(page)
        await dismissCookieBanner(page)
        if (page.url().includes("/auth/")) throw new Error("openDashboard: bounced to sign-in — the dash storageState is stale")
        const ready = await page.evaluate(() => document.getElementById("protection-status-heading") !== null)
        if (ready) return
    }
    throw new Error("openDashboard: the facts row never rendered — refusing to measure")
}

const inside = (box: [number, number, number, number], area: { top: number; bottom: number }) => box[1] >= area.top - 1 && box[1] + box[3] <= area.bottom + 1

for (const fixture of FIXTURES) {
    test.describe(fixture, () => {
        test.beforeAll(async () => {
            await withDb(async (db) => applyPortfolioState(db, DASH_EMAIL, fixture))
        })

        for (const [width, height] of WIDTHS) {
            test(`${fixture} at ${width}`, async ({ page }) => {
                await openDashboard(page, width, height)
                const geometry = await factRowGeometry(page)
                const counts = await renderedCounts(page)
                const overview = await page.evaluate(() => {
                    const el = document.getElementById("overview")!
                    const r = el.getBoundingClientRect()
                    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY }
                })
                const overlaps = (await overlappingHitAreas(page)).filter((o) => inside(o.boxA, overview) && inside(o.boxB, overview))
                const smallTargets = (await smallTapTargets(page)).filter((t) => /overview|protection-status/.test(t.chain))
                const heading = await page.evaluate(() => (document.getElementById("protection-status-heading")?.textContent || "").replace(/\s+/g, " ").trim())

                const card = page.locator('section[aria-labelledby="protection-status-heading"]')
                await card.screenshot({ path: path.join(OUT, `${fixture}-${width}.png`) })
                await page.evaluate(() => document.documentElement.classList.add("dark"))
                await card.screenshot({ path: path.join(OUT, `${fixture}-${width}-dark.png`) })
                await page.evaluate(() => document.documentElement.classList.remove("dark"))

                writeFileSync(path.join(OUT, `${fixture}-${width}.json`), JSON.stringify({ fixture, width, capturedAt: new Date().toISOString(), heading, counts, overlaps, smallTargets, geometry }, null, 2))
                console.log(`[${RUN}/${fixture}/${width}] layout=${geometry.layout} cells=${geometry.cells.length} rows=${geometry.rows} perRow=${geometry.cellsPerRow} rowStartHair=${geometry.hairlineAtRowStart} missingHair=${geometry.missingHairlines} baseline=${geometry.baselineSpread} maxLabelLines=${Math.max(0, ...geometry.cells.map((c) => c.labelLines))} overlaps=${overlaps.length} small=${smallTargets.length} fonts<12=${geometry.smallFonts.length} hscroll=${geometry.hscroll}`)

                // ── every width, both fixtures ──
                expect(geometry.hscroll, "the page must never scroll sideways").toBe(false)
                expect(overlaps, "hit areas inside #overview must not overlap").toEqual([])
                expect(smallTargets, "no tap target inside #overview under 44px").toEqual([])
                expect(geometry.smallFonts, "no functional text under 12px").toEqual([])
                for (const c of geometry.cells) {
                    if (c.key.startsWith("portfolio.") && c.key !== "portfolio.totalAnnualPremium") {
                        expect(c.width, `${c.key} width`).toBeGreaterThanOrEqual(44)
                        expect(c.height, `${c.key} height`).toBeGreaterThanOrEqual(44)
                    }
                    expect(c.labelLines, `${c.key} label lines`).toBeLessThanOrEqual(2)
                    expect(c.noteLines, `${c.key} note lines`).toBeLessThanOrEqual(2)
                }
                expect(geometry.cells.length, "every item renders a cell").toBe(fixture === "seven-facts" ? 7 : 2)
                if (fixture === "seven-facts") {
                    const unassessed = counts["portfolio.unassessedCount"] ?? ""
                    expect(unassessed.replace(/\s+/g, " ").trim()).toMatch(/^1 δεν αξιολογήθηκε χωρίς ορισμένους ελέγχους κλάδου$/)
                }
                // the heading reads the facts in order
                let cursor = 0
                for (const key of ["portfolio.policyCount", "portfolio.expiredCount", "portfolio.expiringCount", "portfolio.neverAnalysedCount", "portfolio.failedCount", "portfolio.unassessedCount"]) {
                    const v = counts[key]
                    if (!v) continue
                    const at = heading.indexOf(v.replace(/\s+/g, " ").trim(), cursor)
                    expect(at, `${key} appears in the heading in fact order`).toBeGreaterThanOrEqual(cursor)
                    cursor = at
                }

                // ── the two layouts ──
                if (width < 1024) {
                    expect(geometry.layout).toBe("pill")
                    expect(geometry.cells.every((c) => c.borderLeftPx === 0), "no hairline below lg").toBe(true)
                } else {
                    expect(geometry.layout).toBe("grid")
                    expect(geometry.cellsPerRow, "columns follow the card's width").toBe(COLUMNS[width])
                    expect(geometry.rows).toBe(fixture === "seven-facts" ? Math.ceil(7 / COLUMNS[width]) : 1)
                    expect(geometry.hairlineAtRowStart, "no hairline at a row's start").toBe(0)
                    expect(geometry.missingHairlines, "a hairline between every two cells of a row").toBe(0)
                    expect(geometry.baselineSpread, "metrics share a baseline within a row").toBeLessThanOrEqual(1)
                    for (const c of geometry.cells) {
                        expect(c.width, `${c.key} measure`).toBeGreaterThanOrEqual(120)
                        expect(c.numberFontPx, `${c.key} metric size`).toBe(20)
                        expect(c.labelFontPx, `${c.key} caption size`).toBe(12)
                    }
                }
            })
        }
    })
}
