import { z } from 'zod'

export const BenefitCode = z.enum(['annual_checkup', 'diagnostic_examinations', 'prenatal_checkup', 'medical_assistance', 'roadside_assistance', 'other'])
export const BenefitRulesSchema = z.object({
    code: BenefitCode,
    frequencyBasis: z.enum(['insurance_year', 'calendar_year', 'per_incident', 'not_stated']),
    usesPerPeriod: z.number().int().positive().optional(),
    exclusiveWith: z.array(BenefitCode).optional(),
    referralValidityDays: z.number().int().positive().optional(),
}).describe('Machine-readable terms ONLY when explicitly stated for this benefit. A check-up is separate from diagnostic cover. Never infer frequency basis from the word annual alone. Cite this object as the benefit rules field.')

export const BenefitContractSchema = z.object({
    pageReadStatus: z.array(z.object({ page: z.number().int().positive(), status: z.enum(['readable', 'unreadable', 'blank']) })).optional().describe('Report every page actually inspected, using original PDF page numbers. Mark unreadable scans/tables explicitly. Never claim omitted pages were read. This is a model-reported audit trail, not measured OCR accuracy.'),
    insuredName: z.string().optional().describe('Named insured, not policyholder, payer or beneficiary. Copy only when this role is explicit.'),
    paymentRequired: z.boolean().optional().describe('True if activation or renewal depends on payment. Not proof that payment occurred.'),
    changes: z.array(z.object({
        code: BenefitCode.optional(),
        scope: z.string(),
        operation: z.enum(['replace', 'remove', 'clarify']),
        fullWordingIncluded: z.boolean(),
        text: z.string(),
    })).optional().describe('Explicit amendments only. Mark fullWordingIncluded false for summaries referring to replacement terms not included in this file. Preserve the exact scope; hospitalization amendments do not remove outpatient benefits. Cite changes by their zero-based index.'),
    specialConditions: z.array(z.string()).optional().describe('Special conditions with their scope, including territorial co-payments. Do not treat these as service benefits. Cite each by index.'),
}).describe('Contract context needed to reconcile this document with other versions. No claim of paid or active coverage.')

export const EvidenceRefSchema = z.object({
    documentId: z.string(), documentHash: z.string(), runId: z.string().nullable(),
    page: z.number().int().positive().optional(), snippet: z.string().optional(),
    located: z.boolean().optional(),
})
export const BenefitIssue = z.enum(['missing_original', 'missing_period', 'identity_unconfirmed', 'identity_conflict', 'undated_document', 'missing_amendment', 'conflicting_terms', 'source_missing', 'partial_read', 'verification_unavailable', 'verification_disagreed', 'processing_failed', 'document_limit'])
export const BenefitPeriodSchema = z.object({ key: z.string(), start: z.string(), end: z.string() })
export const BenefitCompositionSchema = z.object({
    version: z.literal('1'), sourceVersion: z.string(), generatedAt: z.string(),
    period: BenefitPeriodSchema.nullable(),
    activation: z.literal('unconfirmed'),
    additionalUsage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).optional(),
    issues: z.array(BenefitIssue),
    documents: z.array(z.object({ id: z.string(), hash: z.string(), kind: z.string(), status: z.enum(['included', 'review', 'failed']), pageCount: z.number().optional(), textPages: z.array(z.number()).optional(), visionRequestedPages: z.array(z.number()).optional(), modelReportedReadPages: z.array(z.number()).optional(), failedPages: z.array(z.number()).optional(), unreportedPages: z.array(z.number()).optional(), truncated: z.boolean().optional() })),
    benefits: z.array(z.object({
        key: z.string(), perk: z.record(z.string(), z.unknown()),
        sources: z.record(z.string(), EvidenceRefSchema),
        conflicts: z.array(z.object({ field: z.string(), priorValue: z.string(), currentValue: z.string(), priorSource: EvidenceRefSchema.optional(), currentSource: EvidenceRefSchema.optional() })).optional(),
        state: z.enum(['documented', 'clarify', 'conflicting']),
        periods: z.array(BenefitPeriodSchema).optional(),
    })),
    conditions: z.array(z.object({ text: z.string(), source: EvidenceRefSchema.optional() })),
})
export type BenefitComposition = z.infer<typeof BenefitCompositionSchema>
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>
export type ContractIssue = z.infer<typeof BenefitIssue>
export type BenefitRules = z.infer<typeof BenefitRulesSchema>
