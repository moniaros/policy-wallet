/**
 * The vocabulary of the Personal Protection Profile — Layer 1 (NEEDS).
 *
 * Every value here is an enum id the client sends and the server validates;
 * the Greek and English copy for each lives in the i18n dictionary under
 * `onboarding.protectionProfile`, never beside the id. Ids are what analytics
 * sees; copy can be rewritten without touching a single event.
 *
 * Nothing in this file is an insurance category. The screens ask about life —
 * who depends on you, where you live, where your income comes from, what would
 * hurt most — and the mapping to the engine's factors happens in `patch.ts`.
 */

import { EVENT_DOMAINS, type EventDomain } from "@/lib/services/life-events/types"

/** Every screen the flow can show, in authored order. */
export const PROTECTION_STEP_IDS = [
    "intent",
    "orientation",
    "people",
    "home",
    "income",
    "obligations",
    "mobility",
    "hurt_most",
    "changes",
    "plans",
    "confidence",
    "uncertainty_reason",
    "guidance",
    "map",
    "upload",
    "advisor",
] as const
export type ProtectionStepId = (typeof PROTECTION_STEP_IDS)[number]

/**
 * The steps that count toward «Βήμα n από m». Conditional inserts
 * (orientation, plans, uncertainty_reason) and the tail (map, upload, advisor)
 * never change the denominator, so the number a person sees can only go down.
 */
export const COUNTED_STEPS = [
    "intent",
    "people",
    "home",
    "income",
    "obligations",
    "mobility",
    "hurt_most",
    "changes",
    "confidence",
    "guidance",
] as const
export type CountedStepId = (typeof COUNTED_STEPS)[number]

/** «Δεν είμαι σίγουρος/η» as an answer: recorded, never punished. */
export const UNSURE = "unsure" as const

export const INTENT_VALUES = [
    "understand_cover",
    "find_gaps",
    "organise",
    "save_money",
    "life_changed",
    "advisor_suggested",
    "help_me",
] as const
export type IntentValue = (typeof INTENT_VALUES)[number]

export const PEOPLE_VALUES = ["only_me", "partner", "children", "parents_or_others"] as const
export type PeopleValue = (typeof PEOPLE_VALUES)[number]
/** «Πόσα;» — 3 means three or more. */
export const CHILDREN_COUNT_VALUES = ["1", "2", "3"] as const

/** Maps 1:1 onto `residenceType` (`other` is the engine's own value). */
export const HOME_VALUES = ["owned", "rented", "family", "other"] as const
export type HomeValue = (typeof HOME_VALUES)[number]

export const INCOME_VALUES = [
    "employed",
    "self_employed",
    "business",
    "retired",
    "not_working",
    "student_other",
] as const
export type IncomeValue = (typeof INCOME_VALUES)[number]

/** Flags only — an amount is the /protection wizard's job, never asked here. */
export const COMMITMENT_VALUES = ["mortgage", "loan", "rent"] as const
export type CommitmentValue = (typeof COMMITMENT_VALUES)[number]

export const MOBILITY_VALUES = ["0", "1", "2"] as const

/** «Τι θα σε επηρέαζε περισσότερο;» — perceived impact, not exposure. */
export const RISK_CONCERNS = [
    "health",
    "family",
    "income",
    "home",
    "obligation",
    "vehicle",
    "business",
    "other",
] as const
export type RiskConcern = (typeof RISK_CONCERNS)[number]

/**
 * «Άλλαξε κάτι τον τελευταίο χρόνο;» Each chip maps to a life-event registry id
 * or to nothing: a health change is special-category (Art. 9) and stays a flag.
 */
export const LIFE_CHANGE_OPTIONS = [
    { id: "new_child", registry: "birth" },
    { id: "married", registry: "marriage" },
    { id: "separated", registry: "divorce" },
    { id: "bought_home", registry: "property_purchase" },
    { id: "took_mortgage", registry: "mortgage" },
    { id: "started_renting", registry: "renting" },
    { id: "income_changed", registry: "income_increase" },
    { id: "started_business", registry: "business_creation" },
    { id: "retired", registry: "retirement" },
    { id: "new_vehicle", registry: "vehicle_purchase" },
    { id: "health_changed", registry: null },
] as const
export const LIFE_CHANGE_IDS = LIFE_CHANGE_OPTIONS.map((o) => o.id) as unknown as readonly [
    (typeof LIFE_CHANGE_OPTIONS)[number]["id"],
    ...(typeof LIFE_CHANGE_OPTIONS)[number]["id"][],
]
export type LifeChangeId = (typeof LIFE_CHANGE_OPTIONS)[number]["id"]

export const FUTURE_CONSIDERATIONS = [
    "home_purchase",
    "child",
    "business",
    "retirement",
    "move",
    "large_purchase",
    "unknown",
] as const
export type FutureConsideration = (typeof FUTURE_CONSIDERATIONS)[number]

export const CONFIDENCE_LEVELS = ["very", "fairly", "unsure", "gaps", "no_idea"] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]
/** The answers that earn the «τι σε κάνει να μην είσαι σίγουρος/η;» follow-up. */
export const LOW_CONFIDENCE: readonly ConfidenceLevel[] = ["unsure", "gaps", "no_idea"]

export const UNCERTAINTY_REASONS = [
    "dont_know_coverage",
    "never_read",
    "had_to",
    "life_changed",
    "someone_else",
    "other",
] as const
export type UncertaintyReason = (typeof UNCERTAINTY_REASONS)[number]

export const GUIDANCE_PREFERENCES = ["explain_everything", "just_what_matters", "on_my_own"] as const
export type GuidancePreference = (typeof GUIDANCE_PREFERENCES)[number]

/** The "spheres of life" the protection map speaks in — the engine's own. */
export const PRIORITY_DOMAINS = EVENT_DOMAINS
export type PriorityDomain = EventDomain

/**
 * Money has three faces on the map — income, debt, retirement — that a person
 * thinks of separately. The domain stays `money` (life events, labels), the
 * facet keeps the row honest about which one it means.
 */
export const MONEY_FACETS = ["income", "debt", "retirement"] as const
export type MoneyFacet = (typeof MONEY_FACETS)[number]
