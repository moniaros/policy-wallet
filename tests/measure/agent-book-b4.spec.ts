import { test, expect, type Page } from "@playwright/test"
import { execFileSync } from "child_process"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { callsToAction } from "./dashboard"
import { WIDTHS, settle, scrollHeight, sectionCount, duplicateFacts, smallTapTargets, countsWithoutNavigation } from "./metrics"

/**
 * PW-TRANSPARENCY-02 — Goal B4 «dashboards become routers», B2B book (/dashboard as the agent).
 *
 * The same six metrics as dashboard-b4.spec.ts, on the E2E agent account at
 * 320/390/430. The account is wired with one customer, one analysed policy
 * and its findings through scripts/seed-agent-demo.mjs (idempotent, local dev
 * DB); if the seed cannot run the capture still happens and says so.
 *
 * Run:  MEASURE_RUN=b4-before npx playwright test tests/measure/agent-book-b4.spec.ts --project=measure-agent --workers=1
 */
test.describe.configure({ mode: "serial" })

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "dashboard-b4")
const RUN = process.env.MEASURE_RUN || "current"
const SHOTS = path.join(EVIDENCE, "screenshots", RUN)
const DATA = path.join(EVIDENCE, "data", RUN)
const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }
const AGENT_EMAIL = "e2e-agent@policywallet.test"
const CUSTOMER_EMAIL = "e2e-ph@policywallet.test"

let fixture = "not-attempted"

test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
    mkdirSync(DATA, { recursive: true })
    try {
        execFileSync("node", ["scripts/seed-agent-demo.mjs", AGENT_EMAIL, CUSTOMER_EMAIL], { stdio: "pipe", timeout: 90_000 })
        fixture = "seeded"
    } catch (error) {
        fixture = `seed-failed: ${String((error as Error).message).slice(0, 200)}`
    }
})

async function openBook(page: Page, width: number) {
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
        await settle(page)
        await dismissCookieBanner(page)
        if (page.url().includes("/auth/")) throw new Error("openBook: bounced to sign-in — the agent storageState is stale")
        const ready = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").length > 300)
        if (ready) return
    }
    throw new Error("openBook: never rendered its content — refusing to measure")
}

test(`b4 ${RUN}: agent book`, async ({ page }) => {
    test.setTimeout(15 * 60_000)
    for (const width of WIDTHS) {
        await openBook(page, width)
        const ctas = await callsToAction(page)
        const data = {
            surface: "b2b-book",
            label: "agent-book",
            width,
            run: RUN,
            fixture,
            capturedAt: new Date().toISOString(),
            scrollHeight: await scrollHeight(page),
            sections: await sectionCount(page),
            duplicateFacts: await duplicateFacts(page, []),
            countsWithoutNavigation: await countsWithoutNavigation(page),
            tapTargets: await smallTapTargets(page),
            ctas,
            primaryActions: ctas.filter((c) => c.kind === "primary").length,
        }
        expect(data.scrollHeight).toBeGreaterThan(0)
        writeFileSync(path.join(DATA, `agent-book-${width}.json`), JSON.stringify(data, null, 2))
        await page.screenshot({ path: path.join(SHOTS, `agent-book-${width}.png`), fullPage: true })
        console.log(
            `[b4 b2b-book] agent-book@${width} (${fixture}): ${data.scrollHeight}px, ${data.sections.count} sections, ` +
                `${data.duplicateFacts.duplicateFactCount} dup facts, ${data.countsWithoutNavigation.length} counts w/o nav, ` +
                `${data.primaryActions} primary, ${data.tapTargets.length} sub-44`
        )
    }
})
