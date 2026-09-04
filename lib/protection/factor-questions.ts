/**
 * The assessment's questions — one per context factor, authored once.
 *
 * Layer 3 asks nothing of its own: a question exists only because a catalogue
 * risk declares the factor in `requires` or `supports`, and an area asks only
 * the factors its risks still lack (docs/planning/PERSONAL_RISK_PROFILE.md §C
 * Layer 3, §E, §F). This table is the bridge from a factor key to something a
 * person can answer: which profile column(s) the answer writes, what input to
 * render, the options, the prompt, why we ask, and the short noun phrase the
 * area's «Τι δεν ξέρουμε ακόμη» line uses.
 *
 * Copy lives in the dictionaries under `protection.assessment.factors.<factor>`
 * — Greek in the formal plural («εσάς»), because these render on /protection,
 * never in the onboarding's singular voice. Nothing here is a string literal a
 * reader sees.
 *
 * `health` is Art. 9 data. It is the only `specialCategory` question, it is
 * asked only inside the health area, and the component that renders it (wave
 * 2) gates on the existing health-data consent. This module only FLAGS it.
 *
 * `incomeDependency` is the one question that is not a catalogue factor: no
 * risk conditions on it, so it never makes a risk `needs_review` and never
 * appears in an area's `unknownFactors`. It decides IMPORTANCE (§E), and the
 * onboarding asks it; the household and income areas may re-ask it when it is
 * still null.
 */

import { getTranslations } from "@/lib/i18n"
import { AREA_ORDER, areaForRisk, type AttentionAreaId } from "@/lib/protection/domains"
import {
    ACTIVITY_LABELS,
    CONDITION_LABELS,
    CONTEXT_FACTORS,
    FACTOR_COLUMNS,
    HIGH_RISK_ACTIVITIES,
    INCOME_DEPENDENCY_VALUES,
    type ContextFactorKey,
} from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import type { Bilingual } from "@/lib/services/life-events/types"

export const INCOME_DEPENDENCY_FACTOR = "incomeDependency" as const
export type AssessmentFactorKey = ContextFactorKey | typeof INCOME_DEPENDENCY_FACTOR

export type QuestionInput = "single" | "multi" | "number" | "boolean" | "currency"

export interface QuestionOption {
    value: string
    label: Bilingual
}

export interface FactorQuestion {
    factor: AssessmentFactorKey
    /** PolicyholderProfile columns the answer writes — a subset of the engine's FACTOR_COLUMNS. */
    columns: readonly string[]
    input: QuestionInput
    options?: readonly QuestionOption[]
    prompt: Bilingual
    why: Bilingual
    /** For the «Τι δεν ξέρουμε ακόμη» list: «την ηλικία σας», «αν έχετε σκάφος». */
    shortNoun: Bilingual
    /** Art. 9 — true only for `health`. */
    specialCategory: boolean
    /** Areas whose risks need the factor, in display order. */
    area: readonly AttentionAreaId[]
}

// ── Copy ────────────────────────────────────────────────────────────────

interface FactorCopy {
    prompt: string
    why: string
    noun: string
    options?: Record<string, string>
}

const EL = getTranslations("el").protection.assessment.factors as unknown as Record<AssessmentFactorKey, FactorCopy>
const EN = getTranslations("en").protection.assessment.factors as unknown as Record<AssessmentFactorKey, FactorCopy>

function copyOf(factor: AssessmentFactorKey): { el: FactorCopy; en: FactorCopy } {
    const el = EL[factor]
    const en = EN[factor]
    if (!el || !en) throw new Error(`protection.assessment.factors.${factor} is missing from a dictionary`)
    return { el, en }
}

/** The single {el, en} object literal in this module — one entry in the Greek inventory. */
function pair(el: string, en: string): Bilingual {
    return { el, en }
}

function dictionaryOptions(factor: AssessmentFactorKey, values: readonly string[]): QuestionOption[] {
    const { el, en } = copyOf(factor)
    return values.map((value) => {
        const l = el.options?.[value]
        const r = en.options?.[value]
        if (!l || !r) throw new Error(`protection.assessment.factors.${factor}.options.${value} is missing from a dictionary`)
        return { value, label: pair(l, r) }
    })
}

/** Existing bilingual labels (life-context) plus the dictionary's «none». */
function labelledOptions(
    factor: AssessmentFactorKey,
    labels: Record<string, { en: string; el: string }>,
    values: readonly string[]
): QuestionOption[] {
    return [
        ...values.map((value) => ({ value, label: pair(labels[value].el, labels[value].en) })),
        ...dictionaryOptions(factor, ["none"]),
    ]
}

// ── Static shape per factor ─────────────────────────────────────────────

interface QuestionShape {
    columns: readonly string[]
    input: QuestionInput
    options?: () => QuestionOption[]
}

const MARITAL_VALUES = ["single", "married", "partnered", "divorced", "widowed", "other"] as const
const RESIDENCE_VALUES = ["owned", "rented", "family", "company", "other"] as const
const EMPLOYMENT_VALUES = ["employed", "self_employed", "retired", "unemployed", "student", "other"] as const
const CYBER_VALUES = ["low", "moderate", "high"] as const

/**
 * Which column each question writes and how. A factor is KNOWN when any of its
 * engine columns is answered, so a question writes the one column that settles
 * it most directly: the mortgage question writes `mortgageAmount` (0 = none),
 * not the residence type that also happens to imply it.
 */
const SHAPES: Record<AssessmentFactorKey, QuestionShape> = {
    age: { columns: ["dateOfBirth"], input: "number" },
    maritalStatus: { columns: ["maritalStatus"], input: "single", options: () => dictionaryOptions("maritalStatus", MARITAL_VALUES) },
    children: { columns: ["childrenCount"], input: "number" },
    dependents: { columns: ["dependentsCount"], input: "number" },
    pets: { columns: ["hasPets"], input: "boolean" },
    vehicles: { columns: ["vehiclesCount"], input: "number" },
    residence: { columns: ["residenceType"], input: "single", options: () => dictionaryOptions("residence", RESIDENCE_VALUES) },
    // Same column as `residence`: whichever the area asks first answers both.
    tenancy: { columns: ["residenceType"], input: "single", options: () => dictionaryOptions("tenancy", RESIDENCE_VALUES) },
    propertyOwnership: { columns: ["propertiesOwned"], input: "number" },
    tenants: { columns: ["rentsOutProperty"], input: "boolean" },
    boat: { columns: ["ownsBoat"], input: "boolean" },
    businessOwnership: { columns: ["ownsBusiness"], input: "boolean" },
    selfEmployed: { columns: ["employmentStatus"], input: "single", options: () => dictionaryOptions("selfEmployed", EMPLOYMENT_VALUES) },
    employees: { columns: ["businessEmployees"], input: "number" },
    income: { columns: ["annualIncome"], input: "currency" },
    savings: { columns: ["savingsAmount"], input: "currency" },
    mortgage: { columns: ["mortgageAmount"], input: "currency" },
    loans: { columns: ["loanAmount", "hasLoans"], input: "currency" },
    travelFrequency: { columns: ["travelsFrequently"], input: "boolean" },
    hobbies: { columns: ["activities"], input: "multi", options: () => labelledOptions("hobbies", ACTIVITY_LABELS, HIGH_RISK_ACTIVITIES) },
    valuables: { columns: ["valuablesValue"], input: "currency" },
    cyberExposure: { columns: ["cyberExposure"], input: "single", options: () => dictionaryOptions("cyberExposure", CYBER_VALUES) },
    retirementPlanning: { columns: ["retirementPlanning"], input: "boolean" },
    health: { columns: ["chronicConditions"], input: "multi", options: () => labelledOptions("health", CONDITION_LABELS, Object.keys(CONDITION_LABELS)) },
    buildingManagerRole: { columns: ["isBuildingManager"], input: "boolean" },
    incomeDependency: { columns: ["incomeDependency"], input: "single", options: () => dictionaryOptions("incomeDependency", INCOME_DEPENDENCY_VALUES) },
}

/** The only Art. 9 factor. */
export const SPECIAL_CATEGORY_FACTORS: ReadonlySet<AssessmentFactorKey> = new Set<AssessmentFactorKey>(["health"])

// ── Areas, from the catalogue through the domain table ──────────────────

function areasNeeding(factor: ContextFactorKey): AttentionAreaId[] {
    const ids = new Set<AttentionAreaId>()
    for (const risk of RISK_CATALOG) {
        if (!risk.requires.includes(factor) && !(risk.supports ?? []).includes(factor)) continue
        const area = areaForRisk(risk.id)
        if (area) ids.add(area.id)
    }
    return AREA_ORDER.filter((id) => ids.has(id))
}

/** §E: income dependency belongs to the household and income rows. */
const INCOME_DEPENDENCY_AREAS: readonly AttentionAreaId[] = AREA_ORDER.filter((id) => id === "household" || id === "income")

function build(factor: AssessmentFactorKey): FactorQuestion {
    const shape = SHAPES[factor]
    const { el, en } = copyOf(factor)
    return {
        factor,
        columns: shape.columns,
        input: shape.input,
        ...(shape.options ? { options: shape.options() } : {}),
        prompt: pair(el.prompt, en.prompt),
        why: pair(el.why, en.why),
        shortNoun: pair(el.noun, en.noun),
        specialCategory: SPECIAL_CATEGORY_FACTORS.has(factor),
        area: factor === INCOME_DEPENDENCY_FACTOR ? INCOME_DEPENDENCY_AREAS : areasNeeding(factor),
    }
}

/** Every question, in the engine's factor order, then income dependency. */
export const FACTOR_QUESTIONS: readonly FactorQuestion[] = [
    ...CONTEXT_FACTORS.map((factor) => build(factor)),
    build(INCOME_DEPENDENCY_FACTOR),
]

const BY_FACTOR = new Map<AssessmentFactorKey, FactorQuestion>(FACTOR_QUESTIONS.map((q) => [q.factor, q]))

export function questionForFactor(factor: AssessmentFactorKey): FactorQuestion | undefined {
    return BY_FACTOR.get(factor)
}

/**
 * The questions an area should ask, in the order the caller gives (the area's
 * `unknownFactors` are already requires-first). Three filters:
 *   - only factors one of the area's risks needs;
 *   - a special-category factor only inside its own area (health);
 *   - one question per written column — `residence` and `tenancy` both write
 *     `residenceType`, so answering the first settles the second.
 */
export function questionsForArea(
    area: AttentionAreaId,
    unknownFactors: readonly AssessmentFactorKey[]
): FactorQuestion[] {
    const seenColumns = new Set<string>()
    const out: FactorQuestion[] = []
    for (const factor of unknownFactors) {
        const q = BY_FACTOR.get(factor)
        if (!q || !q.area.includes(area)) continue
        if (q.specialCategory && area !== "health") continue
        const column = q.columns[0]
        if (seenColumns.has(column)) continue
        seenColumns.add(column)
        out.push(q)
    }
    return out
}

/** Guard helper: the engine columns a factor may legitimately write. */
export function engineColumnsFor(factor: AssessmentFactorKey): readonly string[] {
    return factor === INCOME_DEPENDENCY_FACTOR ? ["incomeDependency"] : FACTOR_COLUMNS[factor]
}
