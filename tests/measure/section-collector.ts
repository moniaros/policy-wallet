/**
 * SECTION COUNT — the one definition, shared by two runtimes.
 *
 * `collectSections` is written to be SELF-CONTAINED (no imports, no outer
 * references) because it runs in two places that cannot share anything else:
 *
 *   1. Playwright: `metrics.ts#sectionCount` passes it to `page.evaluate`,
 *      which serialises the function source into the browser. Geometry and
 *      computed styles are real there, so no options are passed.
 *   2. Vitest/jsdom: `tests/unit/policy-detail-section-budget.test.tsx` calls
 *      it directly against a rendered page. jsdom has no layout (every rect is
 *      0×0) and no project stylesheet (class-based backgrounds/borders are
 *      invisible to getComputedStyle), so the unit guard passes
 *      `{ assumeVisible: true, boundedFallback: true }` and the function
 *      substitutes structural signals for the geometric ones.
 *
 * The metric definition (unchanged from metrics.ts, where it was inline):
 * a "section" is a distinct top-level content grouping a customer perceives —
 *   (a) every `section[id]` on the page, PLUS
 *   (b) every direct child of a top-level layout column (the page shell's
 *       inner wrapper, the main content column, and the <aside>) that is not
 *       itself inside a `section[id]` and either contains a heading (h1–h3)
 *       or has a visible boundary (background/border/shadow).
 * Nested `section[id]` count individually — the customer perceives them as
 * separate groups; that is the point.
 *
 * NESTED-MATCH FIX (2026-08-26). The column derivation treats every
 * div-grandchild of the shell wrapper as a "column" and scans its children,
 * so it reaches ONE level inside any div-in-div — including a content card
 * under a spacing wrapper. The policy page's summary card was exactly that
 * shape and was counted TWICE for one rendered card: the wrapper (category
 * (b): the heading found by descendant search) and the card's own header row
 * (scanned as a child of the card-as-"column"). One perceived grouping must
 * produce one entry, so heuristic (b) matches now collapse into their
 * outermost counted ancestor. `section[id]` entries are exempt — nested
 * sections deliberately count individually, per the definition above.
 */

export interface SectionCollectorOptions {
    /**
     * jsdom has no layout: every getBoundingClientRect() is 0×0, which the
     * geometric visibility test reads as "everything is invisible". With this
     * flag only display:none / visibility:hidden hide an element.
     */
    assumeVisible?: boolean
    /**
     * jsdom applies no project stylesheet, so a boundary painted by a class
     * (`.pw-card`, a Tailwind border) never reaches getComputedStyle. With
     * this flag, the DOM signals this codebase uses for bounded blocks stand
     * in: the design system's card class, and a bare interactive control
     * (a standalone button/link child of a column always has chrome).
     */
    boundedFallback?: boolean
}

export interface SectionCollectorResult {
    count: number
    ids: string[]
}

export function collectSections(opts?: SectionCollectorOptions): SectionCollectorResult {
    const assumeVisible = !!(opts && opts.assumeVisible)
    const boundedFallback = !!(opts && opts.boundedFallback)

    const visible = (el: Element) => {
        const cs = getComputedStyle(el as HTMLElement)
        if (cs.display === "none" || cs.visibility === "hidden") return false
        if (assumeVisible) return true
        const r = (el as HTMLElement).getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return false
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
        if (sides.some(([w, s, c]) => parseFloat(w) > 0 && s !== "none" && alphaOf(c) > 0.02)) return true
        if (!boundedFallback) return false
        return (
            el.classList.contains("pw-card") ||
            el.tagName === "BUTTON" ||
            (el.tagName === "A" && el.hasAttribute("href"))
        )
    }

    const out = new Set<Element>()
    document.querySelectorAll("section[id]").forEach((s) => {
        if (visible(s)) out.add(s)
    })

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

    // One perceived grouping, one entry — the nested-match fix (header note).
    // Keep the OUTERMOST of any nested pair of heuristic matches; section[id]
    // entries are exempt and still count individually when nested.
    for (const el of Array.from(out)) {
        if (el.matches("section[id]")) continue
        let p: Element | null = el.parentElement
        while (p) {
            if (out.has(p)) {
                out.delete(el)
                break
            }
            p = p.parentElement
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
}
