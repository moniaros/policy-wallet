import fs from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"
import { BASE, TARGET, OLD_ROUTES, ROUTE_MAP, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * A6 — the vocabulary probe (the brief calls it the highest-value one).
 * Scans RENDERED text — the unit guards police the catalogues; this is the
 * page. Old target records the babel; new target asserts:
 *   · status-chip vocabulary is exactly the three-state system
 *   · zero banned advice stems outside /adviser
 *   · zero finding-shaped cards without an entity/number/document reference
 *   · no string rendered more than twice on a route
 *   · zero uppercase Greek runs longer than one word
 *   · no bare number without a label beside it
 */

const BANNED = /πρόταση|προτείν|συμβουλεύ|καλύτερο πρόγραμμα|αλλάξτε|αγοράστε|εξοικονομ|κόψτε/i
/** The rebuilt status vocabulary (StatusChip's three states). */
const THREE_STATES = new Set(["Καλύπτεται", "Χωρίς κάλυψη", "Για έλεγχο"])
/** Everything the OLD builds' seven vocabularies used — collected, not asserted. */
const STATUS_SCAN = [
    "ΛΗΓΜΕΝΟ", "ΛΗΓΕΙ ΣΥΝΤΟΜΑ", "ΕΝΕΡΓΟ", "ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ",
    "Κρίσιμη προτεραιότητα", "Υψηλή προτεραιότητα", "Μεσαία προτεραιότητα", "Χαμηλή προτεραιότητα",
    "Απαιτείται ενέργεια", "Εντάξει", "Προσοχή", "σημεία για έλεγχο",
    "Καλύπτεται", "Κενό", "Χωρίς κάλυψη", "Για έλεγχο",
]

type RouteReport = {
    statusWords: string[]
    banned: string[]
    templateCards: string[]
    duplicates: string[]
    uppercaseRuns: string[]
    /** informational: stored-caps data (legal names) — never gate-failing */
    storedCapsData: string[]
    nakedNumbers: string[]
}

test.describe("A6 consistency", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "vocabulary is viewport-independent — captured once")
        await assertTarget(request)
    })

    test("one vocabulary, no templates, no shouting", async ({ browser }, testInfo) => {
        test.setTimeout(300_000)
        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()
        const routes = TARGET === "old" ? [...OLD_ROUTES] : [...OLD_ROUTES].map((r) => ROUTE_MAP[r])
        const report: Record<string, RouteReport> = {}

        for (const route of routes) {
            await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
            await settleDeterministic(page)

            const data = await page.evaluate((statusScan) => {
                const scope = document.querySelector("main") || document.body
                const texts: string[] = []
                const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
                let n: Node | null
                while ((n = walker.nextNode())) {
                    const t = (n.textContent || "").replace(/\s+/g, " ").trim()
                    const el = n.parentElement
                    if (t.length < 2 || !el) continue
                    const cs = getComputedStyle(el)
                    if (cs.display === "none" || cs.visibility === "hidden" || el.closest('[aria-hidden="true"], script, style')) continue
                    texts.push(t)
                }
                // status words present (chip-sized text runs only — a sentence
                // CONTAINING «Εντάξει» is prose, a 1-3-word run is a status)
                const statusWords = [...new Set(texts.filter((t) => t.split(" ").length <= 4 && statusScan.some((s) => t === s || t.startsWith(s))))]
                // DESIGN shouting = css text-transform uppercase over Greek —
                // the assertable rule (matches the rendered gate). Stored-caps
                // DATA (person/insurer legal names pass through as stored) is
                // recorded separately and never fails the gate.
                const allEls = [...scope.querySelectorAll<HTMLElement>("*")]
                const ownGreek = (el: HTMLElement) => [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent || "").join(" ").trim()
                const uppercaseRuns = [...new Set(allEls
                    .filter((el) => {
                        const own = ownGreek(el)
                        return own && /[α-ωΑ-Ω]/.test(own) && own.split(/\s+/).length > 1 && getComputedStyle(el).textTransform === "uppercase"
                    })
                    .map((el) => (el.textContent || "").trim().slice(0, 50)))]
                const storedCapsData = [...new Set(allEls
                    .filter((el) => {
                        const own = ownGreek(el)
                        if (!own || getComputedStyle(el).textTransform === "uppercase") return false
                        const words = own.split(/\s+/).filter((w) => /^[Α-ΩΪΫ]{2,}$/.test(w))
                        return words.length > 1
                    })
                    .map((el) => ownGreek(el).slice(0, 50)))]
                // duplicates: same visible string more than twice — EXCEPT
                // structural repetition (one occurrence per sibling list item:
                // per-row affordances, per-row status chips). The old /wallet
                // alert repeated a line inside ONE box — that stays flagged.
                const occ = new Map<string, Element[]>()
                {
                    const walker2 = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
                    let n2: Node | null
                    while ((n2 = walker2.nextNode())) {
                        const t = (n2.textContent || "").replace(/\s+/g, " ").trim()
                        const el = n2.parentElement
                        if (t.length <= 8 || !el || el.closest('[aria-hidden="true"], script, style')) continue
                        const rr = el.getBoundingClientRect()
                        if (rr.width <= 1 || rr.height <= 1) continue // unopened dialog/sheet content has no layout
                        if (!occ.has(t)) occ.set(t, [])
                        occ.get(t)!.push(el)
                    }
                }
                const duplicates = [...occ.entries()]
                    .filter(([, els]) => els.length > 2)
                    .filter(([, els]) => {
                        const items = els.map((el) => el.closest("li, article, tr"))
                        if (items.every(Boolean) && new Set(items).size === els.length) return false // one per row
                        return true
                    })
                    .map(([t, els]) => `${els.length}× «${t.slice(0, 60)}»`)
                // finding-shaped cards without entity/number/document reference —
                // scoped to the finding lists (#now/#month/#later and /see),
                // where the source gate is the law; other rows have their own rules
                const cards = [...scope.querySelectorAll<HTMLElement>("section#now li, section#month li, section#later li, section#now article, section#month article, section#later article")]
                const templateCards = cards
                    .filter((c) => {
                        const t = (c.textContent || "").trim()
                        if (t.length < 40) return false
                        const hasRef = /\d/.test(t) || /[A-ZΑ-Ω]{2,3}-?\d{3,4}/.test(t) || /έγγραφ|ασφαλιστήρι|συμβόλαι|πίνακα/i.test(t)
                        return !hasRef
                    })
                    .map((c) => (c.textContent || "").trim().slice(0, 70))
                // bare numbers: numeric-only element whose parent adds no label
                const nakedNumbers = [...scope.querySelectorAll<HTMLElement>("*")]
                    .filter((el) => {
                        const own = (el.textContent || "").trim()
                        if (!/^\d+([.,]\d+)?$/.test(own)) return false
                        const parentText = (el.parentElement?.textContent || "").replace(/\s+/g, " ").trim()
                        return parentText === own // nothing beside it names it
                    })
                    .map((el) => (el.parentElement?.parentElement?.textContent || "").trim().slice(0, 50))
                return { texts, statusWords, uppercaseRuns, storedCapsData, duplicates, templateCards, nakedNumbers }
            }, STATUS_SCAN)

            const isAdviser = route === "/adviser" || route === "/agent"
            const banned = isAdviser ? [] : [...new Set(data.texts.filter((t) => BANNED.test(t)))].map((t) => t.slice(0, 70))
            report[route] = {
                statusWords: data.statusWords,
                banned,
                templateCards: data.templateCards,
                duplicates: data.duplicates,
                uppercaseRuns: data.uppercaseRuns,
                storedCapsData: data.storedCapsData,
                nakedNumbers: [...new Set(data.nakedNumbers)],
            }
        }
        await ctx.close()

        const outDir = path.join(process.cwd(), "docs/audit")
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(
            path.join(outDir, `consistency-${TARGET === "old" ? "baseline" : "new"}.json`),
            JSON.stringify({ target: TARGET, capturedAt: new Date().toISOString(), report }, null, 2)
        )

        if (TARGET === "new") {
            const problems: string[] = []
            for (const [route, r] of Object.entries(report)) {
                for (const w of r.statusWords) if (![...THREE_STATES].some((s) => w === s || w.startsWith(s))) problems.push(`${route}: status word outside the three-state system: «${w}»`)
                for (const b of r.banned) problems.push(`${route}: banned advice language: «${b}»`)
                for (const t of r.templateCards) problems.push(`${route}: finding without entity/number/document ref: «${t}»`)
                for (const d of r.duplicates) problems.push(`${route}: duplicate text ${d}`)
                for (const u of r.uppercaseRuns) problems.push(`${route}: uppercase Greek run «${u}»`)
                for (const nn of r.nakedNumbers) problems.push(`${route}: number without a label near «${nn}»`)
            }
            expect(problems, problems.join("\n")).toEqual([])
        } else {
            const found = Object.values(report).reduce((n, r) => n + r.statusWords.length + r.uppercaseRuns.length + r.duplicates.length, 0)
            expect(found, "probe sensitivity: the old build's vocabulary babel should register").toBeGreaterThan(0)
        }
    })
})
