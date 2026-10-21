/**
 * PW-CONTENT-02 — public-site measurement. Evidence, not assertion: writes
 * docs/series/PW-CONTENT-02/evidence/measure-<phase>.json with, per route,
 *   - the ≥80-char text blocks (shell excluded) → cross-page metric M-X1 (below)
 *   - the same-surface duplicate-block count (the transformation doc's definition)
 *   - truncation failures at 320 / 390 / 430
 *   - the positioning-variant hits in rendered text, <title>, meta, OG/Twitter, JSON-LD (M-P)
 *   - the JSON-LD offer prices
 * Routes are the series' measured set (STEP0 §5). Definitions are imported from
 * metrics.ts, never copied.
 */
import { test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { duplicateBlocks, settle, textBlocks, truncationFailures } from "./metrics"
import { PRODUCT_CATEGORY_SLUGS } from "./content-02-routes"

const PHASE = process.env.CONTENT02_PHASE || "after"
const DIR = join(process.cwd(), "docs", "series", "PW-CONTENT-02", "evidence")
const BANNED = /έλεγχο[ςυ] ρίσκου|ανάλυσης? ρίσκου|(σας λέμε|δείτε|δείχνει|δείχνουμε)\s+(αν|πού)\s+είστε\s+καλυμμένοι|[Αα]ξιολογούμε την προστασία|risk intelligence|risk check|(tell|show)s?\s+(you\s+)?(if|where)\s+you\s+are\s+covered|what you are not covered for|ανεξάρτητ\S*\s+(έλεγχ|ανάλυσ)\S*|independent (risk|analysis|personal)/i

// Support is email only (owner decision 2026-10-22): no phone, hours, chat or «dedicated» support in rendered text.
const SUPPORT_BANNED = /Αποκλειστική υποστήριξη|Dedicated support|τηλεφωνικ\S* υποστήριξη|phone support|ώρες λειτουργίας|ώρες που απαντάμε|When we answer|24\/7|Δευτέρα\s*[–-]\s*Παρασκευή|Monday\s*[–-]\s*Friday|live chat/i

const BASE_ROUTES = ["/", "/pricing", "/product", "/compare", "/solutions/agents", ...PRODUCT_CATEGORY_SLUGS.map((c) => `/product/${c}`)]
const ROUTES = [...BASE_ROUTES, ...BASE_ROUTES.map((r) => (r === "/" ? "/en" : `/en${r}`))]

type RouteResult = {
    route: string
    status: number | null
    blocks: string[]
    sameSurfaceDuplicateBlocks: number
    truncation: Record<number, number>
    truncationSamples: Record<number, string[]>
    positioningHits: string[]
    supportHits: string[]
    jsonLdPrices: unknown[]
    title: string
}
const results: RouteResult[] = []

test.describe.configure({ mode: "serial" })
test.setTimeout(10 * 60 * 1000)

test("measure public routes", async ({ page, baseURL }) => {
    for (const route of ROUTES) {
        const res = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" }).catch(() => null)
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page)
        const blocks = await textBlocks(page, { excludeShell: true })
        const dup = await duplicateBlocks(page)
        const truncation: Record<number, number> = {}
        const truncationSamples: Record<number, string[]> = {}
        for (const w of [320, 390, 430]) {
            await page.setViewportSize({ width: w, height: 844 })
            await page.waitForTimeout(250)
            const found = await truncationFailures(page)
            truncation[w] = found.length
            truncationSamples[w] = found.map((f) => `${f.selector} «${f.text.slice(0, 40)}»`)
        }
        const head = await page.evaluate(() => {
            const metas = [...document.querySelectorAll("meta[name], meta[property]")].map((m) => `${m.getAttribute("name") || m.getAttribute("property")}=${m.getAttribute("content")}`)
            const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || "")
            return { title: document.title, metas, ld, text: document.body.innerText }
        })
        const surfaces = [head.title, ...head.metas, ...head.ld, head.text]
        const positioningHits = surfaces.flatMap((s) => s.split("\n").filter((l) => BANNED.test(l)).map((l) => l.trim().slice(0, 140)))
        const supportHits = surfaces.flatMap((x) => x.split("\n").filter((l) => SUPPORT_BANNED.test(l)).map((l) => l.trim().slice(0, 140)))
        const jsonLdPrices: unknown[] = []
        for (const raw of head.ld) {
            try {
                const walk = (n: unknown): void => {
                    if (Array.isArray(n)) return n.forEach(walk)
                    if (n && typeof n === "object") {
                        const o = n as Record<string, unknown>
                        if (o["@type"] === "Offer") jsonLdPrices.push({ name: o.name, price: o.price, priceCurrency: o.priceCurrency })
                        Object.values(o).forEach(walk)
                    }
                }
                walk(JSON.parse(raw))
            } catch {
                // a non-JSON ld+json block: nothing to read
            }
        }
        results.push({ route, status: res?.status() ?? null, blocks, sameSurfaceDuplicateBlocks: dup.length, truncation, truncationSamples, positioningHits, supportHits, jsonLdPrices, title: head.title })
    }

    // M-X1 — per locale, across /product and /product/* only (the series' acceptance set).
    const xpage = (isEn: boolean) => {
        const set = results.filter((r) => (isEn ? r.route.startsWith("/en/product") : r.route.startsWith("/product")))
        const occ = new Map<string, Set<string>>()
        for (const r of set) for (const b of new Set(r.blocks)) occ.set(b, (occ.get(b) || new Set()).add(r.route))
        const repeated = [...occ.entries()].filter(([, routes]) => routes.size > 1)
        return {
            routes: set.length,
            distinctRepeatedBlocks: repeated.length,
            totalOccurrences: repeated.reduce((n, [, routes]) => n + routes.size, 0),
            maxOccurrencesOfOneBlock: repeated.reduce((m, [, routes]) => Math.max(m, routes.size), 1),
            sample: repeated.slice(0, 5).map(([b, routes]) => ({ block: b.slice(0, 90), routes: routes.size })),
        }
    }
    mkdirSync(DIR, { recursive: true })
    const summary = {
        phase: PHASE,
        base: baseURL,
        measuredAt: new Date().toISOString(),
        mX1: { el: xpage(false), en: xpage(true) },
        mS_renderedSupportHits: results.reduce((n, r) => n + r.supportHits.length, 0),
        mP_renderedHits: results.reduce((n, r) => n + r.positioningHits.length, 0),
        sameSurfaceDuplicateBlocksTotal: results.reduce((n, r) => n + r.sameSurfaceDuplicateBlocks, 0),
        truncationTotals: [320, 390, 430].map((w) => ({ width: w, failures: results.reduce((n, r) => n + (r.truncation[w] || 0), 0) })),
        non200: results.filter((r) => r.status !== 200).map((r) => `${r.route}:${r.status}`),
    }
    writeFileSync(join(DIR, `measure-${PHASE}.json`), JSON.stringify({ summary, routes: results.map(({ blocks, ...r }) => ({ ...r, blockCount: blocks.length })) }, null, 2))
    console.log(JSON.stringify(summary, null, 2))
})
