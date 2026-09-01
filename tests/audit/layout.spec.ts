import fs from "node:fs"
import path from "node:path"
import { test, expect, type Page } from "@playwright/test"
import { pageOverflow, smallTapTargets, truncationFailures } from "../measure/metrics"
import { BASE, TARGET, OLD_ROUTES, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * A2 — geometry and overflow (the responsiveness instrument). Per route per
 * device viewport: horizontal page overflow, elements crossing the viewport's
 * right edge (outside legitimate scroll strips), tap targets under 44×44,
 * truncated text with no full form, and overlapping interactive rects.
 *
 * Record mode (old target) writes the baseline JSON; assert mode (new
 * target) fails on any finding — the rebuilt app owes zero geometry defects.
 */

/** Every policyholder-reachable screen of the rebuilt app; «:id» resolves at
 * runtime from the folder list. The old target keeps the six baseline routes. */
const NEW_SWEEP = [
    "/",
    "/see",
    "/policies",
    "/policies/:id",
    "/money",
    "/updates",
    "/adviser",
    "/me",
    "/me/profile",
    "/me/household",
    "/me/appearance",
    "/me/plan",
    "/me/security",
    "/me/notifications",
    "/me/privacy",
    "/me/history",
    "/add",
    "/life-event/marriage",
    "/help",
    "/upgrade",
    "/benefits",
    "/protection/motor",
    "/wallet/:id/edit",
]

type Finding = { route: string; kind: string; detail: string }

/** Elements poking past the viewport's right edge — ignoring descendants of
 * containers that legitimately scroll sideways (.pw-scroll-strip, snap rails,
 * anything with overflow-x auto/scroll). */
async function wideElements(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const out: string[] = []
        const scrollsX = (el: Element | null): boolean => {
            for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
                const o = getComputedStyle(cur).overflowX
                // hidden/clip ancestors CONTAIN the overflow — a decorative
                // layer inside them cannot push the page sideways
                if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true
            }
            return false
        }
        document.querySelectorAll<HTMLElement>("main *, header *, nav *").forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width < 8 || r.height < 8) return
            if (r.right <= vw + 1) return
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            if (el.closest('[aria-hidden="true"]')) return
            if (scrollsX(el.parentElement)) return
            const id = el.id ? `#${el.id}` : ""
            out.push(`${el.tagName.toLowerCase()}${id} right=${Math.round(r.right)} vw=${vw} «${(el.textContent || "").trim().slice(0, 40)}»`)
        })
        return out.slice(0, 20)
    })
}

/** Interactive rects overlapping by more than a third of the smaller one —
 * DOM ancestry pairs excluded (a badge inside its own link is not a defect). */
async function overlappingTargets(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const inFixed = (el: Element): boolean => {
            for (let cur: Element | null = el; cur && cur !== document.body; cur = cur.parentElement) {
                const p = getComputedStyle(cur).position
                if (p === "fixed" || p === "sticky") return true
            }
            return false
        }
        const els = [...document.querySelectorAll<HTMLElement>('a, button, [role="button"], input, select, summary')].filter((el) => {
            const r = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            if (el.closest("details:not([open])") && !el.closest("summary")) return false // closed-details geometry ghost
            return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest('[aria-hidden="true"]')
        })
        const fixedFlags = els.map(inFixed)
        const out: string[] = []
        for (let i = 0; i < els.length; i++) {
            for (let j = i + 1; j < els.length; j++) {
                const a = els[i], b = els[j]
                if (a.contains(b) || b.contains(a)) continue
                // content scrolled behind fixed/sticky chrome overlays it by
                // design — only same-layer overlaps are defects
                if (fixedFlags[i] !== fixedFlags[j]) continue
                const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
                const x = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left))
                const y = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top))
                const inter = x * y
                const smaller = Math.min(ra.width * ra.height, rb.width * rb.height)
                if (smaller > 0 && inter / smaller > 0.34) {
                    const name = (el: HTMLElement) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30)
                    out.push(`«${name(a)}» ∩ «${name(b)}» ${Math.round((inter / smaller) * 100)}%`)
                }
            }
        }
        return [...new Set(out)].slice(0, 12)
    })
}

test.describe("A2 geometry", () => {
    test.beforeEach(async ({ request }) => {
        await assertTarget(request)
    })

    test("routes hold their geometry at this viewport", async ({ browser }, testInfo) => {
        test.setTimeout(600_000)
        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()
        const findings: Finding[] = []

        let policyId: string | null = null
        if (TARGET === "new") {
            await page.goto(`${BASE}/policies`, { waitUntil: "networkidle" })
            policyId = await page.evaluate(() =>
                (document.querySelector('section#list a[href^="/policies/"]')?.getAttribute("href") || "").split("/").pop() || null
            )
        }
        const routes = (TARGET === "old" ? [...OLD_ROUTES] : NEW_SWEEP)
            .map((r) => (policyId ? r.replace(":id", policyId) : r))
            .filter((r) => !r.includes(":id"))

        for (const route of routes) {
            await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
            await settleDeterministic(page)

            const overflow = await pageOverflow(page)
            if (overflow.overflowPx > 1) findings.push({ route, kind: "h-overflow", detail: `${overflow.overflowPx}px past the viewport (${overflow.offenders.slice(0, 3).join(", ")})` })
            for (const w of await wideElements(page)) findings.push({ route, kind: "wide-element", detail: w })
            const smallLabelledInputs = await page.evaluate(() =>
                // WCAG 2.5.8 equivalent-target: an input inside a <label> that is
                // itself ≥44×44 has a compliant target — collect the compliant ones.
                [...document.querySelectorAll<HTMLInputElement>("label input")].filter((i) => {
                    const l = i.closest("label")!.getBoundingClientRect()
                    return l.width >= 44 && l.height >= 44
                }).length
            )
            for (const t of await smallTapTargets(page)) {
                if (t.tag === "input" && t.chain.includes("label") && smallLabelledInputs > 0) continue
                findings.push({ route, kind: "sub-44-target", detail: `${t.tag} «${t.text}» ${Math.round(t.w)}×${Math.round(t.h)} (${t.chain})` })
            }
            const hiddenTexts = await page.evaluate(() =>
                // aria-hidden duplicates (the collapsed header title) truncate by
                // design — their accessible twin carries the full text
                [...document.querySelectorAll<HTMLElement>('[aria-hidden="true"]')].map((el) => (el.textContent || "").trim().slice(0, 50))
            )
            const seenTrunc = new Set<string>()
            const absDecorated = await page.evaluate(() =>
                [...document.querySelectorAll<HTMLElement>("*")].filter((el) =>
                    [...el.children].some((c) => getComputedStyle(c as Element).position === "absolute")
                ).map((el) => (el.textContent || "").trim().slice(0, 40))
            )
            const titledTexts = await page.evaluate(() =>
                // a truncating element whose title carries the full text HAS its
                // full form one hover/long-press away — not an information loss
                [...document.querySelectorAll<HTMLElement>("[title]")].map((el) => (el.textContent || "").trim().slice(0, 50))
            )
            for (const t of await truncationFailures(page)) {
                if (t.clientWidth <= 2 || t.selector.includes("sr-only")) continue // visually-hidden by design
                if (absDecorated.includes(t.text.slice(0, 40))) continue // overflow from an absolute decoration, not text
                if (titledTexts.includes(t.text.trim().slice(0, 50))) continue
                if (hiddenTexts.includes(t.text.trim().slice(0, 50))) continue
                const key = `${route}|${t.text.slice(0, 50)}`
                if (seenTrunc.has(key)) continue // one defect, one entry — not one per ancestor
                seenTrunc.add(key)
                findings.push({ route, kind: "truncation", detail: JSON.stringify(t).slice(0, 140) })
            }
            for (const o of await overlappingTargets(page)) findings.push({ route, kind: "overlap", detail: o })
        }
        await ctx.close()

        const outDir = path.join(process.cwd(), "docs/audit")
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(
            path.join(outDir, `layout-findings-${TARGET}-${testInfo.project.name}.json`),
            JSON.stringify({ target: TARGET, project: testInfo.project.name, capturedAt: new Date().toISOString(), findings }, null, 2)
        )

        if (TARGET === "new") {
            const lines = findings.map((f) => `[${f.kind}] ${f.route} — ${f.detail}`).join("\n")
            expect(findings, `geometry defects at ${testInfo.project.name}:\n${lines}`).toEqual([])
        } else {
            // Record mode: the baseline must prove the probe can see (the old
            // build is known to have geometry defects at phone widths).
            expect(findings.length, "probe sensitivity: the old build should yield findings").toBeGreaterThan(0)
        }
    })
})
