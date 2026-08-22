/**
 * 0.5d — the blast radius of the two global ≤430px rules, MEASURED.
 *
 * Both B3 (nav pills compressed to 34px slivers) and A5 («Interameri/can») were
 * reported as component defects. They are not: they are two shared rules in
 * app/globals.css doing what they were written to do, on surfaces nobody
 * checked.
 *
 *   RULE 1  :where(.grid, .flex) > * { min-width: 0 }   @ max-width: 430px
 *           Removes the min-content floor from every flex/grid child. On a
 *           horizontal scroll strip that is the floor that MAKES it scroll, so
 *           the children compress into the viewport instead of overflowing.
 *           Static analysis finds TEN other strips with the same shape.
 *
 *   RULE 2  overflow-wrap: anywhere on h1-h4,p,li,dt,dd,… @ max-width: 430px
 *           Breaks any word at any character when it would otherwise overflow,
 *           with no hyphen — including brand names and Greek compounds.
 *
 * This spec REPORTS; it does not gate. Goal 1 fixes the rules and their
 * intended callers per the review; a per-page shim is what invariant 5 forbids.
 */
import { test } from "@playwright/test"
import { dismissCookieBanner } from "../helpers/ui"

/** Surfaces carrying a scroll strip on a flex/grid container (static analysis). */
const STRIP_ROUTES = [
    "/dashboard",
    "/wallet",
    "/coverage",
    "/timeline",
    "/opportunities",
    "/branches/motor",
]

test("report: which scroll strips actually compress at 320px", async ({ page }) => {
    test.setTimeout(15 * 60_000)
    await page.setViewportSize({ width: 320, height: 720 })

    const findings: string[] = []
    for (const route of STRIP_ROUTES) {
        try {
            await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 })
            await dismissCookieBanner(page)
            await page.waitForTimeout(1500)
        } catch {
            findings.push(`${route}: could not load`)
            continue
        }

        const strips = await page.evaluate(() => {
            const out: { cls: string; scrolls: boolean; minChild: number; children: number; clipped: number }[] = []
            document.querySelectorAll<HTMLElement>(".pw-page-shell [class*='overflow-x-auto']").forEach((el) => {
                const cs = getComputedStyle(el)
                if (!/flex|grid/.test(cs.display)) return
                const kids = Array.from(el.children) as HTMLElement[]
                if (kids.length < 2) return
                const widths = kids.map((k) => k.getBoundingClientRect().width)
                out.push({
                    cls: String(el.className).slice(0, 60),
                    scrolls: el.scrollWidth > el.clientWidth + 1,
                    minChild: Math.round(Math.min(...widths)),
                    children: kids.length,
                    // A child narrower than its own content is compressed.
                    clipped: kids.filter((k) => k.scrollWidth > k.clientWidth + 1).length,
                })
            })
            return out
        })

        for (const s of strips) {
            const verdict = s.clipped > 0 ? "COMPRESSED" : s.scrolls ? "scrolls (ok)" : "fits (ok)"
            findings.push(
                `${route}: ${verdict} — ${s.children} children, narrowest ${s.minChild}px, ${s.clipped} clipped — ${s.cls}`
            )
        }
        if (strips.length === 0) findings.push(`${route}: no flex/grid scroll strip rendered`)
    }

    console.log("\n[0.5d RULE 1 — scroll strips at 320px]\n" + findings.join("\n"))
})

test("report: which headings break mid-word at 320px", async ({ page }) => {
    test.setTimeout(15 * 60_000)
    await page.setViewportSize({ width: 320, height: 720 })

    const findings: string[] = []
    for (const route of ["/dashboard", "/wallet", "/coverage", "/branches/motor"]) {
        try {
            await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 })
            await dismissCookieBanner(page)
            await page.waitForTimeout(1500)
        } catch {
            continue
        }
        const broken = await page.evaluate(() => {
            const out: string[] = []
            // A heading whose rendered width is at its container limit AND whose
            // text has a word longer than the line can hold will be split
            // mid-word by `overflow-wrap: anywhere`. Detect by measuring the
            // widest WORD against the element's content box.
            document.querySelectorAll<HTMLElement>(".pw-page-shell h1, .pw-page-shell h2, .pw-page-shell h3").forEach((el) => {
                const text = (el.textContent || "").trim()
                if (!text) return
                const words = text.split(/\s+/)
                const probe = document.createElement("span")
                const cs = getComputedStyle(el)
                probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`
                document.body.appendChild(probe)
                let widest = 0
                let widestWord = ""
                for (const w of words) {
                    probe.textContent = w
                    const ww = probe.getBoundingClientRect().width
                    if (ww > widest) { widest = ww; widestWord = w }
                }
                probe.remove()
                const avail = el.getBoundingClientRect().width
                if (widest > avail + 0.5) {
                    out.push(`"${widestWord}" (${Math.round(widest)}px) in ${Math.round(avail)}px — <${el.tagName.toLowerCase()}> ${text.slice(0, 40)}`)
                }
            })
            return out
        })
        for (const b of broken) findings.push(`${route}: ${b}`)
        if (broken.length === 0) findings.push(`${route}: no heading word exceeds its line`)
    }

    console.log("\n[0.5d RULE 2 — headings broken mid-word at 320px]\n" + findings.join("\n"))
})
