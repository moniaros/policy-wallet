import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { detectProfileGaps, type ProfileFields, type PolicyFields } from '@/lib/services/gap-engine/profile-gap-rules'
import { calculateProtectionScore } from '@/lib/services/gap-engine/protection-score'
import { getBranchFamily } from '@/lib/insurance/taxonomy'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const profile = (over: Partial<ProfileFields> = {}): ProfileFields => ({
    maritalStatus: null,
    dependentsCount: 0,
    employmentStatus: 'employed',
    ownsHome: false,
    mortgageAmount: null,
    hasPets: false,
    vehiclesCount: 0,
    annualIncome: null,
    travelFrequency: null,
    hasChronicConditions: false,
    familyMedicalHistory: null,
    drivingRecord: null,
    outstandingLoans: null,
    ...(over as any),
} as ProfileFields)

/**
 * The taxonomy models motorbike and truck as children of motor, renters as a
 * child of home ("child branches aggregate under their parent"), and
 * portfolio-rules already treats motor and motorbike as one family.
 *
 * The profile rules matched the line-of-business id exactly. So a correctly
 * insured motorbike did not satisfy `hasActiveLine(policies, "motor")`, and
 * `vehicles_no_motor` — severity CRITICAL — told its owner they had a vehicle
 * with no insurance and that insurance is compulsory in Greece. Being wrongly
 * accused of driving uninsured is the most alarming thing this product can say
 * to someone, and it was saying it to people who had done everything right.
 */
describe('a child branch is cover in its parent line', () => {
    const rider: PolicyFields[] = [{ lineOfBusiness: 'motorbike', status: 'active' }]

    it('the taxonomy says so', () => {
        expect(getBranchFamily('motor')).toContain('motorbike')
        expect(getBranchFamily('motor')).toContain('truck')
        expect(getBranchFamily('home')).toContain('renters')
    })

    it('an insured motorbike does not raise the uninsured-vehicle gap', () => {
        const gaps = detectProfileGaps(profile({ vehiclesCount: 1 }), rider)
        expect(gaps.map((g) => g.ruleId)).not.toContain('vehicles_no_motor')
    })

    it('an insured truck does not either', () => {
        const gaps = detectProfileGaps(profile({ vehiclesCount: 1 }), [
            { lineOfBusiness: 'truck', status: 'active' },
        ])
        expect(gaps.map((g) => g.ruleId)).not.toContain('vehicles_no_motor')
    })

    it('but a genuinely uninsured vehicle still does', () => {
        const gaps = detectProfileGaps(profile({ vehiclesCount: 1 }), [])
        expect(gaps.map((g) => g.ruleId)).toContain('vehicles_no_motor')
    })

    it('and a LAPSED motorbike policy still does', () => {
        const gaps = detectProfileGaps(profile({ vehiclesCount: 1 }), [
            { lineOfBusiness: 'motorbike', status: 'expired' },
        ])
        expect(gaps.map((g) => g.ruleId)).toContain('vehicles_no_motor')
    })

    it('scores a motorbike as motor cover, like a car', () => {
        // Asserted against `motor`, not `property`. Splitting Property & Motor
        // into two categories left the old assertion comparing property 0 to
        // property 0 — true, and no longer evidence of anything.
        const bike = calculateProtectionScore(profile({ vehiclesCount: 1 }), ['motorbike'], [], 0)
        const car = calculateProtectionScore(profile({ vehiclesCount: 1 }), ['motor'], [], 0)
        expect(bike.categoryScores.motor.score).toBe(car.categoryScores.motor.score)
        expect(bike.categoryScores.motor.score).toBeGreaterThan(0)
        expect(bike.overallScore).toBe(car.overallScore)
    })

    it('scores a rented home as property cover, like an owned one', () => {
        const renter = calculateProtectionScore(profile(), ['renters'], [], 0)
        const owner = calculateProtectionScore(profile(), ['home'], [], 0)
        expect(renter.categoryScores.property.score).toBe(owner.categoryScores.property.score)
        expect(renter.categoryScores.property.score).toBeGreaterThan(0)
    })
})

/**
 * ai/prompts.ts forbids the model from telling anyone what they "should" buy,
 * because insurance advice is regulated in Greece (IDD, Law 4583/2018). The
 * deterministic rules were not held to the same line.
 */
describe('the deterministic rules meet the standard the model is held to', () => {
    const RULES = strip(readFileSync('lib/services/gap-engine/profile-gap-rules.ts', 'utf-8'))

    it('recommends nothing', () => {
        expect(RULES).not.toMatch(/strongly recommended|συνιστάται/)
    })

    it('is precise about what Greek law actually compels', () => {
        // Third-party liability is compulsory; motor cover in general is not.
        expect(RULES).toMatch(/Third-party liability cover is compulsory/)
        expect(RULES).toMatch(/ασφάλιση αστικής ευθύνης είναι υποχρεωτική/)
        expect(RULES).not.toMatch(/Motor insurance is legally mandatory/)
    })
})
