/**
 * From one validated screen answer to (a) the FACT columns the risk engine
 * reads and (b) the STATEMENT fields of the protection profile.
 *
 * The split is the needs → coverage → gap separation made structural: a fact
 * («three children») goes to `PolicyholderProfile` and becomes known to the
 * engine through `answeredFields`; a statement («my family is what would hurt
 * most») goes to `ProtectionProfile` and can never reach `assessRisks`.
 *
 * Amounts, dates of birth and health facts are never written here — the
 * screens do not ask for them, and a zero or a guess written into
 * `mortgageAmount` would read as "no debt" to every rule downstream.
 */

import type { ProtectionProfileStepInput } from "@/lib/validations/protection-profile"

export interface ProtectionStatements {
    intent?: string
    riskConcerns?: string[]
    commitments?: string[]
    confidenceLevel?: string
    uncertaintyReasons?: string[]
    recentChanges?: string[]
    futureConsiderations?: string[]
    guidancePreference?: string | null
}

export interface ProtectionPatch {
    /** Typed `PolicyholderProfile` columns to set (never overwriting an answered one). */
    columns: Record<string, unknown>
    /** The columns this answer makes KNOWN — «no» must not read as «never asked». */
    answeredFields: string[]
    statements: ProtectionStatements
    /** The step was answered with «Δεν είμαι σίγουρος/η». */
    unsure: boolean
}

const EMPTY: ProtectionPatch = { columns: {}, answeredFields: [], statements: {}, unsure: false }

const INCOME_TO_EMPLOYMENT: Record<string, string> = {
    employed: "employed",
    self_employed: "self_employed",
    // «Έχω δική μου επιχείρηση»: the engine reads self-employment from
    // employmentStatus and the business from its own flag.
    business: "self_employed",
    retired: "retired",
    not_working: "unemployed",
    student_other: "other",
}

export function protectionProfilePatch(input: ProtectionProfileStepInput): ProtectionPatch {
    switch (input.step) {
        case "intent":
            return { ...EMPTY, statements: { intent: input.intent } }

        case "orientation":
            return EMPTY

        case "people": {
            if (input.unsure) return { ...EMPTY, unsure: true }
            const people = new Set(input.people)
            const children = people.has("children") ? Number(input.childrenCount ?? "1") : 0
            // A FLOOR, exactly as the quick start does: a partner or a parent
            // counts as one dependant each; the wizard refines the number.
            const others = (people.has("partner") ? 1 : 0) + (people.has("parents_or_others") ? 1 : 0)
            return {
                ...EMPTY,
                columns: { childrenCount: children, dependentsCount: children + others },
                answeredFields: ["childrenCount", "dependentsCount"],
            }
        }

        case "home": {
            const owned = input.home === "owned"
            return {
                ...EMPTY,
                columns: {
                    residenceType: input.home,
                    ownsHome: owned,
                    // Owning where you live is one property; the wizard refines the rest.
                    propertiesOwned: owned ? 1 : 0,
                },
                answeredFields: ["residenceType", "ownsHome", "propertiesOwned"],
            }
        }

        case "income": {
            const columns: Record<string, unknown> = {
                employmentStatus: INCOME_TO_EMPLOYMENT[input.income] ?? "other",
            }
            const answeredFields = ["employmentStatus"]
            if (input.income === "business") {
                columns.ownsBusiness = true
                answeredFields.push("ownsBusiness")
            }
            return { ...EMPTY, columns, answeredFields }
        }

        case "obligations": {
            if (input.unsure) return { ...EMPTY, unsure: true }
            const commitments = [...new Set(input.commitments)]
            const hasLoans = commitments.includes("mortgage") || commitments.includes("loan")
            return {
                ...EMPTY,
                // The flag only. An amount would be a guess, and a guessed 0 says "no debt".
                columns: { hasLoans },
                answeredFields: ["hasLoans"],
                statements: { commitments },
            }
        }

        case "mobility":
            return {
                ...EMPTY,
                columns: { vehiclesCount: Number(input.vehicles) },
                answeredFields: ["vehiclesCount"],
            }

        case "hurt_most":
            if (input.unsure) return { ...EMPTY, unsure: true, statements: { riskConcerns: [] } }
            return { ...EMPTY, statements: { riskConcerns: [...input.concerns] } }

        case "changes":
            return { ...EMPTY, statements: { recentChanges: [...new Set(input.changes)] } }

        case "plans":
            return { ...EMPTY, statements: { futureConsiderations: [...new Set(input.plans)] } }

        case "confidence":
            return { ...EMPTY, statements: { confidenceLevel: input.confidence } }

        case "uncertainty_reason":
            return { ...EMPTY, statements: { uncertaintyReasons: [...new Set(input.reasons)] } }

        case "guidance":
            return { ...EMPTY, statements: { guidancePreference: input.guidance } }
    }
}
