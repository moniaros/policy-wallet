/**
 * The document gate's KPI, from its own ActivityLog rows.
 *
 * «How many AI analyses did we prevent by rejecting invalid uploads?» is the
 * question the gate exists to answer. Every verdict writes one row
 * (document-gate.ts recordGateOutcome) with a metadata object of numbers and
 * codes — never text, never a file name — and this summarises a window of
 * them for the admin dashboard. Pure, so it is tested on fixtures.
 */

import { GATE_ACTIVITY } from "./types"

export interface GateActivityRow {
    actionType: string
    metadata: unknown
}

export interface DocumentGateSummary {
    /** Every verdict the gate rendered in the window. */
    uploads: number
    validated: number
    held: number
    rejected: number
    rejectedByCode: Record<string, number>
    branchMismatches: number
    /** Rejected documents: each would otherwise have started a run (or a scan's extraction). */
    analysesPrevented: number
    /** Sum of the pipeline estimates for the prevented runs. */
    tokensPrevented: number
    /** How often the cheap classifier was consulted, and what it cost. Bounded spend, not prevented. */
    classifierCalls: number
    classifierTokens: number
    medianLatencyMs: number
}

function num(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function summarizeDocumentGate(rows: GateActivityRow[]): DocumentGateSummary {
    const summary: DocumentGateSummary = {
        uploads: 0,
        validated: 0,
        held: 0,
        rejected: 0,
        rejectedByCode: {},
        branchMismatches: 0,
        analysesPrevented: 0,
        tokensPrevented: 0,
        classifierCalls: 0,
        classifierTokens: 0,
        medianLatencyMs: 0,
    }
    const latencies: number[] = []

    for (const row of rows) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>
        summary.uploads++
        latencies.push(num(meta.latencyMs))
        if (meta.classifier === "model" && !meta.reusedPriorVerdict) {
            summary.classifierCalls++
            summary.classifierTokens += num(meta.modelTokens)
        }
        if (row.actionType === GATE_ACTIVITY.validated) summary.validated++
        else if (row.actionType === GATE_ACTIVITY.requires_review) summary.held++
        else if (row.actionType === GATE_ACTIVITY.rejected) {
            summary.rejected++
            summary.analysesPrevented++
            summary.tokensPrevented += num(meta.tokensPrevented)
            const code = typeof meta.code === "string" ? meta.code : "UNKNOWN"
            summary.rejectedByCode[code] = (summary.rejectedByCode[code] ?? 0) + 1
            if (code === "BRANCH_MISMATCH") summary.branchMismatches++
        }
    }

    if (latencies.length > 0) {
        const sorted = [...latencies].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        summary.medianLatencyMs = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    }
    return summary
}
