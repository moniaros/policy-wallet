import { describe, it, expect } from "vitest"
import type { PolicyMetadata } from "@/lib/services/ai/ai-service.interface"
import {
    HEALTH_ETHNIKI_1,
    HEALTH_ETHNIKI_1_METADATA,
} from "../fixtures/health-ethniki-1"

// ── A. AIPolicyExtractionResponse shape ───────────────────────────────────────

describe("HEALTH_ETHNIKI_1 fixture — AIPolicyExtractionResponse shape", () => {
    it("has all six required fields with correct types", () => {
        expect(typeof HEALTH_ETHNIKI_1.insurerName).toBe("string")
        expect(typeof HEALTH_ETHNIKI_1.policyNumber).toBe("string")
        expect(typeof HEALTH_ETHNIKI_1.lineOfBusiness).toBe("string")
        expect(typeof HEALTH_ETHNIKI_1.startDate).toBe("string")
        expect(typeof HEALTH_ETHNIKI_1.endDate).toBe("string")
        expect(typeof HEALTH_ETHNIKI_1.premiumAmount).toBe("number")
        expect(typeof HEALTH_ETHNIKI_1.coverageSummary).toBe("string")
    })

    it("carries correct identification data from the PDF", () => {
        expect(HEALTH_ETHNIKI_1).toMatchObject({
            insurerName: "Η ΕΘΝΙΚΗ",
            policyNumber: "1651622",
            lineOfBusiness: "health",
        })
    })

    it("carries correct policyholder PII", () => {
        expect(HEALTH_ETHNIKI_1).toMatchObject({
            customerName: "ΑΡΤΕΜΙΣ",
            customerSurname: "ΚΟΚΚΑΛΙΑ",
            customerEmail: "artemiskohas@gmail.com",
        })
    })

    it("stores dates as ISO strings (not Date objects)", () => {
        expect(HEALTH_ETHNIKI_1.startDate).toBe("2024-05-22")
        expect(HEALTH_ETHNIKI_1.endDate).toBe("2025-05-22")
    })

    it("stores total annual premium as a number", () => {
        // 812.66 + 134.00 + 77.00 + 22.61 + 92.00 = 1138.27
        expect(HEALTH_ETHNIKI_1.premiumAmount).toBe(1138.27)
    })

    it("has extractionMeta with confidence in valid range", () => {
        const meta = HEALTH_ETHNIKI_1.extractionMeta!
        expect(meta.overallConfidence).toBeGreaterThanOrEqual(0)
        expect(meta.overallConfidence).toBeLessThanOrEqual(100)
    })

    it("extractionMeta.requiresReview is false for a high-confidence extraction", () => {
        expect(HEALTH_ETHNIKI_1.extractionMeta!.requiresReview).toBe(false)
    })

    it("extractionMeta.missingCriticalFields is empty for a complete extraction", () => {
        expect(HEALTH_ETHNIKI_1.extractionMeta!.missingCriticalFields).toHaveLength(0)
    })

    it("has at least one exclusion entry", () => {
        expect(HEALTH_ETHNIKI_1.exclusions).toBeDefined()
        expect(HEALTH_ETHNIKI_1.exclusions!.length).toBeGreaterThan(0)
    })
})

// ── B. PolicyMetadata mapper ───────────────────────────────────────────────────

/**
 * Mirrors the inline mapper in lib/services/gap-engine/index.ts:
 *   insurerName:    p.insurerName || "Unknown"
 *   premiumAmount:  p.premiumAmount ? Number(p.premiumAmount) : null
 *   startDate/endDate passed through as Date objects
 */
function buildPolicyMetadata(extraction: typeof HEALTH_ETHNIKI_1): PolicyMetadata {
    return {
        insurerName: extraction.insurerName || "Unknown",
        policyNumber: extraction.policyNumber,
        lineOfBusiness: extraction.lineOfBusiness,
        startDate: new Date(extraction.startDate),
        endDate: new Date(extraction.endDate),
        premiumAmount: extraction.premiumAmount ? Number(extraction.premiumAmount) : null,
        coverageSummary: extraction.coverageSummary,
    }
}

describe("HEALTH_ETHNIKI_1 fixture — PolicyMetadata mapper", () => {
    it("mapper produces the expected metadata object", () => {
        const metadata = buildPolicyMetadata(HEALTH_ETHNIKI_1)
        expect(metadata).toMatchObject({
            insurerName: HEALTH_ETHNIKI_1_METADATA.insurerName,
            policyNumber: HEALTH_ETHNIKI_1_METADATA.policyNumber,
            lineOfBusiness: HEALTH_ETHNIKI_1_METADATA.lineOfBusiness,
            premiumAmount: HEALTH_ETHNIKI_1_METADATA.premiumAmount,
            coverageSummary: HEALTH_ETHNIKI_1_METADATA.coverageSummary,
        })
    })

    it("mapper converts startDate string to a Date object", () => {
        const metadata = buildPolicyMetadata(HEALTH_ETHNIKI_1)
        expect(metadata.startDate).toBeInstanceOf(Date)
        expect(metadata.startDate.getFullYear()).toBe(2024)
        expect(metadata.startDate.getMonth()).toBe(4) // May = index 4
    })

    it("mapper converts endDate string to a Date object", () => {
        const metadata = buildPolicyMetadata(HEALTH_ETHNIKI_1)
        expect(metadata.endDate).toBeInstanceOf(Date)
        expect(metadata.endDate.getFullYear()).toBe(2025)
        expect(metadata.endDate.getMonth()).toBe(4)
    })

    it("mapper does not fall back to 'Unknown' — insurer name is present", () => {
        const metadata = buildPolicyMetadata(HEALTH_ETHNIKI_1)
        expect(metadata.insurerName).not.toBe("Unknown")
        expect(metadata.insurerName).toBe("Η ΕΘΝΙΚΗ")
    })

    it("mapper preserves premiumAmount as a number", () => {
        const metadata = buildPolicyMetadata(HEALTH_ETHNIKI_1)
        expect(metadata.premiumAmount).toBe(1138.27)
    })

    it("HEALTH_ETHNIKI_1_METADATA dates are Date instances", () => {
        expect(HEALTH_ETHNIKI_1_METADATA.startDate).toBeInstanceOf(Date)
        expect(HEALTH_ETHNIKI_1_METADATA.endDate).toBeInstanceOf(Date)
    })
})

// ── C. Business rules for a valid Greek health policy ─────────────────────────

describe("HEALTH_ETHNIKI_1 fixture — health policy business rules", () => {
    it("lineOfBusiness is 'health'", () => {
        expect(HEALTH_ETHNIKI_1.lineOfBusiness).toBe("health")
    })

    it("premiumAmount is a positive number", () => {
        expect(HEALTH_ETHNIKI_1.premiumAmount).toBeGreaterThan(0)
    })

    it("policy period is exactly one year", () => {
        const start = new Date(HEALTH_ETHNIKI_1.startDate)
        const end = new Date(HEALTH_ETHNIKI_1.endDate)
        expect(start < end).toBe(true)
        const msPerYear = 365 * 24 * 60 * 60 * 1000
        const diff = end.getTime() - start.getTime()
        // Allow ±1 day tolerance for leap year / timezone edge cases
        expect(diff).toBeGreaterThan(msPerYear - 86_400_000)
        expect(diff).toBeLessThan(msPerYear + 86_400_000)
    })

    it("coverageSummary mentions hospital coverage", () => {
        expect(HEALTH_ETHNIKI_1.coverageSummary.toLowerCase()).toContain("hospital")
    })

    it("exclusions array is non-empty (US hospitalisation co-pay condition)", () => {
        expect(Array.isArray(HEALTH_ETHNIKI_1.exclusions)).toBe(true)
        expect(HEALTH_ETHNIKI_1.exclusions!.some((e) => e.toLowerCase().includes("us"))).toBe(true)
    })

    it("all fieldConfidence scores are ≥ 90", () => {
        const scores = Object.values(HEALTH_ETHNIKI_1.extractionMeta!.fieldConfidence)
        scores.forEach((score) => {
            expect(score).toBeGreaterThanOrEqual(90)
        })
    })
})
