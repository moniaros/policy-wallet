import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { fingerprintGapDefinitions } from "@/lib/gaps/catalogue-version"
import { isEvaluableDetectionLogic } from "@/lib/gaps/assessment-coverage"

/**
 * Coverage composition — two questions, two denominators (PW-TRANSPARENCY-02
 * amendment 01, Goal B2).
 *
 * The engine (`decideGapsForPolicy`, lib/gap-detection.ts, untouched) records
 * only the rules that FIRED. Goal 0 F1/F2: twenty of the 29 authored rules ask
 * a coverage question and return false on an absent field — indistinguishable
 * from a pass — while nine ask whether something was RECORDED and fire on
 * absence. One `A + B + C = N` over all 29 would mix the two questions, so this
 * module derives two lines and never sums across them:
 *
 *   Line 1 — coverage:  checked N₁ = covered A₁ + not_covered B₁ + indeterminate C₁
 *   Line 2 — recording: checked N₂ = recorded A₂ + not_recorded B₂
 *
 * Every classification of a NON-firing rule is made here, in the presentation
 * layer, by reading the inputs the rule declares (`field`, `fields`,
 * `referenceField`) off the same extraction the run evaluated:
 *   - a fired coverage rule is `not_covered`; a fired recording rule is `not_recorded`;
 *   - a non-firing coverage rule is `covered` ONLY when every declared input is
 *     present and of the type the operator evaluates; otherwise `indeterminate`;
 *   - a rule whose inputs are not statically declarable is `indeterminate`
 *     unconditionally and is listed by slug, never silently `covered`.
 *
 * The denominator is the run's attempted-rule plan (B0.2), which names the
 * catalogue version it was evaluated against. A composition is never rendered
 * against a different catalogue version: `catalogue_mismatch` is returned and
 * the surface says so instead.
 */

export type RuleQuestion = "coverage" | "recording" | "unknown"
export type CoverageOutcome = "covered" | "not_covered" | "indeterminate"
export type RecordingOutcome = "recorded" | "not_recorded"

export interface CoverageItem {
    slug: string
    outcome: CoverageOutcome
    /** Why it is indeterminate, when it is. */
    reason?: "input_absent" | "input_wrong_type" | "inputs_undeclared" | "outside_rule_window" | "no_extraction"
    inputs: string[]
}

export interface RecordingItem {
    slug: string
    outcome: RecordingOutcome
    inputs: string[]
}

export interface CoverageLine {
    checked: number
    covered: number
    notCovered: number
    indeterminate: number
    items: CoverageItem[]
}

export interface RecordingLine {
    checked: number
    recorded: number
    notRecorded: number
    items: RecordingItem[]
}

export type Composition =
    | {
          kind: "composition"
          lineOfBusiness: string
          catalogueVersion: string
          coverage: CoverageLine
          recording: RecordingLine
          /** Slugs whose question could not be classified — reported, never counted. */
          unclassified: string[]
          /** Slugs classified indeterminate because their inputs are not statically declarable. */
          undeclaredInputs: string[]
      }
    | { kind: "unauthored"; lineOfBusiness: string }
    | { kind: "catalogue_mismatch"; lineOfBusiness: string; runCatalogueVersion: string; currentCatalogueVersion: string }
    | { kind: "no_run"; lineOfBusiness: string }
    /** V3: a COMPLETED run with no attempted-rules plan (analysed before B0). What was checked cannot be stated. */
    | { kind: "pre_plan"; lineOfBusiness: string; runFinishedAt: string | null; runDateLabel: string | null }

// ── Rule shape helpers ──────────────────────────────────────────────────────

type RawRule = {
    type?: unknown
    operator?: unknown
    field?: unknown
    fields?: unknown
    referenceField?: unknown
    withinDays?: unknown
}

function rulesOf(detectionLogic: unknown): RawRule[] {
    const logic = detectionLogic as { rules?: unknown } | null | undefined
    if (logic && Array.isArray(logic.rules)) return logic.rules.filter((r): r is RawRule => Boolean(r) && typeof r === "object")
    return logic && typeof logic === "object" ? [logic as RawRule] : []
}

const COVERAGE_OPERATORS = new Set(["is_false", "all_false", "value_drift", "falsy", "is_true", "truthy", "equals", "not_equals", "less_than"])
const RECORDING_OPERATORS = new Set(["missing", "all_missing"])

/** Which question a rule asks. A rule that mixes both is `unknown` and is never counted. */
export function classifyRuleQuestion(detectionLogic: unknown): RuleQuestion {
    const rules = rulesOf(detectionLogic)
    if (rules.length === 0) return "unknown"
    let coverage = 0
    let recording = 0
    for (const rule of rules) {
        if (rule.type === "date_within_days") {
            coverage++
            continue
        }
        if (rule.type === "acord_field_check") {
            const op = String(rule.operator ?? "")
            if (RECORDING_OPERATORS.has(op)) recording++
            else if (COVERAGE_OPERATORS.has(op)) coverage++
            else return "unknown"
            continue
        }
        // missing_coverage, low_limit, insurer_match, duration_short,
        // payment_frequency_check, always: not classifiable by input alone.
        return "unknown"
    }
    if (coverage > 0 && recording === 0) return "coverage"
    if (recording > 0 && coverage === 0) return "recording"
    return "unknown"
}

/** The extraction paths a rule declares, or null when its inputs are not statically declarable. */
export function declaredInputs(detectionLogic: unknown): string[] | null {
    const paths: string[] = []
    for (const rule of rulesOf(detectionLogic)) {
        if (rule.type !== "acord_field_check" && rule.type !== "date_within_days") return null
        if (Array.isArray(rule.fields) && rule.fields.length > 0) {
            for (const f of rule.fields) if (typeof f === "string") paths.push(f)
        } else if (typeof rule.field === "string") {
            paths.push(rule.field)
        } else {
            return null
        }
        if (typeof rule.referenceField === "string") paths.push(rule.referenceField)
    }
    return paths.length > 0 ? [...new Set(paths)] : null
}

function getNested(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((o, key) => (o && typeof o === "object" ? (o as Record<string, unknown>)[key] : undefined), obj)
}

function isPresent(value: unknown): boolean {
    if (value === undefined || value === null || value === "") return false
    if (Array.isArray(value)) return value.length > 0
    return true
}

type InputCheck = { ok: true } | { ok: false; reason: CoverageItem["reason"] }

/** Every declared input present AND of the type the operator evaluates. */
function checkInputs(detectionLogic: unknown, acordData: unknown, now: Date): InputCheck {
    for (const rule of rulesOf(detectionLogic)) {
        const fields: string[] = Array.isArray(rule.fields) && rule.fields.length > 0
            ? (rule.fields as unknown[]).filter((f): f is string => typeof f === "string")
            : typeof rule.field === "string"
              ? [rule.field]
              : []
        if (rule.type === "date_within_days") {
            const raw = getNested(acordData, fields[0] ?? "")
            if (!isPresent(raw)) return { ok: false, reason: "input_absent" }
            const date = new Date(String(raw))
            if (Number.isNaN(date.getTime())) return { ok: false, reason: "input_wrong_type" }
            // The rule fires only inside its window (0..withinDays). A date already
            // past is neither "expiring" nor "fine" to this rule — it never
            // evaluates it — so the composition may not call it covered.
            if (date.getTime() < now.getTime()) return { ok: false, reason: "outside_rule_window" }
            continue
        }
        const op = String(rule.operator ?? "")
        const paths = [...fields, ...(typeof rule.referenceField === "string" ? [rule.referenceField] : [])]
        for (const path of paths) {
            const value = getNested(acordData, path)
            if (!isPresent(value)) return { ok: false, reason: "input_absent" }
            if ((op === "is_false" || op === "all_false" || op === "is_true" || op === "truthy") && typeof value !== "boolean") {
                return { ok: false, reason: "input_wrong_type" }
            }
            if ((op === "value_drift" || op === "less_than") && (typeof value !== "number" || !Number.isFinite(value))) {
                return { ok: false, reason: "input_wrong_type" }
            }
        }
    }
    return { ok: true }
}

// ── The composition ─────────────────────────────────────────────────────────

export interface DefinitionForComposition {
    slug: string
    detectionLogic: unknown
}

export interface ComposeInput {
    lineOfBusiness: string
    /** The extraction the run evaluated (the policy's stored acordData). */
    acordData: unknown
    /** Slugs of the LIVE gap rows on the policy — the rules that fired. */
    firedSlugs: readonly string[]
    /** The run's attempted-rule plan (B0.2): slugs + catalogue version. Null when no run completed. */
    attempted: { slugs: readonly string[]; catalogueVersion: string } | null
    /** The latest COMPLETED run, so a run that carries no plan becomes the `pre_plan` state rather than nothing. */
    completedRun?: { finishedAt: Date | string | null; dateLabel?: string | null } | null
    /** The definitions to classify — normally the authored catalogue at the same version. */
    definitions?: readonly DefinitionForComposition[]
    now?: Date
}

/** The fingerprint of the authored catalogue in this build. */
export function currentCatalogueVersion(): string {
    return fingerprintGapDefinitions(AUTHORED_GAP_DEFINITIONS)
}

export function composeFindings(input: ComposeInput): Composition {
    const lineOfBusiness = String(input.lineOfBusiness || "").trim()
    if (!input.attempted) {
        if (input.completedRun) {
            const at = input.completedRun.finishedAt ? new Date(input.completedRun.finishedAt) : null
            return {
                kind: "pre_plan",
                lineOfBusiness,
                runFinishedAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null,
                runDateLabel: input.completedRun.dateLabel ?? null,
            }
        }
        return { kind: "no_run", lineOfBusiness }
    }
    if (input.attempted.slugs.length === 0) return { kind: "unauthored", lineOfBusiness }

    const current = currentCatalogueVersion()
    if (input.attempted.catalogueVersion !== current) {
        return { kind: "catalogue_mismatch", lineOfBusiness, runCatalogueVersion: input.attempted.catalogueVersion, currentCatalogueVersion: current }
    }

    const now = input.now ?? new Date()
    const bySlug = new Map<string, DefinitionForComposition>()
    for (const d of input.definitions ?? AUTHORED_GAP_DEFINITIONS) {
        if (isEvaluableDetectionLogic(d.detectionLogic)) bySlug.set(d.slug, d)
    }
    const fired = new Set(input.firedSlugs)
    const hasExtraction = Boolean(input.acordData && typeof input.acordData === "object")

    const coverage: CoverageLine = { checked: 0, covered: 0, notCovered: 0, indeterminate: 0, items: [] }
    const recording: RecordingLine = { checked: 0, recorded: 0, notRecorded: 0, items: [] }
    const unclassified: string[] = []
    const undeclaredInputs: string[] = []

    for (const slug of [...input.attempted.slugs].sort()) {
        const definition = bySlug.get(slug)
        if (!definition) {
            unclassified.push(slug)
            continue
        }
        const question = classifyRuleQuestion(definition.detectionLogic)
        const inputs = declaredInputs(definition.detectionLogic)

        if (question === "recording") {
            recording.checked++
            const outcome: RecordingOutcome = fired.has(slug) ? "not_recorded" : "recorded"
            if (outcome === "recorded") recording.recorded++
            else recording.notRecorded++
            recording.items.push({ slug, outcome, inputs: inputs ?? [] })
            continue
        }

        if (question === "coverage") {
            coverage.checked++
            if (fired.has(slug)) {
                coverage.notCovered++
                coverage.items.push({ slug, outcome: "not_covered", inputs: inputs ?? [] })
                continue
            }
            if (!inputs) {
                coverage.indeterminate++
                undeclaredInputs.push(slug)
                coverage.items.push({ slug, outcome: "indeterminate", reason: "inputs_undeclared", inputs: [] })
                continue
            }
            if (!hasExtraction) {
                coverage.indeterminate++
                coverage.items.push({ slug, outcome: "indeterminate", reason: "no_extraction", inputs })
                continue
            }
            const check = checkInputs(definition.detectionLogic, input.acordData, now)
            if (check.ok) {
                coverage.covered++
                coverage.items.push({ slug, outcome: "covered", inputs })
            } else {
                coverage.indeterminate++
                coverage.items.push({ slug, outcome: "indeterminate", reason: check.reason, inputs })
            }
            continue
        }

        unclassified.push(slug)
    }

    return {
        kind: "composition",
        lineOfBusiness,
        catalogueVersion: input.attempted.catalogueVersion,
        coverage,
        recording,
        unclassified,
        undeclaredInputs,
    }
}

/** The two invariants, as a predicate a guard can assert on any composition. */
export function compositionSums(c: Composition): boolean {
    if (c.kind !== "composition") return true
    return (
        c.coverage.covered + c.coverage.notCovered + c.coverage.indeterminate === c.coverage.checked &&
        c.recording.recorded + c.recording.notRecorded === c.recording.checked &&
        c.coverage.items.length === c.coverage.checked &&
        c.recording.items.length === c.recording.checked
    )
}
