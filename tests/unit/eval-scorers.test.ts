/**
 * Evaluation scorers — the deterministic, CI-gated core of the eval pipeline.
 *
 * The paid runner (evals/run.ts) is on-demand; these tests pin the scoring math
 * with hand-crafted inputs so a scorer change can't silently distort eval
 * results. They also smoke-test the harness by running the deterministic mock
 * provider through a scorer.
 */

import { describe, it, expect, vi } from "vitest"
import { scoreExtraction } from "@/evals/scorers/extraction-scorer"
import { scoreGaps } from "@/evals/scorers/gap-scorer"
import { scoreQaCompliance } from "@/evals/scorers/qa-compliance-scorer"

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

describe("scoreExtraction", () => {
    const expected = {
        insurerName: "Η ΕΘΝΙΚΗ",
        policyNumber: "1651622",
        lineOfBusiness: "health",
        startDate: "2024-05-22",
        endDate: "2025-05-22",
        premiumAmount: 1138.27,
        hasCoverageSummary: true,
    }

    it("scores a perfect extraction at 100%", () => {
        const s = scoreExtraction(expected, {
            ...expected,
            coverageSummary: "Hospital cover.",
        })
        expect(s.accuracyPct).toBe(100)
        expect(s.passed).toBe(s.total)
    })

    it("fails the field when an enum is wrong", () => {
        const s = scoreExtraction(expected, { ...expected, lineOfBusiness: "motor", coverageSummary: "x" })
        const lob = s.fields.find((f) => f.field === "lineOfBusiness")
        expect(lob?.pass).toBe(false)
        expect(s.accuracyPct).toBeLessThan(100)
    })

    it("accepts an amount within the 1% tolerance and rejects beyond it", () => {
        expect(scoreExtraction({ premiumAmount: 1000 }, { premiumAmount: 1009 }).accuracyPct).toBe(100)
        expect(scoreExtraction({ premiumAmount: 1000 }, { premiumAmount: 1200 }).accuracyPct).toBe(0)
    })

    it("is case/whitespace-insensitive on string fields", () => {
        expect(scoreExtraction({ insurerName: "ERGO" }, { insurerName: "  ergo " }).accuracyPct).toBe(100)
    })
})

describe("scoreGaps", () => {
    it("computes recall and precision, and lists misses", () => {
        const s = scoreGaps(
            ["no-outpatient", "no-dental", "high-deductible"],
            [
                { slug: "no-outpatient", isDetected: true },
                { slug: "no-dental", isDetected: false },
                { slug: "high-deductible", isDetected: true },
                { slug: "has-hospital", isDetected: true }, // false positive
            ]
        )
        expect(s.recallPct).toBe(67) // 2 of 3 expected caught
        expect(s.falseNegatives).toEqual(["no-dental"])
        expect(s.falsePositives).toEqual(["has-hospital"])
        expect(s.precisionPct).toBe(67) // 2 of 3 detected were real
    })

    it("is 100% recall when nothing was expected", () => {
        expect(scoreGaps([], [{ slug: "x", isDetected: false }]).recallPct).toBe(100)
    })
})

describe("scoreQaCompliance", () => {
    it("always bans advice language, even with no dataset rules", () => {
        const s = scoreQaCompliance("You should cancel your policy and buy a cheaper one.")
        expect(s.pass).toBe(false)
    })

    it("passes an informational answer that grounds on the document", () => {
        const s = scoreQaCompliance(
            "Based on the policy data, dental treatment is not mentioned in your coverage.",
            {}
        )
        expect(s.pass).toBe(true)
    })

    it("enforces dataset-specific mustContain / mustNotContain", () => {
        const fail = scoreQaCompliance("I recommend you switch policy now.", { mustNotContain: [/switch policy/i] })
        expect(fail.pass).toBe(false)
        const ok = scoreQaCompliance("The document lists a EUR 1,500 deductible.", { mustContain: ["deductible"] })
        expect(ok.pass).toBe(true)
    })

    it("catches Greek advice language and passes informational Greek", () => {
        // Informational statement of fact — no advice → passes.
        expect(scoreQaCompliance("Το συμβόλαιο καλύπτει νοσοκομειακή περίθαλψη.").pass).toBe(true)
        // "I suggest you buy another" and "you should cancel the contract" → advice.
        expect(scoreQaCompliance("Σου προτείνω να αγοράσεις άλλο.").pass).toBe(false)
        expect(scoreQaCompliance("Θα πρέπει να ακυρώσεις το συμβόλαιο.").pass).toBe(false)
    })
})

describe("harness smoke — the deterministic mock provider runs through a scorer", () => {
    it("produces a well-formed extraction score from MockAIService output", async () => {
        const { MockAIService } = await import("@/lib/services/ai/mock-ai.service")
        const service = new MockAIService()
        const actual = await service.extractPolicyData(
            { data: "AA==", mimeType: "image/png", fileName: "x.png" },
            {}
        )
        const s = scoreExtraction({ lineOfBusiness: "motor", hasCoverageSummary: true }, actual)
        // We assert the SHAPE, not a high accuracy — mock fixtures don't match a
        // real golden record. The harness producing a valid score is the point.
        expect(s.total).toBeGreaterThan(0)
        expect(s.accuracyPct).toBeGreaterThanOrEqual(0)
        expect(s.accuracyPct).toBeLessThanOrEqual(100)
    })
})
