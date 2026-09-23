/**
 * The health self-assessment (spec v2 §9.2): a fixed questionnaire and a
 * deterministic point table. Nothing here is a model's output, a diagnosis or
 * medical advice — it is an attention score the person can read against the
 * table below, worded «ενδεικτικό» everywhere it renders, and every
 * recommended check says «ρωτήστε τον γιατρό σας».
 */
export const HEALTH_CONSENT_VERSION = "2026-09"

export const ASSESSMENT_QUESTIONS = [
    { id: "ageBand", options: ["18_29", "30_39", "40_49", "50_59", "60_plus"] },
    { id: "sex", options: ["female", "male", "other"] },
    { id: "smoking", options: ["never", "former", "current"] },
    { id: "activity", options: ["low", "moderate", "high"] },
    { id: "bmiBand", options: ["under", "normal", "over", "obese"] },
    { id: "bloodPressure", options: ["normal", "high", "unknown"] },
    { id: "familyCardio", options: ["no", "yes", "unknown"] },
    { id: "familyDiabetes", options: ["no", "yes", "unknown"] },
    { id: "backPain", options: ["no", "sometimes", "often"] },
] as const

export type QuestionId = (typeof ASSESSMENT_QUESTIONS)[number]["id"]
export type Answers = Partial<Record<QuestionId, string>>
export const CATEGORIES = ["cardiovascular", "metabolic", "musculoskeletal"] as const
export type Category = (typeof CATEGORIES)[number]
export type Band = "low" | "moderate" | "elevated"

export interface CategoryScore {
    category: Category
    /** 0–100, higher = more worth discussing with a doctor. */
    score: number
    band: Band
    /** Preventive-calendar ids worth raising (lib/wellness/preventive.ts). */
    checks: string[]
}

const AGE = { "18_29": 0, "30_39": 1, "40_49": 2, "50_59": 3, "60_plus": 4 } as const

function pts(table: Record<string, number>, value: string | undefined): number {
    return value !== undefined && value in table ? table[value] : 0
}

export function isCompleteAnswers(answers: Answers): boolean {
    return ASSESSMENT_QUESTIONS.every((q) => {
        const v = answers[q.id]
        return typeof v === "string" && (q.options as readonly string[]).includes(v)
    })
}

export function bandFor(score: number): Band {
    if (score < 25) return "low"
    if (score < 50) return "moderate"
    return "elevated"
}

/** The point table, in one place, so a reader can check any score by hand. */
export function scoreAssessment(answers: Answers): CategoryScore[] {
    const age = answers.ageBand !== undefined && answers.ageBand in AGE ? AGE[answers.ageBand as keyof typeof AGE] : 0
    const cardiovascular =
        [0, 8, 18, 28, 38][age] +
        pts({ never: 0, former: 8, current: 25 }, answers.smoking) +
        pts({ high: 0, moderate: 6, low: 14 }, answers.activity) +
        pts({ normal: 0, under: 3, over: 8, obese: 16 }, answers.bmiBand) +
        pts({ no: 0, yes: 12, unknown: 4 }, answers.familyCardio) +
        pts({ normal: 0, high: 20, unknown: 6 }, answers.bloodPressure)
    const metabolic =
        [0, 5, 12, 20, 26][age] +
        pts({ normal: 0, under: 2, over: 14, obese: 28 }, answers.bmiBand) +
        pts({ high: 0, moderate: 6, low: 14 }, answers.activity) +
        pts({ no: 0, yes: 15, unknown: 5 }, answers.familyDiabetes) +
        pts({ never: 0, former: 2, current: 6 }, answers.smoking)
    const musculoskeletal =
        [0, 4, 10, 16, 24][age] +
        pts({ high: 4, moderate: 8, low: 18 }, answers.activity) +
        pts({ normal: 0, under: 4, over: 10, obese: 20 }, answers.bmiBand) +
        pts({ no: 0, sometimes: 15, often: 30 }, answers.backPain)
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
    const cv = clamp(cardiovascular), mb = clamp(metabolic), ms = clamp(musculoskeletal)
    return [
        { category: "cardiovascular", score: cv, band: bandFor(cv), checks: bandFor(cv) === "low" ? ["blood_pressure"] : ["blood_pressure", "lipid_panel"] },
        { category: "metabolic", score: mb, band: bandFor(mb), checks: bandFor(mb) === "low" ? [] : ["glucose"] },
        { category: "musculoskeletal", score: ms, band: bandFor(ms), checks: bandFor(ms) === "elevated" ? ["gp_discussion"] : [] },
    ]
}
