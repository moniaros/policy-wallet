import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAIService } from "@/lib/services/ai"
import { enforceBillableCallPolicy } from "@/lib/services/ai/guard"
import {
    MAX_UPLOAD_SIZE_BYTES,
    POLICY_EXTRACT_PER_MINUTE_LIMIT,
    POLICY_EXTRACT_RATE_WINDOW_MS,
} from "@/lib/constants/time"
import { validateUploadFile, sanitizeDisplayName } from "@/lib/security/file-upload"
import { withApiGuard } from "@/lib/api-guard"
import { canUserAddPolicy } from "@/lib/subscription-limits"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import {
    UPLOAD_REJECTION_TO_CODE,
    buildFailure,
    type BatchFailureCode,
    type BatchFailureContext,
} from "@/lib/wallet/batch-upload-errors"

// Policy PDF extraction (the "parse"). This is the single paid-AI operation a
// free/Starter user may run — the source of their basic summary — so it is
// gated by the policy allowance (free = 1) rather than blocked outright, plus
// rate-limited. Deep AI analysis is gated separately at the orchestrator.
//
// This route used to hand-roll a raw @google/generative-ai call with its own
// prompt, no timeout/retry, no token metering, and a regex JSON rescue. It now
// runs through the shared IAIService abstraction (getAIService().extractPolicyData),
// which brings the timeout + retry ladder, the canonical extraction prompt,
// capability checks, and token metering — closing an off-the-books spend hole.
//
// Every failure exit answers with a CODE from lib/wallet/batch-upload-errors,
// never with prose. The bulk-upload modal renders the code; nothing it shows the
// user is invented at the call site, and nothing internal leaks out. See that
// module's header for the three defects that made every failure here read as
// «Η αποθήκευση ασφαλιστηρίων απέτυχε».

/** Fields the wallet cannot hold a policy without. */
const WALLET_REQUIRED_FIELDS = ["insurerName", "policyNumber", "startDate", "endDate"] as const

const STATUS_FOR_CODE: Partial<Record<BatchFailureCode, number>> = {
    FILE_EMPTY: 400,
    FILE_TOO_LARGE: 413,
    UNSUPPORTED_FORMAT: 415,
    FILE_UNREADABLE: 415,
    FILE_REJECTED_SECURITY: 400,
    POLICY_LIMIT_REACHED: 403,
    DAILY_LIMIT_REACHED: 429,
    BATCH_THROTTLED: 429,
    AI_UNAVAILABLE: 503,
    AI_TIMEOUT: 504,
    AI_EXTRACTION_FAILED: 500,
    // The request was well-formed and the document simply is not a usable
    // policy — a 4xx that is not the caller's fault to fix by retrying.
    NOT_AN_INSURANCE_POLICY: 422,
    DOCUMENT_NOT_RECOGNIZED: 422,
    REQUIRED_DATA_MISSING: 422,
}

function failure(
    code: BatchFailureCode,
    context?: BatchFailureContext,
    extra?: Record<string, unknown>
) {
    const body = buildFailure(code, context)
    return NextResponse.json(
        { success: false, ...body, ...(extra || {}) },
        { status: STATUS_FOR_CODE[code] ?? 400 }
    )
}

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            // Sized from the advertised batch size, not picked by hand. It was 6
            // against a modal that accepts 10 and fires all 10 at once, so four
            // documents per batch were rejected before anything was parsed —
            // reproducibly, and reported to the user as a save failure.
            limit: POLICY_EXTRACT_PER_MINUTE_LIMIT,
            windowMs: POLICY_EXTRACT_RATE_WINDOW_MS,
            key: ({ auth }) => `policy:extract:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ req, auth }) => {
        const authResult = auth!

        // One id per file, carried into every log line below and returned on
        // failure. Support can answer "why did THIS document fail" from the
        // value on the user's screen, without trawling by timestamp.
        const correlationId = crypto.randomUUID()
        // Set by the bulk-upload modal so one batch's files can be counted
        // together: "4 failed — 2 unreadable, 1 duplicate, 1 missing a number".
        const batchId = req.headers.get("x-pw-batch-id") || null
        const startedAt = Date.now()

        const trace = (
            stage: string,
            outcome: string,
            meta: Record<string, unknown> = {}
        ) => {
            logger(outcome === "failed" ? "warn" : "info", "policy-extract", {
                correlationId,
                batchId,
                stage,
                outcome,
                durationMs: Date.now() - startedAt,
                userId: authResult.dbUser.id,
                ...meta,
            })
        }

        // GDPR Art. 9 gate — the same one the deep pipeline enforces
        // (policy-analysis-orchestrator.service.ts). This route base64-encodes the
        // WHOLE document and sends it to a model provider, so it is a disclosure to
        // a processor in its own right, not a lesser "parse". It was previously
        // gated only by quota and spend, which meant the bulk-upload path
        // (components/wallet/BatchUploadModal.tsx) shipped documents to Gemini with
        // no consent at all — while /trust told the reader the opposite.
        // Here the uploader IS the data subject: no policy row exists yet.
        // Checked before the body is read so a refusal never touches the bytes.
        const uploader = await db.user.findUnique({
            where: { id: authResult.dbUser.id },
            select: { aiProcessingConsentVersion: true },
        })
        if (!uploader?.aiProcessingConsentVersion) {
            trace("consent", "failed", { code: "AI_CONSENT_REQUIRED" })
            return failure("AI_CONSENT_REQUIRED", { correlationId })
        }

        // Cap the AI parse to what the user can actually save: once they are at
        // their policy limit, block the (paid) extraction and surface upgrade.
        const canAdd = await canUserAddPolicy(authResult.dbUser.id)
        if (!canAdd.allowed) {
            await recordConversionEvent(authResult.dbUser.id, "free_ai_call_blocked", {
                kind: "policy_parse",
                source: "policy_extract",
            })
            trace("quota", "failed", { code: "POLICY_LIMIT_REACHED" })
            return failure("POLICY_LIMIT_REACHED", { correlationId })
        }

        try {
            const formData = await req.formData()
            const file = formData.get("file")

            if (!(file instanceof File)) {
                trace("validation", "failed", { code: "FILE_EMPTY" })
                return failure("FILE_EMPTY", { correlationId })
            }

            // Validate size, extension allowlist, content-type, and magic bytes
            // before spending a billable AI call on the (possibly disguised) file.
            const validation = await validateUploadFile(file, {
                category: "policy",
                maxBytes: MAX_UPLOAD_SIZE_BYTES,
            })
            if (!validation.ok) {
                const code = UPLOAD_REJECTION_TO_CODE[validation.reason] ?? "UNSUPPORTED_FORMAT"
                trace("validation", "failed", { code, reason: validation.reason })
                return failure(code, { correlationId })
            }

            // Instance-independent daily backstop. The withApiGuard limiter above
            // is per-minute; this DB-backed 30/day cap counts the
            // POLICY_EXTRACT_REQUESTED rows written below and holds across
            // serverless instances. It is the SPEND cap — distinct from the burst
            // cap, and it does not clear inside a session, which is why it gets
            // its own code and its own message.
            const gate = await enforceBillableCallPolicy({
                userId: authResult.dbUser.id,
                actionType: "POLICY_EXTRACT_REQUESTED",
                redisBucket: `policy-extract-day:${authResult.dbUser.id}`,
                redisLimit: 30,
                redisWindowMs: 24 * 60 * 60 * 1000,
                dbLimit: 30,
                dbWindowMs: 24 * 60 * 60 * 1000,
            })
            if (!gate.allowed) {
                trace("quota", "failed", { code: "DAILY_LIMIT_REACHED" })
                return failure("DAILY_LIMIT_REACHED", { correlationId })
            }

            // Admin runtime override for the extraction operation (cached read;
            // {} = env behavior). The quick path has no line of business yet, so
            // only the operation-level model/provider pin applies here.
            const { getAiRuntimeOverrides } = await import("@/lib/services/ai/runtime-config")
            const overrides = await getAiRuntimeOverrides()
            const extractionOverride = overrides.operations?.extractPolicyData

            // Operator guidance: pre-extraction the LoB is unknown, so only the
            // GLOBAL extractPolicyData guidance row can apply.
            const { getPromptOverrides, resolveOperatorGuidance } =
                await import("@/lib/services/ai/prompt-overrides")
            const promptOverrides = await getPromptOverrides()
            const operatorGuidance = resolveOperatorGuidance(promptOverrides, "extractPolicyData")

            const aiService = getAIService(extractionOverride?.provider)
            if (!aiService.isAvailable()) {
                trace("extraction", "failed", { code: "AI_UNAVAILABLE" })
                return failure("AI_UNAVAILABLE", { correlationId })
            }

            // Auditable spend, written before the billable call so every committed
            // attempt counts toward the DB backstop. userId only — no email, no
            // customer identifiers in the row (GDPR audit M3).
            try {
                await db.activityLog.create({
                    data: {
                        adminUserId: authResult.dbUser.id,
                        adminEmail: "",
                        actionType: "POLICY_EXTRACT_REQUESTED",
                        description: "Policy PDF quick-extract",
                    },
                })
            } catch { /* never fail the parse on a logging error */ }

            const arrayBuffer = await file.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString("base64")

            trace("extraction", "started", { sizeBytes: file.size })

            const result = await aiService.extractPolicyData(
                {
                    data: base64Data,
                    mimeType: file.type,
                    // Sanitized — the raw client filename (often the customer's
                    // name) must not reach the third-party AI provider.
                    fileName: sanitizeDisplayName(file.name),
                },
                { userId: authResult.dbUser.id, modelOverride: extractionOverride?.model, operatorGuidance },
            )

            // ── Recognition gate ────────────────────────────────────────────
            // Computed on the RAW model output by extraction-enrichment, before
            // any placeholder substitution. Without this the quick path happily
            // turned a terms-and-conditions booklet or a blank εναντίωση form
            // into a policy: both name an insurer on every page, so confidence
            // alone never caught them.
            const evidence = result.evidence
            if (evidence && !evidence.sufficient) {
                const code: BatchFailureCode =
                    evidence.reason === "not_a_policy_document"
                        ? "NOT_AN_INSURANCE_POLICY"
                        : "DOCUMENT_NOT_RECOGNIZED"
                trace("recognition", "failed", {
                    code,
                    documentKind: (evidence as any).documentKind ?? result.documentKind ?? null,
                })
                return failure(code, {
                    correlationId,
                    ...((evidence as any).documentKind
                        ? { documentKind: (evidence as any).documentKind }
                        : {}),
                })
            }

            // ── Data-quality gate ───────────────────────────────────────────
            // This route used to substitute `TEMP-${Date.now()}` for an absent
            // policy number, "Unknown Insurer" for an absent insurer and "motor"
            // for an absent line of business. All three are fabrication: the
            // resulting row looked complete, saved silently, and told the user
            // nothing. The fields are reported missing instead, and the modal
            // lets the user supply them from the document in front of them.
            const extracted = {
                insurerName: (result.insurerName || "").trim(),
                policyNumber: (result.policyNumber || "").trim(),
                lineOfBusiness: (result.lineOfBusiness || "").trim(),
                startDate: result.startDate || "",
                endDate: result.endDate || "",
            }
            const missingFields = WALLET_REQUIRED_FIELDS.filter((field) => !extracted[field])

            // The line of business is NEVER a reason to reject a document. An
            // unrecognised one resolves to `other` and is flagged, so a valid
            // policy on a line PolicyWallet has not modelled yet is ingested and
            // labelled rather than failed — see the taxonomy, which is the one
            // place lines are defined.
            const branch = normalizeBranch(extracted.lineOfBusiness)
            const isNewLineOfBusiness = Boolean(extracted.lineOfBusiness) && branch.id === "other"

            const payload = {
                insurerName: extracted.insurerName,
                policyNumber: extracted.policyNumber,
                lineOfBusiness: branch.id,
                /** What the document itself called it, kept when we could not place it. */
                declaredLineOfBusiness: isNewLineOfBusiness ? extracted.lineOfBusiness : undefined,
                startDate: extracted.startDate,
                endDate: extracted.endDate,
                premiumAmount: result.premiumAmount ?? null,
                coverageSummary: result.coverageSummary || null,
                exclusions: result.exclusions ?? [],
                documentKind: result.documentKind,
                extractionMeta: result.extractionMeta,
                acordData: result.acordData,
            }

            if (missingFields.length > 0) {
                trace("data_quality", "failed", {
                    code: "REQUIRED_DATA_MISSING",
                    missingFields,
                    confidence: result.extractionMeta?.overallConfidence ?? null,
                })
                // `partial` is what makes this recoverable rather than terminal:
                // everything the document DID yield travels with the failure, so
                // the user types the one missing number instead of re-uploading.
                return failure(
                    "REQUIRED_DATA_MISSING",
                    { correlationId, missingFields: [...missingFields] },
                    { partial: payload }
                )
            }

            trace("extraction", "succeeded", {
                lineOfBusiness: branch.id,
                newLineOfBusiness: isNewLineOfBusiness,
                confidence: result.extractionMeta?.overallConfidence ?? null,
                requiresReview: result.extractionMeta?.requiresReview ?? null,
            })

            return NextResponse.json({
                success: true,
                correlationId,
                notices: isNewLineOfBusiness ? ["NEW_LINE_OF_BUSINESS"] : [],
                data: payload,
            })
        } catch (error) {
            // Log the real error server-side against the correlation id; never
            // echo internals (AI provider / parser detail) to the client.
            const message = error instanceof Error ? error.message : String(error)
            const isTimeout = /timeout|timed out|abort/i.test(message)
            const code: BatchFailureCode = isTimeout ? "AI_TIMEOUT" : "AI_EXTRACTION_FAILED"
            logger("error", "policy-extract", {
                correlationId,
                batchId,
                stage: "extraction",
                outcome: "failed",
                code,
                durationMs: Date.now() - startedAt,
                error: message,
            })
            return failure(code, { correlationId })
        }
    }
)
