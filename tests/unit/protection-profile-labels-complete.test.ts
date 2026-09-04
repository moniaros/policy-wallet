import { describe, expect, it } from "vitest"
import { getTranslations } from "@/lib/i18n"
import {
    CONFIDENCE_LEVELS, FUTURE_CONSIDERATIONS, GUIDANCE_PREFERENCES, HOME_VALUES, INCOME_DEPENDENCY_ANSWERS, INCOME_VALUES, INTENT_VALUES,
    LIFE_CHANGE_OPTIONS, MOBILITY_VALUES, PEOPLE_VALUES, RISK_CONCERNS, UNCERTAINTY_REASONS, COMMITMENT_VALUES,
} from "@/lib/services/protection-profile/vocabulary"
import { ALIGNMENTS, type NextStep } from "@/lib/protection/attention-areas"
import { EVIDENCE_LEVELS } from "@/lib/protection/evidence"
import { CONTEXT_FACTORS } from "@/lib/services/gap-engine/life-context"

const STEPS: Array<[string, readonly string[]]> = [
    ["intent", INTENT_VALUES], ["people", PEOPLE_VALUES], ["home", HOME_VALUES], ["income", INCOME_VALUES],
    ["income_dependency", INCOME_DEPENDENCY_ANSWERS],
    ["obligations", COMMITMENT_VALUES], ["mobility", MOBILITY_VALUES], ["hurt_most", RISK_CONCERNS],
    ["changes", LIFE_CHANGE_OPTIONS.map((o) => o.id)], ["plans", FUTURE_CONSIDERATIONS],
    ["confidence", CONFIDENCE_LEVELS], ["uncertainty_reason", UNCERTAINTY_REASONS], ["guidance", GUIDANCE_PREFERENCES],
]

/** The map's next-step kinds (lib/protection/attention-areas.ts NextStep) — the type is the source; this list must not shrink. */
const NEXT_STEPS: readonly NextStep[] = ["answer_questions", "check_first_policy", "review_finding", "nothing_now"]

describe("every onboarding value has a label in both languages", () => {
    for (const lang of ["el", "en"] as const) {
        it(lang, () => {
            const q = getTranslations(lang).onboarding.protectionProfile.q as unknown as Record<string, { prompt: string; why: string; options: Record<string, string>; discovery?: string }>
            for (const [step, values] of STEPS) {
                expect(q[step]?.prompt, `${step}.prompt`).toBeTruthy()
                expect(q[step]?.why, `${step}.why`).toBeTruthy()
                for (const value of values) expect(q[step]?.options?.[value], `${lang} ${step}.options.${value}`).toBeTruthy()
            }
            // A screen that offers «Δεν είμαι σίγουρος/η» explains what to think about.
            for (const step of ["people", "obligations", "hurt_most", "income_dependency"]) expect(q[step]?.discovery, `${step}.discovery`).toBeTruthy()
            const summary = getTranslations(lang).onboarding.protectionProfile.summary
            for (const level of CONFIDENCE_LEVELS) expect((summary.confidence as Record<string, string>)[level], `confidence.${level}`).toBeTruthy()
            for (const importance of ["high", "medium", "watch", "needs_review"]) expect((summary.importance as Record<string, string>)[importance]).toBeTruthy()
        })
    }
})

describe("the map's singular vocabulary is complete in both languages", () => {
    for (const lang of ["el", "en"] as const) {
        it(lang, () => {
            const map = getTranslations(lang).onboarding.protectionProfile.map
            // The closed alignment vocabulary, every evidence level, every next-step kind.
            for (const a of ALIGNMENTS) expect((map.alignment as Record<string, string>)[a], `map.alignment.${a}`).toBeTruthy()
            expect(Object.keys(map.alignment)).toEqual([...ALIGNMENTS])
            for (const level of EVIDENCE_LEVELS) expect((map.confidence as Record<string, string>)[level], `map.confidence.${level}`).toBeTruthy()
            for (const kind of NEXT_STEPS) expect((map.next as Record<string, string>)[kind], `map.next.${kind}`).toBeTruthy()
            // One singular noun per context factor — the same keys as the assessment's formal nouns.
            for (const factor of CONTEXT_FACTORS) expect((map.factorNoun as Record<string, string>)[factor], `map.factorNoun.${factor}`).toBeTruthy()
            expect(Object.keys(map.factorNoun).sort()).toEqual([...CONTEXT_FACTORS].sort())
            for (const key of ["limitsUnread", "unknownList", "absenceCaveat", "areaCount", "unknownCount", "coveredCount", "whyLabel", "unknownLabel", "nextLabel"]) {
                expect((map as Record<string, unknown>)[key], `map.${key}`).toBeTruthy()
            }
            expect(map.unknownList).toContain("{list}")
            for (const key of ["areaCount", "unknownCount", "coveredCount"] as const) expect(map[key]).toContain("{n}")
        })
    }

    it("the Greek map copy is the singular register — never «σας», «εσάς», «εσείς»", () => {
        const map = getTranslations("el").onboarding.protectionProfile.map
        const leaves: string[] = []
        const visit = (node: unknown) => {
            if (typeof node === "string") leaves.push(node)
            else if (node && typeof node === "object") Object.values(node).forEach(visit)
        }
        visit(map)
        expect(leaves.length).toBeGreaterThan(30)
        // The pronouns and the second-person-plural verb forms the formal
        // nouns use («έχετε», «είστε»); «έχουμε» / «ξέρουμε» are «we» and allowed.
        const offenders = leaves.filter((s) => /(?<![\p{L}])(σας|εσάς|εσείς|έχετε|είστε|βασίζεστε|ανήκετε|απασχολείτε|ταξιδεύετε)(?![\p{L}])/u.test(s))
        expect(offenders, `formal plural inside the onboarding map: ${offenders.join(" | ")}`).toEqual([])
    })
})
