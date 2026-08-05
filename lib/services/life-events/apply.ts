/**
 * Applying a life event to a profile.
 *
 * Pure — takes the current profile, returns a patch. No DB, no clock beyond what
 * the caller supplies. Deliberately generic over `ContextDelta[]`: there is no
 * branch on an event id anywhere in this file, which is what makes adding an
 * event a registry row rather than a code change.
 *
 * Three refusals are built in, each one a defect the risk work found the hard
 * way:
 *
 *  1. **An inferred event may not assert a value.** It may mark a factor as
 *     asked, and nothing more. Inference earns the right to ask, never the right
 *     to conclude — the same discipline that keeps `needs_review` meaningful.
 *  2. **A delta that needs a magnitude and has none is skipped, not guessed.**
 *     "You took out a mortgage" without an amount must not write 0, because 0 is
 *     a declaration that there is no debt.
 *  3. **Counters never go negative.** A disposal from an unknown baseline
 *     clamps at zero rather than asserting that someone owns minus one car.
 */

import type { AppliedEvent, ContextDelta, LifeEventOccurrence } from "./types"
import { getLifeEvent } from "./registry"

/** Columns whose value may be asserted by a non-declared event. */
function mayAssert(delta: ContextDelta, confidence: "high" | "medium" | "low"): boolean {
    if (confidence === "high") return true
    return delta.inferable === true
}

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value)
        return Number.isFinite(n) ? n : null
    }
    return null
}

/**
 * Apply one occurrence to a profile snapshot.
 *
 * `profile` is the current `PolicyholderProfile` row (or null for a customer who
 * has none yet). The returned patch is safe to hand to Prisma; `answeredColumns`
 * unions into `answeredFields`, which is what actually moves a risk out of
 * `needs_review` — without it an event can change a value and still leave the
 * engine saying "we have not asked".
 */
export function applyLifeEvent(
    occurrence: LifeEventOccurrence,
    profile: Record<string, unknown> | null
): AppliedEvent {
    const definition = getLifeEvent(occurrence.definitionId)
    if (!definition) {
        return {
            definitionId: occurrence.definitionId,
            patch: {},
            answeredColumns: [],
            skipped: [{ column: "*", reason: "unknown_event" }],
        }
    }

    const patch: Record<string, unknown> = {}
    const answeredColumns: string[] = []
    const skipped: AppliedEvent["skipped"] = []

    for (const delta of definition.contextDelta) {
        // Every applied delta settles its factor, even `mark_known`, which
        // writes nothing and exists precisely for that.
        const settle = () => {
            if (!answeredColumns.includes(delta.column)) answeredColumns.push(delta.column)
        }

        if (delta.operation === "mark_known") {
            settle()
            continue
        }

        if (!mayAssert(delta, occurrence.confidence)) {
            // An inferred event still tells us the question is live.
            settle()
            skipped.push({ column: delta.column, reason: "inferred_may_not_assert" })
            continue
        }

        if (delta.operation === "clear") {
            patch[delta.column] = null
            settle()
            continue
        }

        if (delta.operation === "set") {
            // A `set` with no literal takes the occurrence's magnitude — that is
            // how "you took out a mortgage OF X" is expressed without giving
            // every amount its own event.
            const value = delta.value !== undefined ? delta.value : occurrence.magnitude
            if (value === undefined || value === null) {
                skipped.push({ column: delta.column, reason: "no_value_supplied" })
                continue
            }
            // A non-finite number is not a declaration. `increment` already went
            // through `toNumber`; `set` took the value on trust and wrote NaN or
            // Infinity straight into the profile, where every downstream
            // comparison against it silently returns false.
            if (typeof value === "number" && !Number.isFinite(value)) {
                skipped.push({ column: delta.column, reason: "not_a_finite_number" })
                continue
            }
            patch[delta.column] = value
            settle()
            continue
        }

        // increment
        const step =
            delta.value !== undefined ? toNumber(delta.value) : toNumber(occurrence.magnitude)
        if (step === null) {
            skipped.push({ column: delta.column, reason: "no_value_supplied" })
            continue
        }
        const current = toNumber(profile?.[delta.column]) ?? 0
        patch[delta.column] = Math.max(0, current + step)
        settle()
    }

    return { definitionId: definition.id, patch, answeredColumns, skipped }
}

/**
 * Apply several occurrences in order.
 *
 * Later events see the effect of earlier ones, so two births increment to two
 * rather than both writing one. Order is the caller's; chronological is the
 * sensible one.
 */
export function applyLifeEvents(
    occurrences: LifeEventOccurrence[],
    profile: Record<string, unknown> | null
): AppliedEvent[] {
    let working: Record<string, unknown> = { ...(profile ?? {}) }
    const results: AppliedEvent[] = []

    for (const occurrence of occurrences) {
        const applied = applyLifeEvent(occurrence, working)
        working = { ...working, ...applied.patch }
        results.push(applied)
    }

    return results
}

/** Collapse several applications into one patch plus one answered-column set. */
export function mergeApplied(applied: AppliedEvent[]): {
    patch: Record<string, unknown>
    answeredColumns: string[]
} {
    const patch: Record<string, unknown> = {}
    const answered = new Set<string>()
    for (const a of applied) {
        Object.assign(patch, a.patch)
        for (const c of a.answeredColumns) answered.add(c)
    }
    return { patch, answeredColumns: [...answered] }
}

// ── Dependencies ─────────────────────────────────────────────────────

export interface DependencyCheck {
    satisfied: boolean
    missing: Array<{ kind: string; target: string; note?: string }>
}

/**
 * Are an event's prerequisites met?
 *
 * A missing prerequisite is NOT a rejection. Someone declaring a second child
 * with no first child on record has one — the missing antecedent is our gap, not
 * theirs. The caller backfills rather than refusing, and this reports what to
 * backfill.
 */
export function checkDependencies(
    definitionId: string,
    priorEventIds: string[]
): DependencyCheck {
    const definition = getLifeEvent(definitionId)
    if (!definition) return { satisfied: false, missing: [{ kind: "unknown_event", target: definitionId }] }

    const missing: DependencyCheck["missing"] = []
    for (const dependency of definition.dependsOn) {
        if (dependency.kind !== "requires_event") continue
        if (!priorEventIds.includes(dependency.target)) {
            missing.push({ kind: dependency.kind, target: dependency.target, note: dependency.note })
        }
    }

    return { satisfied: missing.length === 0, missing }
}
