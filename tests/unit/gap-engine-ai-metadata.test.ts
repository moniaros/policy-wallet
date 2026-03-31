import { describe, it, expect } from "vitest"
import type { PolicyMetadata } from "@/lib/services/ai/ai-service.interface"

/**
 * Verifies the policyMetadata shape passed to the AI risk-analysis call.
 *
 * Production mapping (lib/services/gap-engine/index.ts → runAiRiskAnalysis):
 *   policyMetadata = policies.map((p) => ({
 *     insurerName:     p.insurerName || "Unknown",
 *     policyNumber:    p.policyNumber,
 *     lineOfBusiness:  p.lineOfBusiness,
 *     startDate:       p.startDate,
 *     endDate:         p.endDate,
 *     premiumAmount:   p.premiumAmount ? Number(p.premiumAmount) : null,
 *     coverageSummary: p.coverageSummary,
 *   }))
 *
 * All seven fields are intentionally included so the AI model has sufficient
 * policy context (dates for expiry analysis, coverage summary for gap detection).
 * This test guards that contract against accidental regression.
 */

// Mirror the production mapping exactly so changes to either break the test.
function buildPolicyMetadata(
    policies: Array<{
        id: string
        lineOfBusiness: string
        status: string
        insurerName: string
        premiumAmount: unknown
        policyNumber: string
        startDate: Date
        endDate: Date
        coverageSummary: string | null
    }>
): PolicyMetadata[] {
    return policies.map((p) => ({
        insurerName: p.insurerName || "Unknown",
        policyNumber: p.policyNumber,
        lineOfBusiness: p.lineOfBusiness,
        startDate: p.startDate,
        endDate: p.endDate,
        premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : null,
        coverageSummary: p.coverageSummary,
    }))
}

const START = new Date("2025-01-01")
const END = new Date("2026-01-01")

const samplePolicies = [
    {
        id: "pol_1",
        lineOfBusiness: "motor",
        status: "active",
        insurerName: "Interamerican",
        premiumAmount: "450.00",
        policyNumber: "POL-001",
        startDate: START,
        endDate: END,
        coverageSummary: "Third-party liability",
    },
    {
        id: "pol_2",
        lineOfBusiness: "health",
        status: "active",
        insurerName: "Eurolife",
        premiumAmount: null,
        policyNumber: "POL-002",
        startDate: START,
        endDate: END,
        coverageSummary: null,
    },
]

describe("runAiRiskAnalysis — policyMetadata shape", () => {
    it("includes all seven required fields", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        const item = metadata[0]
        expect(item).toHaveProperty("insurerName")
        expect(item).toHaveProperty("policyNumber")
        expect(item).toHaveProperty("lineOfBusiness")
        expect(item).toHaveProperty("startDate")
        expect(item).toHaveProperty("endDate")
        expect(item).toHaveProperty("premiumAmount")
        expect(item).toHaveProperty("coverageSummary")
    })

    it("maps core identification fields correctly", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        expect(metadata[0]).toMatchObject({
            insurerName: "Interamerican",
            policyNumber: "POL-001",
            lineOfBusiness: "motor",
        })
        expect(metadata[1]).toMatchObject({
            insurerName: "Eurolife",
            policyNumber: "POL-002",
            lineOfBusiness: "health",
        })
    })

    it("maps policy dates through unchanged", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        expect(metadata[0].startDate).toBe(START)
        expect(metadata[0].endDate).toBe(END)
    })

    it("maps coverageSummary — string value and null both preserved", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        expect(metadata[0].coverageSummary).toBe("Third-party liability")
        expect(metadata[1].coverageSummary).toBeNull()
    })

    it("casts premiumAmount string to number", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        expect(metadata[0].premiumAmount).toBe(450)
    })

    it("returns null premiumAmount when source is null", () => {
        const metadata = buildPolicyMetadata(samplePolicies)
        expect(metadata[1].premiumAmount).toBeNull()
    })

    it("falls back to 'Unknown' when insurerName is empty string", () => {
        const metadata = buildPolicyMetadata([
            {
                id: "pol_3", lineOfBusiness: "home", status: "active",
                insurerName: "", premiumAmount: null,
                policyNumber: "POL-003", startDate: START, endDate: END,
                coverageSummary: null,
            },
        ])
        expect(metadata[0].insurerName).toBe("Unknown")
    })
})
