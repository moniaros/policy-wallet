/**
 * The public needs check — a stepped questionnaire covering every branch the
 * risk engine reasons about.
 *
 * WHY THIS EXISTS. Every route into PolicyWallet used to begin with "upload a
 * policy PDF". That is a high-friction first move for someone who has not yet
 * decided the product is worth anything, and it is the one thing they cannot do
 * from a phone on a bus. This asks instead for facts they already know.
 *
 * WHY IT WRITES TO PolicyholderProfile. The obvious build is a new table of
 * "leads" with its own columns and its own meaning — a second description of
 * the same person, drifting away from the first. Every question here maps to a
 * field `PolicyholderProfile` already holds and the gap engine already reads,
 * so the answers a visitor gives before signing up are the same declarations
 * they would have made inside the product. On the first authenticated load they
 * are PATCHed to `/api/v1/risk-profile`, which re-runs the engine. No new table,
 * no new endpoint, no second vocabulary.
 *
 * WHY STEPS. Sixteen questions on one screen is a form; five short steps is a
 * conversation, and each step is one area of a life — home, family, moving
 * around, work, everything else. The step boundaries are also what make the
 * coverage honest: the visitor can see they were asked about boats and
 * businesses, so a result that says nothing about them means "not applicable"
 * rather than "never asked".
 *
 * WHAT IT DELIBERATELY DOES NOT ASK. No health condition, no smoking status, no
 * income figure, no date of birth. Those live in the authenticated wizard and
 * several are GDPR Art. 9 special-category data; collecting them from an
 * anonymous visitor into browser storage, before any account exists to attach
 * consent to, is not a trade worth making for a marketing page.
 */

import { HIGH_RISK_ACTIVITIES, ACTIVITY_LABELS } from "@/lib/services/gap-engine/life-context"

export type Bilingual = { el: string; en: string }

/** Multi-select exposures. An empty list is the answer "none of these". */
export const EXPOSURE_IDS = [
    "pets",
    "boat",
    "business",
    "travel",
    "buildingManager",
    "rentsOut",
    "valuables",
] as const
export type ExposureId = (typeof EXPOSURE_IDS)[number]

/** Cover the visitor says they already hold somewhere else. */
export const HELD_IDS = ["health", "life", "motor", "home", "pension", "legal_expenses"] as const
export type HeldId = (typeof HELD_IDS)[number]

export interface NeedsAnswers {
    // Step 1 — home
    residence?: "owned" | "rented" | "family"
    properties?: number
    // Step 2 — family
    marital?: "single" | "married" | "partnered" | "divorced" | "widowed"
    children?: number
    // Step 3 — getting around
    vehicles?: number
    // Step 4 — work and money
    work?: "employed" | "self_employed" | "retired" | "unemployed"
    loan?: boolean
    retirement?: boolean
    // Step 5 — the rest of life
    exposures?: ExposureId[]
    activities?: string[]
    cyber?: "low" | "moderate" | "high"
    // Step 6 — what they already hold
    held?: HeldId[]
}

export interface NeedsChoice {
    value: string | number | boolean
    label: Bilingual
}

export interface NeedsQuestion {
    id: keyof NeedsAnswers
    prompt: Bilingual
    hint?: Bilingual
    choices: ReadonlyArray<NeedsChoice>
    kind: "single" | "multi"
}

export interface NeedsStep {
    id: string
    title: Bilingual
    /** One line telling the visitor why this step is being asked. */
    intro: Bilingual
    questions: readonly NeedsQuestion[]
}

const YES: Bilingual = { el: "Ναι", en: "Yes" }
const NO: Bilingual = { el: "Όχι", en: "No" }
const NONE: Bilingual = { el: "Κανένα", en: "None" }

export const NEEDS_STEPS: readonly NeedsStep[] = [
    {
        id: "home",
        title: { el: "Το σπίτι σας", en: "Your home" },
        intro: {
            el: "Η κατοικία είναι ο μεγαλύτερος κίνδυνος των περισσότερων νοικοκυριών — και ο πιο παρεξηγημένος στην Ελλάδα.",
            en: "The home is most households' largest risk — and the most misunderstood one in Greece.",
        },
        questions: [
            {
                id: "residence",
                kind: "single",
                prompt: { el: "Πού μένετε;", en: "Where do you live?" },
                choices: [
                    { value: "owned", label: { el: "Σε δικό μου σπίτι", en: "In a home I own" } },
                    { value: "rented", label: { el: "Σε νοικιασμένο", en: "In a rented home" } },
                    { value: "family", label: { el: "Σε σπίτι της οικογένειας", en: "In a family home" } },
                ],
            },
            {
                id: "properties",
                kind: "single",
                prompt: { el: "Πόσα ακίνητα έχετε στο όνομά σας;", en: "How many properties are in your name?" },
                choices: [
                    { value: 0, label: NONE },
                    { value: 1, label: { el: "Ένα", en: "One" } },
                    { value: 2, label: { el: "Δύο", en: "Two" } },
                    { value: 3, label: { el: "Τρία ή περισσότερα", en: "Three or more" } },
                ],
            },
        ],
    },
    {
        id: "family",
        title: { el: "Η οικογένειά σας", en: "Your family" },
        intro: {
            el: "Ποιος βασίζεται στο εισόδημά σας — αυτό αλλάζει ποιες καλύψεις έχουν νόημα.",
            en: "Who depends on your income — this changes which covers make sense.",
        },
        questions: [
            {
                id: "marital",
                kind: "single",
                prompt: { el: "Ποια είναι η οικογενειακή σας κατάσταση;", en: "What is your family situation?" },
                choices: [
                    { value: "single", label: { el: "Άγαμος/η", en: "Single" } },
                    { value: "married", label: { el: "Έγγαμος/η", en: "Married" } },
                    { value: "partnered", label: { el: "Σε συμβίωση", en: "In a partnership" } },
                    { value: "divorced", label: { el: "Διαζευγμένος/η", en: "Divorced" } },
                    { value: "widowed", label: { el: "Χήρος/α", en: "Widowed" } },
                ],
            },
            {
                id: "children",
                kind: "single",
                prompt: { el: "Υπάρχουν παιδιά ή άλλα εξαρτώμενα άτομα;", en: "Are there children or other dependents?" },
                choices: [
                    { value: 0, label: NONE },
                    { value: 1, label: { el: "Ένα", en: "One" } },
                    { value: 2, label: { el: "Δύο", en: "Two" } },
                    { value: 3, label: { el: "Τρία ή περισσότερα", en: "Three or more" } },
                ],
            },
        ],
    },
    {
        id: "moving",
        title: { el: "Πώς μετακινείστε", en: "How you get around" },
        intro: {
            el: "Οχήματα και σκάφη έχουν υποχρεωτικές καλύψεις — και προαιρετικές που οι περισσότεροι δεν ξέρουν ότι δεν έχουν.",
            en: "Vehicles and boats have compulsory covers — and optional ones most people do not know they lack.",
        },
        questions: [
            {
                id: "vehicles",
                kind: "single",
                prompt: { el: "Πόσα οχήματα έχετε;", en: "How many vehicles do you have?" },
                hint: {
                    el: "Αυτοκίνητα και μοτοσυκλέτες μαζί.",
                    en: "Cars and motorbikes together.",
                },
                choices: [
                    { value: 0, label: NONE },
                    { value: 1, label: { el: "Ένα", en: "One" } },
                    { value: 2, label: { el: "Δύο", en: "Two" } },
                    { value: 3, label: { el: "Τρία ή περισσότερα", en: "Three or more" } },
                ],
            },
        ],
    },
    {
        id: "work",
        title: { el: "Δουλειά και υποχρεώσεις", en: "Work and commitments" },
        intro: {
            el: "Αν σταματήσει το εισόδημα, τι συνεχίζει να τρέχει; Εκεί κρίνονται οι καλύψεις εισοδήματος και δανείου.",
            en: "If the income stops, what keeps running? That is what income and loan covers turn on.",
        },
        questions: [
            {
                id: "work",
                kind: "single",
                prompt: { el: "Πώς εργάζεστε;", en: "How do you work?" },
                choices: [
                    { value: "employed", label: { el: "Μισθωτός", en: "Employed" } },
                    { value: "self_employed", label: { el: "Ελεύθερος επαγγελματίας", en: "Self-employed" } },
                    { value: "retired", label: { el: "Συνταξιούχος", en: "Retired" } },
                    { value: "unemployed", label: { el: "Χωρίς εργασία τώρα", en: "Not working right now" } },
                ],
            },
            {
                id: "loan",
                kind: "single",
                prompt: { el: "Έχετε δάνειο σε εξέλιξη;", en: "Do you have a loan running?" },
                hint: { el: "Στεγαστικό, καταναλωτικό ή επαγγελματικό.", en: "Mortgage, consumer or business." },
                choices: [
                    { value: true, label: YES },
                    { value: false, label: NO },
                ],
            },
            {
                id: "retirement",
                kind: "single",
                prompt: { el: "Αποταμιεύετε για τη σύνταξή σας;", en: "Are you saving for your retirement?" },
                choices: [
                    { value: true, label: YES },
                    { value: false, label: { el: "Όχι ακόμη", en: "Not yet" } },
                ],
            },
        ],
    },
    {
        id: "life",
        title: { el: "Η υπόλοιπη ζωή σας", en: "The rest of your life" },
        intro: {
            el: "Τα υπόλοιπα που δημιουργούν κίνδυνο. Διαλέξτε όσα ισχύουν — αν δεν ισχύει κανένα, προχωρήστε.",
            en: "The rest of what creates risk. Pick any that apply — if none do, carry on.",
        },
        questions: [
            {
                id: "exposures",
                kind: "multi",
                prompt: { el: "Ισχύει κάτι από αυτά;", en: "Do any of these apply?" },
                choices: [
                    { value: "pets", label: { el: "Έχω κατοικίδιο", en: "I have a pet" } },
                    { value: "travel", label: { el: "Ταξιδεύω συχνά", en: "I travel often" } },
                    { value: "business", label: { el: "Έχω επιχείρηση", en: "I own a business" } },
                    { value: "boat", label: { el: "Έχω σκάφος", en: "I own a boat" } },
                    { value: "rentsOut", label: { el: "Νοικιάζω ακίνητο σε άλλους", en: "I rent out a property" } },
                    { value: "buildingManager", label: { el: "Είμαι διαχειριστής πολυκατοικίας", en: "I manage a block of flats" } },
                    { value: "valuables", label: { el: "Έχω τιμαλφή ή έργα τέχνης", en: "I own valuables or artwork" } },
                ],
            },
            {
                id: "activities",
                kind: "multi",
                prompt: { el: "Ασχολείστε με κάποιο από αυτά;", en: "Do you take part in any of these?" },
                hint: {
                    el: "Πολλά ασφαλιστήρια ζωής και υγείας τα εξαιρούν ρητά.",
                    en: "Many life and health policies exclude these by name.",
                },
                choices: HIGH_RISK_ACTIVITIES.map((value) => ({
                    value,
                    label: ACTIVITY_LABELS[value] ?? { el: value, en: value },
                })),
            },
            {
                id: "cyber",
                kind: "single",
                prompt: { el: "Πόσο ζείτε online;", en: "How much of your life is online?" },
                hint: {
                    el: "Τραπεζικές συναλλαγές, αγορές και προσωπικά δεδομένα στο κινητό.",
                    en: "Banking, shopping and personal data on your phone.",
                },
                choices: [
                    { value: "low", label: { el: "Ελάχιστα", en: "Barely" } },
                    { value: "moderate", label: { el: "Όσο οι περισσότεροι", en: "About average" } },
                    { value: "high", label: { el: "Σχεδόν τα πάντα", en: "Almost everything" } },
                ],
            },
        ],
    },
    {
        id: "held",
        title: { el: "Τι έχετε ήδη", en: "What you already hold" },
        intro: {
            el: "Για να μη σας πούμε ότι σας λείπει κάτι που ήδη έχετε — ακόμη κι αν δεν το πήρατε από εμάς.",
            en: "So we do not tell you something is missing when you already have it — even if you did not get it from us.",
        },
        questions: [
            {
                id: "held",
                kind: "multi",
                prompt: { el: "Ποιες από αυτές τις καλύψεις έχετε ήδη;", en: "Which of these do you already have?" },
                hint: {
                    el: "Μετράει και ό,τι σας έδωσε η δουλειά σας ή όρισε η τράπεζα.",
                    en: "Cover your employer gave you or the bank arranged counts too.",
                },
                choices: [
                    { value: "health", label: { el: "Υγείας", en: "Health" } },
                    { value: "life", label: { el: "Ζωής", en: "Life" } },
                    { value: "motor", label: { el: "Οχήματος", en: "Motor" } },
                    { value: "home", label: { el: "Κατοικίας", en: "Home" } },
                    { value: "pension", label: { el: "Συνταξιοδοτικό", en: "Pension" } },
                    { value: "legal_expenses", label: { el: "Νομικής προστασίας", en: "Legal expenses" } },
                ],
            },
        ],
    },
] as const

/** Flat list, for anything that does not care about the step boundaries. */
export const NEEDS_QUESTIONS: readonly NeedsQuestion[] = NEEDS_STEPS.flatMap((s) => s.questions)

/** A step is done when every question in it has an answer. */
export function isStepComplete(step: NeedsStep, a: NeedsAnswers): boolean {
    return step.questions.every((q) =>
        q.kind === "multi"
            ? Array.isArray(a[q.id as keyof NeedsAnswers])
            : a[q.id as keyof NeedsAnswers] !== undefined,
    )
}

export function isComplete(a: NeedsAnswers): boolean {
    return NEEDS_STEPS.every((step) => isStepComplete(step, a))
}

/**
 * The answers as the risk engine's own vocabulary.
 *
 * Returns exactly what `PATCH /api/v1/risk-profile` accepts, so the claim step
 * is a single fetch with no translation layer in between.
 */
export function toRiskProfilePayload(a: NeedsAnswers): {
    payload: Record<string, unknown>
    answeredFields: string[]
} {
    const ex = new Set(a.exposures ?? [])

    const payload: Record<string, unknown> = {
        residenceType: a.residence,
        ownsHome: a.residence === "owned",
        propertiesOwned: a.properties,
        maritalStatus: a.marital,
        childrenCount: a.children,
        // A child is a dependent. The engine reads both, and leaving
        // dependentsCount at its 0 default while childrenCount says two would
        // have the profile contradict itself.
        dependentsCount: a.children,
        vehiclesCount: a.vehicles,
        employmentStatus: a.work,
        hasLoans: a.loan,
        retirementPlanning: a.retirement,
        hasPets: ex.has("pets"),
        travelsFrequently: ex.has("travel"),
        ownsBusiness: ex.has("business"),
        ownsBoat: ex.has("boat"),
        rentsOutProperty: ex.has("rentsOut"),
        isBuildingManager: ex.has("buildingManager"),
        activities: a.activities,
        cyberExposure: a.cyber,
        coverHeldElsewhere: a.held,
    }

    for (const key of Object.keys(payload)) {
        if (payload[key] === undefined) delete payload[key]
    }

    /**
     * Everything this form writes is answered by definition.
     *
     * There are no text or select-with-empty-state controls here — every
     * question is a required choice and a multi-select's empty list is the real
     * answer "none of these". That is a stronger guarantee than the
     * authenticated wizard can make, which is why this list is built from the
     * payload rather than reusing `answeredFieldsFrom`: that helper exists to
     * separate a rendered-but-skipped control from an answered one, and this
     * form has no skippable controls to separate.
     */
    return { payload, answeredFields: Object.keys(payload) }
}
