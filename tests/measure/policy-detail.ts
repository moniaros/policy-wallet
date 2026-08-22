/**
 * Measurement definitions for the policy-detail mobile series
 * (docs/evidence/policy-detail-mobile). ONE implementation, used verbatim by
 * the BASELINE pass (Goal 0) and the RESULT pass (Goal 5) — if these
 * definitions drift between passes the before/after comparison is worthless,
 * so nothing in here may be edited between the two runs except to fix a bug,
 * and any such fix invalidates the baseline and forces a re-run.
 *
 * Metrics (from the goal series brief):
 *   1. Scroll height       — documentElement.scrollHeight after settle()
 *   2. Section count       — perceived top-level content groupings (selector below)
 *   3. Container count     — elements with a visible boundary, + max nesting depth
 *   4. Duplicate-fact count— data-fact values rendered more than once; plus a
 *                            value-scan proxy for the pre-instrumentation baseline
 *   5. Sub-44px tap targets— interactive elements under 44px either dimension
 */

import type { Page } from "@playwright/test"
import sharp from "sharp"

export const WIDTHS = [320, 390, 430] as const
export type Width = (typeof WIDTHS)[number]

/**
 * Settle: wait for lazy content. `networkidle` never fires on the local dev
 * server (the dummy Upstash host retries DNS forever — see STATUS 2026-08-21c),
 * so this waits for it with a hard 8s cap and then always adds the brief's
 * fixed 1s. Identical for both passes by construction.
 */
export async function settle(page: Page): Promise<void> {
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(1_000)
    // Freeze animation/transition so screenshots and pixel sampling are stable,
    // and hide the Next.js DEV-TOOLS overlay (nextjs-portal) — it is not
    // product UI, it floats over real content in full-page captures, and its
    // buttons would pollute the tap-target scan.
    await page.addStyleTag({
        content: `*, *::before, *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
        }
        nextjs-portal { display: none !important; }`,
    })
}

/** documentElement.scrollHeight in CSS px. */
export async function scrollHeight(page: Page): Promise<number> {
    return page.evaluate(() => document.documentElement.scrollHeight)
}

/**
 * SECTION COUNT — the operationalization promised in the evidence file.
 *
 * A "section" is a distinct top-level content grouping a customer perceives:
 *   (a) every `section[id]` on the page (the page's own idiom for a headed
 *       content grouping), PLUS
 *   (b) every direct child of a top-level layout column (the page shell's
 *       inner wrapper, the main content column, and the <aside>) that is not
 *       itself inside a `section[id]` and either contains a heading (h1–h3)
 *       or has a visible boundary (background/border/shadow).
 * Nested `section[id]` (e.g. #renewal inside #key-dates) count individually —
 * the customer perceives them as separate groups; that is the point.
 */
export async function sectionCount(page: Page): Promise<{ count: number; ids: string[] }> {
    return page.evaluate(() => {
        const visible = (el: Element) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            const cs = getComputedStyle(el as HTMLElement)
            if (r.width <= 0 || r.height <= 0 || cs.display === "none" || cs.visibility === "hidden") return false
            // Off-canvas chrome (the app shell's closed drawer sits at
            // translate-x:-100%) is not something a customer perceives.
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            return true
        }
        const alphaOf = (color: string): number => {
            if (!color || color === "transparent") return 0
            const slash = color.match(/\/\s*([0-9.]+%?)\s*\)$/)
            if (slash) return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1])
            const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)$/)
            if (rgba) return parseFloat(rgba[1])
            return 1 // rgb()/oklab() without alpha channel = opaque
        }
        const bounded = (el: HTMLElement) => {
            const cs = getComputedStyle(el)
            if (alphaOf(cs.backgroundColor) > 0.02) return true
            if (cs.boxShadow && cs.boxShadow !== "none") return true
            const sides = [
                [cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor],
                [cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor],
                [cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor],
                [cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor],
            ]
            return sides.some(([w, s, c]) => parseFloat(w) > 0 && s !== "none" && alphaOf(c) > 0.02)
        }

        const out = new Set<Element>()
        document.querySelectorAll("section[id]").forEach((s) => visible(s) && out.add(s))

        // Top-level layout columns: page shell inner wrapper + its grid columns.
        const shell = document.querySelector(".pw-page-shell > div")
        const columns: Element[] = []
        if (shell) {
            columns.push(shell)
            shell.querySelectorAll(":scope > div").forEach((d) => {
                d.querySelectorAll(":scope > div, :scope > aside").forEach((c) => columns.push(c))
            })
        }
        for (const col of columns) {
            for (const child of Array.from(col.children)) {
                if (!visible(child)) continue
                if (child.matches("section[id]") || child.querySelector("section[id]")) continue
                if (child.closest("section[id]")) continue
                const hasHeading = !!child.querySelector("h1,h2,h3") || /^H[1-3]$/.test(child.tagName)
                if (hasHeading || bounded(child as HTMLElement)) out.add(child)
            }
        }
        const ids = Array.from(out).map((el) => {
            const id = (el as HTMLElement).id
            if (id) return `#${id}`
            const h = el.querySelector("h1,h2,h3")
            const t = (h?.textContent || el.textContent || "").trim().slice(0, 40)
            return `<${el.tagName.toLowerCase()}> ${t}`
        })
        return { count: out.size, ids }
    })
}

/**
 * CONTAINER COUNT — elements with a visible boundary (non-transparent
 * background, visible border, or box-shadow), and the max nesting depth of
 * such elements. Alpha is parsed from both modern (`/ a`) and legacy
 * (`rgba(...)`) serialisations; colours with no alpha channel are opaque.
 */
export async function containerCount(page: Page): Promise<{ count: number; maxDepth: number; deepestChain: string[] }> {
    return page.evaluate(() => {
        const alphaOf = (color: string): number => {
            if (!color || color === "transparent") return 0
            const slash = color.match(/\/\s*([0-9.]+%?)\s*\)$/)
            if (slash) return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1])
            const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)$/)
            if (rgba) return parseFloat(rgba[1])
            return 1
        }
        const isContainer = (el: HTMLElement): boolean => {
            const r = el.getBoundingClientRect()
            if (r.width < 8 || r.height < 8) return false
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return false
            if (alphaOf(cs.backgroundColor) > 0.02) return true
            if (cs.boxShadow && cs.boxShadow !== "none") return true
            const sides = [
                [cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor],
                [cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor],
                [cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor],
                [cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor],
            ] as const
            return sides.some(([w, s, c]) => parseFloat(w) > 0 && s !== "none" && alphaOf(c) > 0.02)
        }

        const containers = new Set<HTMLElement>()
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            if (isContainer(el)) containers.add(el)
        })

        let maxDepth = 0
        let deepestChain: string[] = []
        for (const el of containers) {
            const chain: string[] = []
            let cur: HTMLElement | null = el
            while (cur && cur !== document.body) {
                if (containers.has(cur)) {
                    chain.push(`${cur.tagName.toLowerCase()}.${String(cur.className || "").slice(0, 40)}`)
                }
                cur = cur.parentElement
            }
            if (chain.length > maxDepth) {
                maxDepth = chain.length
                deepestChain = chain.reverse()
            }
        }
        return { count: containers.size, maxDepth, deepestChain }
    })
}

/**
 * DUPLICATE-FACT COUNT.
 *
 * Authoritative form: `data-fact="<namespace>.<key>"` values appearing more
 * than once in the rendered DOM. The attribute is added during Goals 1–4;
 * at baseline the DOM carries none, so the same call also runs a VALUE SCAN:
 * for each named fact value supplied by the caller (formatted dates, status
 * label, policy number, …), count visible elements whose OWN text contains
 * it. Both are reported; the pass/fail metric is
 *   max(dataFactDuplicates, valueScanDuplicates)
 * so the baseline is honest before instrumentation exists and the guard is
 * exact after it does.
 */
export interface FactSpec {
    /** e.g. "policy.expiryDate" */
    key: string
    /** the rendered string to scan for, e.g. "6/10/2026" */
    value: string
}

export interface DuplicateFactResult {
    dataFactDuplicates: { key: string; count: number }[]
    valueScanDuplicates: { key: string; value: string; count: number; where: string[] }[]
    duplicateFactCount: number
}

export async function duplicateFacts(page: Page, facts: FactSpec[]): Promise<DuplicateFactResult> {
    return page.evaluate((factList: FactSpec[]) => {
        const visible = (el: HTMLElement) => {
            const r = el.getBoundingClientRect()
            const cs = getComputedStyle(el)
            if (r.width <= 0 || r.height <= 0 || cs.display === "none" || cs.visibility === "hidden") return false
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            return true
        }

        // (a) data-fact scan
        const byKey = new Map<string, number>()
        document.querySelectorAll<HTMLElement>("[data-fact]").forEach((el) => {
            if (!visible(el)) return
            const k = el.getAttribute("data-fact") || ""
            byKey.set(k, (byKey.get(k) || 0) + 1)
        })
        const dataFactDuplicates = Array.from(byKey.entries())
            .filter(([, n]) => n > 1)
            .map(([key, count]) => ({ key, count }))

        // (b) value scan — count elements whose OWN text (direct text nodes)
        // contains the fact value, so an ancestor chain doesn't count once per level.
        const valueScanDuplicates: { key: string; value: string; count: number; where: string[] }[] = []
        for (const fact of factList) {
            if (!fact.value) continue
            const hits: string[] = []
            document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
                if (!visible(el)) return
                const own = Array.from(el.childNodes)
                    .filter((n) => n.nodeType === 3)
                    .map((n) => n.textContent || "")
                    .join(" ")
                if (own.includes(fact.value)) {
                    const sec = el.closest("section[id]")
                    hits.push(
                        `${sec ? "#" + (sec as HTMLElement).id : el.closest("aside") ? "aside" : "top"} <${el.tagName.toLowerCase()}> ${own.trim().slice(0, 60)}`
                    )
                }
            })
            if (hits.length > 1) valueScanDuplicates.push({ key: fact.key, value: fact.value, count: hits.length, where: hits })
        }

        return {
            dataFactDuplicates,
            valueScanDuplicates,
            duplicateFactCount: Math.max(dataFactDuplicates.length, valueScanDuplicates.length),
        }
    }, facts)
}

/**
 * SUB-44px TAP TARGETS.
 * Interactive selector fixed by the brief:
 *   a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])
 * Rendered box under 44px in either dimension fails, EXCEPT elements inside
 * running text (WCAG 2.5.5/2.5.8 inline exception): computed display:inline,
 * or the repo's own `.pw-inline-action` marker. Invisible/zero-size and
 * off-screen-until-focus (skip links) are not rendered targets and are skipped.
 */
export interface TapTargetOffender {
    tag: string
    text: string
    w: number
    h: number
    chain: string
}

export async function smallTapTargets(page: Page): Promise<TapTargetOffender[]> {
    return page.evaluate(() => {
        const SEL = 'a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])'
        const out: { tag: string; text: string; w: number; h: number; chain: string }[] = []
        document.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            if (r.right <= 0 || r.bottom <= 0 || r.width <= 2) return // skip links / sr-only
            if (r.left >= document.documentElement.clientWidth) return // off-canvas chrome
            if (cs.display === "inline") return // running-text exception
            if (el.classList.contains("pw-inline-action")) return
            if (el.closest('[aria-hidden="true"]')) return
            if (r.width >= 44 && r.height >= 44) return
            const chain: string[] = []
            let cur: HTMLElement | null = el.parentElement
            let hops = 0
            while (cur && cur !== document.body && hops < 4) {
                const id = cur.id ? `#${cur.id}` : ""
                chain.push(`${cur.tagName.toLowerCase()}${id}`)
                cur = cur.parentElement
                hops++
            }
            out.push({
                tag: el.tagName.toLowerCase(),
                text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 50),
                w: Math.round(r.width),
                h: Math.round(r.height),
                chain: chain.join(" < "),
            })
        })
        return out
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrast (WCAG 1.4.3 text; 1.4.11 approximated for control boundaries).
// Pixel-differencing method lifted from tests/theme-contrast-audit.spec.ts —
// measures rendered pixels, immune to Chrome's oklab() serialisation.
// ─────────────────────────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number; t: string; tag: string; cls: string; big: boolean }

const COLLECT = `(() => {
  const out = [];
  document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,button,li,td,th,label,dt,dd').forEach(el => {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!txt || txt.length < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.opacity) < 0.55) return;
    if (el.closest('[disabled],[aria-disabled="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 2);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 2);
    const top = document.elementFromPoint(cx, cy);
    if (!top || (top !== el && !el.contains(top) && !top.contains(el))) return;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    out.push({ x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height), t: txt.slice(0, 40),
      tag: el.tagName, cls: String(el.className || '').slice(0, 70),
      big: size >= 24 || (size >= 18.66 && bold) });
  });
  return out;
})()`

const HIDE_TEXT = `*, *::before, *::after {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
}`

const srgb = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const lum = (r: number, g: number, b: number) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const hex = (v: number) => "#" + v.toString(16).padStart(6, "0")

export async function contrastFailures(page: Page): Promise<string[]> {
    const boxes = (await page.evaluate(COLLECT)) as Box[]
    if (!boxes.length) return []

    const withText = await page.screenshot({ fullPage: true })
    const handle = await page.addStyleTag({ content: HIDE_TEXT })
    await page.waitForTimeout(250)
    const noText = await page.screenshot({ fullPage: true })
    await handle.evaluate((n) => (n as HTMLElement).remove())

    const a = await sharp(withText).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const b = await sharp(noText).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = a.info.width
    const H = a.info.height
    if (b.info.width !== W || b.info.height !== H) return []

    // Device pixel ratio: screenshots are in device px, boxes in CSS px.
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1)

    const findings: string[] = []
    for (const box of boxes) {
        const x0 = Math.max(0, Math.round(box.x * dpr))
        const y0 = Math.max(0, Math.round(box.y * dpr))
        const x1 = Math.min(W, Math.round((box.x + box.w) * dpr))
        const y1 = Math.min(H, Math.round((box.y + box.h) * dpr))
        if (x1 - x0 < 2 || y1 - y0 < 2) continue

        let gx0 = x1, gy0 = y1, gx1 = x0, gy1 = y0, glyphs = 0
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4
                if (
                    Math.abs(a.data[i] - b.data[i]) < 8 &&
                    Math.abs(a.data[i + 1] - b.data[i + 1]) < 8 &&
                    Math.abs(a.data[i + 2] - b.data[i + 2]) < 8
                )
                    continue
                glyphs++
                if (x < gx0) gx0 = x
                if (x > gx1) gx1 = x
                if (y < gy0) gy0 = y
                if (y > gy1) gy1 = y
            }
        }
        if (glyphs < 4) continue

        const bx0 = Math.max(x0, gx0 - 2)
        const by0 = Math.max(y0, gy0 - 2)
        const bx1 = Math.min(x1, gx1 + 3)
        const by1 = Math.min(y1, gy1 + 3)

        const counts = new Map<number, number>()
        let bgKey = -1
        let bgN = 0
        for (let y = by0; y < by1; y++) {
            for (let x = bx0; x < bx1; x++) {
                const i = (y * W + x) * 4
                const k = (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]
                const n = (counts.get(k) || 0) + 1
                counts.set(k, n)
                if (n > bgN) { bgN = n; bgKey = k }
            }
        }
        if (bgKey < 0) continue
        const bgL = lum((bgKey >> 16) & 255, (bgKey >> 8) & 255, bgKey & 255)

        let best = -1
        let bestD = 0
        for (let y = by0; y < by1; y++) {
            for (let x = bx0; x < bx1; x++) {
                const i = (y * W + x) * 4
                if (
                    Math.abs(a.data[i] - b.data[i]) < 8 &&
                    Math.abs(a.data[i + 1] - b.data[i + 1]) < 8 &&
                    Math.abs(a.data[i + 2] - b.data[i + 2]) < 8
                )
                    continue
                const d = Math.abs(lum(a.data[i], a.data[i + 1], a.data[i + 2]) - bgL)
                if (d > bestD) { bestD = d; best = (a.data[i] << 16) | (a.data[i + 1] << 8) | a.data[i + 2] }
            }
        }
        if (best < 0) continue

        const cr = ratio(lum((best >> 16) & 255, (best >> 8) & 255, best & 255), bgL)
        const min = box.big ? 3 : 4.5
        if (cr < min - 0.05) {
            findings.push(`"${box.t}" ${cr.toFixed(2)}:1 (needs ${min}) fg=${hex(best)} bg=${hex(bgKey)} <${box.tag}> ${box.cls.slice(0, 50)}`)
        }
    }
    return findings
}

/**
 * WCAG 1.4.11 — NON-TEXT CONTRAST, measured on rendered pixels.
 *
 * The Goal 0 baseline reported ZERO contrast failures across 18 captures of a
 * page whose premium card was `#111111` on a `#111111` hero, separated only by
 * a 15%-alpha border. That is not evidence of a clean page; it is evidence that
 * only 1.4.3 (text) was being measured. B1 was a 1.4.11 failure the whole time.
 *
 * The method mirrors the text one — real pixels, immune to Chrome's oklab()
 * serialisation — but samples ACROSS a boundary instead of within a glyph run:
 * for each candidate element, compare the mean colour of a thin band just
 * INSIDE its edge against a band just OUTSIDE it. A boundary that a sighted
 * user cannot locate scores below 3:1.
 *
 * TWO CLASSES, reported separately, because only one of them is a conformance
 * failure:
 *
 *   `control` — a user interface component (button, link, input, tab). SC
 *               1.4.11 requires ≥3:1 for the visual information needed to
 *               identify it. These GATE.
 *   `surface` — a card or tile whose boundary is what makes it a distinct
 *               object. B1 lived here: a premium card painted its parent's
 *               colour. The standard does not clearly cover a decorative
 *               container, and a deliberately subtle tile-inside-a-card is a
 *               legitimate design choice, so these are REPORTED, not gated —
 *               with the caveat that a surface at ~1:1 against its parent, as
 *               B1 was, is a defect by any reading.
 *
 * Decorative dividers are excluded by requiring a minimum size.
 *
 * KNOWN LIMITATION. It measures the CONTAINER's boundary, so it cannot see that
 * a control is identified by something else — the app shell's active tab has a
 * `bg-primary/15` fill measuring 1.25:1, and reports as a failure, but its state
 * is carried by a `text-primary` icon and label at ~7:1, which satisfies the
 * success criterion by a different affordance. Findings tagged `shell` are
 * reported and not gated for exactly this reason; a `control` finding inside the
 * page still needs a human to confirm the boundary is the only carrier.
 */
export interface BoundaryFinding {
    tag: string
    label: string
    ratio: number
    inside: string
    outside: string
}

export async function nonTextContrastFailures(page: Page): Promise<string[]> {
    const boxes = (await page.evaluate(`(() => {
        const alphaOf = (color) => {
            if (!color || color === 'transparent') return 0
            const slash = color.match(/\\/\\s*([0-9.]+%?)\\s*\\)$/)
            if (slash) return slash[1].endsWith('%') ? parseFloat(slash[1]) / 100 : parseFloat(slash[1])
            const rgba = color.match(/^rgba\\([^,]+,[^,]+,[^,]+,\\s*([0-9.]+)\\s*\\)$/)
            if (rgba) return parseFloat(rgba[1])
            return 1
        }
        const out = []
        const sel = 'button, a, input:not([type=hidden]), select, [role=button], [role=tab], summary'
        const seen = new Set()
        const push = (el, kind) => {
            if (seen.has(el)) return
            const r = el.getBoundingClientRect()
            if (r.width < 12 || r.height < 12) return
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return
            const cs = getComputedStyle(el)
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) return
            // Only elements that actually draw a boundary or a surface.
            const hasBorder = ['Top','Right','Bottom','Left'].some(side =>
                parseFloat(cs['border' + side + 'Width']) > 0 &&
                cs['border' + side + 'Style'] !== 'none' &&
                alphaOf(cs['border' + side + 'Color']) > 0.02)
            const hasFill = alphaOf(cs.backgroundColor) > 0.02
            if (!hasBorder && !hasFill) return
            seen.add(el)
            out.push({
                x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
                w: Math.round(r.width), h: Math.round(r.height),
                tag: el.tagName.toLowerCase(), kind,
                label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 34),
            })
        }
        // Scoped to the PAGE's own controls. The app shell is site chrome and a
        // separate workstream; its findings are reported by the caller rather
        // than gated here, so this series cannot be blocked by a defect it is
        // not allowed to fix.
        const root = document.querySelector('.pw-page-shell') || document.body
        root.querySelectorAll(sel).forEach(el => push(el, 'control'))
        // Distinct surfaces: cards and tiles the reader is meant to perceive as separate.
        root.querySelectorAll('.pw-card, [data-fact], section > div, header').forEach(el => push(el, 'surface'))
        // Shell controls, reported but NOT gated.
        document.querySelectorAll(sel).forEach(el => { if (!root.contains(el)) push(el, 'shell') })
        return out
    })()`)) as { x: number; y: number; w: number; h: number; tag: string; kind: string; label: string }[]

    if (!boxes.length) return []

    const shot = await page.screenshot({ fullPage: true })
    const img = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = img.info.width
    const H = img.info.height
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1)

    const meanAt = (x0: number, y0: number, x1: number, y1: number): number[] | null => {
        let r = 0, g = 0, b = 0, n = 0
        for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
            for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
                const i = (y * W + x) * 4
                r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++
            }
        }
        return n === 0 ? null : [r / n, g / n, b / n]
    }

    const findings: string[] = []
    const BAND = Math.max(1, Math.round(2 * dpr))
    const GAP = Math.max(1, Math.round(3 * dpr))

    for (const box of boxes) {
        const x0 = Math.round(box.x * dpr)
        const y0 = Math.round(box.y * dpr)
        const x1 = Math.round((box.x + box.w) * dpr)
        const y1 = Math.round((box.y + box.h) * dpr)
        if (x1 - x0 < 8 || y1 - y0 < 8) continue

        // Sample the TOP edge, away from corners.
        //
        // THE BOUNDARY IS WHATEVER IS MOST VISIBLE ACROSS THE EDGE — the border
        // if there is one, the fill if there is not. The first version compared
        // a band 3px INSIDE against a band 3px OUTSIDE, which steps straight
        // over a 1px border and measures fill-against-fill: it reported the
        // same 1.04–1.07:1 before and after every control in the product was
        // given a 3.35:1 border, because it was never looking at the border.
        // A metric no fix can satisfy is not a metric.
        //
        // So: walk the rows from just outside to just inside and take the BEST
        // contrast any of them achieves against the outside surface. That
        // credits a thin border, which SC 1.4.11 accepts, while still failing a
        // control that has no boundary at all.
        const cx0 = x0 + Math.round((x1 - x0) * 0.25)
        const cx1 = x0 + Math.round((x1 - x0) * 0.75)
        const outside = meanAt(cx0, y0 - GAP - BAND, cx1, y0 - GAP)
        if (!outside) continue
        const outsideLum = lum(outside[0], outside[1], outside[2])

        let cr = 0
        const EDGE_SPAN = Math.max(2, Math.round(3 * dpr))
        for (let dy = -1; dy <= EDGE_SPAN; dy++) {
            const row = meanAt(cx0, y0 + dy, cx1, y0 + dy + 1)
            if (!row) continue
            const rowCr = ratio(lum(row[0], row[1], row[2]), outsideLum)
            if (rowCr > cr) cr = rowCr
        }
        if (cr === 0) continue
        const inside = meanAt(cx0, y0 + GAP, cx1, y0 + GAP + BAND) || outside
        if (cr < 3 - 0.05) {
            const hexOf = (c: number[]) =>
                "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
            findings.push(
                `[1.4.11:${box.kind}] <${box.tag}> "${box.label}" boundary ${cr.toFixed(2)}:1 (needs 3) ` +
                `inside=${hexOf(inside)} outside=${hexOf(outside)}`
            )
        }
    }
    return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic probes (candidate defects; not pass/fail metrics)
// ─────────────────────────────────────────────────────────────────────────────

/** Latin-script sentence scan for the el locale (B2 / untranslated strings). */
export async function latinSentences(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const ALLOW = /^(PolicyWallet|Interamerican|Generali|AXA|NN|Eurolife|ERGO|Allianz|MAPFRE|AIG|Groupama|AI|PDF|OK|FAQ|IBAN|GDPR|SSL|USD|EUR|API|Q&A|VIP|CO2|GPS|SOS|24\/7|e-mail|email|Mercedes|Toyota|BMW|Audi|Ford|Opel|AW P&C SA|AFFIDEA)$/i
        const out: string[] = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walker.nextNode())) {
            const el = n.parentElement
            if (!el) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) continue
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) continue
            const text = (n.textContent || "").trim()
            if (text.length < 12) continue
            // ≥3 consecutive Latin words of ≥3 letters = sentence-like English.
            const m = text.match(/\b[A-Za-z][a-z]{2,}(?:\s+[A-Za-z(][A-Za-z0-9().,'%€-]{2,}){2,}/)
            if (!m) continue
            if (ALLOW.test(m[0].trim())) continue
            out.push(text.slice(0, 140))
        }
        return Array.from(new Set(out))
    })
}

/** Text-y phone numbers not wrapped in tel: (B9). */
export async function nonTelPhoneNumbers(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walker.nextNode())) {
            const el = n.parentElement
            if (!el) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            const r = el.getBoundingClientRect()
            if (r.width === 0) continue
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) continue
            const text = (n.textContent || "").trim()
            // Greek landline/mobile: 10 digits starting 2 or 69, optional spacing.
            if (!/(^|\D)(2\d{2}\s?\d{3}\s?\d{4}|2\d{9}|69\d{8})(\D|$)/.test(text)) continue
            const inTel = !!el.closest('a[href^="tel:"]')
            if (!inTel) {
                const sec = el.closest("section[id]")
                out.push(`${sec ? "#" + (sec as HTMLElement).id : "?"} <${el.tagName.toLowerCase()}> ${text.slice(0, 80)}`)
            }
        }
        return Array.from(new Set(out))
    })
}

/** Clipped labels: scrollWidth > clientWidth on nav/tab/label elements (B3). */
export async function clippedLabels(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll<HTMLElement>("nav a, nav button, [role=tab], [role=tablist] button, h1, h2, h3, dt, th, .pw-kicker").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0) return
            if (el.scrollWidth > el.clientWidth + 1) {
                out.push(`<${el.tagName.toLowerCase()}> "${(el.textContent || "").trim().slice(0, 50)}" scroll=${el.scrollWidth} client=${el.clientWidth}`)
            }
        })
        return Array.from(new Set(out))
    })
}

/** Every date + day-count + status string on the page (B4 consistency evidence). */
export async function dateFacts(page: Page): Promise<{ dates: string[]; dayCounts: string[]; statusChips: string[] }> {
    return page.evaluate(() => {
        const dates = new Set<string>()
        const dayCounts = new Set<string>()
        const statusChips = new Set<string>()
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walker.nextNode())) {
            const el = n.parentElement
            if (!el) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            const rd = el.getBoundingClientRect()
            if (rd.width === 0) continue
            if (rd.right <= 0 || rd.bottom <= 0 || rd.left >= document.documentElement.clientWidth) continue
            const text = (n.textContent || "").trim()
            const sec = el.closest("section[id]")
            const where = sec ? "#" + (sec as HTMLElement).id : el.closest("aside") ? "aside" : "top"
            for (const m of text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g)) dates.add(`${where}: ${m[0]} — "${text.slice(0, 60)}"`)
            for (const m of text.matchAll(/(?:σε|Σε)\s+(\d+)\s+ημέρ|(\d+)\s+ημέρες/g)) dayCounts.add(`${where}: "${text.slice(0, 70)}"`)
            // textContent keeps sentence case even under CSS uppercase.
            if (/Ενεργό|Λήγει σύντομα|Ληγμένο|Άγνωστη διάρκεια|Απαιτείται ενέργεια|Ακυρωμένο|ΕΝΕΡΓΟ|ΛΗΓΕΙ|ΛΗΓΜΕΝΟ/.test(text) && text.length < 45) statusChips.add(`${where}: "${text}"`)
        }
        return { dates: Array.from(dates), dayCounts: Array.from(dayCounts), statusChips: Array.from(statusChips) }
    })
}

/**
 * Repeated visible strings (B8-class duplicates): exact same visible text
 * (≥12 chars) rendered by more than one element's own text nodes.
 */
export async function repeatedStrings(page: Page): Promise<{ text: string; count: number; where: string[] }[]> {
    return page.evaluate(() => {
        const byText = new Map<string, string[]>()
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return
            const own = Array.from(el.childNodes)
                .filter((x) => x.nodeType === 3)
                .map((x) => (x.textContent || "").trim())
                .join(" ")
                .trim()
            if (own.length < 12) return
            const sec = el.closest("section[id]")
            const where = `${sec ? "#" + (sec as HTMLElement).id : el.closest("aside") ? "aside" : "top"} <${el.tagName.toLowerCase()}>`
            const arr = byText.get(own) || []
            arr.push(where)
            byText.set(own, arr)
        })
        return Array.from(byText.entries())
            .filter(([, w]) => w.length > 1)
            .map(([text, where]) => ({ text: text.slice(0, 80), count: where.length, where }))
    })
}
