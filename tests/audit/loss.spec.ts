import fs from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"
import { BASE, TARGET, ROUTE_MAP, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * Gate 1 — no information loss. Every metric/entity/status/action fact of
 * the OLD inventory must be found on the rebuilt app within one navigation
 * step of its mapped route, or carry an entry in retired-information.md.
 *
 * Matching is honest about rewording:
 *   entity  → its VALUE (plate, policy number) anywhere on the mapped route
 *             or one link away
 *   action  → its normalised destination (through the 301 map) exists as a
 *             link, or its name appears
 *   metric  → its value near a shared keyword stem
 *   status  → the vocabulary was REPLACED by design; unmatched status words
 *             must be retired entries, not silent losses
 * Whatever auto-matching cannot prove goes through the committed
 * docs/audit/loss-resolutions.json — a human-authored list of
 * {key, foundAt: route+quote} | {key, retiredId} — and every foundAt claim
 * is verified LIVE here: the page is visited and the quote must render.
 */

const REDIRECTS: Record<string, string> = {
    "/dashboard": "/", "/wallet": "/policies", "/protection": "/see", "/agent": "/adviser",
    "/notifications": "/updates", "/account": "/me", "/wallet/add": "/add", "/home": "/",
}
const normHref = (href: string): string => {
    if (!href || href.startsWith("http") || href.startsWith("#")) return href
    const clean = href.split("?")[0]
    for (const [from, to] of Object.entries(REDIRECTS)) {
        if (clean === from) return to
        if (clean.startsWith(`${from}/`)) return clean.replace(from, to === "/" ? "" : to)
    }
    return clean
}

type OldItem = { key: string; class: string; text: string; value?: string; href?: string }
type Resolution = { key: string; foundAt?: { route: string; quote: string }; retiredId?: string }

test.describe("gate 1 — no information loss", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "the contract is viewport-independent")
        test.skip(TARGET === "old", "the diff runs against the rebuilt app")
        await assertTarget(request)
    })

    test("every old fact is found, one step away, or retired with a reason", async ({ browser }, testInfo) => {
        test.setTimeout(600_000)
        const auditDir = path.join(process.cwd(), "docs/audit")
        const oldInv = JSON.parse(fs.readFileSync(path.join(auditDir, "information-inventory.json"), "utf-8")) as { inventory: Record<string, OldItem[]> }
        const resolutionsPath = path.join(auditDir, "loss-resolutions.json")
        const resolutions: Resolution[] = fs.existsSync(resolutionsPath) ? JSON.parse(fs.readFileSync(resolutionsPath, "utf-8")) : []
        const retiredMd = fs.existsSync(path.join(auditDir, "retired-information.md"))
            ? fs.readFileSync(path.join(auditDir, "retired-information.md"), "utf-8")
            : ""

        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()

        /** route → its own text + the text of every same-origin main link one step away */
        const corpus = new Map<string, { text: string; hrefs: Set<string> }>()
        const pageText = async (route: string): Promise<{ text: string; hrefs: string[] }> => {
            await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
            await settleDeterministic(page)
            return page.evaluate(() => {
                const scope = document.querySelector("main") || document.body
                // one navigation step includes the CHROME: the tab bar and the
                // sidebar are one tap from anywhere
                const hrefs = [...document.querySelectorAll<HTMLAnchorElement>("main a[href], nav a[href]")]
                    .map((a) => a.getAttribute("href") || "")
                    .filter((h) => h.startsWith("/") && !h.startsWith("//"))
                return { text: (scope.textContent || "").replace(/\s+/g, " "), hrefs: [...new Set(hrefs)] }
            })
        }
        const corpusFor = async (route: string): Promise<{ text: string; hrefs: Set<string> }> => {
            if (corpus.has(route)) return corpus.get(route)!
            const own = await pageText(route)
            const entry = { text: own.text, hrefs: new Set(own.hrefs.map(normHref)) }
            corpus.set(route, entry)
            return entry
        }

        const missing: string[] = []
        const usedResolutions = new Map(resolutions.map((r) => [r.key, r]))

        for (const [oldRoute, items] of Object.entries(oldInv.inventory)) {
            const mapped = ROUTE_MAP[oldRoute] ?? oldRoute
            const base = await corpusFor(mapped)
            // one navigation step: the mapped route's own links (capped to app pages)
            const stepRoutes = [...base.hrefs].filter((h) => h.startsWith("/") && h.split("/").length <= 4).slice(0, 20)

            for (const item of items) {
                if (!["metric", "entity", "status", "action"].includes(item.class)) continue

                let found = false
                if (item.class === "action" && item.href) {
                    const target = normHref(item.href)
                    found = base.hrefs.has(target) || base.text.includes(item.text)
                    if (!found) for (const r of stepRoutes) { const c = await corpusFor(r); if (c.hrefs.has(target)) { found = true; break } }
                } else if (item.class === "entity" && item.value) {
                    found = base.text.includes(item.value)
                    if (!found) for (const r of stepRoutes) { const c = await corpusFor(r); if (c.text.includes(item.value)) { found = true; break } }
                } else if (item.class === "metric") {
                    const stems = ["λήξ", "λήγ", "ημέρ", "ασφαλιστήρι", "έγγραφ", "ευρήματ", "κενό", "κενά", "έλεγχο", "€", "ανανέωσ", "μήν", "διαβάσ"]
                    const stem = stems.find((s) => item.text.toLowerCase().includes(s))
                    const probe = (t: string) => (item.value ? t.includes(item.value) : false) && (!stem || t.toLowerCase().includes(stem))
                    found = probe(base.text)
                    if (!found) for (const r of stepRoutes) { const c = await corpusFor(r); if (probe(c.text)) { found = true; break } }
                } else if (item.class === "status") {
                    // the old vocabularies were deliberately replaced — a status
                    // word "missing" is only fine if the retirement is written
                    found = ["Καλύπτεται", "Κενό", "Για έλεγχο"].some((s) => item.text.includes(s)) && (base.text.includes(item.text) || (item.text === "Κενό" && base.text.includes("Χωρίς κάλυψη")))
                }

                if (found) continue
                const res = usedResolutions.get(item.key)
                if (res?.foundAt) {
                    const c = await corpusFor(res.foundAt.route)
                    if (c.text.includes(res.foundAt.quote)) continue
                    missing.push(`${oldRoute} → ${item.key}: resolution quote not found live at ${res.foundAt.route}: «${res.foundAt.quote}»`)
                    continue
                }
                if (res?.retiredId) {
                    if (retiredMd.includes(res.retiredId)) continue
                    missing.push(`${oldRoute} → ${item.key}: retiredId ${res.retiredId} not in retired-information.md`)
                    continue
                }
                missing.push(`${oldRoute} → [${item.class}] «${item.text.slice(0, 70)}» — not found on ${mapped} or one step away, no resolution`)
            }
        }
        await ctx.close()

        fs.writeFileSync(path.join(auditDir, "loss-report.json"), JSON.stringify({ capturedAt: new Date().toISOString(), unresolved: missing }, null, 2))
        expect(missing, `${missing.length} unresolved:\n${missing.join("\n")}`).toEqual([])
    })
})
