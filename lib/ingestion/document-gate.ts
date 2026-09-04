/**
 * The Document Validation Gate.
 *
 * Runs on the bytes of an upload BEFORE anything is stored, BEFORE any Policy
 * row exists and BEFORE any model sees the document. It answers, in order and
 * as cheaply as possible:
 *
 *   A. Is the file technically readable?           pdf-probe.ts (local)
 *   B. Is it plausibly an insurance document?      lexical-classifier.ts (local)
 *   C. What kind, and may that kind become/attach   types.ts POLICY_BEARING / ATTACHABLE
 *      to a policy?
 *   D. Is it consistent with the branch the person  branch families, model agreement
 *      selected?
 *   E. Only when A–D could not settle it: one cheap  model-classifier.ts (excerpt only,
 *      model classification.                        consent read first)
 *
 * The verdict is a `DocumentValidationResult`. `rejected` and `requires_review`
 * persist nothing but an ActivityLog row (the KPI and the abuse budget);
 * `validated` is what `toValidatedAIDocument` and `ingestPolicyDocument` accept.
 *
 * Invariants worth stating because each was once false somewhere upstream:
 *   - The declared branch is a HINT. It never raises confidence and never
 *     chooses the document type; it can only be found consistent, unknown or
 *     contradicted.
 *   - A model is consulted only in the middle band or for a scan, only with the
 *     actor's AI-processing consent, only on an excerpt, and its answer can
 *     resolve the middle band — it cannot overturn a deterministic rejection.
 *   - `requires_review` is resolvable by the person only for the reasons in
 *     USER_RESOLVABLE_REVIEW_REASONS, and only by re-running this gate on the
 *     same bytes with `branchConfirmed`.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { hashDocumentBuffer } from "@/lib/services/analysis/extraction-cache"
import { estimatePolicyAnalysisTokenBudget } from "@/lib/services/analysis/token-budget-estimator"
import type { BatchFailureCode } from "@/lib/wallet/batch-upload-errors"
import { probePdf, type PdfProbeFailure } from "./pdf-probe"
import {
    classifyLexically,
    ACCEPT_CONFIDENCE,
    BRANCH_HIGH_CONFIDENCE,
    REJECT_CONFIDENCE,
    type LexicalClassification,
} from "./lexical-classifier"
import {
    classifyWithModel as defaultModelClassifier,
    MODEL_TEXT_CAP,
    type ModelClassificationOutcome,
    type ModelClassifier,
} from "./model-classifier"
import {
    ATTACHABLE_TYPES,
    GATE_ACTIVITY,
    GATE_ENGINE_VERSION,
    POLICY_BEARING_TYPES,
    USER_RESOLVABLE_REVIEW_REASONS,
    branchFamilyOf,
    type BranchConsistency,
    type BranchFamily,
    type DocumentType,
    type DocumentValidationResult,
    type GateEvidence,
    type GateMode,
    type GateSurface,
    type ReviewReason,
} from "./types"

/** Rejected uploads per actor per hour before the gate stops parsing for them. */
export const REJECTION_BUDGET_PER_HOUR = 20
const REJECTION_WINDOW_MS = 60 * 60 * 1000

export { GATE_ACTIVITY }

export interface GateInput {
    bytes: Buffer | Uint8Array
    /** From validateUploadFile — the CONTENT's type, never the client's claim. */
    canonicalMime: string
    /** The write-branch id the person (or the existing policy) declared, or null. */
    declaredBranch: string | null
    /** `user`: a hint from a form. `policy`: read off an analysed policy — reliable. */
    declaredBranchSource: "user" | "policy"
    mode: GateMode
    surface: GateSurface
    /** Who is uploading: consent and the rejection budget are theirs. */
    actorUserId: string
    /** Whose wallet: the duplicate lookup is theirs. */
    ownerUserId: string
    /** Attachment / renewal mode: the policy the document joins. */
    existingPolicyId?: string
    /** The person resolved a `requires_review` verdict on these same bytes. */
    branchConfirmed?: boolean
    /** Lazy pass over a STORED document: it must not be found to duplicate itself. */
    excludeDocumentId?: string
    /**
     * Agent commit: the scan step already classified these exact bytes for
     * this actor minutes ago. Reuse that verdict's model reading instead of
     * paying for a second one; the branch check still runs against the
     * branch the agent has now selected.
     */
    reusePriorVerdict?: boolean
    correlationId?: string
}

/** How long a recorded verdict may stand in for a fresh model reading. */
export const PRIOR_VERDICT_TTL_MS = 30 * 60 * 1000

export interface GateDependencies {
    classifyWithModel?: ModelClassifier
    now?: () => number
}

const PROBE_FAILURE_CODE: Record<PdfProbeFailure, BatchFailureCode> = {
    password_protected: "FILE_PASSWORD_PROTECTED",
    unreadable: "FILE_UNREADABLE",
    no_pages: "NO_READABLE_CONTENT",
    too_many_pages: "TOO_MANY_PAGES",
    budget_exceeded: "FILE_UNREADABLE",
}

/** The `documentKinds` copy key for a gate type — what the failure card calls the file. */
export function documentKindFor(type: DocumentType): string {
    switch (type) {
        case "insurance_policy":
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
            return "quotation"
        case "insurance_claim":
            return "claim"
        default:
            return "other"
    }
}

/** Tokens the full pipeline would have spent on this document had it been admitted. */
export function estimatePreventedTokens(surface: GateSurface): number {
    const estimate = estimatePolicyAnalysisTokenBudget({
        hasDocument: true,
        gapDefinitionsCount: 10,
        checklistPillarsCount: 6,
    })
    // A scan (extract route, agent scan) spends the extraction step only; every
    // other surface would have started the whole run.
    return surface === "bulk_extract" || surface === "agent_scan"
        ? estimate.byStep.metadata_extraction_and_verification
        : estimate.totalEstimatedTokens
}

interface Draft {
    status: DocumentValidationResult["status"]
    code?: BatchFailureCode
    documentType: DocumentType
    insuranceConfidence: number
    detectedBranch: BranchFamily | null
    branchConfidence: number
    branchConsistency: BranchConsistency
    reviewReasons: ReviewReason[]
    existingPolicyId?: string
}

function rejected(code: BatchFailureCode, documentType: DocumentType, extra: Partial<Draft> = {}): Draft {
    return {
        status: "rejected",
        code,
        documentType,
        insuranceConfidence: 0,
        detectedBranch: null,
        branchConfidence: 0,
        branchConsistency: "not_declared",
        reviewReasons: [],
        ...extra,
    }
}

/**
 * Decide the branch question for a document already judged policy-bearing.
 * `detected` may come from the lexicon or the model; `detectedConfidence`
 * with it; `modelAgrees` is whether a model independently named the same
 * family (null when no model was asked or it was unavailable).
 */
function decideBranch(params: {
    declaredFamily: BranchFamily | null
    declaredBranch: string | null
    declaredBranchSource: "user" | "policy"
    detected: BranchFamily | null
    detectedConfidence: number
    modelAgrees: boolean | null
}): { consistency: BranchConsistency; verdict: "ok" | "mismatch" | "review" } {
    const { declaredFamily, declaredBranch, detected, detectedConfidence, modelAgrees } = params
    if (!declaredBranch) return { consistency: "not_declared", verdict: "ok" }
    // Declared «other» (or an id the taxonomy cannot place): nothing to contradict.
    if (!declaredFamily) return { consistency: "consistent", verdict: "ok" }
    if (!detected) return { consistency: "unknown", verdict: "review" }
    if (detected === declaredFamily) return { consistency: "consistent", verdict: "ok" }

    const highConfidence = detectedConfidence >= BRANCH_HIGH_CONFIDENCE
    // A reliable declared side (an analysed policy) plus a confident read of a
    // different family is a wrong file, model or no model.
    if (params.declaredBranchSource === "policy" && highConfidence) {
        return { consistency: "mismatch", verdict: "mismatch" }
    }
    // A hint from a form is contradicted only when two independent readings
    // agree: the lexicon confidently AND the model. Otherwise ask the person.
    if (highConfidence && modelAgrees === true) return { consistency: "mismatch", verdict: "mismatch" }
    return { consistency: "unknown", verdict: "review" }
}

export async function validateDocumentForIngestion(
    input: GateInput,
    deps: GateDependencies = {}
): Promise<DocumentValidationResult> {
    const now = deps.now ?? (() => Date.now())
    const startedAt = now()
    const classifyModel = deps.classifyWithModel ?? defaultModelClassifier
    const declaredBranch = input.declaredBranch || null
    const declaredFamily = branchFamilyOf(declaredBranch)

    const evidence: GateEvidence = {
        pageCount: 0,
        textChars: 0,
        imageOnly: false,
        groupsHit: [],
        branchScores: {},
        negativeType: null,
        classifier: "none",
    }

    const documentHash = await hashDocumentBuffer(Buffer.from(input.bytes))

    const finish = async (draft: Draft): Promise<DocumentValidationResult> => {
        const result: DocumentValidationResult = {
            status: draft.status,
            ...(draft.code ? { code: draft.code } : {}),
            documentType: draft.documentType,
            insuranceConfidence: round(draft.insuranceConfidence),
            detectedBranch: draft.detectedBranch,
            branchConfidence: round(draft.branchConfidence),
            declaredBranch,
            branchConsistency: draft.branchConsistency,
            reviewReasons: draft.reviewReasons,
            evidence,
            documentHash,
            engineVersion: GATE_ENGINE_VERSION,
            latencyMs: Math.max(0, now() - startedAt),
            ...(draft.existingPolicyId ? { existingPolicyId: draft.existingPolicyId } : {}),
        }
        await recordGateOutcome(input, result)
        return result
    }

    // ── Abuse budget: too many rejections this hour, no more parsing for now ──
    // (Not for the lazy pass over documents that are already stored.)
    if (input.surface !== "worker_lazy" && (await rejectionBudgetExceeded(input.actorUserId, now()))) {
        return finish(rejected("UPLOAD_REJECTIONS_THROTTLED", "unknown_unreadable"))
    }

    // ── Duplicate: these exact bytes are already in the wallet ───────────────
    const duplicate = await findDuplicate(input.ownerUserId, documentHash, input.excludeDocumentId)
    if (duplicate) {
        return finish(rejected("DUPLICATE_DOCUMENT", "unknown_unreadable", { existingPolicyId: duplicate }))
    }

    // ── A. Technical read ────────────────────────────────────────────────────
    let lexical: LexicalClassification | null = null
    let text = ""
    if (input.canonicalMime === "application/pdf") {
        const probe = await probePdf(input.bytes)
        if (!probe.ok) {
            evidence.pageCount = probe.pageCount ?? 0
            return finish(rejected(PROBE_FAILURE_CODE[probe.failure], "unknown_unreadable"))
        }
        evidence.pageCount = probe.pageCount
        evidence.textChars = probe.textChars
        evidence.imageOnly = probe.imageOnly
        text = probe.text
    } else {
        // A photo of a document: nothing to read locally.
        evidence.pageCount = 1
        evidence.imageOnly = true
    }

    // ── B/C/D. Deterministic classification on text ──────────────────────────
    if (!evidence.imageOnly) {
        lexical = classifyLexically(text)
        evidence.classifier = "deterministic"
        evidence.groupsHit = [...lexical.groupsHit]
        evidence.branchScores = lexical.branch.scores
        evidence.negativeType = lexical.injectionSuspected ? "injection" : lexical.negativeType

        if (lexical.insuranceConfidence <= REJECT_CONFIDENCE) {
            return finish(
                rejected("NOT_AN_INSURANCE_DOCUMENT", "non_insurance", {
                    insuranceConfidence: lexical.insuranceConfidence,
                })
            )
        }

        if (lexical.insuranceConfidence >= ACCEPT_CONFIDENCE) {
            const typeVerdict = checkType(lexical.documentType, input.mode)
            if (typeVerdict) {
                return finish(
                    rejected(typeVerdict, lexical.documentType, {
                        insuranceConfidence: lexical.insuranceConfidence,
                        detectedBranch: lexical.branch.family,
                        branchConfidence: lexical.branch.confidence,
                    })
                )
            }

            // The type is settled locally. The branch may still need a second
            // reading — only when the hint and the lexicon disagree or the
            // lexicon saw no family at all.
            let modelAgrees: boolean | null = null
            let detected = lexical.branch.family
            let detectedConfidence = lexical.branch.confidence
            const needsSecondReading =
                Boolean(declaredFamily) &&
                input.declaredBranchSource === "user" &&
                (!detected || detected !== declaredFamily)
            if (needsSecondReading) {
                const model = await consultModel(input, classifyModel, { kind: "text", text, declaredBranch: declaredFamily }, evidence)
                if (model.outcome?.available) {
                    const m = model.outcome
                    if (m.detectedBranch) {
                        modelAgrees = detected ? m.detectedBranch === detected : null
                        if (!detected && m.branchConfidence >= 0.7) {
                            detected = m.detectedBranch
                            detectedConfidence = Math.min(m.branchConfidence, BRANCH_HIGH_CONFIDENCE - 0.01)
                        }
                    }
                }
            }

            const branch = decideBranch({
                declaredFamily,
                declaredBranch,
                declaredBranchSource: input.declaredBranchSource,
                detected,
                detectedConfidence,
                modelAgrees,
            })
            return finish(
                settle(
                    {
                        documentType: lexical.documentType,
                        insuranceConfidence: lexical.insuranceConfidence,
                        detectedBranch: detected,
                        branchConfidence: detectedConfidence,
                        branchConsistency: branch.consistency,
                    },
                    branch.verdict,
                    [],
                    input.branchConfirmed
                )
            )
        }
    }

    // ── E. The model band: a thin text, or a scan ────────────────────────────
    const request = evidence.imageOnly
        ? ({ kind: "document", bytes: input.bytes, mimeType: input.canonicalMime, declaredBranch: declaredFamily } as const)
        : ({ kind: "text", text: text.slice(0, MODEL_TEXT_CAP), declaredBranch: declaredFamily } as const)
    const model = await consultModel(input, classifyModel, request, evidence)

    const base = {
        documentType: lexical?.documentType ?? "insurance_other",
        insuranceConfidence: lexical?.insuranceConfidence ?? 0.5,
        detectedBranch: lexical?.branch.family ?? null,
        branchConfidence: lexical?.branch.confidence ?? 0,
    }

    // Held before the model could look: the ONE reason is the block itself. The
    // branch question is not asked of a document nobody has classified yet.
    const unclassified = { ...base, branchConsistency: (declaredBranch ? "unknown" : "not_declared") as BranchConsistency }
    if (model.blocked) {
        return finish(settle(unclassified, "ok", [model.blocked], false, model.blockedCode))
    }
    const outcome = model.outcome
    if (!outcome || !outcome.available) {
        // A scan too large to excerpt is not an outage: hold it for the
        // person, who may confirm it is their policy.
        if (outcome && outcome.reason === "excerpt_unavailable") {
            return finish(settle(unclassified, "ok", ["scan_unclassified"], input.branchConfirmed, "DOCUMENT_REVIEW_REQUIRED"))
        }
        return finish(settle(unclassified, "ok", ["classifier_unavailable"], false, "AI_UNAVAILABLE"))
    }

    if (evidence.imageOnly && !outcome.readable) {
        return finish(rejected("FILE_UNREADABLE", "unknown_unreadable"))
    }
    if (!outcome.isInsuranceDocument || outcome.insuranceConfidence <= 0.3) {
        return finish(
            rejected("NOT_AN_INSURANCE_DOCUMENT", "non_insurance", {
                insuranceConfidence: Math.min(base.insuranceConfidence, outcome.insuranceConfidence),
            })
        )
    }

    const modelType = outcome.documentType
    const typeVerdict = checkType(modelType, input.mode)
    if (typeVerdict && outcome.insuranceConfidence >= 0.6) {
        return finish(
            rejected(typeVerdict, modelType, {
                insuranceConfidence: outcome.insuranceConfidence,
                detectedBranch: outcome.detectedBranch,
                branchConfidence: outcome.branchConfidence,
            })
        )
    }

    // The model's reading of the branch, cross-checked with the lexicon's when
    // the lexicon had one.
    const lexicalFamily = lexical?.branch.family ?? null
    const detected = outcome.detectedBranch ?? lexicalFamily
    const detectedConfidence = outcome.detectedBranch
        ? lexicalFamily && lexicalFamily === outcome.detectedBranch
            ? Math.max(outcome.branchConfidence, BRANCH_HIGH_CONFIDENCE)
            : Math.min(outcome.branchConfidence, BRANCH_HIGH_CONFIDENCE - 0.01)
        : lexical?.branch.confidence ?? 0
    const branch = decideBranch({
        declaredFamily,
        declaredBranch,
        declaredBranchSource: input.declaredBranchSource,
        detected,
        detectedConfidence,
        // For a scan the model is the only reader; its confident answer stands alone.
        modelAgrees: evidence.imageOnly ? outcome.branchConfidence >= 0.8 : lexicalFamily === outcome.detectedBranch,
    })

    const confident = evidence.imageOnly
        ? outcome.insuranceConfidence >= 0.8 && outcome.signals.length >= 3
        : outcome.insuranceConfidence >= 0.7
    const reasons: ReviewReason[] = []
    // Not confidently a policy, not confidently not one — hold it for the person.
    if (!confident) reasons.push(evidence.imageOnly ? "scan_unclassified" : "medium_insurance_confidence")

    return finish(
        settle(
            {
                documentType: modelType,
                insuranceConfidence: outcome.insuranceConfidence,
                detectedBranch: detected,
                branchConfidence: detectedConfidence,
                branchConsistency: branch.consistency,
            },
            typeVerdict ? "review" : branch.verdict,
            reasons,
            input.branchConfirmed
        )
    )
}

/** May this type become (policy mode) or join (attachment mode) a policy? Returns the rejection code if not. */
function checkType(type: DocumentType, mode: GateMode): BatchFailureCode | null {
    if (mode === "policy") return POLICY_BEARING_TYPES.has(type) ? null : "NOT_AN_INSURANCE_POLICY"
    return ATTACHABLE_TYPES.has(type) ? null : "NOT_AN_INSURANCE_DOCUMENT"
}

/**
 * Turn a settled reading plus a branch verdict into the final draft, applying
 * the person's confirmation only where the reasons allow it.
 */
function settle(
    reading: Pick<Draft, "documentType" | "insuranceConfidence" | "detectedBranch" | "branchConfidence" | "branchConsistency">,
    branchVerdict: "ok" | "mismatch" | "review",
    reasons: ReviewReason[],
    branchConfirmed: boolean | undefined,
    reviewCode?: BatchFailureCode
): Draft {
    if (branchVerdict === "mismatch") {
        return { ...reading, status: "rejected", code: "BRANCH_MISMATCH", reviewReasons: [] }
    }
    const reviewReasons = [...reasons]
    if (branchVerdict === "review") reviewReasons.push("branch_unknown")

    if (reviewReasons.length === 0) {
        return { ...reading, status: "validated", reviewReasons: [] }
    }
    const resolvable = reviewReasons.every((reason) => USER_RESOLVABLE_REVIEW_REASONS.has(reason))
    if (branchConfirmed && resolvable) {
        return { ...reading, status: "validated", reviewReasons }
    }
    const code: BatchFailureCode =
        reviewCode ??
        (reviewReasons.length === 1 && reviewReasons[0] === "branch_unknown" ? "BRANCH_UNCONFIRMED" : "DOCUMENT_REVIEW_REQUIRED")
    return { ...reading, status: "requires_review", code, reviewReasons }
}

async function consultModel(
    input: GateInput,
    classify: ModelClassifier,
    request:
        | { kind: "text"; text: string; declaredBranch: BranchFamily | null }
        | { kind: "document"; bytes: Uint8Array; mimeType: string; declaredBranch: BranchFamily | null },
    evidence: GateEvidence
): Promise<{ outcome?: Awaited<ReturnType<ModelClassifier>>; blocked?: ReviewReason; blockedCode?: BatchFailureCode }> {
    if (input.reusePriorVerdict) {
        const prior = await findPriorVerdict(input.actorUserId, await hashDocumentBuffer(Buffer.from(input.bytes)))
        if (prior) {
            evidence.classifier = "model"
            evidence.reusedPriorVerdict = true
            return { outcome: prior }
        }
    }

    // Consent is read HERE, immediately before the only step that sends
    // anything outside the boundary. The deterministic stages above are
    // local processing and need none.
    const actor = await db.user.findUnique({
        where: { id: input.actorUserId },
        select: { aiProcessingConsentVersion: true },
    })
    if (!actor?.aiProcessingConsentVersion) {
        return { blocked: "consent_required_for_classification", blockedCode: "AI_CONSENT_REQUIRED" }
    }
    try {
        const outcome = await classify({ ...request, actorUserId: input.actorUserId } as Parameters<ModelClassifier>[0])
        if (outcome.available) {
            evidence.classifier = "model"
            if (typeof outcome.tokens === "number") evidence.modelTokens = outcome.tokens
        }
        return { outcome }
    } catch (error) {
        logger("warn", "document-gate: model classifier failed", {
            correlationId: input.correlationId,
            error: error instanceof Error ? error.message : String(error),
        })
        return { outcome: { available: false, reason: "error" } }
    }
}

/**
 * The scan step's recorded pass for the same actor and the same bytes, as a
 * model outcome. Only a `validated` row counts, and only within the TTL.
 */
async function findPriorVerdict(
    actorUserId: string,
    documentHash: string
): Promise<(ModelClassificationOutcome & { available: true }) | null> {
    try {
        const row = await db.activityLog.findFirst({
            where: {
                adminUserId: actorUserId,
                actionType: GATE_ACTIVITY.validated,
                timestamp: { gte: new Date(Date.now() - PRIOR_VERDICT_TTL_MS) },
                metadata: { path: ["documentHash"], equals: documentHash },
            },
            orderBy: { timestamp: "desc" },
            select: { metadata: true },
        })
        const meta = row?.metadata as Record<string, unknown> | null | undefined
        if (!meta || typeof meta.documentType !== "string") return null
        return {
            available: true,
            documentType: meta.documentType as DocumentType,
            isInsuranceDocument: meta.documentType !== "non_insurance" && meta.documentType !== "unknown_unreadable",
            insuranceConfidence: typeof meta.insuranceConfidence === "number" ? meta.insuranceConfidence : 0.8,
            detectedBranch: (typeof meta.detectedBranch === "string" ? meta.detectedBranch : null) as BranchFamily | null,
            branchConfidence: typeof meta.branchConfidence === "number" ? meta.branchConfidence : 0.8,
            readable: true,
            signals: ["prior verdict", "same bytes", "same actor"],
        }
    } catch (error) {
        logger("warn", "document-gate: prior verdict lookup failed - classifying afresh", {
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}

async function rejectionBudgetExceeded(actorUserId: string, nowMs: number): Promise<boolean> {
    try {
        const recent = await db.activityLog.count({
            where: {
                adminUserId: actorUserId,
                actionType: GATE_ACTIVITY.rejected,
                timestamp: { gte: new Date(nowMs - REJECTION_WINDOW_MS) },
            },
        })
        return recent >= REJECTION_BUDGET_PER_HOUR
    } catch (error) {
        logger("warn", "document-gate: rejection budget read failed - allowing", {
            error: error instanceof Error ? error.message : String(error),
        })
        return false
    }
}

async function findDuplicate(ownerUserId: string, documentHash: string, excludeDocumentId?: string): Promise<string | null> {
    try {
        const existing = await db.policyDocument.findFirst({
            where: {
                documentHash,
                policy: { ownerUserId, status: { not: "deleted" } },
                ...(excludeDocumentId ? { id: { not: excludeDocumentId } } : {}),
            },
            select: { policyId: true },
        })
        return existing?.policyId ?? null
    } catch (error) {
        logger("warn", "document-gate: duplicate lookup failed - continuing", {
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}

/**
 * The gate's own record: one ActivityLog row per verdict. It is the KPI
 * («how many analyses did we prevent?»), the rejection budget's counter, and
 * — for the agent scan — the memo the commit step reads back by hash. userId
 * only, no email; metadata carries numbers, codes and the hash, never text.
 */
async function recordGateOutcome(input: GateInput, result: DocumentValidationResult): Promise<void> {
    const prevented = result.status !== "validated"
    try {
        await db.activityLog.create({
            data: {
                adminUserId: input.actorUserId,
                adminEmail: "",
                actionType: GATE_ACTIVITY[result.status],
                description: `Document gate: ${result.status}${result.code ? ` ${result.code}` : ""} (${input.surface})`,
                metadata: {
                    surface: input.surface,
                    mode: input.mode,
                    status: result.status,
                    code: result.code ?? null,
                    documentType: result.documentType,
                    insuranceConfidence: result.insuranceConfidence,
                    detectedBranch: result.detectedBranch,
                    branchConfidence: result.branchConfidence,
                    declaredBranch: result.declaredBranch,
                    branchConsistency: result.branchConsistency,
                    reviewReasons: result.reviewReasons,
                    pageCount: result.evidence.pageCount,
                    imageOnly: result.evidence.imageOnly,
                    classifier: result.evidence.classifier,
                    modelTokens: result.evidence.modelTokens ?? null,
                    latencyMs: result.latencyMs,
                    documentHash: result.documentHash,
                    engineVersion: result.engineVersion,
                    tokensPrevented: prevented ? estimatePreventedTokens(input.surface) : 0,
                    correlationId: input.correlationId ?? null,
                },
            },
        })
    } catch (error) {
        logger("warn", "document-gate: could not record outcome", {
            error: error instanceof Error ? error.message : String(error),
        })
    }
    logger(result.status === "validated" ? "info" : "warn", "document-gate", {
        correlationId: input.correlationId ?? null,
        surface: input.surface,
        status: result.status,
        code: result.code ?? null,
        documentType: result.documentType,
        latencyMs: result.latencyMs,
        classifier: result.evidence.classifier,
    })
}

function round(value: number): number {
    return Math.round(value * 100) / 100
}
