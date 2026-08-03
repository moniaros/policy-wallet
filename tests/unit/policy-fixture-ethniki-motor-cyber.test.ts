/**
 * Golden tests on the motor and cyber fixtures extracted live from real
 * Εθνική documents (owner action #4, fifth and sixth branch samples).
 *
 * The motor document is the interesting one for the taxonomy layer: a REAL
 * basic policy whose covered list carries liability + nature perils and
 * genuinely lacks theft and legal protection — the exact profile the branch's
 * documented gaps target. The live run showed the AI clarity pass reporting
 * those gaps itself (motor-theft-fire, motor-legal-protection), which makes
 * the backstop's job DEDUP, not detection: it must recognise the AI's slugs
 * as already covering the same findings and add nothing. That behaviour ran
 * live; these tests pin it against the real slugs so a dedup-stem regression
 * cannot silently double-report gaps on every basic Greek motor policy.
 */
import { describe, expect, it } from "vitest"
import {
    MOTOR_ETHNIKI_2,
    MOTOR_ETHNIKI_2_AI_GAP_SLUGS,
    MOTOR_ETHNIKI_2_COVERED,
} from "../fixtures/motor-ethniki-2"
import { CYBER_ETHNIKI_1, CYBER_ETHNIKI_1_COVERED } from "../fixtures/cyber-ethniki-1"
import { parseDocumentDate } from "@/lib/dates/document-date"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { detectMotorCoverages, detectMotorCoverageGaps } from "@/lib/insurance/motor-coverage-taxonomy"
import { taxonomyBackstopGaps } from "@/lib/services/analysis/taxonomy-gap-backstop"

describe("Εθνική basic motor fixture — golden properties", () => {
    it("parses the extraction dates", () => {
        expect(parseDocumentDate(MOTOR_ETHNIKI_2.startDate!)?.toISOString().slice(0, 10)).toBe("2025-10-06")
        expect(parseDocumentDate(MOTOR_ETHNIKI_2.endDate!)?.toISOString().slice(0, 10)).toBe("2026-10-06")
    })

    it("reads the real covered list correctly", () => {
        const present = detectMotorCoverages(MOTOR_ETHNIKI_2_COVERED)

        expect(present.has("liability")).toBe(true)
        expect(present.has("weather")).toBe(true)
        expect(present.has("uninsured_vehicle")).toBe(true)
        // «Δασική πυρκαγιά» is fire cover in the taxonomy's vocabulary.
        expect(present.has("fire")).toBe(true)
        expect(present.has("theft")).toBe(false)
        expect(present.has("legal")).toBe(false)
    })

    it("finds the two documented gaps of a basic policy", () => {
        const gaps = detectMotorCoverageGaps(MOTOR_ETHNIKI_2_COVERED)

        expect(gaps.map((g) => g.key).sort()).toEqual(["legal", "theft"])
    })

    it("the backstop DEDUPES against the AI's real slugs instead of double-reporting", () => {
        // The live run's exact situation: the AI already reported theft and
        // legal under its own slugs. The taxonomy must recognise them.
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "motor",
            covered: MOTOR_ETHNIKI_2_COVERED,
            notCovered: [],
            existingSlugs: MOTOR_ETHNIKI_2_AI_GAP_SLUGS,
        })

        expect(gaps).toEqual([])
    })

    it("and ADDS them when the AI stays silent — the backstop's whole purpose", () => {
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "motor",
            covered: MOTOR_ETHNIKI_2_COVERED,
            notCovered: [],
            existingSlugs: [],
        })

        expect(gaps.map((g) => g.slug).sort()).toEqual([
            "taxonomy_motor_legal",
            "taxonomy_motor_theft",
        ])
    })

    it("keeps money at money scale", () => {
        // The live run stored 94.069999999999990 in an unconstrained numeric
        // before the (10,2) migration. The fixture carries the printed value.
        expect(MOTOR_ETHNIKI_2.premiumAmount).toBe(94.07)
        expect(Math.round(MOTOR_ETHNIKI_2.premiumAmount! * 100)).toBe(9407)
    })
})

describe("Εθνική personal cyber fixture — golden properties", () => {
    it("normalizes to the cyber branch", () => {
        expect(normalizeBranch(CYBER_ETHNIKI_1.lineOfBusiness!).id).toBe("cyber")
    })

    it("runs a calendar-year term", () => {
        expect(parseDocumentDate(CYBER_ETHNIKI_1.startDate!)?.toISOString().slice(0, 10)).toBe("2026-01-01")
        expect(parseDocumentDate(CYBER_ETHNIKI_1.endDate!)?.toISOString().slice(0, 10)).toBe("2026-12-31")
    })

    it("the backstop stays silent for a branch with no taxonomy", () => {
        expect(
            taxonomyBackstopGaps({
                lineOfBusiness: "cyber",
                covered: CYBER_ETHNIKI_1_COVERED,
                notCovered: [],
                existingSlugs: [],
            })
        ).toEqual([])
    })

    it("carries synthetic identities only", () => {
        for (const fixture of [MOTOR_ETHNIKI_2, CYBER_ETHNIKI_1]) {
            expect(fixture.customerEmail).toMatch(/@example\.com$/)
            expect(fixture.policyNumber).toMatch(/^TEST-/)
        }
    })
})
