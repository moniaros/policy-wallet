import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { settle, renderedCounts } from "./metrics"
import { withDb } from "./surface-harness"

const OWNER_EMAIL = "e2e-ph@policywallet.test"

/**
 * PW-TRANSPARENCY-02 remediation R3 — the six leak sites, rendered on the seeded
 * customer wallet at 390px Greek: the home (hero count, attention list), the
 * protection lens (coverage-insights headline), and the first policy's findings
 * page (summary band). Run with MEASURE_RUN=r3-before / r3-after.
 *
 * Run: MEASURE_RUN=r3-before npx playwright test tests/measure/r3-evidence.spec.ts --project=measure --workers=1
 */
const RUN = process.env.MEASURE_RUN || "current"
const OUT = path.join(process.cwd(), "docs", "evidence", "transparency-r3", RUN)

async function open(page: import("@playwright/test").Page, url: string) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url(), url).not.toContain("/auth/")
}
const pickAll = (sel: string) => Array.from(document.querySelectorAll(sel)).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160))

test("R3: B2C leak sites at 390", async ({ page }) => {
    test.setTimeout(8 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    const out: Record<string, unknown> = { run: RUN, capturedAt: new Date().toISOString() }

    await open(page, "/dashboard")
    out.home = {
        counts: await renderedCounts(page),
        heroLine: await page.evaluate(pickAll, '[data-count="recommendation.openCount"]'),
        attentionItems: await page.evaluate(() => Array.from(document.querySelectorAll('section[aria-labelledby="attention-heading"] li')).map((li) => (li.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120))),
        gapTile: await page.evaluate(pickAll, "[data-assessment-state]"),
    }
    await page.screenshot({ path: path.join(OUT, "home-390.png"), fullPage: true })

    await open(page, "/protection")
    out.protection = {
        headline: await page.evaluate(() => Array.from(document.querySelectorAll("h1, h2, h3, p")).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter((t) => /σημεί|κεν[άό]|ευρήματ/i.test(t) && /\d/.test(t)).slice(0, 6)),
        counts: await renderedCounts(page),
    }
    await page.screenshot({ path: path.join(OUT, "protection-390.png"), fullPage: true })

    // The wallet list opens policies by click, not by anchor: take the seeded
    // policy with findings straight from the database.
    const first = await withDb(async (db) => {
        const owner = await db.user.findFirst({ where: { email: OWNER_EMAIL }, select: { id: true } })
        const withGaps = await db.gapInstance.findFirst({ where: { supersededAt: null, policy: { ownerUserId: owner?.id } }, select: { policyId: true } })
        const policy = withGaps?.policyId ?? (await db.policy.findFirst({ where: { ownerUserId: owner?.id }, select: { id: true } }))?.id
        return policy ? `/wallet/${policy}` : null
    })
    expect(first, "a seeded policy for the owner").toBeTruthy()
    await open(page, first!)
    out.policy = {
        href: first,
        summaryBand: await page.evaluate(() => Array.from(document.querySelectorAll("p, div, h3")).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter((t) => /^Βρέθηκ|σημεί[αο] (προς|για)|ευρήματα/i.test(t) && t.length < 140).slice(0, 5)),
        provenanceGroups: await page.evaluate(() => Array.from(document.querySelectorAll('[data-fact="gap.provenanceGroup"]')).map((e) => `${e.getAttribute("data-provenance")}: ${(e.querySelector("h3")?.textContent || "").trim()}`)),
        composition: await page.evaluate(pickAll, '[data-fact^="composition."]'),
        counts: await renderedCounts(page),
    }
    await page.screenshot({ path: path.join(OUT, "policy-390.png"), fullPage: true })

    writeFileSync(path.join(OUT, "b2c.json"), JSON.stringify(out, null, 2))
    console.log("[r3 b2c] " + JSON.stringify({ hero: (out.home as any).heroLine, attention: (out.home as any).attentionItems.length, protection: (out.protection as any).headline, band: (out.policy as any).summaryBand }))
})
