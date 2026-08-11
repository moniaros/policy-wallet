/**
 * Risk DNA — the nine dimensions.
 *
 * Specification: docs/architecture/risk-dna.md
 *
 * **The founding constraint: there is no second composite.** The nine dimensions
 * do not roll up into a "DNA score". The protection score is the only composite
 * this product has, and a second one would immediately disagree with it in front
 * of the customer. The dimensions are lenses, not a scoreboard.
 *
 * That constraint is what makes generous membership safe: a risk can belong to
 * several dimensions for *reading* without being double-counted into any total.
 * Each risk has one `primary` dimension for counting; `secondary` adds context.
 *
 * **Eight dimensions are exposure; Financial Resilience is not.** It answers how
 * much the household could absorb with no cover at all — the denominator, not
 * another numerator, and the only dimension where a high score means needing
 * *less* of what the industry sells. It is the clearest signal the product
 * measures protection rather than opportunity, and the first thing a
 * commercially-minded revision would quietly drop.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

export const RISK_DIMENSIONS = [
    "property",
    "income",
    "family",
    "health",
    "liability",
    "cyber",
    "travel",
    "business",
    "financial_resilience",
] as const
export type RiskDimension = (typeof RISK_DIMENSIONS)[number]

export interface DimensionDefinition {
    id: RiskDimension
    label: Bilingual
    /** What this dimension is measuring, in the customer's terms. */
    question: Bilingual
    /** Risks counted in this dimension's score. */
    primary: string[]
    /** Risks shown under it for context, never counted. */
    secondary: string[]
    /**
     * True for the one dimension that is not an exposure.
     *
     * Resilience has no gap to close and nothing to buy: its suggested actions
     * are all `retain` and `reduce`, and its score is computed from the
     * household's own capacity rather than from cover.
     */
    isCapacity?: boolean
}

export const DIMENSION_DEFINITIONS: DimensionDefinition[] = [
    {
        id: "property",
        label: { en: "Property", el: "Περιουσία" },
        question: {
            en: "If something you own were damaged, destroyed or stolen, who pays?",
            el: "Αν κάτι δικό σας καταστραφεί, υποστεί ζημιά ή κλαπεί, ποιος πληρώνει;",
        },
        primary: [
            "home_building_damage",
            "home_contents_tenant",
            "landlord_letting",
            "valuables_loss",
            "boat_liability",
            // Primary to Property, secondary to Liability: the customer
            // navigates by the asset they own, even though the exposure that
            // bankrupts them is third-party injury.
            "motor_liability",
        ],
        secondary: [],
    },
    {
        id: "income",
        label: { en: "Income", el: "Εισόδημα" },
        question: {
            en: "If your earnings stopped, how long could the household continue?",
            el: "Αν σταματούσαν τα εισοδήματά σας, για πόσο θα συνέχιζε το νοικοκυριό;",
        },
        primary: ["income_interruption", "retirement_shortfall"],
        secondary: ["life_dependents"],
    },
    {
        id: "family",
        label: { en: "Family", el: "Οικογένεια" },
        question: {
            en: "If you were not here, what would the people who depend on you face?",
            el: "Αν δεν ήσασταν εδώ, τι θα αντιμετώπιζαν όσοι εξαρτώνται από εσάς;",
        },
        // `life_debt` is Family, not Property: the loss is that the household
        // has to sell the home, not that the building is damaged. The dimension
        // follows who suffers.
        primary: ["life_dependents", "life_debt"],
        secondary: ["income_interruption", "health_access_delay"],
    },
    {
        id: "health",
        label: { en: "Health", el: "Υγεία" },
        question: {
            en: "When you need care, how fast can you get it and what does it cost you?",
            el: "Όταν χρειαστείτε περίθαλψη, πόσο γρήγορα θα τη λάβετε και τι θα σας κοστίσει;",
        },
        primary: ["health_access_delay", "chronic_condition_costs", "activity_injury"],
        secondary: ["income_interruption"],
    },
    {
        id: "liability",
        label: { en: "Liability", el: "Αστική ευθύνη" },
        question: {
            en: "If you were held responsible for someone else's loss, who pays it?",
            el: "Αν κριθείτε υπεύθυνος για ζημιά τρίτου, ποιος την πληρώνει;",
        },
        primary: [
            "professional_liability",
            "employer_liability",
            "motor_legal_disputes",
            "home_legal_disputes",
            // Personal liability held in the διαχειριστής role — primary rather
            // than secondary because the claim is brought against the person,
            // not the building, and no other cover in the dimension answers it.
            "common_areas_liability",
            "pet_costs",
        ],
        secondary: ["motor_liability", "landlord_letting"],
    },
    {
        id: "cyber",
        label: { en: "Cyber", el: "Ψηφιακοί κίνδυνοι" },
        question: {
            en: "If money were taken from you online, could you get it back?",
            el: "Αν σας αφαιρούσαν χρήματα διαδικτυακά, θα μπορούσατε να τα ανακτήσετε;",
        },
        primary: ["cyber_fraud"],
        secondary: [],
    },
    {
        id: "travel",
        label: { en: "Travel", el: "Ταξίδια" },
        question: {
            en: "Abroad, what happens if you are hurt or something goes wrong?",
            el: "Στο εξωτερικό, τι γίνεται αν τραυματιστείτε ή κάτι πάει στραβά;",
        },
        primary: ["travel_abroad"],
        secondary: ["health_access_delay"],
    },
    {
        id: "business",
        label: { en: "Business", el: "Επιχείρηση" },
        question: {
            en: "If the business stopped trading tomorrow, what would that cost you?",
            el: "Αν η επιχείρηση σταματούσε αύριο, τι θα σας κόστιζε;",
        },
        primary: ["business_assets_interruption"],
        secondary: ["professional_liability", "employer_liability"],
    },
    {
        id: "financial_resilience",
        label: { en: "Financial resilience", el: "Οικονομική αντοχή" },
        question: {
            en: "How much could you absorb yourself, before any insurance is involved?",
            el: "Πόσα θα μπορούσατε να απορροφήσετε μόνοι σας, πριν εμπλακεί οποιαδήποτε ασφάλιση;",
        },
        primary: [],
        secondary: [],
        isCapacity: true,
    },
]

export const DIMENSION_BY_ID = new Map(DIMENSION_DEFINITIONS.map((d) => [d.id, d]))

/**
 * The dimension a risk is counted in.
 *
 * Exactly one, by construction — the mapping is what stops generous secondary
 * membership from double-counting.
 */
export function primaryDimensionOf(riskId: string): RiskDimension | null {
    for (const dimension of DIMENSION_DEFINITIONS) {
        if (dimension.primary.includes(riskId)) return dimension.id
    }
    return null
}

/**
 * A dimension backed by one risk cannot produce a gradient.
 *
 * Cyber, Travel and Business each carry a single primary risk, so their score is
 * effectively binary. The honest response is to render them and say the scale is
 * coarse — merging them into a "Lifestyle" bucket is what the old score category
 * did, and it hid them. The thinness is real information: it says the catalog has
 * one lens on cyber risk, which is true and worth an author noticing.
 */
export function isCoarse(dimension: DimensionDefinition): boolean {
    return !dimension.isCapacity && dimension.primary.length <= 1
}
