import type { Policy, GapDefinition } from '@prisma/client'
import { db } from '@/lib/db'
import { calendarDaysUntil } from '@/lib/policy-status'

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low'
export type GapStatus = 'detected' | 'acknowledged' | 'resolved' | 'dismissed'

// The legacy writer that lived here — `DetectedGap`, `detectGapsForPolicy`,
// `detectGapsForUser`, `createGapInstances` — was removed in Sept 2026
// (PW-TRANSPARENCY-02 B0.1). It evaluated the same definitions but wrote
// `gap_instances` rows with no run, no provenance, and RE-ACTIVATED dismissed
// rows, from the protection refresh action and the process-policy job. Rows are
// now written only by lib/gaps/gap-instance-writer.ts, from an analysis run.
// Nothing below this line changed: `decideGapsForPolicy` still owns detection
// and severity.

/**
 * A gap the RULES found, with the evidence for why.
 *
 * This is the only shape allowed to become a `GapInstance`. It carries the
 * definition it came from, the rule that fired, and the inputs that rule read,
 * so a finding can be re-derived and argued with later — which is what an
 * insurance finding has to survive.
 */
export interface RuleDecidedGap {
    slug: string
    gapDefinitionId: string
    severity: GapSeverity
    ruleId: string
    ruleInputs: Record<string, unknown>
    fallbackDescription: string
}

/** Bumped when rule semantics change, so old findings are identifiable. */
export const GAP_ENGINE_VERSION = "rules-1"

/**
 * Below this, a sum insured and its stated reference are treated as agreeing.
 *
 * 20% is wide on purpose. A sum insured is a negotiated, rounded figure and a
 * declared market value is an estimate; flagging a 5% difference would produce
 * a finding on almost every motor policy in the book and teach people to
 * ignore the whole class. A definition may override it per rule.
 */
export const DEFAULT_DRIFT_THRESHOLD_PCT = 20

/**
 * Does this definition carry logic a rule engine can actually evaluate?
 *
 * Two shapes in the catalogue are NOT rules and must never produce a gap:
 *   • `{ check: "Does the policy cover earthquake?" }` — a natural-language
 *     question for a model, which `evaluateSingleRule` falls through to `false`
 *     on anyway, silently.
 *   • `{ source: "ai_clarity_pipeline" }` — the marker on definitions the AI
 *     minted for itself at runtime. Every one of the 41 definitions in
 *     production had this shape as of 2026-08-19.
 *
 * Returning false here is the difference between "we checked and found nothing"
 * and "nothing checked". Callers must treat it as the latter.
 */
export function hasEvaluableRule(gapDef: Pick<GapDefinition, "detectionLogic">): boolean {
    const logic = gapDef.detectionLogic as any
    if (!logic || typeof logic !== "object") return false
    if (Array.isArray(logic.rules)) return logic.rules.some((rule: any) => typeof rule?.type === "string")
    return typeof logic.type === "string"
}

/**
 * THE decision point: which gaps does this policy actually have?
 *
 * Detection and severity both come from here. The model is not consulted, and a
 * definition without an evaluable rule is skipped rather than guessed at, so a
 * gap type nobody has written a rule for simply does not appear — which is the
 * honest outcome, and a visible one, rather than an AI opinion wearing a
 * severity badge.
 */
export async function decideGapsForPolicy(
    policy: Policy,
    acordData: unknown
): Promise<RuleDecidedGap[]> {
    const gapDefinitions = await (db.gapDefinition.findMany as any)({
        where: { lineOfBusiness: policy.lineOfBusiness, isActive: true },
    })

    const decided: RuleDecidedGap[] = []
    // Evaluate against the freshly extracted document, not the row's stored
    // copy — the extraction that just ran is the whole point of the run.
    const subject = { ...policy, acordData } as Policy

    for (const gapDef of gapDefinitions) {
        if (!hasEvaluableRule(gapDef)) continue
        if (!evaluateGapLogic(subject, gapDef)) continue

        decided.push({
            slug: gapDef.slug,
            gapDefinitionId: gapDef.id,
            severity: (gapDef.severity || "medium") as GapSeverity,
            ruleId: gapDef.ruleId || gapDef.slug,
            ruleInputs: ruleInputsFor(gapDef, acordData),
            fallbackDescription: gapDef.description || gapDef.title || gapDef.name || "",
        })
    }

    return decided
}

/**
 * The values the rule actually looked at, recorded alongside the finding.
 *
 * Without this a gap is an assertion; with it, it is a claim someone can check.
 */
function ruleInputsFor(
    gapDef: Pick<GapDefinition, "detectionLogic">,
    acordData: unknown
): Record<string, unknown> {
    const logic = gapDef.detectionLogic as any
    const rules: any[] = Array.isArray(logic?.rules) ? logic.rules : [logic]
    const inputs: Record<string, unknown> = {}

    for (const rule of rules) {
        if (!rule || typeof rule !== "object") continue
        const fields: string[] = Array.isArray(rule.fields)
            ? rule.fields
            : typeof rule.field === "string"
              ? [rule.field]
              : []
        for (const field of fields) {
            inputs[field] = getNestedField(acordData, field) ?? null
        }

        // A drift rule's finding QUOTES a percentage. Recording only the two
        // inputs would leave the reader of a gap_instances row unable to check
        // the number the customer was shown, so the computed value is stored
        // beside the operands that produced it.
        if (rule.operator === 'value_drift' && typeof rule.referenceField === 'string') {
            const actual = getNestedField(acordData, rule.field)
            const reference = getNestedField(acordData, rule.referenceField)
            inputs[rule.referenceField] = reference ?? null
            if (
                typeof actual === 'number' &&
                typeof reference === 'number' &&
                Number.isFinite(actual) &&
                Number.isFinite(reference) &&
                reference > 0
            ) {
                const drift = (actual - reference) / reference
                inputs.driftPct = Math.round(drift * 1000) / 10
                inputs.thresholdPct = Math.abs(
                    Number(rule.thresholdPct ?? DEFAULT_DRIFT_THRESHOLD_PCT)
                )
                inputs.direction = rule.direction ?? 'either'
            }
        }
    }

    return inputs
}

/**
 * Evaluate mature gap detection logic
 */
export function evaluateGapLogic(policy: Policy, gapDef: GapDefinition): boolean {
    const logic = (gapDef as any).detectionLogic as any
    if (!logic) return false

    // Support for complex multi-condition rules
    if (logic.rules && Array.isArray(logic.rules)) {
        const operator = logic.operator || 'AND'
        const results = logic.rules.map((rule: any) => evaluateSingleRule(policy, rule))

        return operator === 'AND'
            ? results.every((res: boolean) => res === true)
            : results.some((res: boolean) => res === true)
    }

    // Fallback to legacy single-type logic
    return evaluateSingleRule(policy, logic)
}

function evaluateSingleRule(policy: Policy, rule: any): boolean {
    if (rule.type === 'missing_coverage') {
        // An EMPTY summary is not evidence of missing cover. `coverageSummary` is
        // a nullable free-text column that many policies never get — and with
        // `''.includes(x)` false for any non-empty x, an unpopulated field made
        // every configured missing-coverage rule fire at once. The one policy
        // least understood by the product was the one reported as riddled with
        // gaps.
        const coverageSummary = (policy as any).coverageSummary?.toLowerCase() || ''
        const requiredCoverage = rule.requiredCoverage?.toLowerCase() || ''
        if (!coverageSummary || !requiredCoverage) return false
        return !coverageSummary.includes(requiredCoverage)
    }

    if (rule.type === 'low_limit') {
        // A limit is the SUM INSURED — what the policy would pay. This read
        // `premiumAmount`, what the customer pays for it: different quantities,
        // routinely three orders of magnitude apart. A rule set to flag cover
        // below €500,000 matched every policy in the book, because no premium is
        // half a million euros; a rule set at €200 flagged cheap policies while
        // claiming their COVER was inadequate. The check could not be right at
        // any threshold.
        const acord = (policy as any).acordData
        const declared =
            getNestedField(acord, rule.field || 'coverage.sumInsured') ??
            getNestedField(acord, 'property.insuredValue') ??
            // The legacy `home` spelling of the same figure. deriveSumInsured
            // already reads both, so a row this rule called "unknown" was one
            // the review screen displayed a sum insured for.
            getNestedField(acord, 'home.insuredValue') ??
            getNestedField(acord, 'coverage.sumInsured')
        // Unknown sum insured is not a low one — say nothing rather than guess.
        if (typeof declared !== 'number' || !Number.isFinite(declared)) return false
        const threshold = rule.threshold || 0
        return declared < threshold
    }

    if (rule.type === 'insurer_match') {
        return policy.insurerName.toLowerCase() === rule.value?.toLowerCase()
    }

    if (rule.type === 'duration_short') {
        // Calendar arithmetic, not days ÷ 30.44. The average-month divisor made a
        // standard 365-day annual policy compute as 11.99 months, so it was
        // flagged as short — while the SAME policy spanning a leap day (366 days)
        // computed as 12.02 and was not. Whether a customer's annual cover looked
        // unusually short came down to which side of 29 February it fell.
        // detectionLogic is a JSON column, so an admin can add a duration rule at
        // any time; this is reachable, not hypothetical.
        const minMonths = rule.minMonths || 12
        const threshold = new Date(policy.startDate.getTime())
        const dayOfMonth = threshold.getUTCDate()
        threshold.setUTCMonth(threshold.getUTCMonth() + minMonths)
        // Rolled past the end of a shorter month (31 Jan + 1 → 3 Mar): step back.
        if (threshold.getUTCDate() < dayOfMonth) threshold.setUTCDate(0)
        return policy.endDate.getTime() < threshold.getTime()
    }

    if (rule.type === 'always') return true

    // Greek-market deterministic rules using ACORD data
    if (rule.type === 'acord_field_check') {
        const acordData = (policy as any).acordData
        if (!acordData) return false
        return evaluateAcordFieldCheck(acordData, rule)
    }

    if (rule.type === 'date_within_days') {
        const acordData = (policy as any).acordData
        if (!acordData) return false
        const dateStr = getNestedField(acordData, rule.field)
        if (!dateStr) return false
        const target = new Date(dateStr)
        if (Number.isNaN(target.getTime())) return false
        // Athens calendar days, like every other expiry count in the product —
        // this drives the Green Card expiry warning, and a document that expires
        // TODAY must still be inside the window.
        const daysUntil = calendarDaysUntil(target, new Date())
        return daysUntil >= 0 && daysUntil <= (rule.withinDays || 30)
    }

    if (rule.type === 'payment_frequency_check') {
        const premium = (policy as any).premium || (policy as any).acordData?.policy?.premium
        if (!premium) return false
        const freq = (premium.frequency || '').toLowerCase()
        return freq === 'monthly' || freq === 'quarterly'
    }

    return false
}

function getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => o?.[key], obj)
}

/**
 * "Nothing was recorded here."
 *
 * An EMPTY ARRAY counts. `beneficiaries: []` is not a recorded beneficiary, and
 * treating it as one would let a policy with an empty list pass a check whose
 * whole purpose is to notice that nobody is named.
 */
function isAbsent(actual: unknown): boolean {
    if (actual === undefined || actual === null || actual === '') return true
    return Array.isArray(actual) && actual.length === 0
}

/**
 * Exported so an operator can be tested as the pure function it is — the rest
 * of the engine needs a Policy row and a GapDefinition, which turns a check on
 * arithmetic into a database fixture.
 */
export function evaluateAcordFieldCheck(acordData: any, rule: any): boolean {
    const { field, operator, value } = rule
    const actual = getNestedField(acordData, field)

    switch (operator) {
        case 'equals':
            return actual === value
        case 'not_equals':
            return actual !== value
        // "Not covered" must mean the document SAID so, not that the extraction
        // never mentioned it.
        //
        // These read `!actual`, so an absent field — the overwhelmingly common
        // case, since the extractor writes what it finds and is silent about
        // everything else — counted as a definite "no". That turned "we did not
        // read anything about leishmaniasis" into "your dog is not covered for
        // leishmaniasis", which is a different sentence and a worse one to be
        // wrong about. Only an explicit `false` is evidence of absence; unknown
        // yields no gap.
        case 'is_false':
            return actual === false
        // `falsy` keeps its literal meaning for non-boolean fields (empty
        // string, zero) but still refuses to treat "not extracted" as evidence.
        case 'falsy':
            return actual !== undefined && actual !== null && !actual
        case 'is_true':
        case 'truthy':
            return actual === true
        // Fires ON SILENCE, deliberately — it asks whether a value was RECORDED,
        // not whether cover exists. Any finding built on it must be worded "not
        // recorded", never "not covered", and it is only justified for fields
        // that policies of that branch routinely state.
        case 'missing':
            return isAbsent(actual)
        // The `missing` counterpart to `all_false`: every listed field must be
        // absent. Needed where one fact can arrive by more than one path — a life
        // policy's beneficiaries land in either `beneficiaries` or
        // `lifeAndInvestment.beneficiaries`, and checking only one would report
        // "no beneficiary recorded" for a policy that plainly records one.
        case 'all_missing': {
            const fields = (rule.fields || []) as string[]
            if (fields.length === 0) return false
            return fields.every((f: string) => isAbsent(getNestedField(acordData, f)))
        }
        case 'less_than':
            return typeof actual === 'number' && actual < (value as number)
        // ── Insured-value adequacy ──────────────────────────────────────
        //
        // Fires when a sum insured has drifted from a reference value the
        // DOCUMENT ITSELF states, by more than `thresholdPct`, in `direction`.
        //
        // Both numbers come off the policy schedule. That is the whole design:
        // no market table, no depreciation curve, no model estimate. A check
        // that tells someone their car is worth €Y had better be able to say
        // where €Y came from, and "the value your own policy declares" is the
        // only answer available that cannot be argued with. An age-based
        // depreciation arm needs Greek market reference data this codebase
        // does not have — see docs/planning/INSURED_VALUE_ADEQUACY.md.
        //
        // Unknown is not drift: if either figure is missing or non-positive
        // there is no finding, consistent with `is_false` above.
        case 'value_drift': {
            const reference = getNestedField(acordData, rule.referenceField)
            if (typeof actual !== 'number' || typeof reference !== 'number') return false
            if (!Number.isFinite(actual) || !Number.isFinite(reference)) return false
            if (actual <= 0 || reference <= 0) return false

            const drift = (actual - reference) / reference
            const threshold = Math.abs(Number(rule.thresholdPct ?? DEFAULT_DRIFT_THRESHOLD_PCT)) / 100
            if (!Number.isFinite(threshold) || threshold <= 0) return false

            switch (rule.direction) {
                // Over-insurance: paying for cover above the stated value.
                case 'above':
                    return drift > threshold
                // Under-insurance: the proportional-payout term (όρος αναλογίας)
                // bites here, so this is the direction with teeth.
                case 'below':
                    return drift < -threshold
                default:
                    return Math.abs(drift) > threshold
            }
        }
        case 'all_false': {
            // Used for "you need ALL of these to qualify" (the ENFIA discount
            // needs fire AND earthquake AND flood). The gap is that at least one
            // is explicitly absent — an unknown one means we cannot tell yet,
            // which is not the same as failing to qualify.
            const fields = (rule.fields || []) as string[]
            return fields.some((f: string) => getNestedField(acordData, f) === false)
        }
        default:
            return false
    }
}

/**
 * A second, parallel gap engine used to live here — `detectGaps(policies)`, with
 * its own `SimpleGap` shape and rules for missing health cover, expiring
 * policies and "low coverage amount".
 *
 * It was referenced by nothing but its own test file. Its doc comment said
 * "used by Unit Tests and potentially frontend", one of its rules was commented
 * "Mock Logic matching test", and every title and description it emitted was
 * hardcoded English — so had it ever been wired to a screen it would have shown
 * "Missing Health Insurance" to a Greek policyholder, alongside verdicts that
 * disagreed with the real engine's (different severities, no line-of-business
 * awareness, `=== 'home'` matching that skipped renters).
 *
 * The engine that runs is `decideGapsForPolicy` above, plus
 * lib/services/gap-engine. A ninety-line duplicate with a passing test suite
 * reads as maintained; it was a prototype, and it is gone.
 */

