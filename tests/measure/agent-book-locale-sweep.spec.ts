import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { settle, pageOverflow } from "./metrics"
import { withDb } from "./surface-harness"

/**
 * PW-CONTENT-01 Goal 1 acceptance 4 — both audiences render end to end in each
 * locale at 320/390/430 with no horizontal clipping, and a dated sentence speaks
 * the page's language. Run with MEASURE_RUN=el|en after setting the seeded
 * users' stored preference (the client provider is seeded from it).
 * Project: agent.
 */
const RUN = process.env.MEASURE_RUN || "el"
const OUT = path.join(process.cwd(), "docs", "evidence", "content-g1", RUN)
const GREEK_MONTH = /Ιανουαρίου|Φεβρουαρίου|Μαρτίου|Απριλίου|Μαΐου|Ιουνίου|Ιουλίου|Αυγούστου|Σεπτεμβρίου|Οκτωβρίου|Νοεμβρίου|Δεκεμβρίου/
const ENGLISH_MONTH = /January|February|March|April|May|June|July|August|September|October|November|December/

async function open(page: import("@playwright/test").Page, url: string) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url(), url).not.toContain("/auth/")
}
const stamp = () => ({ lang: document.documentElement.lang, locale: document.documentElement.getAttribute("data-locale"), dated: Array.from(document.querySelectorAll('[data-fact="composition.prePlan"], [data-fact="gap.findingsProvenance"], [data-fact="composition.lines"]')).map((e) => (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160)) })

test("Goal 1: agent locale sweep at 320/390/430", async ({ page }) => {
    test.setTimeout(10 * 60_000)
    mkdirSync(OUT, { recursive: true })
    // The harness's global setup re-provisions the seeded users (preferredLanguage: 'el'),
    // so the stored preference is set HERE, after setup, and restored at the end.
    const setPreference = (lang: string) => withDb((db) => db.user.updateMany({ where: { email: { in: ["e2e-ph@policywallet.test", "e2e-agent@policywallet.test"] } }, data: { preferredLanguage: lang } }))
    await setPreference(RUN)
    const pages: string[] = await withDb(async (db) => { const c = await db.user.findFirst({ where: { email: "e2e-ph@policywallet.test" }, select: { id: true } }); const p = await db.policy.findFirst({ where: { policyNumber: "63708952" }, select: { id: true } }); return ["/dashboard", "/customers", "/insights", "/tasks", ...(c && p ? [`/customers/${c.id}/policy/${p.id}`] : [])] })
    const out: any = { run: RUN, capturedAt: new Date().toISOString(), results: [] }
    const failures: string[] = []
    for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 })
        for (const url of pages) {
            await open(page, url)
            const overflow = await pageOverflow(page)
            const s = await page.evaluate(stamp)
            const row = { width, url, overflowPx: (overflow as any).overflowPx, offenders: ((overflow as any).offenders ?? []).slice(0, 6), lang: s.lang, locale: s.locale, dated: s.dated }
            out.results.push(row)
            if ((overflow as any).overflowPx > 0) failures.push(`${width}px ${url}: overflow ${(overflow as any).overflowPx}px`)
            if (s.lang !== RUN) failures.push(`${width}px ${url}: <html lang> is ${s.lang}, expected ${RUN}`)
            if (s.locale !== (RUN === "el" ? "el-GR" : "en-GB")) failures.push(`${width}px ${url}: data-locale ${s.locale}`)
            for (const d of s.dated) {
                if (RUN === "el" && ENGLISH_MONTH.test(d)) failures.push(`${width}px ${url}: English month in Greek copy — ${d}`)
                if (RUN === "en" && GREEK_MONTH.test(d)) failures.push(`${width}px ${url}: Greek month in English copy — ${d}`)
            }
            if (width === 390) await page.screenshot({ path: path.join(OUT, `agent-${url.replace(/[^a-z0-9]+/gi, "_")}-390.png`), fullPage: true })
        }
    }
    out.failures = failures
    await setPreference("el")
    writeFileSync(path.join(OUT, "agent.json"), JSON.stringify(out, null, 2))
    expect(failures, failures.join("\n")).toEqual([])
})

