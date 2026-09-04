/**
 * Life Context — the customer's actual situation, with knownness attached.
 *
 * The engine's founding rule is that a risk is assessed from the customer's life,
 * never from the absence of a policy. That rule is unenforceable without one
 * distinction the old model could not make: **"we never asked" is not "no".**
 *
 * `PolicyholderProfile` stores `ownsHome`, `hasPets`, `vehiclesCount` and friends
 * with NOT NULL defaults (`false` / `0`), so a profile nobody ever filled in is
 * byte-identical to a profile whose owner answered "no" to everything. The
 * consequences ran both ways: rules silently under-fired for everyone who had not
 * found the wizard, while `buildRiskProfilePrompt` told the model, as fact, that
 * the person owned no home and had no vehicles.
 *
 * So every factor here carries a `known` flag, resolved by `isFactorKnown`:
 *
 *   1. the field is listed in `PolicyholderProfile.answeredFields` — an explicit
 *      record of what the customer was actually asked and answered; or
 *   2. the stored value is non-default (true, > 0, non-null), which can only have
 *      come from an answer.
 *
 * Rule (2) is what makes this backwards compatible: every profile written before
 * `answeredFields` existed keeps exactly the knownness its data implies, with no
 * backfill and no destructive migration. Rule (1) is what lets someone answer
 * "no, I have no pets" and have that count as knowledge.
 *
 * A risk whose deciding factors are unknown resolves to `needs_review`, never to
 * a protection gap — see `risk-assessment.ts`.
 */

import type { PolicyholderProfile } from "@prisma/client"

// ── Factor vocabulary ────────────────────────────────────────────────

/**
 * Every contextual factor the risk catalog may condition on.
 *
 * This is the closed vocabulary: a risk declares the factors it needs by key,
 * and `assessRisks` refuses to call a risk applicable while any of them is
 * unknown. Adding a factor here without adding its `known` resolution below is a
 * type error, which is the point.
 */
export const CONTEXT_FACTORS = [
    "age",
    "maritalStatus",
    "children",
    "dependents",
    "pets",
    "vehicles",
    "residence",
    "tenancy",
    "propertyOwnership",
    "tenants",
    "boat",
    "businessOwnership",
    "selfEmployed",
    "employees",
    "income",
    "savings",
    "mortgage",
    "loans",
    "travelFrequency",
    "hobbies",
    "valuables",
    "cyberExposure",
    "retirementPlanning",
    "health",
    /**
     * Acting as the manager (διαχειριστής) of a block of flats.
     *
     * A distinctly Greek exposure with no analogue in the other factors: the
     * role is unpaid, usually rotates between residents, and carries personal
     * liability for the common areas — lifts, stairwells, the pipework that
     * runs behind them. It is not covered by owning a home, and it applies to
     * tenants as readily as to owners, so no existing factor implies it.
     */
    "buildingManagerRole",
] as const

export type ContextFactorKey = (typeof CONTEXT_FACTORS)[number]

/** Residence arrangement. `owned` and `rented` carry different risks entirely. */
export type ResidenceType = "owned" | "rented" | "family" | "company" | "other"

/** Self-declared digital exposure. */
export type CyberExposureLevel = "low" | "moderate" | "high"

/**
 * How far the household leans on this person's income. A plain fact the
 * importance table reads (PERSONAL_RISK_PROFILE.md §C Layer 1) — deliberately
 * NOT a `CONTEXT_FACTORS` entry: the factor vocabulary is the risk catalogue's
 * own, and a fact that no risk conditions on has no business making a risk
 * `needs_review`.
 */
export const INCOME_DEPENDENCY_VALUES = ["primary", "shared", "minor"] as const
export type IncomeDependency = (typeof INCOME_DEPENDENCY_VALUES)[number]

/**
 * Hobby / sport ids that materially change accident and liability exposure.
 * Kept deliberately short and specific: a vague "sporty" signal is not
 * actionable, and a long taxonomy invites the model to guess.
 */
export const HIGH_RISK_ACTIVITIES = [
    "motorsport",
    "climbing",
    "skiing",
    "diving",
    "aviation",
    "martial_arts",
    "equestrian",
    "sailing",
    "cycling_competitive",
    "hunting",
] as const

export type HighRiskActivity = (typeof HIGH_RISK_ACTIVITIES)[number]

/**
 * Activity ids and their labels, beside the ids they name.
 *
 * The intake wizard held the only copy, so anything server-side — the risk
 * graph included — could render nothing but the raw id: a Greek reader was
 * shown "cycling_competitive" as the thing producing their injury risk.
 */
export const ACTIVITY_LABELS: Record<string, { en: string; el: string }> = {
    motorsport: { en: "Motorsport", el: "Μηχανοκίνητα σπορ" },
    climbing: { en: "Climbing", el: "Αναρρίχηση" },
    skiing: { en: "Skiing", el: "Σκι" },
    diving: { en: "Diving", el: "Καταδύσεις" },
    aviation: { en: "Aviation", el: "Αεροπορικές δραστηριότητες" },
    martial_arts: { en: "Martial arts", el: "Πολεμικές τέχνες" },
    equestrian: { en: "Horse riding", el: "Ιππασία" },
    sailing: { en: "Sailing", el: "Ιστιοπλοΐα" },
    cycling_competitive: { en: "Competitive cycling", el: "Αγωνιστική ποδηλασία" },
    hunting: { en: "Hunting", el: "Κυνήγι" },
}

/**
 * Health condition ids and their labels, in one place.
 *
 * The catalog used to interpolate the raw stored id straight into its copy, so a
 * Greek reader who ticked "Διαβήτης" was told «Έχετε δηλώσει χρόνια πάθηση
 * (diabetes)» — their own answer read back to them in a language they had not
 * used, in the sentence whose entire job is to show we understood them.
 */
export const CONDITION_LABELS: Record<string, { en: string; el: string }> = {
    diabetes: { en: "Diabetes", el: "Διαβήτης" },
    hypertension: { en: "Hypertension", el: "Υπέρταση" },
    heart_disease: { en: "Heart disease", el: "Καρδιοπάθεια" },
    asthma: { en: "Asthma", el: "Άσθμα" },
    cancer: { en: "Cancer", el: "Καρκίνος" },
    mental_health: { en: "Mental health condition", el: "Ψυχική διαταραχή" },
    mental_illness: { en: "Mental illness", el: "Ψυχική ασθένεια" },
    musculoskeletal: { en: "Musculoskeletal", el: "Μυοσκελετικά" },
    stroke: { en: "Stroke", el: "Εγκεφαλικό" },
}

/** Render stored condition ids in the reader's language, unknown ids passed through. */
export function conditionLabels(ids: string[] | null | undefined, lang: "en" | "el"): string {
    return (ids ?? []).map((id) => CONDITION_LABELS[id]?.[lang] ?? id).join(", ")
}

// ── The context ──────────────────────────────────────────────────────

export interface LifeContext {
    // Person
    age: number | null
    maritalStatus: string | null
    childrenCount: number
    dependentsCount: number

    // Household & assets
    residenceType: ResidenceType | null
    propertiesOwned: number
    rentsOutProperty: boolean
    ownsBoat: boolean
    vehiclesCount: number
    hasPets: boolean
    petsCount: number | null
    valuablesValue: number | null

    // Work
    employmentStatus: string | null
    isSelfEmployed: boolean
    occupation: string | null
    ownsBusiness: boolean
    businessEmployees: number

    // Money
    annualIncome: number | null
    /** How far the household leans on this income. Not a factor — see INCOME_DEPENDENCY_VALUES. */
    incomeDependency: IncomeDependency | null
    savingsAmount: number | null
    mortgageAmount: number | null
    loanAmount: number | null

    // Lifestyle
    travelsFrequently: boolean
    /** Acts as the manager of a block of flats — see CONTEXT_FACTORS. */
    isBuildingManager: boolean
    activities: HighRiskActivity[]
    cyberExposure: CyberExposureLevel | null
    retirementPlanning: boolean

    // Health & driving (existing fields, unchanged semantics)
    chronicConditions: string[] | null
    familyMedicalHistory: string[] | null
    drivingRecord: string | null
    smokingStatus: string | null

    /**
     * Lines the customer says they hold OUTSIDE PolicyWallet — bank-assigned
     * borrower cover, an employer group scheme. Audit §2.1/§2.3: the profile
     * state that most strongly triggers the mortgage and home rules is also the
     * state in which a Greek lender has almost certainly already required both
     * covers. Treating "not in the wallet" as "does not exist" manufactures a
     * gap against a policy that exists and is simply held elsewhere.
     */
    coverHeldElsewhere: string[]

    /** Per-factor knownness. Never inferred at the call site — read it. */
    known: Record<ContextFactorKey, boolean>
}

/** Total exposure that a death would leave behind. Used by the life risks. */
export function outstandingDebt(ctx: LifeContext): number {
    return (ctx.mortgageAmount ?? 0) + (ctx.loanAmount ?? 0)
}

/**
 * People financially reliant on this person.
 *
 * The max() this used to be assumed children imply dependency, which is true
 * right up until a child becomes independent — and then it made
 * `child_leaves_home` INERT: decrementing dependants changed nothing while
 * `childrenCount` still stood, so the one event whose whole purpose is to REDUCE
 * cover could never retire the risk it targets. A grown child is still your
 * child; they are not still your dependant.
 *
 * So an explicit dependants answer wins outright. The max() survives only as a
 * fallback for the profile that stated children and never touched dependants,
 * which is the case it was written for.
 */
export function totalDependents(ctx: LifeContext): number {
    if (ctx.known.dependents) return ctx.dependentsCount
    return Math.max(ctx.dependentsCount, ctx.childrenCount)
}

/** Does the customer hold this line somewhere we can't see? */
export function heldElsewhere(ctx: LifeContext, lob: string): boolean {
    const key = lob.toLowerCase()
    return ctx.coverHeldElsewhere.some((l) => l.toLowerCase() === key)
}

// ── Knownness ────────────────────────────────────────────────────────

/**
 * Which profile columns decide each factor. A factor is known when ANY of its
 * columns is known — asking "how many vehicles?" settles the vehicles factor
 * whether the answer is 0 or 3.
 *
 * Exported for the protection composition (lib/protection/attention-areas.ts),
 * which reads each column's provenance to say how sure an area may claim to be,
 * and for the guard that proves every assessment question writes a column the
 * engine actually reads. Read-only elsewhere: the table stays authored here.
 */
export const FACTOR_COLUMNS: Record<ContextFactorKey, string[]> = {
    age: ["dateOfBirth"],
    maritalStatus: ["maritalStatus"],
    children: ["childrenCount"],
    dependents: ["dependentsCount"],
    pets: ["hasPets", "petsCount"],
    vehicles: ["vehiclesCount"],
    residence: ["residenceType", "ownsHome"],
    // Deliberately NOT satisfied by the legacy `ownsHome` boolean. That column
    // can only say owner / not-owner, and "not an owner" is not "tenant" — a
    // person living in a family-owned or employer-provided home is neither. The
    // tenant-contents risk was being dismissed as not-applicable on the strength
    // of an unticked ownership box, which is a conclusion the data cannot carry.
    tenancy: ["residenceType"],
    propertyOwnership: ["propertiesOwned", "ownsHome", "residenceType"],
    tenants: ["rentsOutProperty"],
    boat: ["ownsBoat"],
    businessOwnership: ["ownsBusiness"],
    selfEmployed: ["employmentStatus"],
    employees: ["businessEmployees"],
    income: ["annualIncome"],
    savings: ["savingsAmount"],
    mortgage: ["mortgageAmount", "ownsHome", "residenceType"],
    loans: ["hasLoans", "loanAmount"],
    travelFrequency: ["travelsFrequently"],
    hobbies: ["activities"],
    valuables: ["valuablesValue"],
    cyberExposure: ["cyberExposure"],
    retirementPlanning: ["retirementPlanning"],
    // Art. 9 data, collected only on an explicitly consented surface — so it is
    // routinely unknown, and that must read as unknown. A `null` here means
    // nobody has asked; only an empty array means "I have no chronic condition".
    health: ["chronicConditions"],
    buildingManagerRole: ["isBuildingManager"],
}

/**
 * Columns whose DB default is a real value rather than NULL. For these, a
 * non-default value proves an answer was given; the default proves nothing.
 */
const DEFAULTED_COLUMNS: Record<string, (v: unknown) => boolean> = {
    ownsHome: (v) => v === true,
    hasPets: (v) => v === true,
    hasLoans: (v) => v === true,
    travelsFrequently: (v) => v === true,
    rentsOutProperty: (v) => v === true,
    ownsBoat: (v) => v === true,
    ownsBusiness: (v) => v === true,
    retirementPlanning: (v) => v === true,
    isBuildingManager: (v) => v === true,
    dependentsCount: (v) => typeof v === "number" && v > 0,
    childrenCount: (v) => typeof v === "number" && v > 0,
    vehiclesCount: (v) => typeof v === "number" && v > 0,
    propertiesOwned: (v) => typeof v === "number" && v > 0,
    businessEmployees: (v) => typeof v === "number" && v > 0,
}

/**
 * Is this profile column's value an answer, or just its default?
 *
 * `answered` is the explicit record (`PolicyholderProfile.answeredFields`).
 * Everything else falls back to "a non-default value can only have come from an
 * answer" — which is what keeps every pre-existing profile working unchanged.
 */
export function isColumnKnown(
    profile: Record<string, unknown> | null,
    answered: Set<string>,
    column: string
): boolean {
    if (answered.has(column)) return true
    if (!profile) return false

    const value = profile[column]
    const defaulted = DEFAULTED_COLUMNS[column]
    if (defaulted) return defaulted(value)

    // Nullable column: any non-null value is an answer.
    if (value === null || value === undefined) return false
    if (Array.isArray(value)) return true
    if (typeof value === "string") return value.trim().length > 0
    return true
}

export function isFactorKnown(
    profile: Record<string, unknown> | null,
    answered: Set<string>,
    factor: ContextFactorKey
): boolean {
    return FACTOR_COLUMNS[factor].some((col) => isColumnKnown(profile, answered, col))
}

// ── Construction ─────────────────────────────────────────────────────

function num(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

/** Whole years since `dateOfBirth`, or null. Leap-safe (calendar comparison). */
export function ageFrom(dateOfBirth: Date | null | undefined, now: Date): number | null {
    if (!dateOfBirth) return null
    const dob = new Date(dateOfBirth)
    if (Number.isNaN(dob.getTime())) return null
    let age = now.getUTCFullYear() - dob.getUTCFullYear()
    const monthDiff = now.getUTCMonth() - dob.getUTCMonth()
    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age--
    return age >= 0 && age < 130 ? age : null
}

/**
 * Build a LifeContext from a stored profile.
 *
 * A null profile yields a context in which **every factor is unknown** — not one
 * in which the customer owns nothing. That single change is what stops the
 * engine passing judgement on a person it has never asked a question.
 */
export function toLifeContext(
    profile: PolicyholderProfile | null,
    now: Date = new Date()
): LifeContext {
    const p = (profile ?? null) as Record<string, unknown> | null
    const answered = new Set(stringArray(p?.answeredFields))

    const known = {} as Record<ContextFactorKey, boolean>
    for (const factor of CONTEXT_FACTORS) {
        known[factor] = isFactorKnown(p, answered, factor)
    }

    // Residence: the explicit column wins; otherwise fall back to the legacy
    // boolean, which can only tell us "owned" (its false is ambiguous).
    const storedResidence = typeof p?.residenceType === "string" ? (p.residenceType as ResidenceType) : null
    const residenceType: ResidenceType | null =
        storedResidence ?? (p?.ownsHome === true ? "owned" : null)

    const employmentStatus = (p?.employmentStatus as string | null) ?? null

    return {
        age: ageFrom((p?.dateOfBirth as Date | null) ?? null, now),
        maritalStatus: (p?.maritalStatus as string | null) ?? null,
        childrenCount: num(p?.childrenCount) ?? 0,
        dependentsCount: num(p?.dependentsCount) ?? 0,

        residenceType,
        // An owner with no explicit count still owns the one they live in.
        propertiesOwned:
            num(p?.propertiesOwned) ?? (residenceType === "owned" ? 1 : 0),
        rentsOutProperty: p?.rentsOutProperty === true,
        ownsBoat: p?.ownsBoat === true,
        vehiclesCount: num(p?.vehiclesCount) ?? 0,
        hasPets: p?.hasPets === true,
        petsCount: num(p?.petsCount),
        valuablesValue: num(p?.valuablesValue),

        employmentStatus,
        isSelfEmployed: employmentStatus === "self_employed",
        occupation: (p?.occupation as string | null) ?? null,
        ownsBusiness: p?.ownsBusiness === true,
        businessEmployees: num(p?.businessEmployees) ?? 0,

        annualIncome: num(p?.annualIncome),
        incomeDependency: (INCOME_DEPENDENCY_VALUES as readonly string[]).includes(
            p?.incomeDependency as string
        )
            ? (p!.incomeDependency as IncomeDependency)
            : null,
        savingsAmount: num(p?.savingsAmount),
        mortgageAmount: num(p?.mortgageAmount),
        loanAmount: p?.hasLoans === true || num(p?.loanAmount) ? num(p?.loanAmount) : null,

        travelsFrequently: p?.travelsFrequently === true,
        isBuildingManager: p?.isBuildingManager === true,
        activities: stringArray(p?.activities).filter((a): a is HighRiskActivity =>
            (HIGH_RISK_ACTIVITIES as readonly string[]).includes(a)
        ),
        cyberExposure:
            typeof p?.cyberExposure === "string" ? (p.cyberExposure as CyberExposureLevel) : null,
        retirementPlanning: p?.retirementPlanning === true,

        chronicConditions: Array.isArray(p?.chronicConditions) ? stringArray(p.chronicConditions) : null,
        familyMedicalHistory: Array.isArray(p?.familyMedicalHistory)
            ? stringArray(p.familyMedicalHistory)
            : null,
        drivingRecord: (p?.drivingRecord as string | null) ?? null,
        smokingStatus: (p?.smokingStatus as string | null) ?? null,

        coverHeldElsewhere: stringArray(p?.coverHeldElsewhere),

        known,
    }
}

/**
 * How much of the life context we actually know, 0-100.
 *
 * Replaces the old two-section weighting, which measured how many COLUMNS were
 * non-null — and therefore counted a defaulted `false` as filled in. This counts
 * factors the customer has genuinely answered, so the number means "how much of
 * your situation do we know", which is what the UI claims it means.
 */
export function contextCompleteness(ctx: LifeContext): number {
    const answered = CONTEXT_FACTORS.filter((f) => ctx.known[f]).length
    return Math.round((answered / CONTEXT_FACTORS.length) * 100)
}

/** Factors still unanswered, in catalog order — drives the "tell us more" prompts. */
export function unknownFactors(ctx: LifeContext): ContextFactorKey[] {
    return CONTEXT_FACTORS.filter((f) => !ctx.known[f])
}
