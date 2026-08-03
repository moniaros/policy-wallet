import { describe, expect, it } from "vitest"

import {
    calculateProtectionScore,
    type PolicyGapRef,
} from "@/lib/services/gap-engine/protection-score"
import type { ProfileFields } from "@/lib/services/gap-engine/profile-gap-rules"

/**
 * Audit finding F-04.
 *
 * The gap penalty was computed from the GLOBAL gap count but subtracted inside
 * the per-category loop, so one motor gap also deducted from Health, Life and
 * Liability. The category breakdown is the part an advisor reads out to a
 * client, so this pointed them at lines that had nothing wrong with them.
 */

const EMPTY_PROFILE: ProfileFields = {
    maritalStatus: null,
    dependentsCount: 0,
    employmentStatus: null,
    ownsHome: false,
    mortgageAmount: null,
    hasPets: false,
    vehiclesCount: 0,
    dateOfBirth: null,
    annualIncome: null,
    occupation: null,
    riskTolerance: null,
    hasLoans: false,
    loanAmount: null,
    travelsFrequently: false,
    smokingStatus: null,
    lifeEvents: null,
    gender: null,
    heightCm: null,
    weightKg: null,
    chronicConditions: null,
    familyMedicalHistory: null,
    drivingRecord: null,
    activityLevel: null,
}

/** A profile where every category is applicable, so cross-charging is visible. */
const FULL_PROFILE: ProfileFields = {
    ...EMPTY_PROFILE,
    dependentsCount: 2,
    employmentStatus: "self_employed",
    ownsHome: true,
    mortgageAmount: 150_000,
    vehiclesCount: 1,
    hasPets: true,
    travelsFrequently: true,
}

const ALL_LOBS = ["motor", "home", "health", "life", "liability", "travel"]

function motorGaps(n: number): PolicyGapRef[] {
    return Array.from({ length: n }, () => ({ lineOfBusiness: "motor" }))
}

describe("protection score — gap attribution (F-04)", () => {
    it("charges a motor gap to Property & Motor only", () => {
        const result = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            motorGaps(1)
        )

        expect(result.categoryScores.property.score).toBe(95)
        // The categories that used to be dragged down by a motor-only gap.
        expect(result.categoryScores.health.score).toBe(100)
        expect(result.categoryScores.life.score).toBe(100)
        expect(result.categoryScores.liability.score).toBe(100)
        expect(result.categoryScores.income.score).toBe(100)
        expect(result.categoryScores.other.score).toBe(100)
    })

    it("does not let an unrelated gap change the overall score of a full portfolio by more than its own weight", () => {
        const clean = calculateProtectionScore(FULL_PROFILE, ALL_LOBS, [], [])
        const oneMotorGap = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            motorGaps(1)
        )

        expect(clean.overallScore).toBe(100)
        // Property carries weight 20 of 100; a 5-point category hit is a 1-point
        // overall hit. Pre-fix this was 5 points, because all six categories paid.
        expect(clean.overallScore - oneMotorGap.overallScore).toBe(1)
    })

    it("caps the per-category penalty at 20 points", () => {
        const result = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            motorGaps(10)
        )
        expect(result.categoryScores.property.score).toBe(80)
        // Still contained: other categories are untouched no matter how many
        // motor gaps pile up.
        expect(result.categoryScores.health.score).toBe(100)
    })

    it("charges gaps to every category whose lines include the gap's line", () => {
        // 'life' appears in both Life & Income and Income Protection.
        const result = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            [{ lineOfBusiness: "life" }]
        )
        expect(result.categoryScores.life.score).toBe(95)
        expect(result.categoryScores.income.score).toBe(95)
        expect(result.categoryScores.property.score).toBe(100)
    })

    it("resolves child branches to their parent category", () => {
        // Motorbike is a child of motor; pre-normalization it matched nothing.
        const result = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            [{ lineOfBusiness: "motorbike" }]
        )
        expect(result.categoryScores.property.score).toBe(95)
    })

    it("counts an unattributable gap in the total but charges it to nothing", () => {
        const result = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            [{ lineOfBusiness: null }, { lineOfBusiness: "" }]
        )
        expect(result.gapCount).toBe(2)
        expect(result.overallScore).toBe(100)
    })

    it("still accepts a bare count for backwards compatibility", () => {
        const legacy = calculateProtectionScore(FULL_PROFILE, ALL_LOBS, [], 1)
        // The old global behaviour: every applicable category pays.
        expect(legacy.categoryScores.property.score).toBe(95)
        expect(legacy.categoryScores.health.score).toBe(95)
        expect(legacy.gapCount).toBe(1)
    })

    it("reports the same total gapCount whichever input shape is used", () => {
        const withRefs = calculateProtectionScore(
            FULL_PROFILE,
            ALL_LOBS,
            [],
            motorGaps(3)
        )
        const withCount = calculateProtectionScore(FULL_PROFILE, ALL_LOBS, [], 3)
        expect(withRefs.gapCount).toBe(withCount.gapCount)
    })

    it("leaves non-applicable categories marked N/A rather than penalised", () => {
        // Empty profile + a single motor policy: only Health (always applies) and
        // Property (applies because a policy exists) are in the denominator.
        const result = calculateProtectionScore(
            EMPTY_PROFILE,
            ["motor"],
            [],
            motorGaps(1)
        )
        expect(result.categoryScores.life.applicable).toBe(false)
        expect(result.categoryScores.life.score).toBe(-1)
        expect(result.categoryScores.property.score).toBe(95)
    })
})
