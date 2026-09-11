import { describe, it, expect } from "vitest"
import {
    findSameSubjectOverlap,
    insuredSubject,
    type PortfolioPolicyFacts,
} from "@/lib/services/gap-engine/portfolio-rules"

/**
 * Guards for per-policy overlap attribution.
 *
 * The brief's overlap row must fire by the engine's OWN rule — same insured
 * subject (plate / address), both live, overlapping periods. Two motor
 * policies are normally two cars; attributing a portfolio-level duplicate
 * finding to a policy on a different plate would tell a two-car household to
 * drop cover on a compulsory line.
 */

function motor(overrides: Partial<PortfolioPolicyFacts> = {}): PortfolioPolicyFacts {
    return {
        id: "p1",
        lineOfBusiness: "motor",
        status: "active",
        insurerName: "Interamerican",
        policyNumber: "POL-1",
        startDate: new Date("2026-01-01"),
        coverageEndDate: new Date("2026-12-31"),
        acordData: { vehicle: { plateNumber: "ABC 1234" } },
        ...overrides,
    }
}

describe("findSameSubjectOverlap", () => {
    it("fires for the same plate insured twice over overlapping periods", () => {
        const overlap = findSameSubjectOverlap(motor(), [
            motor({ id: "p2", policyNumber: "POL-2", acordData: { vehicle: { plateNumber: "abc1234" } } }),
        ])
        expect(overlap?.partner.id).toBe("p2")
    })

    it("does NOT fire for a different plate — two cars are not a duplicate", () => {
        const overlap = findSameSubjectOverlap(motor(), [
            motor({ id: "p2", acordData: { vehicle: { plateNumber: "XYZ 9876" } } }),
        ])
        expect(overlap).toBeNull()
    })

    it("does not fire when the periods cannot overlap", () => {
        const overlap = findSameSubjectOverlap(motor({ coverageEndDate: new Date("2026-06-30") }), [
            motor({ id: "p2", startDate: new Date("2026-07-01"), coverageEndDate: new Date("2027-06-30") }),
        ])
        expect(overlap).toBeNull()
    })

    it("asserts nothing when the subject is unstated", () => {
        const noPlate = motor({ acordData: {} })
        expect(insuredSubject(noPlate)).toBeNull()
        expect(findSameSubjectOverlap(noPlate, [motor({ id: "p2" })])).toBeNull()
    })

    it("asserts nothing for a line with no checkable subject", () => {
        const health = motor({ lineOfBusiness: "health", acordData: {} })
        expect(insuredSubject(health)).toBeNull()
    })

    it("ignores non-live siblings", () => {
        const overlap = findSameSubjectOverlap(motor(), [motor({ id: "p2", status: "cancelled" })])
        expect(overlap).toBeNull()
    })
})
