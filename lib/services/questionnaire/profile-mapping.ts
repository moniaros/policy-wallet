/**
 * Questionnaire → risk-profile mapping (audit finding F-01).
 *
 * The Protection Score is computed from `PolicyholderProfile`, but that record
 * was writable only from the two B2C paths (onboarding and /api/v1/risk-profile).
 * The advisor's questionnaire — the one instrument built for gathering exactly
 * these facts — recorded free-form answers that reached nothing. So for any
 * client who had not personally completed B2C onboarding, `toProfileFields(null)`
 * returned all-zero defaults and the score collapsed to a near-constant verdict
 * that no advisor action could move.
 *
 * This module is the missing link, and it is deliberately pure: it turns answers
 * into a validated profile patch and decides nothing about persistence.
 *
 * **Provenance.** Only the questionnaire's RECIPIENT may submit it (enforced at
 * both call sites), so every value here is the client's own declaration — the
 * advisor merely asked the question. That keeps the profile self-reported for
 * IDD purposes even though an advisor initiated the exchange. An advisor-asserted
 * profile would need a separate, distinguishable source and is out of scope.
 */

import type { QuestionnaireAnswers } from "@/types/questionnaire"

/**
 * The subset of PolicyholderProfile that a questionnaire may write.
 *
 * Deliberately excludes health-special-category fields (chronicConditions,
 * familyMedicalHistory, heightCm, weightKg, smokingStatus, gender): those carry
 * GDPR Art. 9 weight and must be collected through an explicitly consented
 * surface, not a general-purpose advisor form.
 */
export type MappableProfileField =
    | "maritalStatus"
    | "dependentsCount"
    | "employmentStatus"
    | "ownsHome"
    | "mortgageAmount"
    | "hasPets"
    | "vehiclesCount"
    | "annualIncome"
    | "occupation"
    | "riskTolerance"
    | "hasLoans"
    | "loanAmount"
    | "travelsFrequently"
    | "drivingRecord"
    // ── Life Context factors ──────────────────────────────────────────────
    | "childrenCount"
    | "residenceType"
    | "propertiesOwned"
    | "rentsOutProperty"
    | "ownsBoat"
    | "ownsBusiness"
    | "businessEmployees"
    | "savingsAmount"
    | "valuablesValue"
    | "retirementPlanning"

type FieldSpec =
    | { kind: "int"; min: number; max: number }
    | { kind: "decimal"; min: number; max: number }
    | { kind: "bool" }
    | { kind: "enum"; values: readonly string[] }
    | { kind: "string"; maxLength: number }

/**
 * Bounds are sanity rails, not underwriting rules: they exist so a mistyped or
 * hostile answer cannot poison the score. Anything outside them is dropped and
 * reported in `rejected`, never silently clamped — a clamped value would look
 * like a real declaration.
 */
export const PROFILE_FIELD_SPECS: Record<MappableProfileField, FieldSpec> = {
    maritalStatus: {
        kind: "enum",
        values: ["single", "married", "divorced", "widowed", "partnered", "other"],
    },
    dependentsCount: { kind: "int", min: 0, max: 20 },
    employmentStatus: {
        kind: "enum",
        values: ["employed", "self_employed", "unemployed", "retired", "student", "other"],
    },
    ownsHome: { kind: "bool" },
    mortgageAmount: { kind: "decimal", min: 0, max: 100_000_000 },
    hasPets: { kind: "bool" },
    vehiclesCount: { kind: "int", min: 0, max: 50 },
    annualIncome: { kind: "decimal", min: 0, max: 100_000_000 },
    occupation: { kind: "string", maxLength: 120 },
    riskTolerance: {
        kind: "enum",
        values: ["conservative", "moderate", "aggressive"],
    },
    hasLoans: { kind: "bool" },
    loanAmount: { kind: "decimal", min: 0, max: 100_000_000 },
    travelsFrequently: { kind: "bool" },
    drivingRecord: {
        kind: "enum",
        values: ["clean", "minor_violations", "major_violations", "accidents"],
    },
    childrenCount: { kind: "int", min: 0, max: 20 },
    residenceType: {
        kind: "enum",
        values: ["owned", "rented", "family", "company"],
    },
    propertiesOwned: { kind: "int", min: 0, max: 100 },
    rentsOutProperty: { kind: "bool" },
    ownsBoat: { kind: "bool" },
    ownsBusiness: { kind: "bool" },
    businessEmployees: { kind: "int", min: 0, max: 10_000 },
    savingsAmount: { kind: "decimal", min: 0, max: 100_000_000 },
    valuablesValue: { kind: "decimal", min: 0, max: 100_000_000 },
    retirementPlanning: { kind: "bool" },
}

/**
 * Canonical question ids that map to a profile field with no template authoring.
 *
 * Templates already in the database were written before any of this existed, so
 * requiring an explicit `profileField` on every question would mean the fix
 * delivers nothing until every template is re-authored. A question carrying one
 * of these stable ids maps automatically; anything else needs `profileField`.
 */
export const CANONICAL_QUESTION_IDS: Record<string, MappableProfileField> = {
    "risk.maritalStatus": "maritalStatus",
    "risk.dependentsCount": "dependentsCount",
    "risk.employmentStatus": "employmentStatus",
    "risk.ownsHome": "ownsHome",
    "risk.mortgageAmount": "mortgageAmount",
    "risk.hasPets": "hasPets",
    "risk.vehiclesCount": "vehiclesCount",
    "risk.annualIncome": "annualIncome",
    "risk.occupation": "occupation",
    "risk.riskTolerance": "riskTolerance",
    "risk.hasLoans": "hasLoans",
    "risk.loanAmount": "loanAmount",
    "risk.travelsFrequently": "travelsFrequently",
    "risk.drivingRecord": "drivingRecord",
    "risk.childrenCount": "childrenCount",
    "risk.residenceType": "residenceType",
    "risk.propertiesOwned": "propertiesOwned",
    "risk.rentsOutProperty": "rentsOutProperty",
    "risk.ownsBoat": "ownsBoat",
    "risk.ownsBusiness": "ownsBusiness",
    "risk.businessEmployees": "businessEmployees",
    "risk.savingsAmount": "savingsAmount",
    "risk.valuablesValue": "valuablesValue",
    "risk.retirementPlanning": "retirementPlanning",
}

/** Minimal shape this module needs from a template question. */
export interface MappableQuestion {
    id: string
    /** Explicit mapping; wins over the canonical-id lookup. */
    profileField?: string | null
}

/**
 * Concretely typed patch so it drops straight into Prisma without a cast at the
 * call site — a `Record<field, unknown>` would force every caller to assert, and
 * one bad assertion is all it takes to write a string into a Decimal column.
 */
export interface ProfileUpdatePatch {
    maritalStatus?: string
    dependentsCount?: number
    employmentStatus?: string
    ownsHome?: boolean
    mortgageAmount?: number
    hasPets?: boolean
    vehiclesCount?: number
    annualIncome?: number
    occupation?: string
    riskTolerance?: string
    hasLoans?: boolean
    loanAmount?: number
    travelsFrequently?: boolean
    drivingRecord?: string
    childrenCount?: number
    residenceType?: string
    propertiesOwned?: number
    rentsOutProperty?: boolean
    ownsBoat?: boolean
    ownsBusiness?: boolean
    businessEmployees?: number
    savingsAmount?: number
    valuablesValue?: number
    retirementPlanning?: boolean
}

export interface ProfileMappingResult {
    /** Validated patch, safe to hand to Prisma. Empty when nothing mapped. */
    updates: ProfileUpdatePatch
    /** Fields that will be written. */
    applied: MappableProfileField[]
    /** Answers that named a field but failed validation, with the reason. */
    rejected: Array<{ questionId: string; field: string; reason: string }>
}

/** Resolve which profile field a question writes, if any. */
export function resolveProfileField(
    question: MappableQuestion
): MappableProfileField | null {
    const explicit = question.profileField?.trim()
    if (explicit) {
        return explicit in PROFILE_FIELD_SPECS
            ? (explicit as MappableProfileField)
            : null
    }
    return CANONICAL_QUESTION_IDS[question.id] ?? null
}

function coerceBool(value: unknown): boolean | null {
    if (typeof value === "boolean") return value
    if (typeof value === "number") {
        if (value === 1) return true
        if (value === 0) return false
        return null
    }
    if (typeof value === "string") {
        const v = value.trim().toLowerCase()
        // Greek yes/no included: the UI is Greek-default, and a select rendered
        // in Greek submits its label when no value is configured.
        if (["true", "yes", "y", "1", "ναι"].includes(v)) return true
        if (["false", "no", "n", "0", "όχι", "οχι"].includes(v)) return false
    }
    return null
}

/**
 * Parse a number written in either Greek or English convention.
 *
 * Both separators are ambiguous on their own — "180.000" is 180000 to a Greek
 * client and 180.0 to an English one — so decide by SHAPE rather than by
 * position: a separator repeated in strict 3-digit groups is a thousands
 * separator; anything else is a decimal point. Getting this wrong writes
 * "180" where the client declared a €180,000 mortgage, which silently
 * suppresses the life-cover gap that mortgage exists to trigger.
 */
function coerceNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null
    if (typeof value !== "string") return null

    const raw = value.trim().replace(/[€\s]/g, "")
    if (!raw) return null

    const negative = raw.startsWith("-")
    const body = negative ? raw.slice(1) : raw

    const hasDot = body.includes(".")
    const hasComma = body.includes(",")

    let normalized: string
    if (hasDot && hasComma) {
        // Whichever comes last is the decimal separator.
        normalized =
            body.lastIndexOf(",") > body.lastIndexOf(".")
                ? body.replace(/\./g, "").replace(",", ".")
                : body.replace(/,/g, "")
    } else if (hasComma) {
        normalized = /^\d{1,3}(,\d{3})+$/.test(body)
            ? body.replace(/,/g, "")
            : body.replace(",", ".")
    } else if (hasDot) {
        // "180.000" → thousands. "180.5" / "180.00" → decimal.
        normalized = /^\d{1,3}(\.\d{3})+$/.test(body) ? body.replace(/\./g, "") : body
    } else {
        normalized = body
    }

    if (!/^\d*\.?\d*$/.test(normalized) || normalized === "" || normalized === ".") {
        return null
    }

    const n = Number(normalized)
    if (!Number.isFinite(n)) return null
    return negative ? -n : n
}

function validate(
    field: MappableProfileField,
    raw: unknown
): { ok: true; value: unknown } | { ok: false; reason: string } {
    const spec = PROFILE_FIELD_SPECS[field]

    switch (spec.kind) {
        case "bool": {
            const v = coerceBool(raw)
            return v === null ? { ok: false, reason: "not_boolean" } : { ok: true, value: v }
        }
        case "int": {
            const n = coerceNumber(raw)
            if (n === null) return { ok: false, reason: "not_a_number" }
            if (!Number.isInteger(n)) return { ok: false, reason: "not_an_integer" }
            if (n < spec.min || n > spec.max) return { ok: false, reason: "out_of_range" }
            return { ok: true, value: n }
        }
        case "decimal": {
            const n = coerceNumber(raw)
            if (n === null) return { ok: false, reason: "not_a_number" }
            if (n < spec.min || n > spec.max) return { ok: false, reason: "out_of_range" }
            return { ok: true, value: n }
        }
        case "enum": {
            if (typeof raw !== "string") return { ok: false, reason: "not_a_string" }
            const v = raw.trim().toLowerCase().replace(/[\s-]+/g, "_")
            return spec.values.includes(v)
                ? { ok: true, value: v }
                : { ok: false, reason: "not_an_allowed_value" }
        }
        case "string": {
            if (typeof raw !== "string") return { ok: false, reason: "not_a_string" }
            const v = raw.trim()
            if (!v) return { ok: false, reason: "empty" }
            if (v.length > spec.maxLength) return { ok: false, reason: "too_long" }
            return { ok: true, value: v }
        }
    }
}

/**
 * Turn questionnaire answers into a validated `PolicyholderProfile` patch.
 *
 * Unmapped questions are ignored entirely — a template is free to ask things
 * that are only for the advisor to read. An answer that names a field but fails
 * validation is dropped and reported, never coerced into something plausible.
 */
export function mapAnswersToProfile(
    questions: MappableQuestion[],
    answers: QuestionnaireAnswers | null | undefined
): ProfileMappingResult {
    const updates: ProfileUpdatePatch = {}
    const applied: MappableProfileField[] = []
    const rejected: ProfileMappingResult["rejected"] = []

    if (!answers || typeof answers !== "object") {
        return { updates, applied, rejected }
    }

    for (const question of questions ?? []) {
        const field = resolveProfileField(question)
        if (!field) continue

        // TWO answer shapes exist in the wild and both must work:
        //   1. `{ [questionId]: rawScalar }` — what QuestionnaireForm actually
        //      posts (it does `answers[q.id] = value`).
        //   2. `{ [questionId]: { questionId, value, type, ... } }` — the shape
        //      types/questionnaire.ts declares.
        // Reading only the declared shape would have made this whole mapping a
        // no-op against the real UI.
        const entry =
            (answers as Record<string, unknown>)[question.id] ??
            Object.values(answers).find(
                (a) => a && typeof a === "object" && (a as any).questionId === question.id
            )
        if (entry === undefined || entry === null) continue

        const raw =
            typeof entry === "object" && !Array.isArray(entry) && "value" in (entry as object)
                ? (entry as { value?: unknown }).value
                : entry
        if (raw === undefined || raw === null || raw === "") continue

        const result = validate(field, raw)
        if (!result.ok) {
            rejected.push({ questionId: question.id, field, reason: result.reason })
            continue
        }

        // Last answer wins if two questions target the same field. The cast is
        // safe: `validate` returns the type `PROFILE_FIELD_SPECS[field]` declares,
        // and that table is the same one ProfileUpdatePatch is written from.
        if (!(field in updates)) applied.push(field)
        ;(updates as Record<MappableProfileField, unknown>)[field] = result.value
    }

    return { updates, applied, rejected }
}

/**
 * Union the fields this submission answered into what was already on record.
 *
 * Answering "no, I have no pets" writes `hasPets: false` — the same value the
 * column defaults to. Without a record of the question having been ASKED, the
 * risk engine cannot tell that declaration from silence and leaves the pet risk
 * in `needs_review` no matter how carefully the client filled the form in. This
 * is what makes a completed questionnaire actually move the assessment.
 *
 * Pure so both write paths (the API route and the server action) share one
 * definition instead of each growing their own merge.
 */
export function mergeAnsweredFields(
    existing: unknown,
    applied: MappableProfileField[]
): string[] {
    const previous = Array.isArray(existing)
        ? existing.filter((f): f is string => typeof f === "string")
        : []
    return [...new Set([...previous, ...applied])]
}

/**
 * The canonical risk questions, ready to seed as a system template.
 *
 * Exported so the advisor-facing "Risk Profile" template is defined once and
 * cannot drift from the mapping above.
 */
export const CANONICAL_RISK_QUESTIONS = [
    {
        id: "risk.dependentsCount",
        type: "number" as const,
        label: "How many people depend on your income?",
        labelEl: "Πόσα άτομα εξαρτώνται από το εισόδημά σας;",
        required: true,
        profileField: "dependentsCount",
    },
    {
        id: "risk.employmentStatus",
        type: "select" as const,
        label: "Employment status",
        labelEl: "Εργασιακή κατάσταση",
        required: true,
        profileField: "employmentStatus",
        options: [
            { value: "employed", label: "Employed", labelEl: "Μισθωτός" },
            { value: "self_employed", label: "Self-employed", labelEl: "Ελεύθερος επαγγελματίας" },
            { value: "retired", label: "Retired", labelEl: "Συνταξιούχος" },
            { value: "unemployed", label: "Not working", labelEl: "Χωρίς εργασία" },
            { value: "student", label: "Student", labelEl: "Φοιτητής" },
            { value: "other", label: "Something else", labelEl: "Κάτι άλλο" },
        ],
    },
    {
        id: "risk.ownsHome",
        type: "boolean" as const,
        label: "Do you own your home?",
        labelEl: "Έχετε δική σας κατοικία;",
        required: true,
        profileField: "ownsHome",
    },
    {
        id: "risk.mortgageAmount",
        type: "number" as const,
        label: "Outstanding mortgage balance (€)",
        labelEl: "Υπόλοιπο στεγαστικού δανείου (€)",
        required: false,
        profileField: "mortgageAmount",
    },
    {
        id: "risk.vehiclesCount",
        type: "number" as const,
        label: "How many vehicles do you own?",
        labelEl: "Πόσα οχήματα έχετε;",
        required: true,
        profileField: "vehiclesCount",
    },
    {
        id: "risk.hasLoans",
        type: "boolean" as const,
        label: "Do you have any other loans?",
        labelEl: "Έχετε άλλα δάνεια;",
        required: false,
        profileField: "hasLoans",
    },
    {
        id: "risk.travelsFrequently",
        type: "boolean" as const,
        label: "Do you travel abroad more than twice a year?",
        labelEl: "Ταξιδεύετε στο εξωτερικό πάνω από δύο φορές τον χρόνο;",
        required: false,
        profileField: "travelsFrequently",
    },
    {
        id: "risk.hasPets",
        type: "boolean" as const,
        label: "Do you have pets?",
        labelEl: "Έχετε κατοικίδια;",
        required: false,
        profileField: "hasPets",
    },
    // ── Life Context factors ────────────────────────────────────────────────
    // `residenceType` supersedes the bare `ownsHome` boolean above: "not an
    // owner" and "a tenant" are different risks, and the boolean could only ever
    // express the first. Both are asked so an advisor working from an older
    // template still populates something usable.
    {
        id: "risk.residenceType",
        type: "select" as const,
        label: "Your home is…",
        labelEl: "Η κατοικία σας είναι…",
        required: false,
        profileField: "residenceType",
        options: [
            { value: "owned", label: "Owned by you", labelEl: "Ιδιόκτητη" },
            { value: "rented", label: "Rented", labelEl: "Ενοικιαζόμενη" },
            { value: "family", label: "Family-owned", labelEl: "Οικογενειακή" },
            { value: "company", label: "Provided by employer", labelEl: "Παρέχεται από εργοδότη" },
        ],
    },
    {
        id: "risk.childrenCount",
        type: "number" as const,
        label: "How many children do you have?",
        labelEl: "Πόσα παιδιά έχετε;",
        required: false,
        profileField: "childrenCount",
    },
    {
        id: "risk.propertiesOwned",
        type: "number" as const,
        label: "How many properties do you own?",
        labelEl: "Πόσα ακίνητα σας ανήκουν;",
        required: false,
        profileField: "propertiesOwned",
    },
    {
        id: "risk.rentsOutProperty",
        type: "boolean" as const,
        label: "Do you let out any property to tenants?",
        labelEl: "Εκμισθώνετε κάποιο ακίνητο σε ενοικιαστές;",
        required: false,
        profileField: "rentsOutProperty",
    },
    {
        id: "risk.ownsBoat",
        type: "boolean" as const,
        label: "Do you own a boat?",
        labelEl: "Έχετε σκάφος;",
        required: false,
        profileField: "ownsBoat",
    },
    {
        id: "risk.ownsBusiness",
        type: "boolean" as const,
        label: "Do you own a business?",
        labelEl: "Έχετε δική σας επιχείρηση;",
        required: false,
        profileField: "ownsBusiness",
    },
    {
        id: "risk.businessEmployees",
        type: "number" as const,
        label: "How many people do you employ?",
        labelEl: "Πόσα άτομα απασχολείτε;",
        required: false,
        profileField: "businessEmployees",
    },
    {
        id: "risk.savingsAmount",
        type: "number" as const,
        label: "Roughly how much do you have in savings (€)?",
        labelEl: "Περίπου πόσα έχετε σε αποταμιεύσεις (€);",
        required: false,
        profileField: "savingsAmount",
    },
    {
        id: "risk.valuablesValue",
        type: "number" as const,
        label: "Total value of jewellery, art, instruments or similar (€)",
        labelEl: "Συνολική αξία κοσμημάτων, έργων τέχνης, οργάνων ή παρόμοιων (€)",
        required: false,
        profileField: "valuablesValue",
    },
    {
        id: "risk.retirementPlanning",
        type: "boolean" as const,
        label: "Do you have a private pension or retirement savings plan?",
        labelEl: "Έχετε ιδιωτικό συνταξιοδοτικό ή πρόγραμμα αποταμίευσης;",
        required: false,
        profileField: "retirementPlanning",
    },
]
