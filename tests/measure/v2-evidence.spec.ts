import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { settle, renderedCounts } from "./metrics"

/**
 * PW-TRANSPARENCY-02 verification V2 — what the B2C home shows for a wallet
 * that HAS findings (the seeded customer of scripts/seed-agent-demo.mjs), at
 * 390px, Greek. Evidence only; no gate.
 *
 * Run: npx playwright test tests/measure/v2-evidence.spec.ts --project=measure --workers=1
 */
const OUT = path.join(process.cwd(), "docs", "evidence", "transparency-v2")

test("V2: B2C home with findings at 390", async ({ page }) => {
    test.setTimeout(5 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url()).not.toContain("/auth/")
    const data = {
        capturedAt: new Date().toISOString(),
        url: page.url(),
        renderedCounts: await renderedCounts(page),
        facts: await page.evaluate(() => {
            const pick = (sel: string) => Array.from(document.querySelectorAll(sel)).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160))
            return {
                underReviewOmitted: pick('[data-fact="gap.underReviewOmitted"]'),
                heroAreasLine: pick('[data-count="recommendation.openCount"]'),
                attentionItems: Array.from(document.querySelectorAll('section[aria-labelledby="attention-heading"] li')).map((li) => (li.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140)),
                gapTile: pick('[data-assessment-state]'),
                provenanceCountChips: pick('[data-count="gap.provenanceCount"]'),
            }
        }),
    }
    writeFileSync(path.join(OUT, "b2c-home-seeded-390.json"), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(OUT, "b2c-home-seeded-390.png"), fullPage: true })
    console.log("[v2] " + JSON.stringify(data.facts))
    console.log("[v2] counts " + JSON.stringify(data.renderedCounts))
})
