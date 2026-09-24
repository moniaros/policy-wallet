import type { CategoryScore } from "@/lib/wellness/scoring"

/**
 * Prevention brief P2 — what a health share may carry. A FROZEN snapshot,
 * built here and nowhere else, so the minimisation is one reviewable list:
 *   - assessment: the category scores and bands and the date — never the
 *     raw answers, never the «checks»;
 *   - profile: smoking, activity, conditions, family history and a BMI BAND —
 *     never raw height or weight, never date of birth or gender.
 */
export const HEALTH_SHARE_CONSENT_VERSION = "2026-09"
export type ShareScope = "assessment" | "profile" | "both"

export interface HealthSnapshot {
    assessment?: { takenAt: string; scores: Array<{ category: string; score: number; band: string }> }
    profile?: {
        smokingStatus: string | null
        activityLevel: string | null
        chronicConditions: string[]
        familyMedicalHistory: string[]
        bmiBand: BmiBand | null
    }
}

export type BmiBand = "under" | "normal" | "over" | "obese"

export function bmiBand(heightCm: number | null | undefined, weightKg: number | null | undefined): BmiBand | null {
    if (!heightCm || !weightKg || heightCm < 50 || weightKg < 10) return null
    const bmi = weightKg / (heightCm / 100) ** 2
    return bmi < 18.5 ? "under" : bmi < 25 ? "normal" : bmi < 30 ? "over" : "obese"
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

export function buildHealthSnapshot(
    scope: ShareScope,
    assessment: { scores: CategoryScore[]; createdAt: Date } | null,
    profile: { smokingStatus?: string | null; activityLevel?: string | null; chronicConditions?: unknown; familyMedicalHistory?: unknown; heightCm?: number | null; weightKg?: number | null } | null
): HealthSnapshot {
    const out: HealthSnapshot = {}
    if ((scope === "assessment" || scope === "both") && assessment) {
        out.assessment = {
            takenAt: assessment.createdAt.toISOString(),
            scores: assessment.scores.map((s) => ({ category: s.category, score: s.score, band: s.band })),
        }
    }
    if ((scope === "profile" || scope === "both") && profile) {
        out.profile = {
            smokingStatus: profile.smokingStatus ?? null,
            activityLevel: profile.activityLevel ?? null,
            chronicConditions: strings(profile.chronicConditions),
            familyMedicalHistory: strings(profile.familyMedicalHistory),
            bmiBand: bmiBand(profile.heightCm, profile.weightKg),
        }
    }
    return out
}
