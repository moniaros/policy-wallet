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
import { withDb } from "./surface-harness"
const SEED_POLICY_NUMBER = "63708952" // scripts/seed-agent-demo.mjs — the policy carrying the authored, citation-backed finding

/**
 * PW-TRANSPARENCY-02 close-out F5 — where a classified requirement renders, it
 * renders its citation: the home tally, the protection lens (coverage-insights
 * card microcopy + headline), and the seeded policy's findings card. 390px Greek.
 * Run: MEASURE_RUN=after npx playwright test tests/measure/r3-evidence-f5.spec.ts --project=measure --workers=1
 */
test("F5: B2C citation sites at 390", async ({ page }) => {
    test.setTimeout(8 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    const out: Record<string, unknown> = { run: RUN, capturedAt: new Date().toISOString() }

    await open(page, "/dashboard")
    out.home = { ...(await page.evaluate(provenanceFacts)), counts: await renderedCounts(page) }

    await open(page, "/protection")
    out.protection = {
        ...(await page.evaluate(provenanceFacts)),
        headline: await page.evaluate(() => Array.from(document.querySelectorAll("h1, h2, h3, p")).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()).filter((t) => /σημεί|υπό αξιολόγηση/.test(t)).slice(0, 4)),
    }
    const card = page.locator("text=/2496\\/1997/").first()
    if (await card.count()) await card.screenshot({ path: path.join(OUT, "protection-citation-390.png") })

    const href = await withDb(async (db) => {
        const p = await db.policy.findFirst({ where: { policyNumber: SEED_POLICY_NUMBER }, select: { id: true } })
        return p ? `/wallet/${p.id}` : null
    })
    expect(href, "the seeded demo policy (policy number " + SEED_POLICY_NUMBER + ")").toBeTruthy()
    await open(page, href!)
    out.policy = { href, ...(await page.evaluate(provenanceFacts)), counts: await renderedCounts(page) }
    const cite = page.locator('[data-fact="gap.citation"]').first()
    if (await cite.count()) {
        await cite.scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(OUT, "policy-citation-390.png"), fullPage: false })
    }
    await page.screenshot({ path: path.join(OUT, "policy-full-390.png"), fullPage: true })

    writeFileSync(path.join(OUT, "b2c-citations.json"), JSON.stringify(out, null, 2))
    expect((out.policy as any).facts.some((f: any) => f.fact === "gap.citation" && /2496\/1997/.test(f.text)), "the findings card renders the citation").toBe(true)
})
