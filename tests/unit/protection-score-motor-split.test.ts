/**
 * WP-05 — home and motor are scored separately.
 *
 * They used to share ONE category, "Property & Motor" (weight 20), satisfied by
 * either line of business. So a household that owns a home and a car but
 * insures only the car scored 100% on that category: the protection score told
 * them they were covered while their house was uninsured. The reverse hid a
 * missing motor policy — which in Greece is also the legal minimum for driving.
 *
 * They are different risks, bought from different products, and a score that
 * merges them cannot say which one is missing. Splitting keeps the combined
 * weight at 20 so no other category shifts.
 *
 * Note: 2649 existing tests passed both before and after this change, which is
 * exactly why it needed its own.
 */
import { describe, expect, it } from "vitest"
import {
    SCORE_CATEGORIES,
    calculateProtectionScore,
} from "@/lib/services/gap-engine/protection-score"
import type { ProfileFields } from "@/lib/services/gap-engine/profile-gap-rules"

const BASE: ProfileFields = {
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
} as ProfileFields

const homeAndCar = { ...BASE, ownsHome: true, vehiclesCount: 1 }

describe("protection score — home and motor", () => {
    it("keeps them as separate categories", () => {
        const keys = SCORE_CATEGORIES.map((c) => c.key)
        expect(keys).toContain("property")
        expect(keys).toContain("motor")
    })

    it("preserves the original combined weight, so other categories are unaffected", () => {
        const property = SCORE_CATEGORIES.find((c) => c.key === "property")!
        const motor = SCORE_CATEGORIES.find((c) => c.key === "motor")!
        expect(property.weight + motor.weight).toBe(20)
    })

    it("does NOT mark an uninsured home covered because the car is insured", () => {
        // The exact defect: this used to score the merged category at 100%.
        const result = calculateProtectionScore(homeAndCar, ["motor"], [], 0)

        expect(result.categoryScores.motor.score).toBeGreaterThan(0)
        expect(result.categoryScores.property.score).toBe(0)
    })

    it("does NOT mark an uninsured car covered because the home is insured", () => {
        const result = calculateProtectionScore(homeAndCar, ["home"], [], 0)

        expect(result.categoryScores.property.score).toBeGreaterThan(0)
        expect(result.categoryScores.motor.score).toBe(0)
    })

    it("scores both when both are insured", () => {
        const result = calculateProtectionScore(homeAndCar, ["home", "motor"], [], 0)

        expect(result.categoryScores.property.score).toBeGreaterThan(0)
        expect(result.categoryScores.motor.score).toBeGreaterThan(0)
    })

    it("applies motor only to people who actually have a vehicle", () => {
        const homeOnly = { ...BASE, ownsHome: true }
        const result = calculateProtectionScore(homeOnly, ["home"], [], 0)

        expect(result.applicableCategories).toContain("property")
        expect(result.applicableCategories).not.toContain("motor")
    })

    it("applies home only to people who actually own one", () => {
        const carOnly = { ...BASE, vehiclesCount: 2 }
        const result = calculateProtectionScore(carOnly, ["motor"], [], 0)

        expect(result.applicableCategories).toContain("motor")
        expect(result.applicableCategories).not.toContain("property")
    })

    it("still counts a motorbike as motor cover, via the branch taxonomy", () => {
        // Child branches roll up to their parent; a correctly-insured motorbike
        // must not read as no motor cover at all.
        const result = calculateProtectionScore(
            { ...BASE, vehiclesCount: 1 },
            ["motorbike"],
            [],
            0
        )
        expect(result.categoryScores.motor.score).toBeGreaterThan(0)
    })
})
