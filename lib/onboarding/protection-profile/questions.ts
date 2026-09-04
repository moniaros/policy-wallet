/**
 * Which options each screen offers — VALUES only, filtered by earlier answers
 * so a person who rents is not asked about a mortgage and a person without a
 * car is not asked whether the car would hurt most. Labels come from the
 * dictionary under `onboarding.protectionProfile.q.<step>.options.<value>`.
 */

import {
    CONFIDENCE_LEVELS,
    FUTURE_CONSIDERATIONS,
    GUIDANCE_PREFERENCES,
    HOME_VALUES,
    INCOME_DEPENDENCY_ANSWERS,
    INCOME_VALUES,
    INTENT_VALUES,
    LIFE_CHANGE_OPTIONS,
    MOBILITY_VALUES,
    PEOPLE_VALUES,
    RISK_CONCERNS,
    UNCERTAINTY_REASONS,
} from "@/lib/services/protection-profile/vocabulary"
import type { ProtectionAnswers } from "@/lib/validations/protection-profile"

const has = (a: ProtectionAnswers, step: "obligations", value: string) =>
    a[step]?.commitments?.includes(value as never) ?? false

export function intentOptions(): readonly string[] {
    return INTENT_VALUES
}
export function peopleOptions(): readonly string[] {
    return PEOPLE_VALUES
}
export function homeOptions(): readonly string[] {
    return HOME_VALUES
}
export function incomeOptions(): readonly string[] {
    return INCOME_VALUES
}
export function incomeDependencyOptions(): readonly string[] {
    return INCOME_DEPENDENCY_ANSWERS
}

/** Mortgage only for an owner (or «somewhere else»); rent only for a tenant. */
export function obligationOptions(a: ProtectionAnswers): string[] {
    const home = a.home?.home
    const out: string[] = []
    if (home !== "rented" && home !== "family") out.push("mortgage")
    out.push("loan")
    if (home === "rented") out.push("rent")
    return out
}

export function mobilityOptions(): readonly string[] {
    return MOBILITY_VALUES
}

/** What would hurt most — only things the person has told us they have. */
export function hurtMostOptions(a: ProtectionAnswers): string[] {
    const income = a.income?.income
    const vehicles = a.mobility?.vehicles
    const out: string[] = ["health", "family", "income", "home"]
    if (has(a, "obligations", "mortgage") || has(a, "obligations", "loan") || has(a, "obligations", "rent")) out.push("obligation")
    if (vehicles && vehicles !== "0") out.push("vehicle")
    if (income === "self_employed" || income === "business") out.push("business")
    out.push("other")
    return out.filter((v) => (RISK_CONCERNS as readonly string[]).includes(v))
}

/** Life changes that can be true given what we already know. */
export function changeOptions(a: ProtectionAnswers): string[] {
    const people = a.people?.people ?? []
    const home = a.home?.home
    const income = a.income?.income
    const vehicles = a.mobility?.vehicles
    const unsurePeople = a.people?.unsure === true
    return LIFE_CHANGE_OPTIONS.map((o) => o.id).filter((id) => {
        switch (id) {
            case "new_child":
                return unsurePeople || people.includes("children")
            case "bought_home":
                return home === "owned" || home === "other" || home === undefined
            case "took_mortgage":
                return has(a, "obligations", "mortgage") || a.obligations?.unsure === true || a.obligations === undefined
            case "started_renting":
                return home === "rented" || home === undefined
            case "started_business":
                return income === "self_employed" || income === "business" || income === undefined
            case "retired":
                return income === "retired" || income === undefined
            case "new_vehicle":
                return (vehicles !== undefined && vehicles !== "0") || vehicles === undefined
            default:
                return true
        }
    })
}

export function planOptions(): readonly string[] {
    return FUTURE_CONSIDERATIONS
}
export function confidenceOptions(): readonly string[] {
    return CONFIDENCE_LEVELS
}
export function uncertaintyReasonOptions(): readonly string[] {
    return UNCERTAINTY_REASONS
}
export function guidanceOptions(): readonly string[] {
    return GUIDANCE_PREFERENCES
}

/** The guidance default when the person defers: low confidence → explain. */
export function defaultGuidance(a: ProtectionAnswers): "explain_everything" | "just_what_matters" {
    const intent = a.intent?.intent
    const confidence = a.confidence?.confidence
    if (intent === "help_me") return "explain_everything"
    if (confidence === "unsure" || confidence === "gaps" || confidence === "no_idea") return "explain_everything"
    return "just_what_matters"
}
