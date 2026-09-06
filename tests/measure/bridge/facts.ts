/**
 * PW-BRIDGE-01 L0.3 — the fact-divergence metric.
 *
 * Two views of one object may differ in depth, never in fact. This module
 * turns that sentence into a number: given a capture of the policyholder's
 * page and a capture of the agent's page over the SAME records, it pairs every
 * `data-fact` (and every `data-count`) present on BOTH sides and reports every
 * pair whose rendered value differs.
 *
 * Pure functions only — the Playwright side lives in `two-sided.ts`, and the
 * unit test `tests/unit/bridge-fact-divergence.test.ts` proves the metric goes
 * red on a deliberately divergent pair before it is trusted on a live page.
 *
 * What counts as "the same fact": the same `data-fact` key AND the same
 * `data-fact-subject` (a policy id, a run id) when one is present. A key with
 * no subject pairs by key alone. Values are whitespace-normalised and trimmed;
 * nothing else is forgiven — «3 σημεία» and «3 σημείων» ARE a divergence,
 * because the reader cannot tell a grammatical drift from a numeric one.
 */

export type FactMap = Record<string, string>

export interface SideCapture {
    /** "customer" | "agent" | a template name — free text, appears in the report. */
    side: string
    url: string
    /** `<data-fact>[#<subject>]` → rendered text. */
    facts: FactMap
    /** `<data-count>[#<subject>]` → rendered text. */
    counts: FactMap
}

export interface Divergence {
    key: string
    a: { side: string; value: string }
    b: { side: string; value: string }
}

export interface DivergenceReport {
    kind: "fact" | "count"
    /** Keys present on both sides — the denominator. 0 means parity is unmeasurable, which is itself a finding. */
    pairsCompared: number
    /** Keys present on exactly one side — depth, not fact; reported, never counted as divergence. */
    onlyA: string[]
    onlyB: string[]
    divergences: Divergence[]
}

/**
 * Keys that describe the VIEWER, not the shared object — the same key renders a
 * different person's number on each side by design. Never paired. The first live
 * run paired the shell's unread badge («9+» vs «3») and called it a divergence.
 */
export const VIEWER_SCOPED_KEYS: ReadonlySet<string> = new Set(["notification.unreadCount"])

function isViewerScoped(key: string): boolean {
    return VIEWER_SCOPED_KEYS.has(key.split("#")[0])
}

export function normaliseValue(value: string): string {
    return value.replace(/\s+/g, " ").trim()
}

function compare(kind: "fact" | "count", a: SideCapture, b: SideCapture, mapA: FactMap, mapB: FactMap): DivergenceReport {
    const keysA = new Set(Object.keys(mapA).filter((k) => !isViewerScoped(k)))
    const keysB = new Set(Object.keys(mapB).filter((k) => !isViewerScoped(k)))
    const both = [...keysA].filter((k) => keysB.has(k)).sort()
    const divergences: Divergence[] = []
    for (const key of both) {
        const va = normaliseValue(mapA[key])
        const vb = normaliseValue(mapB[key])
        if (va !== vb) divergences.push({ key, a: { side: a.side, value: va }, b: { side: b.side, value: vb } })
    }
    return {
        kind,
        pairsCompared: both.length,
        onlyA: [...keysA].filter((k) => !keysB.has(k)).sort(),
        onlyB: [...keysB].filter((k) => !keysA.has(k)).sort(),
        divergences,
    }
}

export function compareFacts(a: SideCapture, b: SideCapture): DivergenceReport {
    return compare("fact", a, b, a.facts, b.facts)
}

export function compareCounts(a: SideCapture, b: SideCapture): DivergenceReport {
    return compare("count", a, b, a.counts, b.counts)
}

/** The browser-side extractor, serialised into `page.evaluate`. Visible elements only. */
export function extractAttributeMap(attribute: "data-fact" | "data-count"): FactMap {
    const out: FactMap = {}
    document.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.display === "none" || cs.visibility === "hidden") return
        const subject = el.getAttribute(`${attribute}-subject`)
        const key = `${el.getAttribute(attribute)}${subject ? "#" + subject : ""}`
        const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160)
        // Two visible elements with one key on one page is the duplicate-fact
        // defect `data-fact` exists to expose; keep the FIRST and let the
        // duplicate-facts metric (tests/measure/metrics.ts) own that finding.
        if (!(key in out)) out[key] = text
    })
    return out
}

/** One line per divergence, for PROGRESS.md and the console. */
export function formatReport(report: DivergenceReport): string[] {
    const lines = [`${report.kind}: ${report.pairsCompared} pairs compared, ${report.divergences.length} divergent, ${report.onlyA.length}/${report.onlyB.length} one-sided`]
    for (const d of report.divergences) lines.push(`  ✗ ${d.key}: ${d.a.side}=«${d.a.value}» ${d.b.side}=«${d.b.value}»`)
    return lines
}
