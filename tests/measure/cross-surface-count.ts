/**
 * CROSS-SURFACE COUNT COMPARISON — the detector for the run's headline defect.
 *
 * DECISIONS.md D-025 names count consistency "v2's headline defect (§2.8,
 * five surfaces)". Five SURFACES: the defect is «3 ασφαλιστήρια» on one page
 * and «4» on another, and a per-document verdict — which is all
 * `collectCountConsistency` produces — cannot see it by construction. This
 * module compares the per-surface captures ACROSS surfaces: group by
 * key+subject over every surface's `groups`, and report any key that renders
 * more than one distinct value anywhere in the product.
 *
 * RUNTIME. Pure functions over `CountConsistencyMetricResult` values — no
 * DOM, no Playwright, never serialised into a browser. The value-extraction
 * rules stay in count-collector.ts (`valueOf`), used once per render at
 * capture time; this module NEVER re-extracts, so there is exactly one
 * definition of "what number does this element show" (the drift rule that
 * produced metrics.ts in the first place).
 *
 * ── DECISION 1 — SAME STATE, OR THE COMPARISON IS MEANINGLESS ─────────────
 *
 * A cross-surface diff is only evidence if all captures observed ONE
 * portfolio state. The sweep spec (phase5-cross-surface.spec.ts) enforces
 * this: one account, one browser session, navigation only (no clicks — the
 * notifications page marks-as-read only on explicit user action, verified in
 * NotificationsClient.tsx, so pure GETs mutate nothing), and TWO full passes
 * over all five surfaces. `compareSweepPasses` below diffs pass 1 against
 * pass 2 per surface: if any surface's key→values map changed between its
 * own two visits, something mutated state mid-sweep (a background job, an
 * arriving notification, an Athens-midnight day rollover) or the surface is
 * nondeterministic — either way every cross-surface finding from that run
 * would be uninterpretable, so the run is VOID and the spec fails loudly
 * instead of reporting a phantom contradiction. The double pass is chosen
 * over a single sentinel re-visit of /dashboard because a mutation visible
 * only on, say, /wallet+/protection would escape a /dashboard sentinel; it is
 * chosen over a DB fingerprint because picking "the tables that matter" is a
 * hand-maintained universe (the D-005 guard failure), and because opening
 * pooler connections during a browser run is this repo's documented way to
 * hit the 15-client ceiling. Residual blind spot, stated: a mutation that
 * lands after surface S's pass-1 capture and reverts exactly before S's
 * pass-2 capture is invisible. See the doc for the full list.
 *
 * ── DECISION 2 — SATURATION IS A FLOOR CLAIM, NOT A VALUE ─────────────────
 *
 * The bell badge renders «9+» above 9 (AppShell, both badge sites);
 * count-collector's `valueOf` reads that as exact 9, which is harmless
 * within one page (every badge site saturates identically — count-keys.ts
 * demands the lockstep) but WRONG across surfaces, where a saturated badge
 * may sit against an exact render: 9+ vs 12 would read as 9-vs-12, a phantom.
 * So this module re-reads each render's RAW TEXT: a render whose entire text
 * is `N+` is reclassified as a FLOOR claim "the value is ≥ N". Rules:
 *   floor(N) vs exact(V):  contradiction iff V < N   (9+ vs 3 fires; 9+ vs 12 does not)
 *   floor(N₁) vs floor(N₂): never a value contradiction (both satisfiable by
 *       any true value ≥ max) — but N₁ ≠ N₂ is reported as
 *       saturationThresholdDrift, because count-keys.ts requires badge
 *       thresholds in lockstep and drifted thresholds are how a saturated
 *       and an exact render end up side by side.
 *   exact vs exact:        contradiction iff distinct.
 * The pattern is strict — the WHOLE text, `\d+` then `+` — because «3 + 2»
 * is arithmetic and a looser match would launder real numerals into floors.
 * The cost, stated: a saturated badge that ever renders prose around the
 * `N+` («9+ ειδοποιήσεις») reads as exact N and could fire a phantom against
 * a true exact ≥ N. Today's two badge sites render the bare token.
 *
 * ── DECISION 3 — PAGE-SCOPED KEYS ARE EXCLUDED BY NAME, WITH THE REASON ───
 *
 * Some instrumented counts are facts about a PAGE's presentation, not the
 * portfolio, and comparing them across surfaces would manufacture
 * contradictions out of design. They are excluded via PAGE_SCOPED_KEYS —
 * key → stated reason — and every excluded observation is REPORTED under
 * `excludedPageScoped` with the values seen, never silently dropped: an
 * exclusion nobody can see is indistinguishable from a blind spot. The list
 * is deliberately tiny; the registry's own namespace rule ("the namespace is
 * the fact's OWNER, never the surface") means almost every key is meant to
 * agree everywhere, and a key that "has to be excluded" to keep the sweep
 * green should first be suspected of being the defect.
 *
 * ── DECISION 4 — ABSENCE IS NOT AGREEMENT ─────────────────────────────────
 *
 * A key present on one surface and absent on four is UNCORROBORATED, not
 * consistent — a verdict of "consistent" over one observation is the
 * vacuous pass this programme exists to remove (D-025: the attribute scans
 * returned a vacuous zero all run). So the result separates:
 *   corroboratedExact  — ≥2 surfaces each contributed an exact value and all
 *                        agree. The only thing that earns "corroborated".
 *   corroboratedFloorOnly — ≥2 surfaces agree but ONLY at floor precision
 *                        (all renders saturated). Floors agreeing proves both
 *                        surfaces saturate, not that they would agree
 *                        unsaturated — reported separately, never counted as
 *                        exact corroboration.
 *   uncorroboratedShared — present on ≥2 surfaces without contradiction, but
 *                        with at most one exact observation (e.g. one exact +
 *                        one floor: the floor fails to deny the exact, which
 *                        is not the same as confirming it).
 *   singleSurface      — present on exactly one surface. Nothing was compared.
 * The verdict is four-valued and only "consistent-and-corroborated" when at
 * least one key actually passed a real cross-surface comparison:
 *   "contradicted"                — ≥1 cross-surface contradiction
 *   "consistent-and-corroborated" — none, and ≥1 corroboratedExact key
 *   "consistent-but-uncorroborated" — none, shared keys exist, zero exact
 *                                    corroboration (floors/one-sided only)
 *   "vacuous-no-shared-keys"      — no key appears on ≥2 surfaces at all
 *
 * ── WHAT ELSE IS REPORTED, AND WHY ────────────────────────────────────────
 *
 *  - intraSurfaceInconsistencies: a key rendering two values WITHIN one
 *    surface is the per-page metric's finding and gates there; it is passed
 *    through here (not silently absorbed into the cross-surface number) so
 *    this report is complete on its own, but it does not drive this verdict.
 *  - channelMismatches: the same key carried as data-count on one surface
 *    and data-fact on another is a vocabulary bug (the registry forbids a
 *    key in both maps). Groups are merged by key+subject REGARDLESS of
 *    channel — keeping channel in the identity would make a real value
 *    contradiction invisible behind the vocabulary bug — and the mismatch is
 *    reported alongside whatever the values say.
 *  - unmeasurableBySurface: this verdict vouches ONLY for instrumented
 *    counts. Each surface's uninstrumented-numeral count is carried into the
 *    result so "consistent" can never be read wider than what was measured.
 *
 * ── BLIND SPOTS (inherited and own) ───────────────────────────────────────
 *  1. Two keys for one real-world quantity (portfolio.activeCount vs a
 *     hypothetical wallet.activeCount, or the LEGACY policy.* spellings) do
 *     not compare — vocabulary discipline is the registry guard's job.
 *  2. Subject-scoped keys compare per subject; the same policy rendered
 *     under two different subject ids on two surfaces does not compare.
 *  3. Everything count-collector cannot extract (spelled-out numbers,
 *     masked values) never reaches this module.
 *  4. The five-surface list is this module's universe; a sixth surface
 *     rendering a third value is invisible until added to the sweep.
 */

import type { CountConsistencyMetricResult, CountRender } from "./count-collector"

/** One surface's capture: the path and the per-page collector's output. */
export interface SurfaceCapture {
    surface: string
    result: CountConsistencyMetricResult
}

/**
 * DECISION 3's list. key → the stated reason it is a page fact, not a
 * portfolio fact. Kept deliberately short — see the header.
 */
export const PAGE_SCOPED_KEYS: Record<string, string> = {
    "portfolio.attentionCollapsedCount":
        "Counts the attention notices THIS page hides behind its own 'show more' toggle " +
        "(count-keys.ts: 'attention notices minus the two shown') — a fact about one page's " +
        "presentation. Two surfaces with different fold sizes may honestly hide different numbers.",
    "timeline.groupSize":
        "Subject is a render-local collapsed-run id (T-06 grouping) — group identity exists only " +
        "within one rendered list, so a cross-surface match on it would be a coincidence of ids, " +
        "not the same fact.",
}

/** One render's claim about a key's value, tagged with where it was seen. */
export interface CrossSurfaceClaim {
    surface: string
    kind: "exact" | "floor"
    /** canonical value (exact) or the floor threshold as a string (floor) */
    value: string
    text: string
    where: string
    channel: "count" | "fact"
}

export interface CrossSurfaceContradiction {
    key: string
    subject: string
    /** distinct competing claims, e.g. ["3", "4"] or ["≥9", "3"] */
    values: string[]
    /** the surfaces involved — always ≥2 for entries in `contradictions` */
    surfaces: string[]
    claims: CrossSurfaceClaim[]
}

export interface CrossSurfaceKeyReport {
    key: string
    subject: string
    surfaces: string[]
    status:
        | "corroborated-exact"
        | "corroborated-floor-only"
        | "uncorroborated-shared"
        | "single-surface"
        | "contradicted"
    claims: CrossSurfaceClaim[]
}

export interface CrossSurfaceCountResult {
    surfaces: string[]
    /** key+subject groups that appear on ≥2 surfaces (exclusions removed) */
    sharedKeyCount: number
    corroboratedExact: number
    corroboratedFloorOnly: number
    uncorroboratedShared: number
    singleSurface: { key: string; subject: string; surface: string; values: string[] }[]
    /** the headline: a key rendering different values on DIFFERENT surfaces */
    contradictions: CrossSurfaceContradiction[]
    /** per-page findings passed through for completeness; gate at the per-page metric */
    intraSurfaceInconsistencies: { surface: string; key: string; subject: string; values: string[] }[]
    channelMismatches: { key: string; subject: string; channels: string[]; surfaces: string[] }[]
    saturationThresholdDrift: { key: string; subject: string; floors: string[]; surfaces: string[] }[]
    excludedPageScoped: {
        key: string
        reason: string
        bySurface: { surface: string; values: string[] }[]
    }[]
    /** scope honesty: uninstrumented numerals per surface — what this verdict does NOT cover */
    unmeasurableBySurface: { surface: string; count: number }[]
    keys: CrossSurfaceKeyReport[]
    verdict:
        | "contradicted"
        | "consistent-and-corroborated"
        | "consistent-but-uncorroborated"
        | "vacuous-no-shared-keys"
}

/** Strict saturation form: the whole text is `N+` (see DECISION 2). */
const FLOOR_RE = /^\s*(\d{1,4})\s*\+\s*$/

const isNumeric = (v: string): boolean => /^[+-]?\d+(\.\d+)?$/.test(v)

/** A render's claim: floor if the raw text is the saturated badge form. */
function claimOf(surface: string, r: CountRender, channel: "count" | "fact"): CrossSurfaceClaim | null {
    const floor = r.text.match(FLOOR_RE)
    if (floor) {
        return { surface, kind: "floor", value: floor[1], text: r.text, where: r.where, channel }
    }
    if (r.value === null) return null // per-page nonComparable/textual — nothing to compare
    return { surface, kind: "exact", value: r.value, text: r.text, where: r.where, channel }
}

export function compareAcrossSurfaces(captures: SurfaceCapture[]): CrossSurfaceCountResult {
    interface Merged {
        key: string
        subject: string
        claims: CrossSurfaceClaim[]
        channels: Set<string>
        surfacesSeen: Set<string>
    }
    const merged = new Map<string, Merged>()
    const excludedBySurface = new Map<string, Map<string, string[]>>() // key → surface → values

    for (const cap of captures) {
        for (const g of cap.result.groups) {
            if (PAGE_SCOPED_KEYS[g.key]) {
                const per = excludedBySurface.get(g.key) || new Map<string, string[]>()
                const vals = per.get(cap.surface) || []
                for (const r of g.renders) vals.push(r.value === null ? `(no value: "${r.text}")` : r.value)
                per.set(cap.surface, vals)
                excludedBySurface.set(g.key, per)
                continue
            }
            // Merge by key+subject, NOT channel — see channelMismatches above.
            const id = g.key + "\u0000" + g.subject
            const m = merged.get(id) || {
                key: g.key,
                subject: g.subject,
                claims: [],
                channels: new Set<string>(),
                surfacesSeen: new Set<string>(),
            }
            m.channels.add(g.channel)
            m.surfacesSeen.add(cap.surface)
            for (const r of g.renders) {
                const c = claimOf(cap.surface, r, g.channel)
                if (c) m.claims.push(c)
            }
            merged.set(id, m)
        }
    }

    const contradictions: CrossSurfaceContradiction[] = []
    const intraSurfaceInconsistencies: CrossSurfaceCountResult["intraSurfaceInconsistencies"] = []
    const channelMismatches: CrossSurfaceCountResult["channelMismatches"] = []
    const saturationThresholdDrift: CrossSurfaceCountResult["saturationThresholdDrift"] = []
    const singleSurface: CrossSurfaceCountResult["singleSurface"] = []
    const keys: CrossSurfaceKeyReport[] = []
    let sharedKeyCount = 0
    let corroboratedExact = 0
    let corroboratedFloorOnly = 0
    let uncorroboratedShared = 0

    for (const m of Array.from(merged.values()).sort((a, b) =>
        (a.key + a.subject).localeCompare(b.key + b.subject)
    )) {
        const surfaces = Array.from(m.surfacesSeen).sort()
        const exacts = m.claims.filter((c) => c.kind === "exact")
        const floors = m.claims.filter((c) => c.kind === "floor")

        if (m.channels.size > 1) {
            channelMismatches.push({
                key: m.key,
                subject: m.subject,
                channels: Array.from(m.channels).sort(),
                surfaces,
            })
        }

        // Intra-surface disagreement (per-page jurisdiction, passed through).
        for (const s of surfaces) {
            const own = Array.from(new Set(exacts.filter((c) => c.surface === s).map((c) => c.value)))
            if (own.length > 1) {
                intraSurfaceInconsistencies.push({ surface: s, key: m.key, subject: m.subject, values: own })
            }
        }

        // Cross-surface contradiction: two DIFFERENT surfaces make
        // incompatible claims. Exact-vs-exact: distinct values on distinct
        // surfaces. Floor-vs-exact: a numeric exact BELOW a floor threshold,
        // on a different surface than the floor.
        const conflicting: CrossSurfaceClaim[] = []
        for (let i = 0; i < m.claims.length; i++) {
            for (let j = i + 1; j < m.claims.length; j++) {
                const a = m.claims[i]
                const b = m.claims[j]
                if (a.surface === b.surface) continue
                let clash = false
                if (a.kind === "exact" && b.kind === "exact") {
                    clash = a.value !== b.value
                } else if (a.kind !== b.kind) {
                    const floor = a.kind === "floor" ? a : b
                    const exact = a.kind === "floor" ? b : a
                    clash = isNumeric(exact.value) && parseFloat(exact.value) < parseFloat(floor.value)
                }
                // floor vs floor never clashes (DECISION 2)
                if (clash) {
                    if (!conflicting.includes(a)) conflicting.push(a)
                    if (!conflicting.includes(b)) conflicting.push(b)
                }
            }
        }
        const isContradicted = conflicting.length > 0
        if (isContradicted) {
            const values = Array.from(
                new Set(conflicting.map((c) => (c.kind === "floor" ? "≥" + c.value : c.value)))
            ).sort()
            contradictions.push({
                key: m.key,
                subject: m.subject,
                values,
                surfaces: Array.from(new Set(conflicting.map((c) => c.surface))).sort(),
                claims: m.claims,
            })
        }

        // Threshold drift among floors (report-only; see DECISION 2).
        const floorValues = Array.from(new Set(floors.map((c) => c.value)))
        if (floorValues.length > 1) {
            saturationThresholdDrift.push({
                key: m.key,
                subject: m.subject,
                floors: floorValues.sort(),
                surfaces: Array.from(new Set(floors.map((c) => c.surface))).sort(),
            })
        }

        // Status per DECISION 4.
        let status: CrossSurfaceKeyReport["status"]
        if (isContradicted) {
            status = "contradicted"
        } else if (surfaces.length < 2) {
            status = "single-surface"
            singleSurface.push({
                key: m.key,
                subject: m.subject,
                surface: surfaces[0],
                values: Array.from(
                    new Set(m.claims.map((c) => (c.kind === "floor" ? "≥" + c.value : c.value)))
                ),
            })
        } else {
            sharedKeyCount++
            const exactSurfaces = new Set(exacts.map((c) => c.surface))
            if (exactSurfaces.size >= 2) {
                status = "corroborated-exact"
                corroboratedExact++
            } else if (exacts.length === 0 && new Set(floors.map((c) => c.surface)).size >= 2) {
                status = "corroborated-floor-only"
                corroboratedFloorOnly++
            } else {
                status = "uncorroborated-shared"
                uncorroboratedShared++
            }
        }
        keys.push({ key: m.key, subject: m.subject, surfaces, status, claims: m.claims })
    }

    // Contradicted keys that span ≥2 surfaces still count as shared — they
    // were compared, they just failed. sharedKeyCount above only counted the
    // non-contradicted ones; add the multi-surface contradicted ones so the
    // verdict arithmetic can't understate how much was actually compared.
    sharedKeyCount += keys.filter((k) => k.status === "contradicted" && k.surfaces.length >= 2).length

    const excludedPageScoped = Array.from(excludedBySurface.entries()).map(([key, per]) => ({
        key,
        reason: PAGE_SCOPED_KEYS[key],
        bySurface: Array.from(per.entries())
            .map(([surface, values]) => ({ surface, values }))
            .sort((a, b) => a.surface.localeCompare(b.surface)),
    }))

    const verdict: CrossSurfaceCountResult["verdict"] =
        contradictions.length > 0
            ? "contradicted"
            : sharedKeyCount === 0
              ? "vacuous-no-shared-keys"
              : corroboratedExact > 0
                ? "consistent-and-corroborated"
                : "consistent-but-uncorroborated"

    return {
        surfaces: captures.map((c) => c.surface),
        sharedKeyCount,
        corroboratedExact,
        corroboratedFloorOnly,
        uncorroboratedShared,
        singleSurface,
        contradictions,
        intraSurfaceInconsistencies,
        channelMismatches,
        saturationThresholdDrift,
        excludedPageScoped,
        unmeasurableBySurface: captures.map((c) => ({
            surface: c.surface,
            count: c.result.unmeasurable.length,
        })),
        keys,
        verdict,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION 1's detector: the two-pass same-state check.
// ─────────────────────────────────────────────────────────────────────────────

export interface SweepPassDiff {
    surface: string
    key: string
    subject: string
    pass1Values: string[]
    pass2Values: string[]
}

export interface SweepStateCheck {
    void: boolean
    diffs: SweepPassDiff[]
}

/**
 * Compare two full passes over the same surfaces. Any surface whose
 * key+subject → value-set map changed between its own two visits means the
 * state the sweep claims to have observed did not hold still — the run is
 * VOID (fail loudly; never report a phantom). Value SETS, not render lists:
 * a re-render that shows the same value in the same places twice is stable;
 * layout jitter that changes only `where` is not a state change.
 */
export function compareSweepPasses(pass1: SurfaceCapture[], pass2: SurfaceCapture[]): SweepStateCheck {
    const diffs: SweepPassDiff[] = []
    const mapOf = (cap: SurfaceCapture): Map<string, string[]> => {
        const m = new Map<string, string[]>()
        for (const g of cap.result.groups) {
            const id = g.key + "\u0000" + g.subject
            const values = Array.from(
                new Set(g.renders.map((r) => (r.value === null ? "(none:" + r.text + ")" : r.value)))
            ).sort()
            m.set(id, values)
        }
        return m
    }
    const bySurface2 = new Map(pass2.map((c) => [c.surface, c]))
    for (const c1 of pass1) {
        const c2 = bySurface2.get(c1.surface)
        if (!c2) {
            diffs.push({ surface: c1.surface, key: "(surface missing from pass 2)", subject: "", pass1Values: [], pass2Values: [] })
            continue
        }
        const m1 = mapOf(c1)
        const m2 = mapOf(c2)
        const allIds = new Set([...m1.keys(), ...m2.keys()])
        for (const id of allIds) {
            const [key, subject] = id.split("\u0000")
            const v1 = m1.get(id) || []
            const v2 = m2.get(id) || []
            if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                diffs.push({ surface: c1.surface, key, subject, pass1Values: v1, pass2Values: v2 })
            }
        }
    }
    return { void: diffs.length > 0, diffs }
}
