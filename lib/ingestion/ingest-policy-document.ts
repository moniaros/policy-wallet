/**
 * THE persistence path for a policy document.
 *
 * Five surfaces used to write policy documents each in their own way —
 * `/wallet/add` from the browser straight into the bucket, the onboarding
 * and wallet uploads through `uploadAndParse`, the renewal attach, the agent
 * commit, the documents route — and every one of them committed the row, and
 * often the whole Policy, before anything had asked what the file was. This
 * module is the one door. It:
 *
 *   1. validates the bytes (lib/security/file-upload.ts),
 *   2. runs the document gate (document-gate.ts) — rejected or held means
 *      NOTHING is stored: no object, no row, one ActivityLog line,
 *   3. only then uploads to the private bucket and, in ONE transaction,
 *      creates the Policy (when new) and the PolicyDocument carrying the
 *      gate's stamp — status, verdict, hash, kind,
 *   4. deletes the object again if that transaction fails.
 *
 * Analysis is NOT started here. Callers decide how (inline, after(), the
 * queue) and the orchestrator re-reads the stamp before it spends anything.
 *
 * tests/unit/document-gate-storage-single-path.test.ts fails if a policy
 * document reaches `uploadFileDetailed(…, "policies")` from anywhere else.
 */

import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { StoredObject } from "@/lib/storage"
import { validateUploadFile, type UploadRejectionReason } from "@/lib/security/file-upload"
import { UPLOAD_REJECTION_TO_CODE, type BatchFailureCode } from "@/lib/wallet/batch-upload-errors"
import { storedDocumentLabel } from "@/lib/wallet/document-label"
import { mintPlaceholderIdentity } from "@/lib/wallet/policy-identity"
import { daysFromNow, DEFAULT_POLICY_DURATION_DAYS } from "@/lib/constants/time"
import type { DocumentKind } from "@/lib/services/ai/document-kind"
import { validateDocumentForIngestion, documentKindFor } from "./document-gate"
import {
    FAMILY_DEFAULT_BRANCH,
    USER_RESOLVABLE_REVIEW_REASONS,
    type DocumentType,
    type DocumentValidationResult,
    type GateMode,
    type GateSurface,
    type ReviewReason,
} from "./types"

export interface IngestTypedMetadata {
    insurerName?: string | null
    policyNumber?: string | null
    startDate?: string | Date | null
    endDate?: string | Date | null
    premiumAmount?: number | null
    premiumCurrency?: string | null
}

export interface IngestPolicyDocumentInput {
    /** Who is uploading — consent for the gate's classifier and the rejection budget are theirs. */
    actorUserId: string
    /** Whose wallet the policy is in (the customer, on the agent path). */
    ownerUserId: string
    /** Recorded as `createdByUserId` on a NEW policy; defaults to the actor. */
    createdByUserId?: string
    file: File
    surface: GateSurface
    mode: GateMode
    /** The branch selected on the form (source `user`) or read off the existing policy (source `policy`). */
    declaredBranch: string | null
    declaredBranchSource: "user" | "policy"
    /** The person resolved a `requires_review` verdict on these same bytes. */
    branchConfirmed?: boolean
    /** Agent commit: reuse the verdict the scan already recorded for these bytes. */
    reusePriorVerdict?: boolean
    maxBytes?: number
    correlationId?: string

    // ── Joining an EXISTING policy ───────────────────────────────────────
    existingPolicyId?: string
    /** The caller's kind for the document; the gate's reading wins unless `trustDeclaredKind`. */
    documentKind?: DocumentKind | null
    /** The person's explicit action («add a renewal») is better evidence than a classifier's guess. */
    trustDeclaredKind?: boolean
    /** Renewal attach: flip the policy to «analysing» in the same transaction. */
    markPolicyAnalyzing?: boolean

    // ── Creating a NEW policy ────────────────────────────────────────────
    typedMetadata?: IngestTypedMetadata
    /** `analyzing` (the caller will start a run) or `active` (agent path, gated afterwards). */
    policyStatus?: "analyzing" | "active"
    acordData?: Prisma.InputJsonValue
    /** Extra rows that must commit WITH the policy (the agent's management grant). */
    afterCreate?: (tx: Prisma.TransactionClient, created: { id: string }) => Promise<void>

    source?: "policyholder" | "agent"
    /** `processing` when a run follows at once; `pending` for a bare attachment. */
    processingStatus?: "processing" | "pending" | "completed"
}

export interface GateRejection {
    kind: "gate"
    status: "rejected" | "requires_review"
    code: BatchFailureCode
    documentType: DocumentType
    /** `documentKinds` copy key — what the failure card calls the file. */
    documentKind: string
    /** Write-branch id for the family the gate detected, for a «change type to …» action. */
    detectedBranch: string | null
    declaredBranch: string | null
    existingPolicyId?: string
    reviewReasons: ReviewReason[]
    /** True when a resubmission with `branchConfirmed` may turn the hold into a pass. */
    resolvable: boolean
    verdict: DocumentValidationResult
}

export interface UploadRejection {
    kind: "upload_invalid"
    reason: UploadRejectionReason
    code: BatchFailureCode
}

export type IngestFailure = GateRejection | UploadRejection

export type IngestPolicyDocumentResult =
    | {
          ok: true
          policyId: string
          documentId: string
          /** False when the document joined an existing policy. */
          created: boolean
          lineOfBusiness: string
          verdict: DocumentValidationResult
      }
    | ({ ok: false } & IngestFailure)

/**
 * Thrown by callers that cannot return a structured failure (PolicyService
 * methods with typed return values). The message is the code the wallet's
 * error mapper localises (`DOCUMENT_REJECTED_<CODE>` → wallet.batchUpload.failures).
 */
export class DocumentGateError extends Error {
    readonly code: BatchFailureCode
    readonly rejection: GateRejection
    constructor(rejection: GateRejection) {
        super(`DOCUMENT_REJECTED_${rejection.code}`)
        this.name = "DocumentGateError"
        this.code = rejection.code
        this.rejection = rejection
    }
}

/** The stored `documentKind` (document-kind.ts vocabulary) for a gate type. */
export function storedDocumentKindFor(type: DocumentType): DocumentKind | null {
    // An endorsement amends a schedule and is analysed like one.
    switch (type) {
        case "insurance_policy":
        case "insurance_endorsement":
            return "policy_schedule"
        case "insurance_certificate":
            return "certificate"
        case "insurance_renewal":
            return "renewal_notice"
        case "insurance_terms_or_guide":
            return "terms_and_conditions"
        case "invoice_payment":
            return "invoice"
        case "insurance_quotation":
        case "insurance_claim":
            return "other"
        default:
            return null
    }
}

export function gateRejectionFrom(verdict: DocumentValidationResult): GateRejection {
    const status = verdict.status === "requires_review" ? "requires_review" : "rejected"
    return {
        kind: "gate",
        status,
        code: verdict.code ?? "DOCUMENT_NOT_RECOGNIZED",
        documentType: verdict.documentType,
        documentKind: documentKindFor(verdict.documentType),
        detectedBranch: verdict.detectedBranch ? FAMILY_DEFAULT_BRANCH[verdict.detectedBranch] : null,
        declaredBranch: verdict.declaredBranch,
        ...(verdict.existingPolicyId ? { existingPolicyId: verdict.existingPolicyId } : {}),
        reviewReasons: verdict.reviewReasons,
        resolvable:
            status === "requires_review" &&
            verdict.reviewReasons.length > 0 &&
            verdict.reviewReasons.every((reason) => USER_RESOLVABLE_REVIEW_REASONS.has(reason)),
        verdict,
    }
}

function toDate(value: string | Date | null | undefined, fallback: Date): Date {
    if (!value) return fallback
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? fallback : date
}

export async function ingestPolicyDocument(input: IngestPolicyDocumentInput): Promise<IngestPolicyDocumentResult> {
    // 1. Bytes: size, extension allowlist, magic bytes, /Encrypt — the byte gate.
    const validation = await validateUploadFile(input.file, { category: "policy", maxBytes: input.maxBytes })
    if (!validation.ok) {
        return {
            ok: false,
            kind: "upload_invalid",
            reason: validation.reason,
            code: UPLOAD_REJECTION_TO_CODE[validation.reason] ?? "UNSUPPORTED_FORMAT",
        }
    }

    // 2. Content: the document gate. Nothing below runs unless it passes.
    const bytes = Buffer.from(await input.file.arrayBuffer())
    const verdict = await validateDocumentForIngestion({
        bytes,
        canonicalMime: validation.value.canonicalMime,
        declaredBranch: input.declaredBranch,
        declaredBranchSource: input.declaredBranchSource,
        mode: input.mode,
        surface: input.surface,
        actorUserId: input.actorUserId,
        ownerUserId: input.ownerUserId,
        existingPolicyId: input.existingPolicyId,
        branchConfirmed: input.branchConfirmed,
        reusePriorVerdict: input.reusePriorVerdict,
        correlationId: input.correlationId,
    })
    if (verdict.status !== "validated") {
        return { ok: false, ...gateRejectionFrom(verdict) }
    }

    // 3. Storage — only now. The central chokepoint re-validates and scans.
    // Imported lazily: the storage module validates env at import, and every
    // server action that reaches this file must stay importable without it
    // (the pattern agent/actions.ts used for the same module).
    const { uploadFileDetailed } = await import("@/lib/storage")
    const stored: StoredObject = await uploadFileDetailed(input.file, "policies")

    const gateKind = storedDocumentKindFor(verdict.documentType)
    const documentKind: DocumentKind | null = input.trustDeclaredKind
        ? (input.documentKind ?? gateKind)
        : (gateKind ?? input.documentKind ?? null)

    const documentData = (policyId: string): Prisma.PolicyDocumentUncheckedCreateInput => ({
        policyId,
        fileUrl: stored.url,
        // GENERATED, never the customer's file name — lib/wallet/document-label.ts.
        fileName: storedDocumentLabel({ documentKind: documentKind ?? undefined }),
        fileSize: input.file.size,
        source: input.source ?? "policyholder",
        uploadedByUserId: input.actorUserId,
        processingStatus: input.processingStatus ?? "processing",
        documentKind,
        storageBucket: stored.bucket || null,
        storageKey: stored.key,
        storageProvider: stored.bucket ? "supabase" : null,
        mimeType: stored.mimeType,
        // The gate's stamp. The orchestrator refuses to spend on a row without one.
        documentHash: verdict.documentHash,
        validationStatus: "validated",
        validationJson: verdict as unknown as Prisma.InputJsonValue,
        validatedAt: new Date(),
    })

    try {
        if (input.existingPolicyId) {
            const existingPolicyId = input.existingPolicyId
            const document = await db.$transaction(async (tx) => {
                const created = await tx.policyDocument.create({ data: documentData(existingPolicyId), select: { id: true } })
                if (input.markPolicyAnalyzing) {
                    await tx.policy.update({ where: { id: existingPolicyId }, data: { status: "analyzing" } })
                }
                return created
            })
            logger("info", "ingest: document attached", {
                correlationId: input.correlationId ?? null,
                surface: input.surface,
                policyId: existingPolicyId,
                documentId: document.id,
                documentType: verdict.documentType,
            })
            const existing = await db.policy.findUnique({ where: { id: existingPolicyId }, select: { lineOfBusiness: true } })
            return {
                ok: true,
                policyId: existingPolicyId,
                documentId: document.id,
                created: false,
                lineOfBusiness: existing?.lineOfBusiness ?? "other",
                verdict,
            }
        }

        // A NEW policy. The identity is whatever the person typed, else the
        // placeholder extraction will replace; the branch is what they
        // selected, else what the gate detected, else «other».
        const placeholder = mintPlaceholderIdentity()
        const typed = input.typedMetadata ?? {}
        const startDate = toDate(typed.startDate, new Date())
        const endDate = toDate(typed.endDate, daysFromNow(DEFAULT_POLICY_DURATION_DAYS))
        const lineOfBusiness =
            input.declaredBranch ?? (verdict.detectedBranch ? FAMILY_DEFAULT_BRANCH[verdict.detectedBranch] : "other")

        const result = await db.$transaction(async (tx) => {
            const created = await tx.policy.create({
                data: {
                    ownerUserId: input.ownerUserId,
                    createdByUserId: input.createdByUserId ?? input.actorUserId,
                    insurerName: typed.insurerName?.trim() || placeholder.insurerName,
                    policyNumber: typed.policyNumber?.trim() || placeholder.policyNumber,
                    lineOfBusiness,
                    startDate,
                    endDate,
                    coverageEndDate: endDate,
                    premiumAmount: typed.premiumAmount ?? 0,
                    premiumCurrency: typed.premiumCurrency || "EUR",
                    status: input.policyStatus ?? "analyzing",
                    ...(input.acordData !== undefined ? { acordData: input.acordData } : {}),
                },
                select: { id: true },
            })
            const document = await tx.policyDocument.create({ data: documentData(created.id), select: { id: true } })
            if (input.afterCreate) await input.afterCreate(tx, created)
            return { policyId: created.id, documentId: document.id }
        })

        logger("info", "ingest: policy created from a validated document", {
            correlationId: input.correlationId ?? null,
            surface: input.surface,
            policyId: result.policyId,
            documentType: verdict.documentType,
            lineOfBusiness,
            classifier: verdict.evidence.classifier,
        })
        return { ok: true, ...result, created: true, lineOfBusiness, verdict }
    } catch (error) {
        // The object landed but no row references it — remove it rather than
        // leaving personal data no export can reach.
        const { discardOrphanedUploads } = await import("@/lib/services/policy-discard")
        await discardOrphanedUploads([stored.url], {
            reason: input.existingPolicyId ? "document_attach_failed" : "policy_create_failed",
            userId: input.actorUserId,
        })
        throw error
    }
}
