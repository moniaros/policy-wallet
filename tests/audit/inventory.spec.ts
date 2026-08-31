import fs from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"
import { BASE, TARGET, OLD_ROUTES, ROUTE_MAP, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * A1 — the information contract (D1). Extracts every information-bearing
 * text node and interactive control from each route, normalised and
 * classified, into docs/audit/information-inventory*.json. The old-target
 * file is the CONTRACT: nothing classed metric/entity/status/action may
 * vanish from the rebuilt app without an entry in retired-information.md.
 *
 * Captured once, at desktop — the rebuild's own rule is that no width hides
 * a fact (progressive disclosure names what it folds), so the contract is
 * viewport-independent; the geometry probe polices the widths.
 */

/** Old vocabularies V1–V7 + the rebuilt three-state system. */
const STATUS_WORDS = [
    "ΛΗΓΜΕΝΟ", "ΛΗΓΕΙ ΣΥΝΤΟΜΑ", "ΕΝΕΡΓΟ", "ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ",
    "Κρίσιμη προτεραιότητα", "Υψηλή προτεραιότητα", "Μεσαία προτεραιότητα", "Χαμηλή προτεραιότητα",
    "Απαιτείται ενέργεια", "Εντάξει", "Προσοχή",
    "σημεία για έλεγχο", "υψηλά", "μέτρια", "χαμηλά",
    "Καλύπτεται", "Κενό", "Για έλεγχο", "Ληγμένο", "Λήγει", "Ενεργό",
    "δεν το βλέπει", "το βλέπει",
]

const PLATE = /\b[A-ZΑ-ΩΪΫ]{2,3}-?\s?\d{3,4}\b/u
const POLICY_NO = /\b[A-ZΑ-Ω0-9][A-ZΑ-Ω0-9-]{4,}\b/u
const CURRENCY = /€\s?[\d.,]+|[\d.,]+\s?€/u
const DATE_EL = /\b\d{1,2}[/.]\d{1,2}[/.](?:20)?\d{2}\b|\b\d{1,2}\s(?:Ιαν|Φεβ|Μαρ|Απρ|Μαΐ|Ιουν|Ιουλ|Αυγ|Σεπ|Οκτ|Νοε|Δεκ)\w*\s?\d{0,4}/u

type Item = { key: string; class: string; text: string; value?: string; selector: string; name?: string; href?: string }

function normalise(raw: string): string {
    return raw.normalize("NFC").replace(/\s+/g, " ").trim()
}

/** Digits collapse to N for the diff key — «σε 13 ημέρες» and «σε 8 ημέρες»
 * are the same FACT (an expiry countdown); the number is the value. Entities
 * keep their digits: the plate IS the fact. */
function factKey(cls: string, text: string): string {
    if (cls === "entity") return `${cls}|${text}`
    return `${cls}|${text.replace(/\d+([.,]\d+)?/g, "N")}`
}

function classify(text: string, interactive: { name?: string; href?: string } | null): { cls: string; value?: string } {
    if (interactive) return { cls: "action" }
    for (const w of STATUS_WORDS) if (text === w || text.includes(w)) return { cls: "status" }
    const cur = text.match(CURRENCY)
    if (cur) return { cls: "metric", value: cur[0] }
    if (DATE_EL.test(text)) return { cls: "metric", value: text.match(DATE_EL)![0] }
    if (PLATE.test(text)) return { cls: "entity", value: text.match(PLATE)![0] }
    if (/\d/.test(text)) {
        // a number with a duration/relative word is a metric; an identifier-
        // shaped run without one is an entity (policy numbers)
        if (POLICY_NO.test(text) && /[A-ZΑ-Ω]/.test(text) && !/ημέρες|ώρες|από|σε /.test(text)) return { cls: "entity", value: text.match(POLICY_NO)![0] }
        return { cls: "metric", value: (text.match(/\d+([.,]\d+)?/) || [""])[0] }
    }
    return { cls: text.length <= 60 ? "chrome" : "explanation" }
}

test.describe("A1 information inventory", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "captured once, at desktop")
        await assertTarget(request)
    })

    test("extract the information contract", async ({ browser }, testInfo) => {
        test.setTimeout(300_000)
        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()

        const routes = TARGET === "old" ? [...OLD_ROUTES] : [...OLD_ROUTES].map((r) => ROUTE_MAP[r])
        const inventory: Record<string, Item[]> = {}

        for (const route of routes) {
            await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
            await settleDeterministic(page)

            const raw = await page.evaluate(() => {
                const scope = document.querySelector("main") || document.body
                const out: { text: string; selector: string; name?: string; href?: string; interactive: boolean }[] = []
                const sel = (el: Element): string => {
                    const parts: string[] = []
                    for (let cur: Element | null = el, hops = 0; cur && cur !== document.body && hops < 5; cur = cur.parentElement, hops++) {
                        parts.unshift(cur.tagName.toLowerCase() + (cur.id ? `#${cur.id}` : ""))
                    }
                    return parts.join(" > ")
                }
                const visible = (el: Element): boolean => {
                    const cs = getComputedStyle(el)
                    if (cs.display === "none" || cs.visibility === "hidden") return false
                    const r = el.getBoundingClientRect()
                    return r.width > 1 && r.height > 1
                }
                // interactive controls with their accessible name + destination
                scope.querySelectorAll<HTMLElement>('a[href], button, [role="button"], select, summary').forEach((el) => {
                    if (!visible(el) || el.closest('[aria-hidden="true"]')) return
                    const name = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ")
                    if (!name) return
                    out.push({ text: name.slice(0, 120), selector: sel(el), name: name.slice(0, 120), href: el.getAttribute("href") || undefined, interactive: true })
                })
                // information-bearing text nodes OUTSIDE interactive elements
                const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
                let node: Node | null
                while ((node = walker.nextNode())) {
                    const t = (node.textContent || "").replace(/\s+/g, " ").trim()
                    if (t.length < 2) continue
                    const el = node.parentElement
                    if (!el || !visible(el)) continue
                    if (el.closest('a[href], button, [role="button"], select, summary, script, style, [aria-hidden="true"]')) continue
                    out.push({ text: t.slice(0, 160), selector: sel(el), interactive: false })
                }
                return out
            })

            const seen = new Set<string>()
            inventory[route] = raw.flatMap((r) => {
                const text = normalise(r.text)
                if (!text) return []
                const { cls, value } = classify(text, r.interactive ? { name: r.name, href: r.href } : null)
                const key = factKey(cls, text)
                if (seen.has(key)) return []
                seen.add(key)
                return [{ key, class: cls, text, ...(value ? { value } : {}), selector: r.selector, ...(r.name ? { name: r.name } : {}), ...(r.href ? { href: r.href } : {}) }]
            })
        }
        await ctx.close()

        const outDir = path.join(process.cwd(), "docs/audit")
        fs.mkdirSync(outDir, { recursive: true })
        const file = TARGET === "old" ? "information-inventory.json" : "information-inventory-new.json"
        fs.writeFileSync(path.join(outDir, file), JSON.stringify({ target: TARGET, capturedAt: new Date().toISOString(), inventory }, null, 2))

        if (TARGET === "old") {
            // the readable contract, grouped by route and class
            const lines: string[] = ["# Information inventory — the contract (old build)", ""]
            for (const [route, items] of Object.entries(inventory)) {
                lines.push(`## ${route}`, "")
                for (const cls of ["metric", "entity", "status", "action", "explanation", "chrome"]) {
                    const group = items.filter((i) => i.class === cls)
                    if (!group.length) continue
                    lines.push(`### ${cls} (${group.length})`, "")
                    for (const i of group) lines.push(`- ${i.text}${i.href ? ` → ${i.href}` : ""}`)
                    lines.push("")
                }
            }
            fs.writeFileSync(path.join(outDir, "information-inventory.md"), lines.join("\n"))
        }

        const total = Object.values(inventory).reduce((n, items) => n + items.length, 0)
        expect(total, "an empty inventory means the extractor failed, not that the app is empty").toBeGreaterThan(50)
    })
})
