import { describe, expect, it } from "vitest"
import { getTranslations } from "@/lib/i18n"
import {
    CONFIDENCE_LEVELS, FUTURE_CONSIDERATIONS, GUIDANCE_PREFERENCES, HOME_VALUES, INCOME_VALUES, INTENT_VALUES,
    LIFE_CHANGE_OPTIONS, MOBILITY_VALUES, PEOPLE_VALUES, RISK_CONCERNS, UNCERTAINTY_REASONS, COMMITMENT_VALUES,
} from "@/lib/services/protection-profile/vocabulary"

const STEPS: Array<[string, readonly string[]]> = [
    ["intent", INTENT_VALUES], ["people", PEOPLE_VALUES], ["home", HOME_VALUES], ["income", INCOME_VALUES],
    ["obligations", COMMITMENT_VALUES], ["mobility", MOBILITY_VALUES], ["hurt_most", RISK_CONCERNS],
    ["changes", LIFE_CHANGE_OPTIONS.map((o) => o.id)], ["plans", FUTURE_CONSIDERATIONS],
    ["confidence", CONFIDENCE_LEVELS], ["uncertainty_reason", UNCERTAINTY_REASONS], ["guidance", GUIDANCE_PREFERENCES],
]

describe("every onboarding value has a label in both languages", () => {
    for (const lang of ["el", "en"] as const) {
        it(lang, () => {
            const q = getTranslations(lang).onboarding.protectionProfile.q as unknown as Record<string, { prompt: string; why: string; options: Record<string, string> }>
            for (const [step, values] of STEPS) {
                expect(q[step]?.prompt, `${step}.prompt`).toBeTruthy()
                expect(q[step]?.why, `${step}.why`).toBeTruthy()
                for (const value of values) expect(q[step]?.options?.[value], `${lang} ${step}.options.${value}`).toBeTruthy()
            }
            const summary = getTranslations(lang).onboarding.protectionProfile.summary
            for (const level of CONFIDENCE_LEVELS) expect((summary.confidence as Record<string, string>)[level], `confidence.${level}`).toBeTruthy()
            for (const importance of ["high", "medium", "watch", "needs_review"]) expect((summary.importance as Record<string, string>)[importance]).toBeTruthy()
        })
    }
})
