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

    it("the Greek onboarding copy is the singular register — never «σας», «εσάς», «εσείς», «συνδεθήκατε»", () => {
        // The WHOLE stage: questions, map, upload, advisor. The formal plural
        // is the dashboard's voice; one screen that slips («Συνδεθήκατε!»
        // did) breaks the register mid-flow.
        const stage = getTranslations("el").onboarding.protectionProfile
        const leaves: string[] = []
        const visit = (node: unknown) => {
            if (typeof node === "string") leaves.push(node)
            else if (node && typeof node === "object") Object.values(node).forEach(visit)
        }
        visit(stage)
        expect(leaves.length).toBeGreaterThan(200)
        // The pronouns and the second-person-plural verb forms the formal
        // nouns use («έχετε», «είστε»); «έχουμε» / «ξέρουμε» are «we» and allowed.
        const offenders = leaves.filter((s) =>
            /(?<![\p{L}])(σας|εσάς|εσείς|έχετε|είστε|βασίζεστε|ανήκετε|απασχολείτε|ταξιδεύετε|συνδεθήκατε|συνδεθείτε|δείτε|πείτε)(?![\p{L}])/iu.test(s)
        )
        expect(offenders, `formal plural inside the onboarding stage: ${offenders.join(" | ")}`).toEqual([])
        expect(stage.advisor.connected).toBe("Έγινε η σύνδεση")
        expect(stage.advisor.inviteSentBody).toBe("Θα συνδεθείς αυτόματα μόλις ο σύμβουλός σου δεχτεί την πρόσκληση.")
        expect(stage.summary.unsureCount).toBe("{n} σημεία μένουν ανοιχτά — θα τα δούμε μαζί.")
        expect(stage.q.hurt_most.why).toBe("Αυτό ορίζει από πού ξεκινά η εικόνα σου — δεν υπάρχει σωστή απάντηση.")
        expect(stage.q.hurt_most.hint).toMatch(/^Διάλεξε ένα — ή δύο/)
        for (const lang of ["el", "en"] as const) {
            const t = getTranslations(lang).onboarding.protectionProfile
            for (const key of ["title", "nothingYet", "readNoChange", "notOnMap", "beforeLabel", "afterLabel", "cta"] as const) expect(t.summary.afterUpload[key], `${lang} summary.afterUpload.${key}`).toBeTruthy()
            expect(t.summary.unsureCountOne).toBeTruthy()
            expect(t.upload.limitsNeedFullAnalysis).toBeTruthy()
            for (const key of ["expiringSoon", "lapsedOnly"] as const) expect(t.map[key], `${lang} map.${key}`).toBeTruthy()
            // A queued reading is never «ready» on the map either.
            expect(t.summary.afterUpload.nothingYet).not.toMatch(/έτοιμ|ready/i)
        }
    })
})
