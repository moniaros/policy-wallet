/**
 * SHARED measurement definitions — imported by every surface's own spec/module
 * (originally just the policy-detail mobile series, now also dashboard.ts and
 * pro-home.spec.ts; a third surface is expected next). This file is the ONE
 * place these definitions live — renamed from policy-detail.ts (T-011) so a
 * shared definition stops living inside a file named after a single surface,
 * which is how definitions fork when the next surface arrives.
 *
 * Evidence use: for the policy-detail mobile series
 * (docs/evidence/policy-detail-mobile), the five core metrics below are ONE
 * implementation used verbatim by the BASELINE pass (Goal 0) and the RESULT
 * pass (Goal 5) — if these definitions drift between passes the before/after
 * comparison is worthless, so nothing in here may be edited between the two
 * runs except to fix a bug, and any such fix invalidates the baseline and
 * forces a re-run.
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

import { collectSections } from "./section-collector"
import { collectDuplicateActions } from "./action-collector"
import type { DuplicateActionsOptions, DuplicateActionsResult } from "./action-collector"
import { collectCountConsistency } from "./count-collector"
import type { CountConsistencyOptions, CountConsistencyMetricResult } from "./count-collector"

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
 * The definition (and the collector that implements it) lives in
 * ./section-collector.ts, because it now runs in two runtimes: serialised
 * into the browser here, and directly against jsdom by the CI budget guard
 * (tests/unit/policy-detail-section-budget.test.tsx). One definition, or the
 * CI ceiling and the measured number drift apart.
 *
 * In short: a "section" is a distinct top-level content grouping a customer
 * perceives — every `section[id]`, plus every heading-bearing or visibly
 * bounded direct child of a top-level layout column. Nested `section[id]`
 * count individually; nested HEURISTIC matches collapse into their outermost
 * counted ancestor (the 2026-08-26 fix — one rendered card used to produce
 * two entries, see the collector's header note).
 */
export async function sectionCount(page: Page): Promise<{ count: number; ids: string[] }> {
    return page.evaluate(collectSections, undefined)
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
    /** `subject` present when the key is subject-scoped (per row/branch/severity). */
    dataFactDuplicates: { key: string; subject?: string; count: number }[]
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

        // (a) data-fact scan, grouped by key AND SUBJECT.
        //
        // `data-fact-subject` scopes a key to one row, branch or severity, so a
        // 29-policy wallet renders `policy.daysRemaining` 29 times legitimately
        // — 29 different policies, not one fact twice. Without the subject this
        // scan reported `{key: "policy.daysRemaining", count: 29}` and the
        // duplicate metric became noise on every wallet capture, which is how a
        // real duplicate would later get ignored.
        //
        // It does NOT weaken the check: two elements sharing a key AND a subject
        // (or both carrying no subject at all) are still one fact rendered
        // twice, and still fire. `countConsistency` in ./dashboard.ts already
        // grouped this way; this is the same rule reaching the second scanner.
        const byKey = new Map<string, number>()
        document.querySelectorAll<HTMLElement>("[data-fact]").forEach((el) => {
            if (!visible(el)) return
            const k = el.getAttribute("data-fact") || ""
            const subject = el.getAttribute("data-fact-subject") || ""
            byKey.set(`${k}\u0000${subject}`, (byKey.get(`${k}\u0000${subject}`) || 0) + 1)
        })
        const dataFactDuplicates = Array.from(byKey.entries())
            .filter(([, n]) => n > 1)
            .map(([composite, count]) => {
                const [key, subject] = composite.split("\u0000")
                return subject ? { key, subject, count } : { key, count }
            })

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
 * DUPLICATE-IDENTITY ROWS (P5-wallet-00) — gates the §7.3 asset reframe.
 *
 * The reframe's premise is that a customer cannot tell wallet rows apart.
 * This is the measurement: for each rendered wallet row, extract the
 * concatenated visible text of its IDENTITY fields — insurer, line of
 * business, date, status — and count rows whose identity string is
 * BYTE-IDENTICAL to at least one other row's. The policy number is
 * DELIBERATELY EXCLUDED: it is the disambiguator, so including it would make
 * every row unique and measure nothing. The definition MUST stay identical
 * between the baseline and the post-reframe result pass — that is the whole
 * point of it living here rather than being re-typed per capture — so do not
 * edit the field-location logic below without re-running BOTH passes.
 *
 * A ROW is `[data-testid="policy-card"]` — the ONE hook both `PolicyCard`
 * (grid) and `PolicyTable` (list) carry (PolicyTable.tsx's own comment: "the
 * wallet defaults to LIST view, so tagging only the grid card left the audit
 * finding no policy at all"). There is no literal `<a href="/wallet/<id>">`
 * on either renderer — both navigate via `router.push` on click — so the
 * testid, not a link, is what identifies a row here.
 *
 * FIELD LOCATION — read before changing this function; a metric whose
 * extraction is undocumented cannot be reproduced after the reframe:
 *
 *  CARD shape (components/wallet/PolicyCard.tsx — the ONLY shape this run's
 *  320/390/430 capture matrix ever renders: PolicyWallet.tsx's own comment,
 *  "cards are ALWAYS the presentation below lg ... the view toggle is itself
 *  desktop-only"):
 *   - insurer          the row's ONLY `span.truncate` — PolicyCard.tsx:138
 *                       assigns `displayInsurer` to exactly this element.
 *   - lineOfBusiness    the LOB paragraph's OWN leading text node (before any
 *                       child span) — PolicyCard.tsx:149-150 renders
 *                       `{localizedLob}` as a bare expression immediately
 *                       followed by the conditional `· <expiry>` fragment, so
 *                       the first text node is exactly the LOB label alone.
 *   - date              the element carrying `data-fact="policy.daysRemaining"`
 *                       (PolicyCard.tsx:157). Despite the key name this is the
 *                       card's ONE displayed date/expiry signal:
 *                       `formatRelativeExpiry` returns a relative count inside
 *                       60 days and the formatted END DATE beyond that, so one
 *                       field carries both concepts on this renderer. ABSENT
 *                       from the DOM entirely (not merely empty) when the card
 *                       has nothing to show (`analyzing`, or no resolvable end
 *                       date) — `expiryInline && (...)` does not render the
 *                       wrapping span at all in that case. That is the row's
 *                       real content, so it contributes an EMPTY STRING to the
 *                       identity rather than counting as an extraction
 *                       failure — and an empty date makes two such rows MORE
 *                       likely to collide, which is correct: a customer
 *                       scanning two "nothing to show" rows sees them as
 *                       identical too.
 *   - status            the row's ONLY `span.rounded-full` — the one element
 *                       `StatusPill` renders (components/ui/StatusPill.tsx).
 *                       Distinguished from the branch icon chip, which is
 *                       `rounded-lg`, never `rounded-full`.
 *
 *  TABLE shape (components/wallet/PolicyTable.tsx — UNVERIFIED by this run:
 *  no capture in the 320/390/430 matrix ever renders a `<tr>`, so this path
 *  is best-effort and untested against a real page):
 *   - insurer          the first `<td>`'s SECOND `<p>` when present (the first
 *                       is `summary.assetTitle`, which for an unnamed asset
 *                       IS the insurer — PolicyTable.tsx:134-143 prints the
 *                       insurer on the second line only when it differs from
 *                       the asset title). When there is no second `<p>`, the
 *                       insurer is not independently on the row — reported as
 *                       an unlocatable field for that row rather than guessed.
 *   - lineOfBusiness    the branch-label `<span>` in the second `<td>`.
 *   - date              `[data-fact="policy.endDate"]` on the row.
 *   - status            the row's `span.rounded-full` (same StatusPill).
 *
 * A row on EITHER shape where a field cannot be located is excluded from the
 * duplicate comparison and reported separately under `unlocatable` — never
 * silently padded with empty string or the whole row's text, which would
 * measure something else and call it this.
 */
export interface IdentityRowRecord {
    index: number
    rowTag: string
    /** `data-fact-subject` off the date element, when present — usually the policy id. */
    subject: string | null
    insurer: string | null
    lineOfBusiness: string | null
    /** the card's single date/expiry signal, or the table's end date. `""` when the row legitimately shows none. */
    date: string
    status: string | null
    /**
     * The plate / address short form / pet name the row renders to tell two
     * policies apart (`data-fact="asset.identifier"`). `""` when the line has
     * none — health, life, cyber, business and pension carry no identifier the
     * extraction captures, so their rows legitimately keep colliding.
     */
    assetIdentifier: string
    missingFields: string[]
}

export interface IdentityDuplicateGroup {
    /** human-readable, NOT the comparison key (which joins fields on a distinctive delimiter) */
    display: string
    count: number
    rows: { index: number; subject: string | null }[]
}

export interface DuplicateIdentityResult {
    totalRows: number
    comparableRows: number
    /** rows that are part of some group of size > 1 — the "raw count" the brief asks for */
    duplicateRowCount: number
    /** size of the largest identical-identity group — 0 or 1 when there are none */
    largestGroupSize: number
    groups: IdentityDuplicateGroup[]
    /** rows where a field could not be located — excluded from comparison, reported separately */
    unlocatable: { index: number; missingFields: string[] }[]
}

export async function duplicateIdentityRows(page: Page): Promise<DuplicateIdentityResult> {
    const records = (await page.evaluate(() => {
        const visible = (el: Element) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            const cs = getComputedStyle(el as HTMLElement)
            if (r.width <= 0 || r.height <= 0 || cs.display === "none" || cs.visibility === "hidden") return false
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            return true
        }
        const ownLeadingText = (el: Element): string | null => {
            const node = Array.from(el.childNodes).find((n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0)
            return node ? (node.textContent || "").trim() : null
        }

        const out: {
            index: number
            rowTag: string
            subject: string | null
            insurer: string | null
            lineOfBusiness: string | null
            date: string
            status: string | null
            assetIdentifier: string
            missingFields: string[]
        }[] = []

        let index = 0
        document.querySelectorAll<HTMLElement>('[data-testid="policy-card"]').forEach((row) => {
            if (!visible(row)) return
            const missingFields: string[] = []
            let insurer: string | null = null
            let lineOfBusiness: string | null = null
            let date = ""
            let status: string | null = null

            if (row.tagName === "TR") {
                const cells = row.querySelectorAll("td")
                const firstTd = cells[0] || null
                const ps = firstTd ? firstTd.querySelectorAll("p") : ([] as unknown as NodeListOf<HTMLElement>)
                insurer = ps.length > 1 ? (ps[1].textContent || "").trim() : null
                if (insurer === null) missingFields.push("insurer")

                const lobSpan = cells[1] ? cells[1].querySelector("span") : null
                lineOfBusiness = lobSpan ? (lobSpan.textContent || "").trim() : null
                if (lineOfBusiness === null) missingFields.push("lineOfBusiness")

                const dateEl = row.querySelector('[data-fact="policy.endDate"]')
                date = dateEl ? (dateEl.textContent || "").trim() : ""

                const statusEl = row.querySelector("span.rounded-full")
                status = statusEl ? (statusEl.textContent || "").trim() : null
                if (status === null) missingFields.push("status")
            } else {
                const insurerEl = row.querySelector("button span.truncate")
                insurer = insurerEl ? (insurerEl.textContent || "").trim() : null
                if (insurer === null) missingFields.push("insurer")

                const lobP = row.querySelector("button p")
                lineOfBusiness = lobP ? ownLeadingText(lobP) : null
                if (lineOfBusiness === null) missingFields.push("lineOfBusiness")

                // Absent element (not merely empty text) = the card legitimately
                // shows no date — contributes "" rather than an unlocatable field.
                const dateEl = row.querySelector('[data-fact="policy.daysRemaining"]')
                date = dateEl ? (dateEl.textContent || "").trim() : ""

                const statusEl = row.querySelector("span.rounded-full")
                status = statusEl ? (statusEl.textContent || "").trim() : null
                if (status === null) missingFields.push("status")
            }

            const subjectEl = row.querySelector("[data-fact-subject]")
            const subject = subjectEl ? subjectEl.getAttribute("data-fact-subject") : null

            // THE ASSET IDENTIFIER — the plate, address short form or pet name
            // the row renders to tell two policies apart. It was not read at
            // all, so two rows showing DIFFERENT plates counted as duplicates.
            // Absent is "" rather than null: a health policy has no identifier
            // by design, and must still be comparable (its absence is shared,
            // which is exactly why health duplicates are expected).
            const assetEl = row.querySelector('[data-fact="asset.identifier"]')
            const assetIdentifier = assetEl ? (assetEl.textContent || "").trim() : ""

            out.push({ index, rowTag: row.tagName, subject, insurer, lineOfBusiness, date, status, assetIdentifier, missingFields })
            index++
        })
        return out
    })) as IdentityRowRecord[]

    const IDENTITY_SEP = "|~identity~|"
    const comparable = records.filter((r) => r.missingFields.length === 0)
    const byIdentity = new Map<string, IdentityRowRecord[]>()
    for (const r of comparable) {
        // The asset identifier joins the key. Without it this metric could not
        // reach P5-wallet-01's acceptance ("motor, property, pet duplicates = 0")
        // even on a wallet where every plate was distinct — it never read the
        // field the work exists to add, so the target was unmeasurable by
        // construction. Lines that carry no identifier contribute "" and keep
        // colliding, which is the documented and expected outcome for health,
        // life, cyber, business and pension.
        const key = [r.insurer, r.lineOfBusiness, r.date, r.status, r.assetIdentifier].join(IDENTITY_SEP)
        const arr = byIdentity.get(key) || []
        arr.push(r)
        byIdentity.set(key, arr)
    }

    const groups: IdentityDuplicateGroup[] = Array.from(byIdentity.values())
        .filter((arr) => arr.length > 1)
        .map((arr) => ({
            display: `${arr[0].insurer} · ${arr[0].lineOfBusiness} · ${arr[0].date || "(no date)"} · ${arr[0].status}`,
            count: arr.length,
            rows: arr.map((r) => ({ index: r.index, subject: r.subject })),
        }))
        .sort((a, b) => b.count - a.count)

    const duplicateRowCount = groups.reduce((sum, g) => sum + g.count, 0)
    const largestGroupSize = groups.reduce((max, g) => Math.max(max, g.count), 0)
    const unlocatable = records
        .filter((r) => r.missingFields.length > 0)
        .map((r) => ({ index: r.index, missingFields: r.missingFields }))

    return {
        totalRows: records.length,
        comparableRows: comparable.length,
        duplicateRowCount,
        largestGroupSize,
        groups,
        unlocatable,
    }
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
                // What the STYLESHEET asks for, so a rendering artifact can be
                // told apart from a boundary nobody specified.
                borderColor: cs.borderTopColor, borderWidth: parseFloat(cs.borderTopWidth) || 0,
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
    })()`)) as { x: number; y: number; w: number; h: number; tag: string; kind: string; label: string; borderColor: string; borderWidth: number }[]

    if (!boxes.length) return []

    const shot = await page.screenshot({ fullPage: true })
    const img = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = img.info.width
    const H = img.info.height
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1)

    // THE INSTRUMENT CHECKS ITSELF BEFORE IT REPORTS.
    //
    // Every box position is document-relative (`rect.top + scrollY`) and every
    // pixel lookup indexes a fullPage screenshot, so the two agree ONLY while the
    // screenshot really is the whole document at `dpr`. When it is not — a sticky
    // header double-counted, a lazy image resizing mid-capture, a clamped
    // viewport — every element below the discrepancy is sampled at the wrong
    // offset, and the failures that produces look exactly like faint borders:
    // `inside=#ffffff outside=#ffffff` at 1.00:1, on a control whose border is
    // demonstrably 3.35:1 and which passes at another width.
    //
    // A metric that cannot tell "no boundary" from "looked in the wrong place"
    // is worse than no metric: both read as a defect to go and fix.
    const docH = await page.evaluate(() => document.documentElement.scrollHeight)
    const expectedH = Math.round(docH * dpr)
    const drift = Math.abs(H - expectedH)
    if (drift > 2 * dpr) {
        return [
            `[1.4.11:harness] REFUSING to report — the screenshot is ${H}px tall but the document is ` +
            `${expectedH}px at dpr ${dpr} (drift ${drift}px). Element positions are document-relative, ` +
            `so samples below the discrepancy read the wrong pixels.`,
        ]
    }


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

            // NO EDGE FOUND ≠ NO BOUNDARY.
            //
            // When the inside band and the outside band are the same colour to
            // within a rounding step, the span never crossed anything — the
            // sampler looked at one flat surface twice. That is a reading the
            // instrument failed to take, and reporting it as a contrast failure
            // sends someone to "fix" a control whose border is demonstrably
            // 3.35:1 and which passes at a different viewport width. Reported
            // under its own class so it is visible and countable, and excluded
            // from the gated total, which is what a failure to measure deserves.
            const flat = inside.every((v, i) => Math.abs(v - outside[i]) < 1.5)

            // SPECIFIED vs RENDERED.
            //
            // A 1px border whose top edge lands on a fractional device row is
            // painted across TWO rows at roughly half alpha each, so no single
            // sampled row ever reaches the specified contrast — a 3.35:1 border
            // measures ~2:1, every time, on whichever widths put that element on
            // a half pixel. The stylesheet is correct and the pixels are correct;
            // only the reading is short.
            //
            // So compute what the DECLARED colour would achieve if it landed on
            // the grid. If that meets 3:1 and the measurement does not, this is
            // dilution, not a missing boundary, and it goes in its own class.
            const specCr = (() => {
                const m = /rgba?\(([^)]+)\)/.exec(box.borderColor || "")
                if (!m || !box.borderWidth) return 0
                const parts = m[1].split(",").map((v) => parseFloat(v))
                const [br, bg, bb] = parts
                const ba = parts.length > 3 ? parts[3] : 1
                const over = [0, 1, 2].map((i) => [br, bg, bb][i] * ba + outside[i] * (1 - ba))
                return ratio(lum(over[0], over[1], over[2]), outsideLum)
            })()
            const subpixel = !flat && specCr >= 3
            findings.push(
                `[1.4.11:${flat ? "unmeasured" : subpixel ? "subpixel" : box.kind}] <${box.tag}> ` +
                `"${box.label}" boundary ${cr.toFixed(2)}:1 (needs 3) ` +
                `inside=${hexOf(inside)} outside=${hexOf(outside)}` +
                (flat ? " — inside and outside identical: no edge crossed, reading discarded" : "") +
                (subpixel ? ` — declared ${specCr.toFixed(2)}:1, rendered across two device rows` : "")
            )
        }
    }
    return findings
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic probes (candidate defects; not pass/fail metrics)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Brand names / acronyms that are Latin script by nature and must not be
 * flagged as untranslated English. Read verbatim out of the pre-T-011
 * `latinSentences` implementation — do not add to this without checking who
 * else now imports it (T-013's outbound-copy inventory runs the same list
 * against email/push template strings, which have no DOM to scope the check).
 */
const LATIN_SENTENCE_ALLOWLIST =
    /^(PolicyWallet|Interamerican|Generali|AXA|NN|Eurolife|ERGO|Allianz|MAPFRE|AIG|Groupama|AI|PDF|OK|FAQ|IBAN|GDPR|SSL|USD|EUR|API|Q&A|VIP|CO2|GPS|SOS|24\/7|e-mail|email|Mercedes|Toyota|BMW|Audi|Ford|Opel|AW P&C SA|AFFIDEA)$/i

/**
 * PURE — Latin-script sentence detector for `el` (Greek) output (B2 /
 * untranslated strings). Operates on a single string; returns `[text.slice(0,
 * 140)]` when it contains a run of ≥3 consecutive Latin words of ≥3 letters
 * not covered by the brand/acronym allowlist, else `[]`.
 *
 * Extracted from the DOM-walking `latinSentences(page)` below so the SAME
 * locale-purity definition can run against a string that never touched a
 * browser — a rendered email or push template, for instance — not just page
 * text. No detection logic changed in the extraction; this is the exact
 * per-node check the old implementation ran inline, unindented.
 */
export function findLatinSentences(text: string): string[] {
    const trimmed = text.trim()
    if (trimmed.length < 12) return []
    // ≥3 consecutive Latin words of ≥3 letters = sentence-like English.
    const m = trimmed.match(/\b[A-Za-z][a-z]{2,}(?:\s+[A-Za-z(][A-Za-z0-9().,'%€-]{2,}){2,}/)
    if (!m) return []
    if (LATIN_SENTENCE_ALLOWLIST.test(m[0].trim())) return []
    return [trimmed.slice(0, 140)]
}

/**
 * DOM WRAPPER — unchanged behaviour. Extracts every visible text node's
 * trimmed content in-browser (identical visibility filter to before), then
 * runs the pure predicate above over each string outside the page context.
 */
export async function latinSentences(page: Page): Promise<string[]> {
    const texts = await page.evaluate(() => {
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
            if (text) out.push(text)
        }
        return out
    })
    const out = new Set<string>()
    for (const text of texts) {
        for (const hit of findLatinSentences(text)) out.add(hit)
    }
    return Array.from(out)
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

/**
 * Clipped labels: scrollWidth > clientWidth on nav/tab/label elements (B3).
 *
 * @deprecated Reconciled into `truncationFailures()` below (T-011), the UNION
 * of this function and dashboard.ts's `clippedContent` — the run contract
 * defines exactly one truncation-failures metric. Kept here, unchanged,
 * because `policy-detail-goal1.spec.ts`'s B3/B6 assertions and several
 * baseline specs' committed JSON output (`docs/evidence/.../data/current/*
 * .json`, field `clippedLabels`) depend on this EXACT selector list and
 * output shape; changing it would silently change what a passing test means.
 * New callers should use `truncationFailures()` instead.
 */
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

/**
 * PURE — internal-identifier / placeholder-content leak detector (D5,
 * invariant 3): a string that must never reach a customer. Deliberately
 * narrow so it cannot cry wolf: fixture-shaped identifiers, raw UUIDs/cuids,
 * and snake_case enum tokens standing alone as content; a brand name or an
 * acronym is not a leak. Returns the REASON tags that matched (joined by the
 * caller), not a formatted string, so a caller with no DOM — T-013's
 * outbound-copy inventory, running this against rendered email/push template
 * strings — gets the same classification a page-scan gets.
 *
 * Moved here from dashboard.ts (T-011): the predicate is not
 * dashboard-specific, and a shared leakage/locale-purity definition living
 * inside one surface's file is exactly how definitions fork when the next
 * surface needs it — the same argument that renamed policy-detail.ts. No
 * detection regex changed in the move.
 */
export function findInternalTokens(text: string): string[] {
    const hits: string[] = []
    if (!text) return hits
    if (/\bE2E[-\s]/i.test(text)) hits.push("E2E fixture identifier")
    // PLACEHOLDER / DRAFT / TEST content must never reach a customer.
    // Extended here rather than in a second probe so one definition
    // covers both classes: a fixture identifier and a fixture STRING are
    // the same failure — internal material rendered as product.
    if (/δοκιμαστικ\w*|υπόδειγμα|placeholder|lorem ipsum|\bTODO\b|\bFIXME\b/i.test(text)) {
        hits.push("placeholder/draft content")
    }
    if (/\bPENDING-|__[A-Z_]+__/.test(text)) hits.push("pending/sentinel marker")
    // A standalone English word like "sample"/"draft"/"test" is too
    // common to match blindly; require it to be labelling the content.
    if (/\((?:sample|draft|test|dummy)[^)]*\)/i.test(text)) hits.push("content marked as sample/draft")
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) hits.push("UUID")
    if (/\b(?:c[a-z0-9]{24})\b/.test(text)) hits.push("cuid")
    // A bare snake_case token as content — the raw-enum class.
    if (/(?:^|\s)[a-z]+(?:_[a-z]+){1,3}(?:\s|$)/.test(text) && !/https?:|@/.test(text)) {
        hits.push("snake_case enum token")
    }
    return hits
}

/**
 * DOM WRAPPER — unchanged behaviour, still scoped to `.pw-page-shell` (the
 * page's own content, not the app shell around it) exactly as before.
 * Extracts each visible text node's trimmed content in-browser, then runs the
 * pure predicate above outside the page context and reassembles the same
 * `"reason+reason: \"text\""` format the old inline version produced.
 */
export async function internalTokenLeaks(page: Page): Promise<string[]> {
    const texts = await page.evaluate(() => {
        const out: string[] = []
        const shell = document.querySelector(".pw-page-shell") || document.body
        const walker = document.createTreeWalker(shell, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walker.nextNode())) {
            const el = n.parentElement
            if (!el) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            if (el.getBoundingClientRect().width === 0) continue
            const text = (n.textContent || "").trim()
            if (text) out.push(text)
        }
        return out
    })
    const out = new Set<string>()
    for (const text of texts) {
        const hits = findInternalTokens(text)
        if (hits.length) out.add(`${hits.join("+")}: "${text.slice(0, 80)}"`)
    }
    return Array.from(out)
}

/**
 * TRUNCATION FAILURES — the ONE definition the run contract specifies:
 *
 *   "elements sourced from the `el` bundle where scrollWidth > clientWidth,
 *   plus any server-side string slicing on Greek content, plus mid-word
 *   breaks on brand names."
 *
 * (The latter two clauses are not DOM-observable — a truncated server-side
 * slice and a rendered-short ellipsis look identical in the browser — and are
 * out of scope for this function; they need a source-vs-rendered text diff,
 * which belongs to whatever probe reads the extraction payload, not this one.)
 *
 * This is the UNION of the two definitions this repo grew independently
 * before the contract was written down:
 *   - `clippedLabels` (deprecated, above): a fixed selector list
 *     (nav/heading/dt/th/`.pw-kicker`), generic `scrollWidth > clientWidth`.
 *   - dashboard.ts's `clippedContent` (deprecated): any element carrying a
 *     CSS truncation class, checked in both dimensions.
 * Neither alone is the metric — `clippedLabels`'s selector list misses a
 * truncated `<p>` insurer name (the defect `clippedContent` was written to
 * catch); `clippedContent`'s CSS-class gate misses a heading that overflows
 * its box with no truncation class at all (a sideways scrollbar the reader
 * never finds, which `clippedLabels` was written to catch).
 *
 *   (a) ANY visible element, anywhere in the page, whose content overflows
 *       its box horizontally (`scrollWidth > clientWidth + 1`) —
 *       reason "overflow". This is `clippedLabels`'s check, widened from its
 *       selector list to every element, per the brief.
 *   (b) ANY visible element carrying a CSS truncation class (`truncate`,
 *       `line-clamp-*`, `text-overflow: ellipsis`, or `overflow: hidden` +
 *       `white-space: nowrap`) whose content is ACTUALLY being clipped, in
 *       EITHER dimension — reason "css-truncation". Vertical clipping
 *       (`line-clamp`) is invisible to (a), which only ever looks sideways;
 *       `clientHeight`/`scrollHeight` are reported alongside for that case
 *       so the record still tells the truth about which axis clipped.
 *
 * An element already recorded under (a) is not recorded again under (b) even
 * if it also carries a truncation class — one element, one record.
 */
export interface TruncationFailure {
    selector: string
    text: string
    scrollWidth: number
    clientWidth: number
    reason: "overflow" | "css-truncation"
    /** Present only when a css-truncation record clipped vertically (line-clamp). */
    scrollHeight?: number
    clientHeight?: number
}

export async function truncationFailures(page: Page): Promise<TruncationFailure[]> {
    return page.evaluate(() => {
        const visible = (el: HTMLElement) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return false
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return false
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            return true
        }
        const selectorOf = (el: HTMLElement): string => {
            const id = el.id ? `#${el.id}` : ""
            const cls = el.classList.length ? "." + Array.from(el.classList).slice(0, 2).join(".") : ""
            return `${el.tagName.toLowerCase()}${id}${cls}`
        }

        const out: {
            selector: string
            text: string
            scrollWidth: number
            clientWidth: number
            reason: "overflow" | "css-truncation"
            scrollHeight?: number
            clientHeight?: number
        }[] = []
        const seen = new Set<Element>()

        // An element that SCROLLS is not truncating — it is doing its job.
        //
        // This exclusion was missing, and its absence inverted the metric: every
        // `.pw-scroll-strip` counted as a truncation failure on every capture.
        // That primitive exists precisely so a horizontal strip CAN overflow
        // rather than compress its children into slivers (globals.css), so the
        // measurement was penalising the sanctioned fix for the thing it was
        // measuring. A representative entry: `div.-mx-1.mb-4`, 577px of filter
        // chips in a 262px viewport, reported as truncation — nothing was
        // clipped, the reader swipes.
        //
        // Overflow hidden BEHIND a clip is still a failure and still counted;
        // only `auto`/`scroll` — a reachable overflow — is excused.
        const scrollsByDesign = (el: HTMLElement) => {
            const ox = getComputedStyle(el).overflowX
            return ox === "auto" || ox === "scroll"
        }

        // (a) generic horizontal overflow, any element.
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            if (!visible(el)) return
            if (scrollsByDesign(el)) return
            if (el.scrollWidth > el.clientWidth + 1) {
                seen.add(el)
                out.push({
                    selector: selectorOf(el),
                    text: (el.textContent || "").trim().slice(0, 80),
                    scrollWidth: el.scrollWidth,
                    clientWidth: el.clientWidth,
                    reason: "overflow",
                })
            }
        })

        // (b) CSS-truncation-class elements actually clipping, not already counted.
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            if (seen.has(el)) return
            if (!visible(el)) return
            const cs = getComputedStyle(el)
            const cls = String(el.className || "")
            const truncating =
                /\btruncate\b|\bline-clamp-\d+\b/.test(cls) ||
                cs.textOverflow === "ellipsis" ||
                cs.webkitLineClamp !== "none" ||
                (cs.overflow === "hidden" && cs.whiteSpace === "nowrap")
            if (!truncating) return
            const clippedH = el.scrollWidth > el.clientWidth + 1
            const clippedV = el.scrollHeight > el.clientHeight + 1
            if (!clippedH && !clippedV) return
            out.push({
                selector: selectorOf(el),
                text: (el.textContent || "").trim().slice(0, 80),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                reason: "css-truncation",
                ...(clippedV ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight } : {}),
            })
        })

        return out
    })
}

export type PageOverflow = {
    documentScrollWidth: number
    viewportWidth: number
    overflowPx: number
    offenders: string[]
}

/**
 * Does the PAGE scroll sideways?
 *
 * The harness has always measured scroll HEIGHT, and `truncationFailures`
 * measures element-level overflow (`el.scrollWidth > el.clientWidth`). Neither
 * asks the question §6.12 exists to ask, so across ~190 captures at
 * 320/390/430 nobody asked it: is the document itself wider than the viewport?
 *
 * It matters here more than it would elsewhere, because two load-bearing rules
 * in app/globals.css exist for exactly this failure and neither had an
 * assertion behind it: `:where(.grid, .flex) > * { min-width: 0 }` below 430px,
 * added so a long Greek compound cannot push the page sideways, and
 * `.pw-scroll-strip`, added because that same rule, applied to a strip that is
 * MEANT to scroll, removes the floor that makes it scroll.
 *
 * A legitimate horizontal scroller does NOT show up here — a `.pw-scroll-strip`
 * clips its own overflow, so its children never extend the document's
 * scrollWidth. That is the point of the distinction: the strip scrolls, the
 * page does not. Offenders are therefore only elements that push past the
 * viewport WITHOUT a scrolling ancestor to contain them.
 */
export async function pageOverflow(page: Page): Promise<PageOverflow> {
    return page.evaluate(() => {
        const doc = document.documentElement
        const viewportWidth = doc.clientWidth
        const documentScrollWidth = Math.max(doc.scrollWidth, document.body.scrollWidth)
        // 1px of tolerance: sub-pixel layout rounding is not a defect.
        const overflowPx = Math.max(0, documentScrollWidth - viewportWidth - 1)

        const selectorOf = (el: Element): string => {
            const id = el.id ? `#${el.id}` : ""
            const cls = el.classList.length ? "." + Array.from(el.classList).slice(0, 2).join(".") : ""
            return `${el.tagName.toLowerCase()}${id}${cls}`
        }
        const containedByAScroller = (el: Element): boolean => {
            let p = el.parentElement
            while (p && p !== doc) {
                const ox = getComputedStyle(p).overflowX
                if (ox === "auto" || ox === "scroll" || ox === "hidden") return true
                p = p.parentElement
            }
            return false
        }

        const offenders: string[] = []
        if (overflowPx > 0) {
            for (const el of Array.from(doc.querySelectorAll("*"))) {
                const cs = getComputedStyle(el)
                if (cs.display === "none" || cs.visibility === "hidden") continue
                if (cs.position === "fixed") continue
                const r = el.getBoundingClientRect()
                if (r.width === 0 || r.height === 0) continue
                if (r.right <= viewportWidth + 1) continue
                if (containedByAScroller(el)) continue
                const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60)
                offenders.push(`${selectorOf(el)} right=${Math.round(r.right)}px "${text}"`)
                if (offenders.length >= 25) break
            }
        }
        return { documentScrollWidth, viewportWidth, overflowPx, offenders }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// §11 metrics 7 and 8 (Phase 5 precondition, PHASE4-ASSESSMENT.md).
//
// Both definitions live in their own self-contained collector files —
// ./action-collector.ts and ./count-collector.ts — on the section-collector
// pattern: `page.evaluate` serialises the function source into the browser,
// so the SAME definition also runs directly under jsdom, which is where their
// red-proof probe lives (phase5-metrics-probe.test.ts). Every design decision
// (identity rule, visibility discipline, nav policy, value extraction, the
// deliberate exclusions) and every stated blind spot is documented in those
// files, next to the code that implements it.
// ─────────────────────────────────────────────────────────────────────────────

export type {
    DuplicateActionsOptions,
    DuplicateActionsResult,
    DuplicateActionGroup,
    ActionInstanceRecord,
    ActionIdentitySource,
    ActionGroupClassification,
} from "./action-collector"

export type {
    CountConsistencyOptions,
    CountConsistencyMetricResult,
    InconsistentCountKey,
    CountRender,
} from "./count-collector"

/**
 * DUPLICATE ACTIONS — the same action offered more than once on one page.
 * Identity: `data-action` verb, else normalised destination, else accessible
 * name (tagged by confidence); subject-scoped so per-row controls do not read
 * as page-level repeats; nav overlap reported-not-gated by default
 * (`navPolicy: "count"` gates it). Full rule + blind spots: action-collector.ts.
 */
export async function duplicateActions(
    page: Page,
    opts?: DuplicateActionsOptions
): Promise<DuplicateActionsResult> {
    return page.evaluate(collectDuplicateActions, opts)
}

/**
 * COUNT CONSISTENCY — one `data-count`/`data-fact` key rendering more than one
 * distinct value (grouped by key + subject). A numeral rendered WITHOUT
 * instrumentation is reported as UNMEASURABLE, never as consistent — the
 * verdict is three-valued so silence cannot read as a pass. Value-extraction
 * rules (Greek thousands, «Απεριόριστα», dates, first-number-in-prose) and
 * blind spots: count-collector.ts. The dashboard's own baseline-era
 * `countConsistency` in ./dashboard.ts is unchanged (committed captures depend
 * on its shape); THIS is the shared §11 metric for new callers.
 */
export async function countConsistency(
    page: Page,
    opts?: CountConsistencyOptions
): Promise<CountConsistencyMetricResult> {
    return page.evaluate(collectCountConsistency, opts)
}

/**
 * COUNTS WITHOUT A NAVIGATION TARGET (PW-TRANSPARENCY-02, Goal B4).
 *
 * "Every rendered count navigates to the set it counts." A visible
 * `[data-count]` element whose nearest ancestor-or-self is not a door — an
 * `a[href]`, a `button[data-href]` or a `[role='link']` — is an offender.
 * Reported with its key, subject, text and the heading of its section, so the
 * fix is a link rather than an argument. Same shape and same visibility rules
 * as `callsToAction` in ./dashboard, so the two numbers describe one page.
 */
export interface CountWithoutNavigation {
    key: string
    subject: string | null
    text: string
    where: string
}
export async function countsWithoutNavigation(page: Page): Promise<CountWithoutNavigation[]> {
    return page.evaluate(() => {
        const out: CountWithoutNavigation[] = []
        document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) return
            if (el.closest("a[href], button[data-href], [role='link']")) return
            const section = el.closest("section, article, [class*='pw-card']")
            const heading = section?.querySelector("h1,h2,h3,.pw-kicker")
            out.push({
                key: el.getAttribute("data-count") || "",
                subject: el.getAttribute("data-count-subject"),
                text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
                where: (heading?.textContent || section?.tagName || "?").replace(/\s+/g, " ").trim().slice(0, 40),
            })
        })
        return out
    })
}

/**
 * OVERLAPPING HIT AREAS — layout integrity (PW-TRANSPARENCY-02, verification V4b).
 *
 * Two interactive elements whose bounding boxes intersect, neither being an
 * ancestor of the other, are two targets fighting for one touch. Negative
 * margins used to hold a 44px target without growing the layout are the
 * classic cause. Every visible `a[href], button, [role=button], [role=link],
 * input, select, textarea` IN THE PAGE FLOW is paired with every other; a pair
 * is reported once with the intersection area in px². Out of scope by
 * definition, and reported by the app-shell audit instead: elements outside
 * the viewport (an off-canvas drawer's contents) and elements in a fixed or
 * sticky bar (a bottom navigation overlays whatever scrolls behind it — that
 * is the bar's design, not two siblings fighting for one touch).
 */
export interface HitAreaOverlap {
    a: string
    b: string
    areaPx: number
    /** Boxes as [x, y, w, h] in page coordinates — the split between a layout defect and an app-shell overlap is read from these. */
    boxA: [number, number, number, number]
    boxB: [number, number, number, number]
}
export async function overlappingHitAreas(page: Page, options: { includeShell?: boolean } = {}): Promise<HitAreaOverlap[]> {
    return page.evaluate((includeShell: boolean) => {
        const sel = "a[href], button, [role='button'], [role='link'], input, select, textarea"
        const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none") return false
            const r = el.getBoundingClientRect()
            if (!(r.width > 0 && r.height > 0)) return false
            if (includeShell) return true
            // Off-canvas (a closed drawer) or outside the viewport horizontally.
            if (r.right <= 0 || r.left >= document.documentElement.clientWidth) return false
            // Inside a fixed / sticky bar: overlays content by design.
            let node: HTMLElement | null = el
            while (node) {
                const pos = getComputedStyle(node).position
                if (pos === "fixed" || pos === "sticky") return false
                node = node.parentElement
            }
            return true
        })
        const label = (el: HTMLElement) => `${el.tagName.toLowerCase()}${el.getAttribute("data-count") ? `[${el.getAttribute("data-count")}]` : ""} «${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40)}»`
        const out: HitAreaOverlap[] = []
        for (let i = 0; i < els.length; i++) {
            const ra = els[i].getBoundingClientRect()
            for (let j = i + 1; j < els.length; j++) {
                if (els[i].contains(els[j]) || els[j].contains(els[i])) continue
                const rb = els[j].getBoundingClientRect()
                const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
                const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
                if (w > 0.5 && h > 0.5) {
                    const box = (r: DOMRect): [number, number, number, number] => [Math.round(r.left + window.scrollX), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)]
                    out.push({ a: label(els[i]), b: label(els[j]), areaPx: Math.round(w * h), boxA: box(ra), boxB: box(rb) })
                }
            }
        }
        return out
    }, Boolean(options.includeShell))
}

/** Every rendered count, key → text (subject-scoped keys carry their subject). For evidence, not for a gate. */
export async function renderedCounts(page: Page): Promise<Record<string, string>> {
    return page.evaluate(() => {
        const out: Record<string, string> = {}
        document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const key = `${el.getAttribute("data-count")}${el.getAttribute("data-count-subject") ? "#" + el.getAttribute("data-count-subject") : ""}`
            out[key] = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)
        })
        return out
    })
}
