import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { settle, renderedCounts } from "./metrics"

const RUN = process.env.MEASURE_RUN || "after"
const OUT = path.join(process.cwd(), "docs", "evidence", "transparency-f5", RUN)

async function open(page: import("@playwright/test").Page, url: string) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url(), url).not.toContain("/auth/")
}
/** Every rendered provenance class / citation, and every leaf whose text names a law used in F5. */
const provenanceFacts = () => ({
    facts: Array.from(document.querySelectorAll('[data-fact="gap.citation"], [data-fact="gap.provenance"], [data-count^="gap.provenanceCount"]')).map((e) => ({
        fact: e.getAttribute("data-fact") || e.getAttribute("data-count"),
        text: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
    })),
    lawMentions: Array.from(document.querySelectorAll("p, span, div, li")).filter((e) => e.children.length === 0 && /2496\/1997|4830\/2021|Νομοθετική απαίτηση|Legal requirement/.test(e.textContent || "")).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220)),
})
/** F5 — the agent side: the KPI/chip counts and the insights pill carrying the citation. Project: measure-agent. */
test("F5: agent citation sites at 390", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    const out: Record<string, unknown> = { run: RUN, capturedAt: new Date().toISOString() }

    await open(page, "/dashboard")
    out.dashboard = {
        counts: await renderedCounts(page),
        kpis: await page.evaluate(() => Array.from(document.querySelectorAll('[data-count^="agent."]')).map((c) => ((c.closest("a, button, div") as HTMLElement | null)?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80))),
        scoreWords: await page.evaluate(() => /Μέσος δείκτης προστασίας|\/100/.test(document.body.textContent || "")),
    }
    await open(page, "/insights")
    out.insights = await page.evaluate(provenanceFacts)
    const pill = page.locator("text=/2496\\/1997/").first()
    if (await pill.count()) {
        await pill.scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(OUT, "agent-insights-citation-390.png"), fullPage: false })
    }
    await page.screenshot({ path: path.join(OUT, "agent-insights-390.png"), fullPage: true })
    writeFileSync(path.join(OUT, "agent-citations.json"), JSON.stringify(out, null, 2))
    expect((out.dashboard as any).scoreWords, "no averaged score words on the agent dashboard").toBe(false)
})
