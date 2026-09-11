import { z } from "zod"

import { AcordDataSchema } from "./acord-data"

/**
 * The STORED shape of `Policy.acordData`: the extraction schema plus the
 * envelope the pipeline writes beside it. PW-PROVENANCE-01 W0-04.
 *
 * `AcordDataSchema` is what the model is asked for. What the row holds is
 * that, plus keys three writers add after the fact and every reader reached
 * through `as any`:
 *
 *   extraction       lib/services/ai/extraction-enrichment.ts (+ the orchestrator's dateParse / reviewState reset)
 *   policyholder     lib/services/ai/extraction-enrichment.ts — the customer's own details, on 7 of 8 production rows (2026-09-11)
 *   insured          lib/services/ai/extraction-enrichment.ts — same shape
 *   analysis         lib/services/analysis/policy-analysis-orchestrator.service.ts — pipeline bookkeeping and the clarity summary
 *   processingError  lib/services/analysis/policy-analysis-orchestrator.service.ts — what a failed run leaves
 *   renewalReview    lib/services/analysis/policy-analysis-orchestrator.service.ts — a renewal notice that names another policy
 *   renewalHistory   lib/services/policy.service.ts, lib/services/policy-merge.service.ts
 *
 * Every field below is DECLARED FROM EVIDENCE: the writer's literal, and the
 * key sets a `jsonb_object_keys` SELECT returned on both databases on
 * 2026-09-11 (`docs/evidence/provenance-w0-04/RESULT.md`). The envelope
 * objects are STRICT so a writer that starts setting a key nobody declared
 * fails `tests/unit/stored-acord-envelope.test.ts` — and a fixture in the
 * shapes production holds today proves the rows already there still parse.
 *
 * Additive, per §4 of the loop contract: `AcordDataSchema` is untouched, and
 * nothing here narrows a field a row already carries. The extraction contract
 * sent to the model (`extraction-schema.ts`) still embeds `AcordDataSchema`,
 * not this — the envelope is ours, not the model's.
 */

const isoString = z.string()
const nullableString = z.string().nullable()

/** `dateParseState` in the orchestrator: whether a date the model returned parsed. */
export const DateParseStateSchema = z.enum(["ok", "failed", "missing"])

/** A party as the enrichment records it — the customer's own contact details. */
export const PartyEnvelopeSchema = z.strictObject({
    name: nullableString.optional(),
    email: nullableString.optional(),
    phone: nullableString.optional(),
    taxId: nullableString.optional(),
})

export const ExtractionEnvelopeSchema = z.strictObject({
    /** The provider that produced the extraction: 'gemini' | 'openai' | 'anthropic' | 'mock'. */
    source: z.string().optional(),
    extractedAt: isoString.optional(),
    confidence: z
        .strictObject({
            overall: z.number().optional(),
            /** Per-field 0–100 scores, keyed by field name. */
            fields: z.record(z.string(), z.number()).optional(),
        })
        .optional(),
    /** Per-field document citations — `extraction-citations.ts`, flag-gated; page is 1-based. */
    sources: z
        .record(
            z.string(),
            z.strictObject({
                page: z.number().optional(),
                snippet: z.string().optional(),
                /** W1-02: found in the locally-read text (true), refuted by it (false), or absent = unverifiable. */
                verified: z.boolean().optional(),
                /** W1-02: the page the snippet was found on when it differs from the cited one. */
                verifiedPage: z.number().optional(),
            })
        )
        .optional(),
    missingCriticalFields: z.array(z.string()).optional(),
    requiresReview: z.boolean().optional(),
    /** 'unconfirmed' | 'confirmed' | 'flagged' — lib/wallet/record-status.ts reads it. */
    reviewState: z.string().optional(),
    confirmedAt: nullableString.optional(),
    /** Who confirmed: 'agent' | 'policyholder' — written by the confirm action, read by record-status. */
    confirmedBy: nullableString.optional(),
    confirmedByUserId: nullableString.optional(),
    flaggedAt: nullableString.optional(),
    dateParse: z
        .strictObject({
            startDate: DateParseStateSchema.optional(),
            endDate: DateParseStateSchema.optional(),
            issueDate: DateParseStateSchema.optional(),
            renewalDate: DateParseStateSchema.optional(),
        })
        .optional(),
    /** Detected language of the composed coverageSummary; null when undetectable. */
    summaryLanguage: nullableString.optional(),
})

export const AnalysisPipelineSchema = z.strictObject({
    runId: z.string().optional(),
    provider: z.string().optional(),
    status: z.string().optional(),
    missingSections: z.array(z.string()).optional(),
    lastFailureCode: nullableString.optional(),
    lastFailureAt: nullableString.optional(),
    completedAt: nullableString.optional(),
})

/**
 * The compact clarity summary the orchestrator stores. Its members are the
 * clarity model's own output shapes (plainLanguageSummary, coverageSnapshot,
 * …); they are declared as present, not modelled here — no read site reaches
 * inside them (2026-09-11), and the model contract owns their shape.
 */
export const AnalysisClaritySchema = z.strictObject({
    generatedAt: isoString.optional(),
    plainLanguageSummary: z.unknown().optional(),
    coverageSnapshot: z.unknown().optional(),
    savingsOpportunities: z.unknown().optional(),
    checklistScores: z.unknown().optional(),
    priorityActions: z.unknown().optional(),
})

export const AnalysisEnvelopeSchema = z.strictObject({
    pipeline: AnalysisPipelineSchema.optional(),
    clarity: AnalysisClaritySchema.optional(),
})

export const ProcessingErrorSchema = z.strictObject({
    code: z.string(),
    message: z.string().optional(),
    retryable: z.boolean().optional(),
    occurredAt: isoString.optional(),
})

/**
 * One past period recorded by a renewal upload. Two writers, one shape today;
 * the dev database also holds an older entry shape (`endDate`, `source`) from
 * a writer that no longer exists — declared so those rows still parse.
 */
export const RenewalHistoryEntrySchema = z.strictObject({
    uploadedAt: nullableString.optional(),
    sourcePolicyId: z.string().optional(),
    policyNumber: nullableString.optional(),
    startDate: nullableString.optional(),
    endDate: nullableString.optional(),
    insurerName: nullableString.optional(),
    documents: z
        .array(
            z.strictObject({
                id: z.string(),
                /** The generated document LABEL (lib/wallet/document-label.ts), never the upload's own name. */
                fileName: nullableString.optional(),
                uploadedAt: nullableString.optional(),
            })
        )
        .optional(),
    /** Legacy (pre-2026 writer): which upload the entry came from. */
    source: z.string().optional(),
})

export const RenewalReviewSchema = z.strictObject({
    status: z.string(),
    expectedPolicyNumber: nullableString.optional(),
    foundPolicyNumber: nullableString.optional(),
    at: isoString,
})

export const StoredAcordDataSchema = AcordDataSchema.extend({
    extraction: ExtractionEnvelopeSchema.optional(),
    analysis: AnalysisEnvelopeSchema.optional(),
    processingError: ProcessingErrorSchema.optional(),
    renewalHistory: z.array(RenewalHistoryEntrySchema).optional(),
    renewalReview: RenewalReviewSchema.optional(),
    policyholder: PartyEnvelopeSchema.optional(),
    insured: PartyEnvelopeSchema.optional(),
})

export type StoredAcordData = z.infer<typeof StoredAcordDataSchema>

/** The roots the envelope adds beside the extraction schema, with the file that writes each. */
export const ENVELOPE_WRITERS: Record<keyof Omit<StoredAcordData, keyof z.infer<typeof AcordDataSchema>>, string[]> = {
    extraction: ["lib/services/ai/extraction-enrichment.ts", "lib/services/analysis/policy-analysis-orchestrator.service.ts"],
    analysis: ["lib/services/analysis/policy-analysis-orchestrator.service.ts"],
    processingError: ["lib/services/analysis/policy-analysis-orchestrator.service.ts", "lib/services/policy.service.ts"],
    renewalHistory: ["lib/services/policy.service.ts", "lib/services/policy-merge.service.ts"],
    renewalReview: ["lib/services/analysis/policy-analysis-orchestrator.service.ts"],
    policyholder: ["lib/services/ai/extraction-enrichment.ts"],
    insured: ["lib/services/ai/extraction-enrichment.ts"],
}
