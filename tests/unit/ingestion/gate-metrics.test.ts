import { describe, it, expect } from "vitest"
import { summarizeDocumentGate } from "@/lib/ingestion/gate-metrics"

const row = (actionType: string, metadata: Record<string, unknown>) => ({ actionType, metadata })

describe("summarizeDocumentGate — the «analyses prevented» KPI", () => {
    it("counts verdicts, codes, prevented runs and their tokens, and classifier spend separately", () => {
        const summary = summarizeDocumentGate([
            row("DOCUMENT_VALIDATED", { latencyMs: 90, classifier: "deterministic", tokensPrevented: 0 }),
            row("DOCUMENT_VALIDATED", { latencyMs: 2400, classifier: "model", modelTokens: 420, tokensPrevented: 0 }),
            row("DOCUMENT_VALIDATED", { latencyMs: 120, classifier: "model", modelTokens: 400, reusedPriorVerdict: true }),
            row("DOCUMENT_REVIEW_REQUIRED", { latencyMs: 2100, classifier: "model", modelTokens: 380, code: "BRANCH_UNCONFIRMED" }),
            row("DOCUMENT_REJECTED", { latencyMs: 80, classifier: "deterministic", code: "NOT_AN_INSURANCE_DOCUMENT", tokensPrevented: 200_000 }),
            row("DOCUMENT_REJECTED", { latencyMs: 2300, classifier: "model", modelTokens: 410, code: "BRANCH_MISMATCH", tokensPrevented: 200_000 }),
            row("DOCUMENT_REJECTED", { latencyMs: 70, classifier: "deterministic", code: "NOT_AN_INSURANCE_DOCUMENT", tokensPrevented: 102_000 }),
        ])
        expect(summary).toMatchObject({
            uploads: 7,
            validated: 3,
            held: 1,
            rejected: 3,
            rejectedByCode: { NOT_AN_INSURANCE_DOCUMENT: 2, BRANCH_MISMATCH: 1 },
            branchMismatches: 1,
            analysesPrevented: 3,
            tokensPrevented: 502_000,
            classifierCalls: 3,
            classifierTokens: 1210,
            medianLatencyMs: 120,
        })
    })

    it("is honest on an empty window", () => {
        expect(summarizeDocumentGate([])).toMatchObject({ uploads: 0, analysesPrevented: 0, tokensPrevented: 0, medianLatencyMs: 0 })
    })

    it("ignores malformed metadata rather than throwing", () => {
        const summary = summarizeDocumentGate([row("DOCUMENT_REJECTED", null as any), row("DOCUMENT_REJECTED", { tokensPrevented: "many" })])
        expect(summary).toMatchObject({ rejected: 2, tokensPrevented: 0, rejectedByCode: { UNKNOWN: 2 } })
    })
})
