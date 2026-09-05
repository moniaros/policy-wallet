import { test, expect, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { applyPortfolioState, policiesFor, type PortfolioState } from "./dashboard-fixtures"
import { callsToAction } from "./dashboard"
import { WIDTHS, settle, scrollHeight, sectionCount, duplicateFacts, smallTapTargets, countsWithoutNavigation, overlappingHitAreas, renderedCounts } from "./metrics"
import { withDb } from "./surface-harness"

/**
 * PW-TRANSPARENCY-02 — Goal B4 «dashboards become routers», B2C Αρχική.
 *
 * Before/after evidence for the six acceptance metrics, on {empty, typical,
 * heavy} × {320, 390, 430}, locale el, the dedicated dashboard account:
 *   1. section count (≤ 6)                       — sectionCount, the one definition
 *   2. duplicate facts by data-fact (0)          — duplicateFacts, data-fact scan only
 *   3. counts with no navigation target (0)      — countsWithoutNavigation (new, ./metrics)
 *   4. primary actions per surface (exactly 1)   — callsToAction kind === primary
 *   5. scroll height (must fall against BEFORE)  — scrollHeight
 *   6. sub-44px tap targets (0)                  — smallTapTargets
 * plus the two ordering rules the goal states: renewals inside the first
 * viewport, and the life-event prompt above the generated findings.
 *
 * Run (serial, one worker — the account's whole wallet is the fixture):
 *   MEASURE_RUN=b4-before npx playwright test tests/measure/dashboard-b4.spec.ts --project=measure-dash --workers=1
 *   MEASURE_RUN=b4-after  … the same, after the change.
 */
test.describe.configure({ mode: "serial" })

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "dashboard-b4")
const RUN = process.env.MEASURE_RUN || "current"
const SHOTS = path.join(EVIDENCE, "screenshots", RUN)
const DATA = path.join(EVIDENCE, "data", RUN)
const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }
const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const STATES: PortfolioState[] = ["empty", "typical", "heavy"]

test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
    mkdirSync(DATA, { recursive: true })
})

async function openDashboard(page: Page, width: number) {
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
        await settle(page)
        await dismissCookieBanner(page)
        if (page.url().includes("/auth/")) throw new Error("openDashboard: bounced to sign-in — the dash storageState is stale")
        const ready = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").length > 300)
        if (ready) return
    }
    throw new Error("openDashboard: never rendered its content — refusing to measure")
}

export async function captureB4(page: Page, surface: string, label: string, width: number, extra: Record<string, unknown> = {}) {
    const ctas = await callsToAction(page)
    const order = await page.evaluate(() => {
        const top = (sel: string) => {
            const el = document.querySelector(sel)
            return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
        }
        return {
            viewportHeight: window.innerHeight,
            hero: top('section[aria-labelledby="protection-status-heading"]'),
            renewals: top('section[aria-labelledby="renewals-heading"]'),
            lifeEvents: top('a[href="/protection#life-events"]'),
            attention: top('section[aria-labelledby="attention-heading"]'),
            // A renewal FACT in the hero counts as renewals in the first viewport
            // when it is a door to the timeline (B4: every count navigates).
            renewalFact: top('a[href="#renewals"][data-count], [data-count="portfolio.expiringCount"]'),
        }
    })
    const data = {
        surface,
        label,
        width,
        run: RUN,
        capturedAt: new Date().toISOString(),
        scrollHeight: await scrollHeight(page),
        sections: await sectionCount(page),
        duplicateFacts: await duplicateFacts(page, []),
        countsWithoutNavigation: await countsWithoutNavigation(page),
        tapTargets: await smallTapTargets(page),
        // V4b: layout integrity — interactive boxes must not intersect.
        hitAreaOverlaps: await overlappingHitAreas(page),
        // V2 evidence: what every count says, and what the attention list lists.
        renderedCounts: await renderedCounts(page),
        attentionItems: await page.evaluate(() => Array.from(document.querySelectorAll('section[aria-labelledby="attention-heading"] li')).map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120))),
        ctas,
        primaryActions: ctas.filter((c) => c.kind === "primary").length,
        order,
        renewalsInFirstViewport:
            (order.renewals !== null && order.renewals < order.viewportHeight) ||
            (order.renewalFact !== null && order.renewalFact < order.viewportHeight),
        lifeEventsAboveAttention: order.lifeEvents !== null && order.attention !== null && order.lifeEvents < order.attention,
        ...extra,
    }
    writeFileSync(path.join(DATA, `${label}-${width}.json`), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(SHOTS, `${label}-${width}.png`), fullPage: true })
    console.log(
        `[b4 ${surface}] ${label}@${width}: ${data.scrollHeight}px, ${data.sections.count} sections, ` +
            `${data.duplicateFacts.duplicateFactCount} dup facts, ${data.countsWithoutNavigation.length} counts w/o nav, ` +
            `${data.primaryActions} primary, ${data.tapTargets.length} sub-44, ${data.hitAreaOverlaps.length} overlaps, renewals-first-viewport=${data.renewalsInFirstViewport}, ` +
            `life-events-above-attention=${data.lifeEventsAboveAttention}`
    )
    return data
}

for (const state of STATES) {
    test(`b4 ${RUN}: ${state}`, async ({ page }) => {
        test.setTimeout(20 * 60_000)
        const ids = await withDb((db) => applyPortfolioState(db, DASH_EMAIL, state))
        expect(ids.length, `${state}: fixture count`).toBe(policiesFor(state).length)
        for (const width of WIDTHS) {
            await openDashboard(page, width)
            await captureB4(page, "b2c-home", state, width, { portfolioState: state, policyCount: ids.length })
        }
    })
}
