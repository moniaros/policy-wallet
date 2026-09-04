/**
 * The step graph of the first-stage onboarding — pure, no React, no copy.
 *
 * Two guarantees the tests hold:
 *   - every `visibleIf` depends only on EARLIER answers, so the first estimate
 *     of the path is the longest one and a forward answer can only prune it;
 *   - the progress denominator is the fixed count of COUNTED_STEPS, so the
 *     number a person sees never grows when a conditional screen appears.
 */

import {
    COUNTED_STEPS,
    INCOME_ASKED_FOR_DEPENDENCY,
    LOW_CONFIDENCE,
    PROTECTION_STEP_IDS,
    type ProtectionStepId,
} from "@/lib/services/protection-profile/vocabulary"
import type { ProtectionAnswers } from "@/lib/validations/protection-profile"

/**
 * §F: «πόσο βασίζεται το νοικοκυριό σου στο εισόδημά σου;» is asked when
 * someone other than the person may live on that income — people ≠ «Μόνο
 * εγώ» (an unsure answer is not «only me», so it is still asked) — and the
 * income answer is one the household can lean on (not «Δεν δουλεύω» /
 * «Σπουδάζω ή κάτι άλλο»). Both are EARLIER answers; an unanswered one keeps
 * the screen on the predicted path.
 */
function incomeDependencyApplies(a: ProtectionAnswers): boolean {
    const onlyMe = a.people !== undefined && a.people.unsure !== true && (a.people.people ?? []).includes("only_me")
    const notEarning = a.income !== undefined && !INCOME_ASKED_FOR_DEPENDENCY.includes(a.income.income)
    return !onlyMe && !notEarning
}

export type StepKind = "single" | "multi" | "info" | "summary" | "upload" | "advisor"

export interface StepDef {
    id: ProtectionStepId
    kind: StepKind
    /** Earlier steps this step's visibility reads. Never a later one. */
    dependsOn?: ProtectionStepId[]
    /** Unknown dependency ⇒ visible (the longest path is the first estimate). */
    visibleIf?: (answers: ProtectionAnswers) => boolean
    /** The screen offers «Δεν είμαι σίγουρος/η». */
    allowsUnsure?: boolean
}

export const STEPS: readonly StepDef[] = [
    { id: "intent", kind: "single" },
    {
        id: "orientation",
        kind: "info",
        dependsOn: ["intent"],
        visibleIf: (a) => a.intent === undefined || a.intent.intent === "help_me",
    },
    { id: "people", kind: "multi", allowsUnsure: true },
    { id: "home", kind: "single" },
    { id: "income", kind: "single" },
    {
        id: "income_dependency",
        kind: "single",
        dependsOn: ["people", "income"],
        visibleIf: incomeDependencyApplies,
        allowsUnsure: true,
    },
    { id: "obligations", kind: "multi", allowsUnsure: true },
    { id: "mobility", kind: "single" },
    { id: "hurt_most", kind: "multi", allowsUnsure: true },
    { id: "changes", kind: "multi" },
    {
        id: "plans",
        kind: "multi",
        dependsOn: ["changes"],
        visibleIf: (a) => a.changes === undefined || a.changes.somethingComing === true,
    },
    { id: "confidence", kind: "single" },
    {
        id: "uncertainty_reason",
        kind: "multi",
        dependsOn: ["confidence"],
        visibleIf: (a) =>
            a.confidence === undefined || LOW_CONFIDENCE.includes(a.confidence.confidence),
    },
    { id: "guidance", kind: "single" },
    { id: "map", kind: "summary" },
    { id: "upload", kind: "upload" },
    { id: "advisor", kind: "advisor" },
]

const STEP_INDEX = new Map(STEPS.map((s, i) => [s.id, i]))
const COUNTED = new Set<ProtectionStepId>(COUNTED_STEPS)

export function stepDef(id: ProtectionStepId): StepDef {
    const def = STEPS[STEP_INDEX.get(id) ?? -1]
    if (!def) throw new Error(`unknown protection-profile step: ${id}`)
    return def
}

/** The path the answers currently predict, from the first step to the tail. */
export function computePath(answers: ProtectionAnswers): ProtectionStepId[] {
    return STEPS.filter((s) => (s.visibleIf ? s.visibleIf(answers) : true)).map((s) => s.id)
}

export function nextStep(current: ProtectionStepId, answers: ProtectionAnswers): ProtectionStepId | null {
    const path = computePath(answers)
    const at = path.indexOf(current)
    // A step that just became invisible (the answer that hid it was changed)
    // still needs a way forward: resume from its authored position.
    const from = at >= 0 ? at : path.findIndex((id) => (STEP_INDEX.get(id) ?? 0) > (STEP_INDEX.get(current) ?? 0)) - 1
    return path[from + 1] ?? null
}

export function previousStep(current: ProtectionStepId, answers: ProtectionAnswers): ProtectionStepId | null {
    const path = computePath(answers)
    const at = path.indexOf(current)
    if (at <= 0) return null
    return path[at - 1] ?? null
}

/**
 * «Βήμα n από m». `m` is the constant count of counted steps; `n` is the
 * position of the current step among them (a conditional screen shows the
 * number of the counted step it follows, so nothing jumps).
 */
export function progressFor(current: ProtectionStepId): { index: number; total: number } | null {
    const total = COUNTED_STEPS.length
    if (["map", "upload", "advisor"].includes(current)) return null
    let index = 0
    for (const def of STEPS) {
        if (COUNTED.has(def.id)) index++
        if (def.id === current) return { index: Math.max(index, 1), total }
    }
    return null
}

/** Is this step's answer recorded (a stored value or an explicit unsure)? */
export function isAnswered(id: ProtectionStepId, answers: ProtectionAnswers, answeredSteps: readonly string[]): boolean {
    if (answeredSteps.includes(id)) return true
    return (answers as Record<string, unknown>)[id] !== undefined
}

/** The first screen on the predicted path that has no answer yet. */
export function firstOpenStep(answers: ProtectionAnswers, answeredSteps: readonly string[]): ProtectionStepId {
    for (const id of computePath(answers)) {
        if (["map", "upload", "advisor"].includes(id)) return id
        if (!isAnswered(id, answers, answeredSteps)) return id
    }
    return "map"
}

export function isProtectionStepId(value: unknown): value is ProtectionStepId {
    return typeof value === "string" && (PROTECTION_STEP_IDS as readonly string[]).includes(value)
}
