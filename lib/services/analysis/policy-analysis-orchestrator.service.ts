import fs from "fs/promises"
import { isTransientError } from "@/lib/services/ai/shared-utils"
import path from "path"
import { randomUUID } from "crypto"
import { z } from "zod"
import { db } from "@/lib/db"
import { decideGapsForPolicy, GAP_ENGINE_VERSION } from "@/lib/gap-detection"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { canUserUseTokens, reserveTokens, releaseTokenReservation } from "@/lib/token-tracking"
import { getAIService, type AIServiceType } from "@/lib/services/ai"
import { enrichExtractionPayload } from "@/lib/services/ai/extraction-enrichment"
import { parseDocumentDate } from "@/lib/dates/document-date"
import { downloadPolicyDocument } from "@/lib/supabase/storage-download"
import type {
    AIDocument,
    AICapabilityOperation,
    AIGapAnalysisResponse,
    AIPolicyClarityResponse,
    AIPolicyExtractionResponse,
    GapDefinitionForAI,
    PolicyMetadata,
} from "@/lib/services/ai/ai-service.interface"
import { batchTranslateToEnglish } from "@/lib/services/translation/batch-translator"
import {
    collectClarityTextsForTranslation,
    collectGapTextsForTranslation,
} from "@/lib/services/translation/greek-to-bilingual"
import {
    hashDocumentBuffer,
    getCachedExtraction,
    setCachedExtraction,
    setDocumentHash,
} from "./extraction-cache"
import { classifyAnalysisFailure, type FailureClass } from "./failure-classifier"
import { discardFailedPolicy } from "@/lib/services/policy-discard"
import {
    isAnthropicFailoverEnabled,
    isCriticalStep,
    isDegradableStep,
    isDegradedCompletionEnabled,
    isFullFailoverAllowed,
    isOpenAIFailoverEnabled,
    isRemediationAlertingEnabled,
} from "./remediation-policy"
import { evaluateAnalysisIncidentThresholds } from "./incident-dispatcher"
import {
    INSURANCE_CLARITY_CHECKLIST,
    INSURANCE_CLARITY_CHECKLIST_TOTAL_CHECKS,
} from "./insurance-clarity-checklist"
import {
    estimatePolicyAnalysisTokenBudget,
    type PolicyAnalysisStepKey,
} from "./token-budget-estimator"
import { estimateAnalysisRunBudget } from "./run-preflight"
import { getModelForStep, selectPrimaryProvider, fallbackModelFor, type AiRuntimeOverrides } from "@/lib/services/ai/model-router"
import { getAiRuntimeOverrides } from "@/lib/services/ai/runtime-config"
import { getPromptOverrides, resolveOperatorGuidance } from "@/lib/services/ai/prompt-overrides"
// The app's canonical gap-concept table (also used by the gap-engine
// recommendation generator) — here it stops the clarity pipeline from minting
// a new definition for every vocabulary variant the AI invents.
import { pickCanonicalGapDefinition } from "@/lib/wallet/gap-report"
import { detectDeterministicSavings } from "./deterministic-savings"
import { resolveUserEntitlements, resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import {
    emitAnalysisRunTelemetry,
    emitAnalysisStepTelemetry,
} from "./step-telemetry"
import { documentMimeType } from "@/lib/security/file-upload"
import { selectSourceDocument } from "@/lib/wallet/renewal-chain"
import { isPlaceholderInsurerName, isPlaceholderPolicyNumber } from "@/lib/wallet/policy-identity"
import { closeSupersededRenewals } from "@/lib/services/renewal.service"
import { assessRenewalMatch, type RenewalMatch } from "@/lib/wallet/renewal-match"
import { normalizeBranch } from "@/lib/insurance/taxonomy"

const STEP_ORDER: Record<PolicyAnalysisStepKey, number> = {
    document_load_and_validation: 1,
    metadata_extraction_and_verification: 2,
    plain_language_translation: 3,
    coverage_mapping: 4,
    gap_detection: 5,
    savings_detection: 6,
    checklist_scoring_and_actions: 7,
    persistence_and_finalize: 8,
}

const MAX_STEP_ATTEMPTS = 3
const MAX_RUN_ATTEMPTS = 5
const STEP_BACKOFF_MS = [2000, 5000, 10000]
// Must stay BELOW the execute-analysis route's maxDuration (300s): when the
// function is killed at the platform ceiling, the lease has to expire before
// QStash's next redelivery so the retry can re-acquire and resume. At the old
// 8 min the retry landed inside the still-valid lease, no-op'ed with a 200,
// and the run stayed 'running' (and the policy 'analyzing') forever.
const RUN_EXECUTION_LEASE_TTL_MS = 4 * 60 * 1000

// H4: Minimal schema for sourceRun.resultJson — guards retryMissing against propagating corrupt JSON
const sourceRunResultSchema = z.object({
    gapResults: z.array(z.record(z.string(), z.unknown())),
    metadata: z.record(z.string(), z.unknown()).optional(),
    acordData: z.unknown().optional(),
}).passthrough()

type RemediationType = "initial" | "retry" | "model_fallback" | "provider_failover"
type ProviderAttemptOutcome = "success" | "failed"

type ProviderAttemptRecord = {
    stepKey: PolicyAnalysisStepKey
    provider: AIServiceType
    model?: string
    attempt: number
    remediationType: RemediationType
    outcome: ProviderAttemptOutcome
    failureCode?: string
    failureClass?: FailureClass
}

type PipelineRemediationSummary = {
    providerAttempts: ProviderAttemptRecord[]
    degradedSteps: PolicyAnalysisStepKey[]
    missingArtifacts: string[]
    finalUserMessageKey: string
    failoverUsed: boolean
    retryScope?: "full" | "missing_only"
    retrySourceRunId?: string
    translationFailed?: boolean
}

type StepExecutionPayload<T> = {
    result: T
    successPct: number
    logMessage: string
    logJson?: Record<string, unknown>
    usage?: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }
    remediation?: {
        providerAttempts: ProviderAttemptRecord[]
        failureClass?: FailureClass
        userMessageKey?: string
        failureCode?: string
    }
}

export class OrchestrationError extends Error {
    code: string
    retryable: boolean
    hardFailure: boolean
    blockedReason?: string
    failureClass?: FailureClass
    userMessageKey?: string
    remediationProviderAttempts?: ProviderAttemptRecord[]

    constructor(
        message: string,
        options: {
            code: string
            retryable?: boolean
            hardFailure?: boolean
            blockedReason?: string
            failureClass?: FailureClass
            userMessageKey?: string
            remediationProviderAttempts?: ProviderAttemptRecord[]
        }
    ) {
        super(message)
        this.code = options.code
        this.retryable = options.retryable ?? false
        this.hardFailure = options.hardFailure ?? false
        this.blockedReason = options.blockedReason
        this.failureClass = options.failureClass
        this.userMessageKey = options.userMessageKey
        this.remediationProviderAttempts = options.remediationProviderAttempts
    }
}

// One classification, one module: this used to be a stale local copy with the
// bare-substring bugs ('aborted'/'500' anywhere in the message) that
// shared-utils' isTransientError has since fixed.


/**
 * One classification, one module — this is now a thin alias over the canonical
 * `normalizeBranch`.
 *
 * It used to be a second, much weaker normalizer that knew only `auto` and
 * `vehicle`, which meant the AI write path and every read path could disagree
 * about the same policy: an extraction emitting "Marine Cargo" was stored
 * verbatim here while `normalizeBranch` resolved it elsewhere, so the branch a
 * policy displayed under was decided by which code looked at it.
 */
function normalizeLineOfBusiness(value: string | null | undefined): string {
    return normalizeBranch(value).id
}

/**
 * The line of business a re-analysis is allowed to write.
 *
 * A fresh extraction normally supersedes the stored values — that is deliberate,
 * and `reviewState` is reset to `unconfirmed` so the customer re-reviews. The
 * BRANCH is the one exception, because it is not just another field: it selects
 * the score category, the coverage panel, the gap definitions that run and the
 * commission rate an advisor is paid. A confirmed branch is a human answer to
 * exactly the question the model is re-asking, and it wins.
 *
 * This matters more now than it did: widening the extractor's vocabulary means a
 * policy the model previously had no word for — a cargo transit, a fidelity
 * schedule — can come back classified differently on the next run. Where nobody
 * confirmed the old value that is an improvement; where somebody did, it is a
 * regression they already corrected once.
 */
function resolveLineOfBusiness(policy: any, extraction: AIPolicyExtractionResponse): string {
    const confirmed = (policy?.acordData as any)?.extraction?.reviewState === "confirmed"
    if (confirmed && policy?.lineOfBusiness) {
        const stored = normalizeLineOfBusiness(policy.lineOfBusiness)
        const proposed = normalizeLineOfBusiness(extraction.lineOfBusiness || policy.lineOfBusiness)
        if (stored !== proposed) {
            logger("info", "Keeping confirmed line of business over re-extraction", {
                policyId: policy.id,
                stored,
                proposed,
            })
        }
        return stored
    }
    return normalizeLineOfBusiness(extraction.lineOfBusiness || policy?.lineOfBusiness)
}

// Extracted dates arrive as ISO yyyy-MM-dd (prompt normalization — see
// lib/services/ai/prompts.ts; legacy runs emitted DD-MM-YYYY), Greek month
// phrases, or ISO — parseDocumentDate handles all three. When nothing parses
// the existing column value stays (it may be the upload placeholder, which
// the extraction.dateParse flags mark as unusable for display/status).
function parseDateMaybe(input: string | undefined, fallback: Date): Date {
    return parseDocumentDate(input) ?? fallback
}

type DateParseState = "ok" | "failed" | "missing"

function dateParseState(input: string | undefined | null): DateParseState {
    const raw = String(input ?? "").trim()
    if (!raw) return "missing"
    return parseDocumentDate(raw) ? "ok" : "failed"
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAIBackedStep(stepKey: PolicyAnalysisStepKey): boolean {
    return (
        stepKey === "metadata_extraction_and_verification" ||
        stepKey === "plain_language_translation" ||
        stepKey === "gap_detection"
    )
}

function capabilityOperationForStep(stepKey: PolicyAnalysisStepKey): AICapabilityOperation | null {
    if (stepKey === "metadata_extraction_and_verification") return "extractPolicyData"
    if (stepKey === "plain_language_translation") return "analyzePolicyClarity"
    if (stepKey === "gap_detection") return "analyzeGaps"
    return null
}

/**
 * Delegates model selection to the smart model router.
 * The router uses a cost-optimized routing table keyed by (operation, provider, tier).
 * Falls back to env-based defaults configured in the routing table.
 */
function getDefaultModelForStep(
    provider: AIServiceType,
    stepKey: PolicyAnalysisStepKey,
    overrides: AiRuntimeOverrides = {}
): string | undefined {
    return getModelForStep(provider, stepKey, "free", overrides)
}

function fallbackModelForProvider(provider: AIServiceType): string | undefined {
    // Delegate to the router so the model-fallback branch works for every
    // provider (Claude/OpenAI previously had no fallback model and skipped the
    // cheaper same-provider retry). Gemini's fallback is unchanged.
    return fallbackModelFor(provider)
}

function mapMissingArtifacts(stepKey: PolicyAnalysisStepKey): string[] {
    switch (stepKey) {
        case "plain_language_translation":
            return ["plain_language_summary", "coverage_snapshot"]
        case "coverage_mapping":
            return ["coverage_map"]
        case "gap_detection":
            return ["gap_results"]
        case "savings_detection":
            return ["savings_opportunities"]
        case "checklist_scoring_and_actions":
            return ["checklist_scores", "priority_actions"]
        default:
            return [stepKey]
    }
}

const FALLBACK_DEGRADED_SUMMARY = {
    en: "Summary unavailable due to analysis degradation.",
    el: "Η σύνοψη δεν είναι διαθέσιμη λόγω υποβάθμισης ανάλυσης.",
}

const FALLBACK_STORED_SUMMARY = {
    en: "Summary unavailable",
    el: "Μη διαθέσιμη σύνοψη",
}

function createFallbackClarity(): AIPolicyClarityResponse {
    return {
        plainLanguageSummary: FALLBACK_DEGRADED_SUMMARY,
        coverageSnapshot: {
            covered: [],
            notCovered: [],
            limits: [],
            deductibles: [],
            exclusions: [],
        },
        savingsOpportunities: [],
        coverageGaps: [],
        checklistScores: [],
        priorityActions: [],
    }
}

function createFallbackGapAnalysis(metadata: PolicyMetadata): AIGapAnalysisResponse {
    return {
        verifiedMetadata: {
            insurerName: metadata.insurerName,
            policyNumber: metadata.policyNumber,
            lineOfBusiness: metadata.lineOfBusiness,
            startDate: metadata.startDate.toISOString().split("T")[0],
            endDate: metadata.endDate.toISOString().split("T")[0],
            premiumAmount: metadata.premiumAmount ?? undefined,
            coverageSummary: metadata.coverageSummary || undefined,
        },
        gapResults: [],
    }
}

export class PolicyAnalysisOrchestratorService {
    /**
     * Free/Starter "parse": run ONLY the extraction step and persist the basic
     * summary (insurer, policy number, line of business, dates, premium,
     * coverage summary). No clarity / gaps / translation — those are the Plus
     * (deep) pipeline. This is the single paid-AI operation free/Starter may
     * run and is not token-gated (the policy-count cap bounds it). Returns a
     * lightweight status; never creates a PolicyAnalysisRun.
     */
    async extractBasicSummary(
        policyId: string,
        userId: string
    ): Promise<{ status: "completed" | "blocked" | "failed"; reason?: string }> {
        const policy = await this.loadAuthorizedPolicy(policyId, userId)

        // GDPR Art. 9 consent gate — same as the deep pipeline: no document
        // bytes reach the LLM without the owner's AI-processing consent.
        const owner = await db.user.findUnique({
            where: { id: policy.ownerUserId },
            select: { aiProcessingConsentVersion: true },
        })
        if (!owner?.aiProcessingConsentVersion) {
            return { status: "blocked", reason: "ai_consent_missing" }
        }

        if (!policy.documents?.length) {
            return { status: "failed", reason: "no_document" }
        }

        try {
            const prepared = await this.prepareDocument(policyId)
            const service = getAIService()
            // Meter the spend: without userId the provider records no TokenUsage
            // row, so this free/Starter parse ran entirely off the books.
            const extraction = await service.extractPolicyData(prepared.document, {
                userId,
                policyId,
                lineOfBusinessHint: policy.lineOfBusiness,
            })
            const metadata = this.buildMetadata(policy, extraction)

            // A renewal that names a different policy is refused above (the
            // period does not move) and reported here, so the wallet can say
            // WHY nothing changed instead of quietly looking unchanged. Written
            // on every renewal run, so a corrected re-upload clears a stale
            // mismatch rather than leaving the customer reading an old error.
            const renewalReview =
                extraction.documentKind === "renewal_notice"
                    ? { acordData: {
                          ...(((policy.acordData as Record<string, unknown>) || {})),
                          // undefined rather than null: JSON.stringify drops the
                          // key, which is how a corrected re-upload clears it.
                          renewalReview:
                              this.renewalReviewRecord(this.assessRenewal(policy, extraction), new Date()) ?? undefined,
                      } as any }
                    : {}

            await db.policy.update({
                where: { id: policyId },
                data: {
                    insurerName: metadata.insurerName,
                    policyNumber: metadata.policyNumber,
                    lineOfBusiness: metadata.lineOfBusiness,
                    ...(metadata.startDate ? { startDate: metadata.startDate } : {}),
                    ...(metadata.endDate ? { endDate: metadata.endDate } : {}),
                    ...(metadata.premiumAmount != null ? { premiumAmount: metadata.premiumAmount } : {}),
                    ...(metadata.coverageSummary ? { coverageSummary: metadata.coverageSummary } : {}),
                    ...renewalReview,
                    status: "active",
                },
            })
            await db.policyDocument.updateMany({
                where: { policyId },
                data: { processingStatus: "completed" },
            })

            // Recompute the owner's DETERMINISTIC gaps + protection score. This is
            // the free/Starter path — the deep AI gap analysis is gated to Plus,
            // but the profile gaps ("you have a car and no motor policy") and the
            // score are rule-based, need no tokens, and ARE shown to free users.
            // Without this a new user finishing onboarding — their first policy,
            // their first impression — saw an empty score and no gaps until a
            // once-daily cron caught up. Best-effort: extraction already committed.
            try {
                const { refreshProtectionScore } = await import("@/lib/services/gap-engine")
                await refreshProtectionScore(policy.ownerUserId)
            } catch (error) {
                logger("warn", "Gap recompute after basic summary failed", {
                    policyId, error: error instanceof Error ? error.message : String(error),
                })
            }

            // Evidence closes a review: a held policy for the sphere an open
            // review asked about IS the looking the review asked for. One
            // closer for both completion paths; it never throws.
            const { closeReviewsByPolicyEvidence } = await import("@/lib/services/risk-review/service")
            await closeReviewsByPolicyEvidence({ policyId })

            return { status: "completed" }
        } catch (error) {
            logger("error", "extractBasicSummary failed", {
                policyId,
                userId,
                error: error instanceof Error ? error.message : String(error),
            })
            await db.policyDocument.updateMany({
                where: { policyId },
                data: { processingStatus: "failed" },
            })
            return { status: "failed", reason: "extraction_failed" }
        }
    }

    async createRun(policyId: string, userId: string) {
        const policy = await this.loadAuthorizedPolicy(policyId, userId)

        // Primary provider comes from the router (admin DB override ->
        // AI_SERVICE_TYPE -> key priority), not a hardcoded "gemini". Under the
        // default env this resolves to gemini with the same clarity model as
        // before, so run rows are unchanged; admins can now pin the primary
        // provider (and per-operation models) from /admin/ai/settings.
        const runtimeOverrides = await getAiRuntimeOverrides()
        const primaryProvider = selectPrimaryProvider(runtimeOverrides)
        const primaryRunModel =
            getModelForStep(primaryProvider, "plain_language_translation", "free", runtimeOverrides) ??
            env.GEMINI_MODEL_CLARITY_ANALYSIS

        // GDPR Art. 9 gate: the policy OWNER (the data subject — documents can
        // carry special-category health data) must have granted explicit AI-processing
        // consent before any document bytes reach an LLM provider. Checked before any
        // policy/document status mutation so a blocked attempt leaves no churn.
        const owner = await db.user.findUnique({
            where: { id: policy.ownerUserId },
            select: { aiProcessingConsentVersion: true },
        })
        if (!owner?.aiProcessingConsentVersion) {
            return db.policyAnalysisRun.create({
                data: {
                    policyId,
                    userId,
                    provider: primaryProvider,
                    model: primaryRunModel,
                    status: "blocked",
                    blockedReason: "ai_consent_missing",
                    failureCode: "AI_CONSENT_REQUIRED",
                    failureMessage: "Policy owner has not granted AI-processing consent",
                    finishedAt: new Date(),
                },
            })
        }

        // Paywall: DEEP AI analysis (clarity + gaps + translation) is a Plus
        // feature (code key "pro"). Free and Starter get the basic parsed
        // summary only — extraction runs at upload (policies/extract, policy-cap
        // gated) and never reaches this deep pipeline. Agents are metered by
        // their own agent-plan budget (canAgentRunAnalysis at the action layer +
        // the token gate below), so the tier block never applies to them.
        const initiator = await db.user.findUnique({
            where: { id: userId },
            select: { roles: true },
        })
        const isAgentInitiator = Boolean(initiator?.roles?.includes("agent"))

        // Resolve tier for priority queue: pro=2, plus=1, free=0
        const userEntitlements = await resolveUserEntitlements(userId)

        if (!isAgentInitiator && userEntitlements.tier !== "pro") {
            return db.policyAnalysisRun.create({
                data: {
                    policyId,
                    userId,
                    provider: primaryProvider,
                    model: primaryRunModel,
                    status: "blocked",
                    blockedReason: "free_tier_ai_locked",
                    failureCode: "UPGRADE_REQUIRED",
                    failureMessage: "Full AI analysis is a Plus feature; free and Starter plans get the basic summary only",
                    finishedAt: new Date(),
                },
            })
        }

        // ONE estimator, shared with the agent upload's pre-flight
        // (lib/services/analysis/run-preflight.ts): the number the modal
        // decides on before it answers is the number this gate refuses on.
        const estimation = await estimateAnalysisRunBudget({
            lineOfBusiness: policy.lineOfBusiness,
            hasDocument: policy.documents.length > 0,
        })

        // Priority queue: for an agent-initiated run, honor the AGENT tier's
        // priorityQueue entitlement (sold Pro+) — the B2C tier below would
        // always resolve an agent to 0. Otherwise use the B2C tier ladder.
        let queuePriority = userEntitlements.tier === "pro" ? 2 : userEntitlements.tier === "plus" ? 1 : 0
        if (isAgentInitiator) {
            const agentEntitlements = await resolveAgentEntitlements(userId)
            queuePriority = agentEntitlements.limits.priorityQueue ? 2 : 0
        }

        const run = await db.policyAnalysisRun.create({
            data: {
                policyId,
                userId,
                provider: primaryProvider,
                model: primaryRunModel,
                status: "queued",
                priority: queuePriority,
                estimatedTokens: estimation.totalEstimatedTokens,
            },
        })

        await db.policy.update({
            where: { id: policyId },
            data: { status: "analyzing" },
        })

        await db.policyDocument.updateMany({
            where: { policyId },
            data: { processingStatus: "processing" },
        })

        // Only pro (Plus) policyholders and agents reach here; the token budget
        // is the meter (pro = 3M, agent = plan budget).
        const gate = await canUserUseTokens(userId, estimation.totalEstimatedTokens)
        if (!gate.allowed) {
            const blockedRun = await db.policyAnalysisRun.update({
                where: { id: run.id },
                data: {
                    status: "blocked",
                    blockedReason: gate.reason || "insufficient_tokens",
                    failureCode: "TOKEN_LIMIT_BLOCKED",
                    failureMessage: `Token budget check failed: ${gate.reason || "insufficient tokens"}`,
                    finishedAt: new Date(),
                },
            })

            await db.policy.update({
                where: { id: policyId },
                data: {
                    status: "action_needed",
                    acordData: {
                        ...(policy.acordData as any),
                        analysis: {
                            ...(((policy.acordData as any)?.analysis as Record<string, unknown>) || {}),
                            pipeline: {
                                ...(((policy.acordData as any)?.analysis?.pipeline as Record<string, unknown>) || {}),
                                runId: run.id,
                                provider: primaryProvider,
                                status: "blocked",
                                missingSections: [],
                                lastFailureCode: "TOKEN_LIMIT_BLOCKED",
                                lastFailureAt: new Date().toISOString(),
                            },
                        },
                        processingError: {
                            code: "TOKEN_LIMIT_BLOCKED",
                            message: `Policy analysis blocked due to token limits (${gate.reason || "insufficient tokens"})`,
                            retryable: true,
                            occurredAt: new Date().toISOString(),
                        },
                    },
                },
            })

            // Documents were set to "processing" before the token gate — reset them
            // so the wallet UI doesn't show a perpetual spinner for a blocked run.
            await db.policyDocument.updateMany({
                where: { policyId, processingStatus: "processing" },
                data: { processingStatus: "failed" },
            })

            return blockedRun
        }

        return run
    }

    async createAndExecuteRun(policyId: string, userId: string, language: "en" | "el" = "en") {
        const run = await this.createRun(policyId, userId)
        if (run.status === "blocked") {
            return this.getRunStatus(run.id, userId)
        }

        await this.executeRun(run.id, language)
        return this.getRunStatus(run.id, userId)
    }

    async getRunStatus(runId: string, userId: string) {
        return db.policyAnalysisRun.findFirst({
            where: {
                id: runId,
                userId,
            },
            include: {
                steps: {
                    orderBy: [{ stepOrder: "asc" }, { attempt: "asc" }],
                },
            },
        })
    }

    private buildExecutionLeaseExpiry() {
        return new Date(Date.now() + RUN_EXECUTION_LEASE_TTL_MS)
    }

    private async tryAcquireRunLease(runId: string, leaseId: string): Promise<boolean> {
        const now = new Date()
        const acquired = await db.policyAnalysisRun.updateMany({
            where: {
                id: runId,
                OR: [
                    { executionLeaseId: null },
                    { executionLeaseExpiresAt: null },
                    { executionLeaseExpiresAt: { lt: now } },
                    { executionLeaseId: leaseId },
                ],
            },
            data: {
                executionLeaseId: leaseId,
                executionLeaseExpiresAt: this.buildExecutionLeaseExpiry(),
                leaseHeartbeatAt: now,
            },
        })
        return acquired.count === 1
    }

    private async heartbeatRunLease(runId: string, leaseId: string): Promise<void> {
        const now = new Date()
        const refreshed = await db.policyAnalysisRun.updateMany({
            where: {
                id: runId,
                executionLeaseId: leaseId,
            },
            data: {
                executionLeaseExpiresAt: this.buildExecutionLeaseExpiry(),
                leaseHeartbeatAt: now,
            },
        })

        if (refreshed.count !== 1) {
            throw new OrchestrationError("Run execution lease lost", {
                code: "RUN_LEASE_LOST",
                retryable: true,
            })
        }
    }

    private async releaseRunLease(runId: string, leaseId: string): Promise<void> {
        await db.policyAnalysisRun.updateMany({
            where: {
                id: runId,
                executionLeaseId: leaseId,
            },
            data: {
                executionLeaseId: null,
                executionLeaseExpiresAt: null,
                leaseHeartbeatAt: new Date(),
            },
        })
    }

    /**
     * Fail runs whose execution lease expired without a resume — the holder
     * died (serverless kill) and QStash's redeliveries were exhausted inside
     * the lease window. Everything for one run happens in ONE transaction so a
     * crash mid-reap cannot leave the run 'failed' but the policy stuck
     * 'analyzing' — a state no later pass would ever revisit. The failure
     * shape mirrors failRun (remediationSummary + acordData.analysis.pipeline
     * + processingError) so reaped runs render identically to orchestrator-
     * failed ones.
     */
    async reapStaleRuns(options?: {
        graceMs?: number
        limit?: number
        // Scope to specific policies — used by user-facing surfaces to self-heal
        // exactly the policy the user is staring at, without a global sweep.
        policyIds?: string[]
    }): Promise<{
        staleCandidates: number
        reaped: number
        /** Reaped runs whose placeholder-only policy was removed outright. */
        discarded: number
    }> {
        const graceMs = options?.graceMs ?? 5 * 60 * 1000
        const limit = options?.limit ?? 50
        const cutoff = new Date(Date.now() - graceMs)

        const staleRuns = await db.policyAnalysisRun.findMany({
            where: {
                status: "running",
                executionLeaseExpiresAt: { lt: cutoff },
                ...(options?.policyIds?.length ? { policyId: { in: options.policyIds } } : {}),
            },
            select: { id: true, policyId: true, provider: true },
            orderBy: { executionLeaseExpiresAt: "asc" },
            take: limit,
        })

        let reaped = 0
        let discarded = 0
        for (const run of staleRuns) {
            const remediationSummary: PipelineRemediationSummary = {
                providerAttempts: [],
                degradedSteps: [],
                missingArtifacts: [],
                finalUserMessageKey: "analysis.errors.generic",
                failoverUsed: false,
                retryScope: "full",
            }
            const didReap = await db.$transaction(async (tx) => {
                // Guarded: only reap if the run is STILL running with the same
                // expired lease — a redelivery that resumed it in the meantime
                // has refreshed the lease and must not be clobbered.
                const failed = await tx.policyAnalysisRun.updateMany({
                    where: {
                        id: run.id,
                        status: "running",
                        executionLeaseExpiresAt: { lt: cutoff },
                    },
                    data: {
                        status: "failed",
                        failureCode: "LEASE_EXPIRED",
                        failureMessage: "Analysis executor died and the run was never resumed",
                        remediationSummary: remediationSummary as any,
                        executionLeaseId: null,
                        executionLeaseExpiresAt: null,
                        finishedAt: new Date(),
                    },
                })
                if (failed.count !== 1) return false

                // acordData is fetched INSIDE the transaction so the merge is
                // never a stale snapshot of a concurrently-updated policy.
                const policy = await tx.policy.findUnique({
                    where: { id: run.policyId },
                    select: { acordData: true },
                })
                const acordData = (policy?.acordData as Record<string, any> | null) || {}
                await tx.policy.update({
                    where: { id: run.policyId },
                    data: {
                        status: "action_needed",
                        acordData: {
                            ...acordData,
                            analysis: {
                                ...((acordData.analysis as Record<string, unknown>) || {}),
                                pipeline: {
                                    ...(((acordData.analysis as any)?.pipeline as Record<
                                        string,
                                        unknown
                                    >) || {}),
                                    runId: run.id,
                                    provider: run.provider,
                                    status: "failed",
                                    lastFailureCode: "LEASE_EXPIRED",
                                    lastFailureAt: new Date().toISOString(),
                                },
                            },
                            processingError: {
                                code: "LEASE_EXPIRED",
                                message: "Analysis was interrupted and did not resume",
                                retryable: true,
                                occurredAt: new Date().toISOString(),
                            },
                        },
                    },
                })
                await tx.policyDocument.updateMany({
                    where: { policyId: run.policyId, processingStatus: "processing" },
                    data: { processingStatus: "failed" },
                })
                return true
            })
            if (!didReap) continue
            reaped += 1

            // Process death is the one failure path no in-process handler can
            // cover, so the discard rule is applied here too: a policy that is
            // nothing but placeholders, whose executor died, holds nothing a
            // re-upload would not reproduce — and left behind it shows the
            // customer a policy the product knows nothing about.
            const outcome = await discardFailedPolicy(run.policyId, {
                reason: "LEASE_EXPIRED",
            }).catch((error) => {
                logger("warn", "Discard after reap failed", {
                    policyId: run.policyId,
                    error: error instanceof Error ? error.message : String(error),
                })
                return null
            })
            if (outcome?.discarded) discarded += 1
        }

        if (reaped > 0) {
            logger("info", "Reaped stale analysis runs", {
                staleCandidates: staleRuns.length,
                reaped,
                discarded,
            })
        }
        return { staleCandidates: staleRuns.length, reaped, discarded }
    }

    async retryMissing(runId: string, userId: string, language: "en" | "el" = "en") {
        const sourceRun = await db.policyAnalysisRun.findFirst({
            where: {
                id: runId,
                userId,
            },
            include: {
                policy: {
                    include: {
                        documents: true,
                    },
                },
            },
        })

        if (!sourceRun) {
            throw new Error("Analysis run not found")
        }
        if (sourceRun.status !== "completed_with_warnings") {
            throw new Error("Retry missing is only available for degraded completed runs")
        }

        const summary =
            (sourceRun.remediationSummary as PipelineRemediationSummary | null) ||
            ((sourceRun.resultJson as any)?.remediation as PipelineRemediationSummary | null)
        const degradedSteps = (summary?.degradedSteps || []).filter((step): step is PolicyAnalysisStepKey =>
            isDegradableStep(step as PolicyAnalysisStepKey)
        )

        if (!degradedSteps.length) {
            throw new Error("No missing degradable steps found for this run")
        }

        const rerun = await this.createRun(sourceRun.policyId, userId)
        if (rerun.status === "blocked") {
            return this.getRunStatus(rerun.id, userId)
        }

        await this.executeRun(rerun.id, language, {
            retryOnlySteps: new Set(degradedSteps),
            retrySourceRunId: sourceRun.id,
        })

        return this.getRunStatus(rerun.id, userId)
    }

    async executeRun(
        runId: string,
        language: "en" | "el" = "en",
        options?: {
            retryOnlySteps?: Set<PolicyAnalysisStepKey>
            retrySourceRunId?: string
            // Queue consumers set this so a held lease surfaces as a retryable
            // error (503) instead of a silent no-op 200 — otherwise QStash
            // marks the delivery done and a killed executor's run is orphaned.
            throwOnLeaseHeld?: boolean
        }
    ) {
        const existing = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
        })
        if (!existing) {
            throw new Error("Analysis run not found")
        }
        if (
            existing.status === "blocked" ||
            existing.status === "completed" ||
            existing.status === "completed_with_warnings"
        ) {
            return existing
        }

        const leaseId = randomUUID()
        const leaseAcquired = await this.tryAcquireRunLease(runId, leaseId)
        if (!leaseAcquired) {
            const currentRun = await db.policyAnalysisRun.findUnique({
                where: { id: runId },
            })
            logger("info", "Skipping duplicate policy analysis execution due to active lease", {
                runId,
                status: currentRun?.status || null,
                executionLeaseId: currentRun?.executionLeaseId || null,
                executionLeaseExpiresAt: currentRun?.executionLeaseExpiresAt || null,
            })
            if (options?.throwOnLeaseHeld) {
                throw new OrchestrationError("Run execution lease held by another executor", {
                    code: "RUN_LEASE_HELD",
                    retryable: true,
                })
            }
            return currentRun
        }

        let lastError: OrchestrationError | null = null
        const runStartedAt = existing.startedAt || new Date()

        // Keep the lease fresh for as long as this process is alive, independent
        // of step duration — a single AI call (timeout 180s × retries) can exceed
        // the lease TTL between step-boundary heartbeats. Failures are swallowed
        // here: if the lease is genuinely lost, the next step-boundary heartbeat
        // throws RUN_LEASE_LOST and aborts the attempt.
        const leaseRefreshTimer = setInterval(() => {
            void this.heartbeatRunLease(runId, leaseId).catch(() => {})
        }, 60_000)

        try {
            await this.heartbeatRunLease(runId, leaseId)

            for (let runAttempt = existing.runAttempt; runAttempt <= MAX_RUN_ATTEMPTS; runAttempt++) {
                await this.heartbeatRunLease(runId, leaseId)

                const updatedToRunning = await db.policyAnalysisRun.updateMany({
                    where: {
                        id: runId,
                        executionLeaseId: leaseId,
                    },
                    data: {
                        status: "running",
                        runAttempt,
                        startedAt: runStartedAt,
                        failureCode: null,
                        failureMessage: null,
                    },
                })

                if (updatedToRunning.count !== 1) {
                    throw new OrchestrationError("Run execution lease lost while marking running", {
                        code: "RUN_LEASE_LOST",
                        retryable: true,
                    })
                }

                try {
                    const terminalRun = await this.executePipelineAttempt(runId, language, leaseId, options)
                    if (
                        terminalRun?.status === "completed" ||
                        terminalRun?.status === "completed_with_warnings"
                    ) {
                        return terminalRun
                    }
                    return db.policyAnalysisRun.findUnique({ where: { id: runId } })
                } catch (error) {
                    const orchestrationError =
                        error instanceof OrchestrationError
                            ? error
                            : new OrchestrationError(
                                  error instanceof Error ? error.message : "Analysis pipeline failed",
                                  {
                                      code: "PIPELINE_ERROR",
                                      retryable: isTransientError(error),
                                  }
                              )

                    lastError = orchestrationError

                    if (orchestrationError.blockedReason) {
                        await this.failRun(runId, "blocked", orchestrationError, leaseId)
                        break
                    }

                    if (
                        orchestrationError.hardFailure ||
                        !orchestrationError.retryable ||
                        runAttempt >= MAX_RUN_ATTEMPTS
                    ) {
                        await this.failRun(runId, "failed", orchestrationError, leaseId)
                        break
                    }

                    const delayMs = Math.min(2000 * Math.pow(2, runAttempt - 1), 20000)
                    logger("warn", "Retrying policy analysis run after transient failure", {
                        runId,
                        runAttempt,
                        delayMs,
                        code: orchestrationError.code,
                        message: orchestrationError.message,
                    })
                    await sleep(delayMs)
                }
            }

            const terminalRun = await db.policyAnalysisRun.findUnique({
                where: { id: runId },
                include: {
                    user: {
                        select: { roles: true },
                    },
                },
            })

            if (
                terminalRun &&
                (await isRemediationAlertingEnabled(terminalRun.userId, terminalRun.user?.roles)) &&
                (terminalRun.status === "completed_with_warnings" ||
                    terminalRun.status === "failed" ||
                    terminalRun.status === "blocked")
            ) {
                await evaluateAnalysisIncidentThresholds().catch((thresholdError) => {
                    logger("warn", "Failed to evaluate remediation incident thresholds", {
                        runId,
                        error:
                            thresholdError instanceof Error
                                ? thresholdError.message
                                : String(thresholdError),
                    })
                })
            }

            if (terminalRun) {
                return terminalRun
            }
            if (lastError) {
                await this.failRun(runId, "failed", lastError, leaseId)
            }
            return db.policyAnalysisRun.findUnique({ where: { id: runId } })
        } finally {
            clearInterval(leaseRefreshTimer)
            await this.releaseRunLease(runId, leaseId).catch((error) => {
                logger("warn", "Failed to release policy analysis execution lease", {
                    runId,
                    leaseId,
                    error: error instanceof Error ? error.message : String(error),
                })
            })
        }
    }

    private async executePipelineAttempt(
        runId: string,
        language: "en" | "el",
        leaseId: string,
        options?: {
            retryOnlySteps?: Set<PolicyAnalysisStepKey>
            retrySourceRunId?: string
        }
    ) {
        const run = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
            include: {
                user: {
                    select: {
                        roles: true,
                    },
                },
                policy: {
                    include: {
                        documents: {
                            orderBy: { uploadedAt: "desc" },
                        },
                    },
                },
            },
        })

        if (!run) {
            throw new OrchestrationError("Analysis run not found", {
                code: "RUN_NOT_FOUND",
                hardFailure: true,
            })
        }
        await this.heartbeatRunLease(runId, leaseId)

        const policy = run.policy
        const userRoles = run.user?.roles
        const primaryProvider: AIServiceType =
            run.provider === "gemini" ||
            run.provider === "openai" ||
            run.provider === "anthropic" ||
            run.provider === "mock"
                ? (run.provider as AIServiceType)
                : "gemini"

        const fallbackOpenAI = getAIService("openai")
        const primaryService = getAIService(primaryProvider)
        // One resolve, three reads: getFlags() is cached, so these do not cost
        // three round trips.
        const [failoverEnabled, degradedEnabled, fullFailoverAllowed] = await Promise.all([
            isOpenAIFailoverEnabled(run.userId, userRoles),
            isDegradedCompletionEnabled(run.userId, userRoles),
            isFullFailoverAllowed(run.userId, userRoles),
        ])

        if (!primaryService.isAvailable()) {
            if (!(failoverEnabled && fallbackOpenAI.isAvailable())) {
                throw new OrchestrationError("AI service unavailable", {
                    code: "AI_UNAVAILABLE",
                    hardFailure: true,
                })
            }
        }

        const gapDefinitions = await this.getGapDefinitionsForPolicy(policy.lineOfBusiness)

        // Admin operator guidance, resolved once per attempt (cached reader,
        // never throws). The deep pipeline knows the policy's line of business,
        // so LoB-scoped rows beat the operation's global row.
        const promptOverrides = await getPromptOverrides()
        const guidanceFor = (
            operation: "extractPolicyData" | "analyzePolicyClarity" | "analyzeGaps"
        ) => resolveOperatorGuidance(promptOverrides, operation, policy.lineOfBusiness)

        const tokenBudget = estimatePolicyAnalysisTokenBudget({
            hasDocument: policy.documents.length > 0,
            gapDefinitionsCount: gapDefinitions.length,
            checklistPillarsCount: INSURANCE_CLARITY_CHECKLIST.length,
        })

        const stepScores: number[] = []
        let totalInputTokens = 0
        let totalOutputTokens = 0

        const providerAttempts: ProviderAttemptRecord[] = []
        const degradedSteps = new Set<PolicyAnalysisStepKey>()
        const missingArtifacts = new Set<string>()
        let finalUserMessageKey = "analysis.status.completed"
        let lastFailureCode: string | null = null
        let lastFailureAt: string | null = null
        let translationFailed = false

        const retryOnlySteps = options?.retryOnlySteps
        const shouldRun = (stepKey: PolicyAnalysisStepKey) =>
            !retryOnlySteps || retryOnlySteps.has(stepKey) || !isDegradableStep(stepKey)

        const clarityDependentSteps = new Set<PolicyAnalysisStepKey>([
            "plain_language_translation",
            "coverage_mapping",
            "savings_detection",
            "checklist_scoring_and_actions",
        ])
        const shouldRunClarityGroup =
            !retryOnlySteps ||
            Array.from(clarityDependentSteps).some((stepKey) => retryOnlySteps.has(stepKey))

        let sourceRunResult: Record<string, any> | null = null
        if (options?.retrySourceRunId) {
            const sourceRun = await db.policyAnalysisRun.findFirst({
                where: {
                    id: options.retrySourceRunId,
                    policyId: policy.id,
                },
                select: { resultJson: true },
            })
            const rawResult = (sourceRun?.resultJson as Record<string, any>) || null
            // H4: Validate before trusting — partially written JSON propagates corruption
            if (rawResult !== null) {
                const parsed = sourceRunResultSchema.safeParse(rawResult)
                if (parsed.success) {
                    sourceRunResult = parsed.data as Record<string, any>
                } else {
                    logger("warn", "retryMissing: sourceRun.resultJson schema validation failed — falling back to fresh analysis", {
                        runId: options.retrySourceRunId,
                        issues: parsed.error.issues.map((i) => i.message),
                    })
                    sourceRunResult = null
                }
            }
        }

        const storedClarity =
            this.extractStoredClarity(policy.acordData as Record<string, unknown> | null) ||
            createFallbackClarity()
        const storedGapAnalysis =
            this.extractStoredGapAnalysisFromResult(sourceRunResult) ||
            createFallbackGapAnalysis(
                this.buildMetadata(policy, {
                    insurerName: policy.insurerName,
                    policyNumber: policy.policyNumber,
                    lineOfBusiness: policy.lineOfBusiness,
                    startDate: policy.startDate.toISOString().split("T")[0],
                    endDate: policy.endDate.toISOString().split("T")[0],
                    premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : 0,
                    coverageSummary: policy.coverageSummary || "",
                })
            )

        const absorbPayload = <T,>(payload: StepExecutionPayload<T>) => {
            if (payload.usage) {
                totalInputTokens += payload.usage.inputTokens
                totalOutputTokens += payload.usage.outputTokens
            }
            if (payload.remediation?.providerAttempts?.length) {
                providerAttempts.push(...payload.remediation.providerAttempts)
            }
            stepScores.push(payload.successPct)
        }

        const markDegraded = (stepKey: PolicyAnalysisStepKey, error: OrchestrationError) => {
            degradedSteps.add(stepKey)
            for (const item of mapMissingArtifacts(stepKey)) {
                missingArtifacts.add(item)
            }
            finalUserMessageKey = "analysis.status.completedWithWarnings"
            lastFailureCode = error.code
            lastFailureAt = new Date().toISOString()
            if (error.remediationProviderAttempts?.length) {
                providerAttempts.push(...error.remediationProviderAttempts)
            }
        }

        const createSkippedStep = async (stepKey: PolicyAnalysisStepKey, reason: string) => {
            await db.policyAnalysisStep.create({
                data: {
                    runId,
                    stepKey,
                    stepOrder: STEP_ORDER[stepKey],
                    status: "skipped",
                    attempt: 1,
                    successPct: 100,
                    logMessage: reason,
                    logJson: {
                        retryMode: options?.retrySourceRunId ? "missing_only" : "full",
                    },
                    startedAt: new Date(),
                    finishedAt: new Date(),
                },
            })
        }

        const docStep = await this.executeStepWithRetry({
            runId,
            leaseId,
            policyId: policy.id,
            userId: run.userId,
            userRoles,
            stepKey: "document_load_and_validation",
            estimatedTokens: tokenBudget.byStep.document_load_and_validation,
            allowFallbackModel: false,
            allowProviderFailover: false,
            preferredProvider: primaryProvider,
            includesDocumentContext: false,
            execute: async () => {
                const prepared = await this.prepareDocument(policy.id)
                const checksPassed = prepared.document ? 3 : 1
                return {
                    result: prepared,
                    successPct: Math.round((checksPassed / 3) * 100),
                    logMessage: "Document loaded and validated",
                    logJson: {
                        mimeType: prepared.document?.mimeType || null,
                    },
                }
            },
        })
        absorbPayload(docStep)

        // Check extraction cache before running AI extraction
        // Pass documentId so a re-upload with the same hash doesn't return a stale cache
        const cachedExtraction = await getCachedExtraction(
            policy.id,
            docStep.result.documentHash,
            docStep.result.documentId
        )

        let extractionStep: StepExecutionPayload<AIPolicyExtractionResponse>
        if (cachedExtraction) {
            logger("info", "Using cached extraction — skipping AI call", {
                runId,
                policyId: policy.id,
                documentHash: docStep.result.documentHash.slice(0, 12),
            })

            const checks = [
                Boolean(cachedExtraction.insurerName),
                Boolean(cachedExtraction.policyNumber),
                Boolean(cachedExtraction.lineOfBusiness),
                Boolean(cachedExtraction.startDate),
                Boolean(cachedExtraction.endDate),
                cachedExtraction.premiumAmount !== undefined,
            ]
            const checksPassed = checks.filter(Boolean).length

            extractionStep = {
                result: cachedExtraction,
                successPct: Math.round((checksPassed / checks.length) * 100),
                logMessage: "Metadata loaded from extraction cache",
                logJson: {
                    insurerName: cachedExtraction.insurerName,
                    policyNumber: cachedExtraction.policyNumber,
                    lineOfBusiness: cachedExtraction.lineOfBusiness,
                    cached: true,
                },
            }
            stepScores.push(extractionStep.successPct)
        } else {
            extractionStep = await this.executeStepWithRetry({
                runId,
                leaseId,
                policyId: policy.id,
                userId: run.userId,
                userRoles,
                stepKey: "metadata_extraction_and_verification",
                estimatedTokens: tokenBudget.byStep.metadata_extraction_and_verification,
                allowFallbackModel: true,
                allowProviderFailover: failoverEnabled,
                preferredProvider: primaryProvider,
                includesDocumentContext: true,
                capabilityOperation: "extractPolicyData",
                documentMimeType: docStep.result.document.mimeType,
                failoverDataAllowed: fullFailoverAllowed,
                execute: async ({ modelOverride, provider, service, remediationAttempt, remediationType }) => {
                    const extraction = await service.extractPolicyData(docStep.result.document, {
                        userId: run.userId,
                        policyId: policy.id,
                        modelOverride,
                        provider,
                        remediationAttempt,
                        fallbackType:
                            remediationType === "provider_failover" || remediationType === "model_fallback"
                                ? remediationType
                                : undefined,
                        operatorGuidance: guidanceFor("extractPolicyData"),
                        // Selects the line-of-business knowledge pack composed
                        // into the prompt. A hint only: the model still reports
                        // the line it reads, so a stale column costs a paragraph
                        // of irrelevant guidance rather than a wrong branch.
                        lineOfBusinessHint: policy.lineOfBusiness,
                    })

                    const checks = [
                        Boolean(extraction.insurerName),
                        Boolean(extraction.policyNumber),
                        Boolean(extraction.lineOfBusiness),
                        Boolean(extraction.startDate),
                        Boolean(extraction.endDate),
                        extraction.premiumAmount !== undefined,
                    ]
                    const checksPassed = checks.filter(Boolean).length

                    return {
                        result: extraction,
                        successPct: Math.round((checksPassed / checks.length) * 100),
                        logMessage: "Metadata extracted and verified",
                        logJson: {
                            insurerName: extraction.insurerName,
                            policyNumber: extraction.policyNumber,
                            lineOfBusiness: extraction.lineOfBusiness,
                            provider,
                        },
                        usage: extraction.usage,
                    }
                },
            })
            absorbPayload(extractionStep)

            // Cache the extraction result for future re-analysis
            setCachedExtraction(
                policy.id,
                docStep.result.documentHash,
                extractionStep.result
            ).catch((err) => {
                logger("warn", "Failed to cache extraction result", {
                    runId,
                    error: err instanceof Error ? err.message : String(err),
                })
            })
        }
        const metadata = this.buildMetadata(policy, extractionStep.result)

        let clarityResult: AIPolicyClarityResponse = storedClarity
        if (shouldRunClarityGroup && shouldRun("plain_language_translation")) {
            try {
                const clarityStep = await this.executeStepWithRetry({
                    runId,
                    leaseId,
                    policyId: policy.id,
                    userId: run.userId,
                    userRoles,
                    stepKey: "plain_language_translation",
                    estimatedTokens: tokenBudget.byStep.plain_language_translation,
                    allowFallbackModel: true,
                    allowProviderFailover: failoverEnabled,
                    preferredProvider: primaryProvider,
                    // Use structured extraction context instead of re-sending the PDF (~50-100K token savings)
                    includesDocumentContext: false,
                    capabilityOperation: "analyzePolicyClarity",
                    documentMimeType: docStep.result.document?.mimeType,
                    failoverDataAllowed: fullFailoverAllowed,
                    execute: async ({ modelOverride, provider, service, remediationAttempt, remediationType }) => {
                        const clarity = await service.analyzePolicyClarity(
                            null, // No PDF re-send: use structuredContext instead
                            metadata,
                            INSURANCE_CLARITY_CHECKLIST,
                            {
                                userId: run.userId,
                                policyId: policy.id,
                                modelOverride,
                                provider,
                                remediationAttempt,
                                fallbackType:
                                    remediationType === "provider_failover" ||
                                    remediationType === "model_fallback"
                                        ? remediationType
                                        : undefined,
                                structuredContext: extractionStep.result,
                                operatorGuidance: guidanceFor("analyzePolicyClarity"),
                            }
                        )
                        const avgScore = clarity.checklistScores.length
                            ? Math.round(
                                  clarity.checklistScores.reduce(
                                      (sum, item) => sum + item.successPct,
                                      0
                                  ) / clarity.checklistScores.length
                              )
                            : 70
                        return {
                            result: clarity,
                            successPct: avgScore,
                            logMessage: "Plain-language clarity generated",
                            logJson: {
                                checklistScores: clarity.checklistScores.length,
                                savingsOpportunities: clarity.savingsOpportunities.length,
                                coverageGaps: clarity.coverageGaps.length,
                                provider,
                            },
                            usage: clarity.usage,
                        }
                    },
                })
                absorbPayload(clarityStep)
                clarityResult = clarityStep.result
            } catch (error) {
                if (!(error instanceof OrchestrationError) || !degradedEnabled) {
                    throw error
                }
                if (isCriticalStep("plain_language_translation")) {
                    throw error
                }
                markDegraded("plain_language_translation", error)
                logger("warn", "Degrading analysis after plain_language_translation failure", {
                    runId,
                    policyId: policy.id,
                    code: error.code,
                    message: error.message,
                })
            }
        } else if (retryOnlySteps) {
            await createSkippedStep("plain_language_translation", "Skipped in retry-missing execution")
        }

        if (shouldRun("coverage_mapping")) {
            try {
                const coverageMappingStep = await this.executeStepWithRetry({
                    runId,
                    leaseId,
                    policyId: policy.id,
                    userId: run.userId,
                    userRoles,
                    stepKey: "coverage_mapping",
                    estimatedTokens: tokenBudget.byStep.coverage_mapping,
                    allowFallbackModel: false,
                    allowProviderFailover: false,
                    preferredProvider: primaryProvider,
                    includesDocumentContext: false,
                    execute: async () => {
                        // Defensive: JSON-mode clarity output can omit arrays
                        // the old response_schema guaranteed (normalized at the
                        // service too — this is the belt to that suspender).
                        const raw = (clarityResult.coverageSnapshot ?? {}) as Partial<
                            typeof clarityResult.coverageSnapshot
                        >
                        const snapshot = {
                            covered: Array.isArray(raw.covered) ? raw.covered : [],
                            notCovered: Array.isArray(raw.notCovered) ? raw.notCovered : [],
                            limits: Array.isArray(raw.limits) ? raw.limits : [],
                            deductibles: Array.isArray(raw.deductibles) ? raw.deductibles : [],
                            exclusions: Array.isArray(raw.exclusions) ? raw.exclusions : [],
                        }
                        const checks = [
                            snapshot.covered.length > 0,
                            snapshot.limits.length > 0 || snapshot.deductibles.length > 0,
                            snapshot.exclusions.length >= 0,
                        ]
                        const checksPassed = checks.filter(Boolean).length
                        return {
                            result: snapshot,
                            successPct: Math.round((checksPassed / checks.length) * 100),
                            logMessage: "Coverage map assembled from clarity output",
                            logJson: {
                                covered: snapshot.covered.length,
                                notCovered: snapshot.notCovered.length,
                                limits: snapshot.limits.length,
                                deductibles: snapshot.deductibles.length,
                            },
                        }
                    },
                })
                absorbPayload(coverageMappingStep)
            } catch (error) {
                if (!(error instanceof OrchestrationError) || !degradedEnabled) {
                    throw error
                }
                markDegraded("coverage_mapping", error)
            }
        } else if (retryOnlySteps) {
            await createSkippedStep("coverage_mapping", "Skipped in retry-missing execution")
        }

        let gapResult: AIGapAnalysisResponse = storedGapAnalysis
        if (shouldRun("gap_detection")) {
            try {
                const gapStep = await this.executeStepWithRetry({
                    runId,
                    leaseId,
                    policyId: policy.id,
                    userId: run.userId,
                    userRoles,
                    stepKey: "gap_detection",
                    estimatedTokens: tokenBudget.byStep.gap_detection,
                    allowFallbackModel: true,
                    allowProviderFailover: failoverEnabled,
                    preferredProvider: primaryProvider,
                    // Use structured extraction context instead of re-sending the PDF (~50-100K token savings)
                    includesDocumentContext: false,
                    capabilityOperation: "analyzeGaps",
                    documentMimeType: docStep.result.document?.mimeType,
                    failoverDataAllowed: fullFailoverAllowed,
                    execute: async ({ modelOverride, provider, service, remediationAttempt, remediationType }) => {
                        const gapAnalysis = await service.analyzeGaps(
                            null, // No PDF re-send: use structuredContext instead
                            metadata,
                            gapDefinitions,
                            {
                                userId: run.userId,
                                policyId: policy.id,
                                modelOverride,
                                provider,
                                remediationAttempt,
                                fallbackType:
                                    remediationType === "provider_failover" ||
                                    remediationType === "model_fallback"
                                        ? remediationType
                                        : undefined,
                                structuredContext: extractionStep.result,
                                operatorGuidance: guidanceFor("analyzeGaps"),
                            }
                        )
                        const total = Math.max(gapDefinitions.length, 1)
                        const checksPassed = Math.min(gapAnalysis.gapResults.length, total)
                        return {
                            result: gapAnalysis,
                            successPct: Math.round((checksPassed / total) * 100),
                            logMessage: "Gap detection completed",
                            logJson: {
                                checked: gapDefinitions.length,
                                returned: gapAnalysis.gapResults.length,
                                explained: gapAnalysis.gapResults.length,
                                provider,
                            },
                            usage: gapAnalysis.usage,
                        }
                    },
                })
                absorbPayload(gapStep)
                gapResult = gapStep.result
            } catch (error) {
                if (!(error instanceof OrchestrationError) || !degradedEnabled) {
                    throw error
                }
                markDegraded("gap_detection", error)
            }
        } else if (retryOnlySteps) {
            await createSkippedStep("gap_detection", "Skipped in retry-missing execution")
        }

        if (shouldRun("savings_detection")) {
            try {
                const savingsStep = await this.executeStepWithRetry({
                    runId,
                    leaseId,
                    policyId: policy.id,
                    userId: run.userId,
                    userRoles,
                    stepKey: "savings_detection",
                    estimatedTokens: tokenBudget.byStep.savings_detection,
                    allowFallbackModel: false,
                    allowProviderFailover: false,
                    preferredProvider: primaryProvider,
                    includesDocumentContext: false,
                    execute: async () => {
                        const aiSavings = clarityResult.savingsOpportunities

                        // Merge deterministic (zero-cost) savings with AI-generated ones
                        const deterministicSavings = detectDeterministicSavings({
                            acordData: extractionStep.result.acordData ?? null,
                            lineOfBusiness: policy.lineOfBusiness,
                            premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
                            startDate: policy.startDate,
                        })
                        const savings = [...aiSavings, ...deterministicSavings]

                        // Update clarityResult so downstream persistence sees merged savings
                        clarityResult = { ...clarityResult, savingsOpportunities: savings }

                        const checksPassed = savings.length > 0 ? 3 : 2
                        return {
                            result: savings,
                            successPct: Math.round((checksPassed / 3) * 100),
                            logMessage: "Savings opportunities scored",
                            logJson: {
                                count: savings.length,
                                aiCount: aiSavings.length,
                                deterministicCount: deterministicSavings.length,
                                withEstimate: savings.filter(
                                    (item) => item.estimatedAnnualSavingsEur !== null
                                ).length,
                            },
                        }
                    },
                })
                absorbPayload(savingsStep)
            } catch (error) {
                if (!(error instanceof OrchestrationError) || !degradedEnabled) {
                    throw error
                }
                markDegraded("savings_detection", error)
            }
        } else if (retryOnlySteps) {
            await createSkippedStep("savings_detection", "Skipped in retry-missing execution")
        }

        if (shouldRun("checklist_scoring_and_actions")) {
            try {
                const checklistStep = await this.executeStepWithRetry({
                    runId,
                    leaseId,
                    policyId: policy.id,
                    userId: run.userId,
                    userRoles,
                    stepKey: "checklist_scoring_and_actions",
                    estimatedTokens: tokenBudget.byStep.checklist_scoring_and_actions,
                    allowFallbackModel: false,
                    allowProviderFailover: false,
                    preferredProvider: primaryProvider,
                    includesDocumentContext: false,
                    execute: async () => {
                        const checklistScores = clarityResult.checklistScores
                        const totalChecks = checklistScores.reduce(
                            (sum, item) => sum + item.checksTotal,
                            0
                        )
                        const passedChecks = checklistScores.reduce(
                            (sum, item) => sum + item.checksPassed,
                            0
                        )
                        const score =
                            totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0
                        return {
                            result: {
                                checklistScores,
                                priorityActions: clarityResult.priorityActions,
                            },
                            successPct: score,
                            logMessage: "Checklist scoring and actions prepared",
                            logJson: {
                                pillars: checklistScores.length,
                                checksPassed: passedChecks,
                                checksTotal: totalChecks,
                                expectedChecks: INSURANCE_CLARITY_CHECKLIST_TOTAL_CHECKS,
                            },
                        }
                    },
                })
                absorbPayload(checklistStep)
            } catch (error) {
                if (!(error instanceof OrchestrationError) || !degradedEnabled) {
                    throw error
                }
                markDegraded("checklist_scoring_and_actions", error)
            }
        } else if (retryOnlySteps) {
            await createSkippedStep(
                "checklist_scoring_and_actions",
                "Skipped in retry-missing execution"
            )
        }

        const finalStatus =
            degradedSteps.size > 0 ? "completed_with_warnings" : ("completed" as const)

        // Batch translate Greek-only AI outputs to bilingual (Greek + English)
        // This replaces the placeholder English text with proper translations
        try {
            const clarityCollection = collectClarityTextsForTranslation(clarityResult)
            const gapCollection = collectGapTextsForTranslation(gapResult.gapResults)

            const allGreekTexts = [...clarityCollection.texts, ...gapCollection.texts]
            if (allGreekTexts.length > 0) {
                // Meter the billable translation pass against the run's user.
                const allEnglish = await batchTranslateToEnglish(allGreekTexts, {
                    userId: run.userId,
                    policyId: run.policyId,
                })
                const clarityEnglish = allEnglish.slice(0, clarityCollection.texts.length)
                const gapEnglish = allEnglish.slice(clarityCollection.texts.length)

                clarityResult = {
                    ...clarityCollection.rebuild(clarityEnglish),
                    acordData: clarityResult.acordData,
                    usage: clarityResult.usage,
                }
                gapResult = {
                    ...gapResult,
                    gapResults: gapCollection.rebuild(gapEnglish),
                }

                logger("info", "Batch translation completed for analysis results", {
                    runId,
                    textsTranslated: allGreekTexts.length,
                })
            }
        } catch (translationError) {
            logger("warn", "Batch translation failed, using Greek as fallback for English fields", {
                runId,
                error: translationError instanceof Error ? translationError.message : String(translationError),
            })
            // M9: Track failure so the UI can show a soft warning
            translationFailed = true
            missingArtifacts.add("translation")
        }

        // Captured out of the persistence closure below so the run's resultJson can
        // record WHICH gaps the rules decided (see persistAnalysisArtifacts' return).
        let decidedGapSlugs: string[] = []

        const persistenceStep = await this.executeStepWithRetry({
            runId,
            leaseId,
            policyId: policy.id,
            userId: run.userId,
            userRoles,
            stepKey: "persistence_and_finalize",
            estimatedTokens: tokenBudget.byStep.persistence_and_finalize,
            allowFallbackModel: false,
            allowProviderFailover: false,
            preferredProvider: primaryProvider,
            includesDocumentContext: false,
            execute: async () => {
                decidedGapSlugs = await this.persistAnalysisArtifacts({
                    runId,
                    language,
                    policy,
                    extraction: extractionStep.result,
                    clarity: clarityResult,
                    gapAnalysis: gapResult,
                    gapDefinitions,
                    metadata,
                    pipeline: {
                        status: finalStatus,
                        missingSections: Array.from(missingArtifacts),
                        lastFailureCode,
                        lastFailureAt,
                        provider: primaryProvider,
                    },
                })
                return {
                    result: { persisted: true },
                    successPct: 100,
                    logMessage: "Policy clarity analysis persisted",
                    logJson: {
                        runId,
                        policyId: policy.id,
                        finalStatus,
                    },
                }
            },
        })
        absorbPayload(persistenceStep)

        const actualTotalTokens = totalInputTokens + totalOutputTokens
        const overallSuccessPct = stepScores.length
            ? Math.round(stepScores.reduce((sum, value) => sum + value, 0) / stepScores.length)
            : 0

        const remediationSummary: PipelineRemediationSummary = {
            providerAttempts,
            degradedSteps: Array.from(degradedSteps),
            missingArtifacts: Array.from(missingArtifacts),
            finalUserMessageKey:
                finalStatus === "completed_with_warnings"
                    ? "analysis.status.completedWithWarnings"
                    : finalUserMessageKey,
            failoverUsed: providerAttempts.some(
                (attempt) => attempt.remediationType === "provider_failover"
            ),
            retryScope: options?.retrySourceRunId ? "missing_only" : "full",
            retrySourceRunId: options?.retrySourceRunId,
            translationFailed: translationFailed || undefined,
        }

        const resultJson = {
            metadata: {
                insurerName: metadata.insurerName,
                policyNumber: metadata.policyNumber,
                lineOfBusiness: metadata.lineOfBusiness,
                startDate: metadata.startDate.toISOString(),
                endDate: metadata.endDate.toISOString(),
                premiumAmount: metadata.premiumAmount,
                coverageSummary: metadata.coverageSummary,
            },
            plainLanguageSummary: clarityResult.plainLanguageSummary,
            coverageSnapshot: clarityResult.coverageSnapshot,
            savingsOpportunities: clarityResult.savingsOpportunities,
            coverageGaps: clarityResult.coverageGaps,
            checklistScores: clarityResult.checklistScores,
            priorityActions: clarityResult.priorityActions,
            gapResults: gapResult.gapResults,
            // AI prose keyed by slug (`gapResults`) is NOT a detection list. This is.
            decidedGapSlugs,
            run: {
                runId,
                generatedAt: new Date().toISOString(),
                status: finalStatus,
            },
            remediation: remediationSummary,
        }

        await this.heartbeatRunLease(runId, leaseId)

        const finalizeUpdate = await db.policyAnalysisRun.updateMany({
            where: {
                id: runId,
                executionLeaseId: leaseId,
            },
            data: {
                status: finalStatus,
                overallSuccessPct,
                actualInputTokens: totalInputTokens,
                actualOutputTokens: totalOutputTokens,
                actualTotalTokens,
                failureCode: finalStatus === "completed_with_warnings" ? lastFailureCode : null,
                failureMessage:
                    finalStatus === "completed_with_warnings"
                        ? "Analysis completed with missing sections"
                        : null,
                remediationSummary: remediationSummary as any,
                resultJson: resultJson as any,
                finishedAt: new Date(),
            },
        })

        if (finalizeUpdate.count !== 1) {
            throw new OrchestrationError("Run execution lease lost while finalizing", {
                code: "RUN_LEASE_LOST",
                retryable: true,
            })
        }

        const updatedRun = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
        })
        if (!updatedRun) {
            throw new OrchestrationError("Analysis run not found after finalize", {
                code: "RUN_NOT_FOUND",
                hardFailure: true,
            })
        }

        logger("info", "Policy analysis orchestration completed", {
            runId,
            policyId: policy.id,
            status: finalStatus,
            overallSuccessPct,
            actualTotalTokens,
            degradedSteps: remediationSummary.degradedSteps,
            failoverUsed: remediationSummary.failoverUsed,
        })

        const startedAtMs = updatedRun.startedAt?.getTime()
        emitAnalysisRunTelemetry({
            runId,
            policyId: policy.id,
            status: finalStatus,
            provider: primaryProvider,
            failoverUsed: remediationSummary.failoverUsed,
            degradedCompletion: finalStatus === "completed_with_warnings",
            degradedSteps: remediationSummary.degradedSteps,
            overallSuccessPct,
            actualTotalTokens,
            durationMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : undefined,
        })

        // Refresh protection score after successful analysis (fire-and-forget)
        if (finalStatus === "completed" || finalStatus === "completed_with_warnings") {
            import("@/lib/services/gap-engine")
                .then(({ refreshProtectionScore }) => refreshProtectionScore(run.userId))
                .catch((err) =>
                    logger("warn", "Post-analysis protection score refresh failed (non-blocking)", {
                        userId: run.userId,
                        runId,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )

            // Evidence closes a review — after the GapInstances above are
            // persisted, through the same closer the basic-summary path calls.
            // Non-blocking like the score refresh; the closer never throws.
            import("@/lib/services/risk-review/service")
                .then(({ closeReviewsByPolicyEvidence }) => closeReviewsByPolicyEvidence({ policyId: policy.id }))
                .catch((err) =>
                    logger("warn", "Post-analysis review close by evidence failed (non-blocking)", {
                        policyId: policy.id,
                        runId,
                        error: err instanceof Error ? err.message : String(err),
                    })
                )
        }

        return updatedRun
    }
    private async executeStepWithRetry<T>(params: {
        runId: string
        leaseId: string
        policyId: string
        userId: string
        userRoles?: string
        stepKey: PolicyAnalysisStepKey
        estimatedTokens: number
        allowFallbackModel: boolean
        allowProviderFailover: boolean
        preferredProvider: AIServiceType
        includesDocumentContext: boolean
        capabilityOperation?: AICapabilityOperation
        documentMimeType?: string | null
        failoverDataAllowed?: boolean
        execute: (options: {
            modelOverride?: string
            provider: AIServiceType
            service: ReturnType<typeof getAIService>
            remediationType: RemediationType
            remediationAttempt: number
        }) => Promise<StepExecutionPayload<T>>
    }): Promise<StepExecutionPayload<T>> {
        let latestError: unknown = null
        let latestClassified = classifyAnalysisFailure(new Error("Unknown step failure"))
        const providerAttempts: ProviderAttemptRecord[] = []
        let stepAttemptCounter = 0

        // Local steps (document load, coverage mapping, savings math, checklist
        // scoring, persistence) make NO provider call: reserving tokens for
        // them, resolving a model, and probing provider availability were pure
        // waste — measured at ~9-11 sequential DB roundtrips per step boundary
        // (the dev run's uniform ~10s "dead time" on 1s-of-work steps), and a
        // reservation for a step that cannot spend shrank the user's live
        // budget headroom for nothing. They also must not fail on a provider
        // outage they don't depend on.
        const aiBacked = isAIBackedStep(params.stepKey)

        const runSingleAttempt = async (input: {
            provider: AIServiceType
            remediationType: RemediationType
            modelOverride?: string
        }): Promise<StepExecutionPayload<T> | null> => {
            stepAttemptCounter += 1
            const stepStartedAtMs = Date.now()
            // Admin runtime overrides (cached, never throws). With no override the
            // resolved model is the same env string the provider would fall back
            // to, so passing it through is behavior-neutral — and it makes an
            // admin pin actually reach the call instead of being telemetry-only.
            const runtimeOverrides = aiBacked ? await getAiRuntimeOverrides() : undefined
            const resolvedModel =
                input.modelOverride ||
                (aiBacked
                    ? getDefaultModelForStep(input.provider, params.stepKey, runtimeOverrides)
                    : "none")

            await this.heartbeatRunLease(params.runId, params.leaseId)

            // Atomically reserve tokens — collapses the TOCTOU window between
            // check and usage recording. AI-backed steps only: a local step
            // spends nothing.
            const preflight = aiBacked
                ? await reserveTokens(params.userId, params.estimatedTokens)
                : { allowed: true as const, source: undefined }
            if (!preflight.allowed) {
                const classified = classifyAnalysisFailure(
                    new Error(`Token budget check failed: ${preflight.reason || "insufficient_tokens"}`)
                )
                throw new OrchestrationError("Insufficient tokens for step execution", {
                    code: classified.code,
                    hardFailure: true,
                    blockedReason: preflight.reason || "insufficient_tokens",
                    failureClass: classified.failureClass,
                    userMessageKey: classified.userMessageKey,
                    remediationProviderAttempts: providerAttempts,
                })
            }

            // Track whether the reservation was against subscription pool or purchased tokens.
            // releaseTokenReservation must ONLY be called for subscription reservations — purchased
            // tokens are not tracked via reserved_tokens so releasing would corrupt the pool.
            const reservationSource = preflight.source

            try {

            const step = await db.policyAnalysisStep.create({
                data: {
                    runId: params.runId,
                    stepKey: params.stepKey,
                    stepOrder: STEP_ORDER[params.stepKey],
                    status: "running",
                    attempt: stepAttemptCounter,
                    provider: input.provider,
                    remediationType: input.remediationType,
                    startedAt: new Date(stepStartedAtMs),
                    logMessage: `Running step ${params.stepKey}`,
                },
            })
            emitAnalysisStepTelemetry({
                status: "started",
                runId: params.runId,
                policyId: params.policyId,
                stepKey: params.stepKey,
                attempt: stepAttemptCounter,
                provider: input.provider,
                remediationType: input.remediationType,
                model: resolvedModel,
            })

            const service = getAIService(input.provider)
            if (!service.isAvailable() && aiBacked) {
                const unavailableError = new Error(`${input.provider} AI provider unavailable`)
                latestError = unavailableError
                latestClassified = classifyAnalysisFailure(unavailableError)
                providerAttempts.push({
                    stepKey: params.stepKey,
                    provider: input.provider,
                    model: resolvedModel,
                    attempt: stepAttemptCounter,
                    remediationType: input.remediationType,
                    outcome: "failed",
                    failureCode: "AI_PROVIDER_UNAVAILABLE",
                    failureClass: latestClassified.failureClass,
                })

                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: "failed",
                        errorCode: "AI_PROVIDER_UNAVAILABLE",
                        errorMessage: unavailableError.message,
                        logMessage: `${input.provider} provider unavailable for ${params.stepKey}`,
                        finishedAt: new Date(),
                    },
                })
                emitAnalysisStepTelemetry({
                    status: "failed",
                    runId: params.runId,
                    policyId: params.policyId,
                    stepKey: params.stepKey,
                    attempt: stepAttemptCounter,
                    provider: input.provider,
                    remediationType: input.remediationType,
                    model: resolvedModel,
                    durationMs: Date.now() - stepStartedAtMs,
                    failureClass: latestClassified.failureClass,
                    failureCode: "AI_PROVIDER_UNAVAILABLE",
                    willRetry: false,
                })
                await this.heartbeatRunLease(params.runId, params.leaseId)
                return null
            }

            const capabilityOperation =
                params.capabilityOperation || capabilityOperationForStep(params.stepKey)
            if (isAIBackedStep(params.stepKey) && capabilityOperation) {
                const capability = service.checkCapabilities({
                    operation: capabilityOperation,
                    model: resolvedModel,
                    hasDocument: params.includesDocumentContext,
                    mimeType: params.documentMimeType || null,
                })

                if (!capability.supported) {
                    const capabilityError = new Error(capability.reason)
                    ;(capabilityError as Error & { code?: string }).code = capability.code

                    latestError = capabilityError
                    latestClassified = classifyAnalysisFailure({
                        message: capability.reason,
                        code: capability.code,
                    })

                    providerAttempts.push({
                        stepKey: params.stepKey,
                        provider: input.provider,
                        model: resolvedModel,
                        attempt: stepAttemptCounter,
                        remediationType: input.remediationType,
                        outcome: "failed",
                        failureCode: capability.code,
                        failureClass: latestClassified.failureClass,
                    })

                    await db.policyAnalysisStep.update({
                        where: { id: step.id },
                        data: {
                            status: "failed",
                            errorCode: capability.code,
                            errorMessage: capability.reason,
                            provider: input.provider,
                            remediationType: input.remediationType,
                            logMessage: `Capability check failed for ${params.stepKey}`,
                            logJson: {
                                failureClass: latestClassified.failureClass,
                                userMessageKey: capability.userMessageKey,
                                capabilityMetadata: capability.metadata as any,
                            },
                            finishedAt: new Date(),
                        },
                    })
                    emitAnalysisStepTelemetry({
                        status: "failed",
                        runId: params.runId,
                        policyId: params.policyId,
                        stepKey: params.stepKey,
                        attempt: stepAttemptCounter,
                        provider: input.provider,
                        remediationType: input.remediationType,
                        model: resolvedModel,
                        durationMs: Date.now() - stepStartedAtMs,
                        failureClass: latestClassified.failureClass,
                        failureCode: capability.code,
                        willRetry: false,
                    })

                    await this.heartbeatRunLease(params.runId, params.leaseId)
                    return null
                }
            }

            try {
                const payload = await params.execute({
                    // The resolved model (admin override or the env-tier default —
                    // identical to the provider's own fallback when no override).
                    modelOverride: input.modelOverride ?? resolvedModel,
                    provider: input.provider,
                    service,
                    remediationType: input.remediationType,
                    remediationAttempt: stepAttemptCounter,
                })

                providerAttempts.push({
                    stepKey: params.stepKey,
                    provider: input.provider,
                    model: resolvedModel,
                    attempt: stepAttemptCounter,
                    remediationType: input.remediationType,
                    outcome: "success",
                })

                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: "completed",
                        successPct: payload.successPct,
                        inputTokens: payload.usage?.inputTokens || 0,
                        outputTokens: payload.usage?.outputTokens || 0,
                        totalTokens: payload.usage?.totalTokens || 0,
                        provider: input.provider,
                        remediationType: input.remediationType,
                        logMessage: payload.logMessage,
                        logJson: {
                            ...(payload.logJson || {}),
                            remediation: {
                                provider: input.provider,
                                remediationType: input.remediationType,
                                model: resolvedModel,
                            },
                        },
                        finishedAt: new Date(),
                    },
                })
                emitAnalysisStepTelemetry({
                    status: "completed",
                    runId: params.runId,
                    policyId: params.policyId,
                    stepKey: params.stepKey,
                    attempt: stepAttemptCounter,
                    provider: input.provider,
                    remediationType: input.remediationType,
                    model: resolvedModel,
                    durationMs: Date.now() - stepStartedAtMs,
                    successPct: payload.successPct,
                    tokens: payload.usage,
                })
                // No tail heartbeat: the next attempt's OPENING heartbeat is the
                // authoritative lease-loss check and the interval timer keeps
                // the TTL fresh in between — this was one more serialized DB
                // roundtrip on every step boundary.

                return {
                    ...payload,
                    remediation: {
                        ...(payload.remediation || {}),
                        providerAttempts: [
                            ...(payload.remediation?.providerAttempts || []),
                            ...providerAttempts,
                        ],
                    },
                }
            } catch (error) {
                latestError = error
                latestClassified = classifyAnalysisFailure(error)

                providerAttempts.push({
                    stepKey: params.stepKey,
                    provider: input.provider,
                    model: resolvedModel,
                    attempt: stepAttemptCounter,
                    remediationType: input.remediationType,
                    outcome: "failed",
                    failureCode: latestClassified.code,
                    failureClass: latestClassified.failureClass,
                })

                const canRetryThisAttempt =
                    latestClassified.failureClass === "transient" &&
                    stepAttemptCounter < MAX_STEP_ATTEMPTS &&
                    input.remediationType !== "model_fallback" &&
                    input.remediationType !== "provider_failover"

                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: canRetryThisAttempt ? "retrying" : "failed",
                        errorCode: latestClassified.code,
                        errorMessage: error instanceof Error ? error.message : String(error),
                        provider: input.provider,
                        remediationType: input.remediationType,
                        logMessage: canRetryThisAttempt
                            ? `Retrying step ${params.stepKey} after ${latestClassified.failureClass} failure`
                            : `Step ${params.stepKey} failed (${latestClassified.failureClass})`,
                        logJson: {
                            failureClass: latestClassified.failureClass,
                            userMessageKey: latestClassified.userMessageKey,
                        },
                        finishedAt: new Date(),
                    },
                })
                emitAnalysisStepTelemetry({
                    status: "failed",
                    runId: params.runId,
                    policyId: params.policyId,
                    stepKey: params.stepKey,
                    attempt: stepAttemptCounter,
                    provider: input.provider,
                    remediationType: input.remediationType,
                    model: resolvedModel,
                    durationMs: Date.now() - stepStartedAtMs,
                    failureClass: latestClassified.failureClass,
                    failureCode: latestClassified.code,
                    willRetry: canRetryThisAttempt,
                })
                await this.heartbeatRunLease(params.runId, params.leaseId)

                if (latestClassified.failureClass === "token") {
                    throw new OrchestrationError(
                        error instanceof Error ? error.message : "Token limit blocked",
                        {
                            code: latestClassified.code,
                            hardFailure: true,
                            blockedReason: "insufficient_tokens",
                            failureClass: latestClassified.failureClass,
                            userMessageKey: latestClassified.userMessageKey,
                            remediationProviderAttempts: providerAttempts,
                        }
                    )
                }

                if (canRetryThisAttempt) {
                    await sleep(STEP_BACKOFF_MS[Math.min(stepAttemptCounter - 1, STEP_BACKOFF_MS.length - 1)] || 10000)
                }

                return null
            }

            } finally {
                // Release the subscription reservation on EVERY exit path —
                // success (actual usage is recorded by trackTokenUsage in the
                // AI service layer), failure, token-classified throws, and
                // lost leases. Before this, the throw paths skipped the
                // release, leaking reserved_tokens against the user's budget
                // for the rest of the billing month. The purchased-token path
                // does not use reserved_tokens and must not release.
                if (reservationSource === 'subscription') {
                    await releaseTokenReservation(params.userId, params.estimatedTokens).catch(() => {})
                }
            }
        }

        for (let attempt = 1; attempt <= MAX_STEP_ATTEMPTS; attempt++) {
            const payload = await runSingleAttempt({
                provider: params.preferredProvider,
                remediationType: attempt === 1 ? "initial" : "retry",
            })
            if (payload) {
                return payload
            }
            if (latestClassified.failureClass !== "transient") {
                break
            }
        }

        if (
            params.allowFallbackModel &&
            isAIBackedStep(params.stepKey) &&
            (latestClassified.failureClass === "transient" ||
                latestClassified.failureClass === "schema")
        ) {
            const fallbackModel = fallbackModelForProvider(params.preferredProvider)
            if (fallbackModel) {
                const fallbackPayload = await runSingleAttempt({
                    provider: params.preferredProvider,
                    remediationType: "model_fallback",
                    modelOverride: fallbackModel,
                })
                if (fallbackPayload) {
                    return fallbackPayload
                }
            }
        }

        const canSendFailoverData =
            !params.includesDocumentContext || params.failoverDataAllowed !== false

        // Failover chain: Gemini -> Claude -> OpenAI
        if (
            params.allowProviderFailover &&
            latestClassified.shouldFailoverProvider &&
            canSendFailoverData
        ) {
            // Try Anthropic first (if not already the preferred provider)
            if (
                params.preferredProvider !== "anthropic" &&
                (await isAnthropicFailoverEnabled(params.userId, params.userRoles))
            ) {
                const anthropicPayload = await runSingleAttempt({
                    provider: "anthropic",
                    remediationType: "provider_failover",
                })
                if (anthropicPayload) {
                    return anthropicPayload
                }
            }

            // Then try OpenAI (if not already the preferred provider)
            if (
                params.preferredProvider !== "openai" &&
                (await isOpenAIFailoverEnabled(params.userId, params.userRoles))
            ) {
                const openaiPayload = await runSingleAttempt({
                    provider: "openai",
                    remediationType: "provider_failover",
                })
                if (openaiPayload) {
                    return openaiPayload
                }
            }
        }

        const hardFailure =
            latestClassified.failureClass === "auth" ||
            latestClassified.failureClass === "document" ||
            latestClassified.failureClass === "token"

        throw new OrchestrationError(
            latestError instanceof Error ? latestError.message : "Step execution failed",
            {
                code: latestClassified.code,
                retryable: latestClassified.retryable,
                hardFailure,
                blockedReason:
                    latestClassified.failureClass === "token"
                        ? "insufficient_tokens"
                        : undefined,
                failureClass: latestClassified.failureClass,
                userMessageKey: latestClassified.userMessageKey,
                remediationProviderAttempts: providerAttempts,
            }
        )
    }
    private async prepareDocument(policyId: string): Promise<{
        document: AIDocument
        documentId: string
        documentHash: string
    }> {
        // THE NEWEST DOCUMENT IS NOT NECESSARILY THE POLICY.
        //
        // This read used to be `findFirst(orderBy: uploadedAt desc)` with no
        // filter, which was correct only while every document on a policy was a
        // policy schedule. A customer attaching a terms booklet (όροι) — or any
        // reference file — to an already-analysed policy would make that booklet
        // the analysed document on the next run, whatever triggered it:
        // `retryPolicyAnalysis`, a renewal attach, or the process-policy job.
        //
        // `assessExtractionEvidence` would stop the booklet OVERWRITING the
        // stored facts, so the damage was not corrupted data — it was a run
        // spending tokens on the wrong file and caching the extraction against
        // it, while the customer saw an analysis that had not read their policy.
        //
        // `isPolicyBearing(null)` is deliberately TRUE (document-kind.ts): rows
        // predating the field must behave exactly as before. So this changes
        // behaviour ONLY for a document explicitly classified as not
        // policy-bearing, and falls back to the newest overall when nothing
        // qualifies — a policy with only a booklet still gets analysed rather
        // than failing MISSING_DOCUMENT.
        const candidates = await db.policyDocument.findMany({
            where: { policyId },
            orderBy: { uploadedAt: "desc" },
        })
        const document = selectSourceDocument(candidates) ?? null
        if (!document) {
            throw new OrchestrationError("No policy document uploaded", {
                code: "MISSING_DOCUMENT",
                hardFailure: true,
            })
        }

        let buffer: Buffer | null = null
        let lastDocumentError: unknown = null

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                if (document.fileUrl.startsWith("http")) {
                    // Service-role download for Supabase storage URLs — the
                    // 'policies' bucket is private, raw fetch returns 400.
                    buffer = await downloadPolicyDocument(document.fileUrl)
                } else {
                    const relativePath = document.fileUrl.startsWith("/")
                        ? document.fileUrl.slice(1)
                        : document.fileUrl
                    const filePath = path.join(process.cwd(), "public", relativePath)
                    buffer = await fs.readFile(filePath)
                }
                break
            } catch (error) {
                lastDocumentError = error
                if (attempt < 2) {
                    logger("warn", "Document load failed, retrying once", {
                        policyId,
                        documentId: document.id,
                        attempt,
                        error: error instanceof Error ? error.message : String(error),
                    })
                    await sleep(500)
                }
            }
        }

        if (!buffer) {
            throw new OrchestrationError(
                lastDocumentError instanceof Error
                    ? lastDocumentError.message
                    : "Failed to load document",
                {
                    code: "DOCUMENT_LOAD_FAILED",
                    hardFailure: true,
                    failureClass: "document",
                    userMessageKey: "analysis.errors.document",
                }
            )
        }

        // From the upload allowlist — see documentMimeType. This chain omitted
        // HEIC, so a phone photo reached the model labelled as a PDF and the
        // extraction had nothing it could read.
        // ...but the fix above could never fire, because `fileName` is not a
        // file name. It is a GENERATED LABEL — «Έγγραφο σε επεξεργασία»,
        // «Ανανεωτήριο» — with no extension (document-label.ts, enforced by
        // `filename-never-persisted`). `documentMimeType` matches on a trailing
        // extension, so every stored document resolved to the
        // `application/pdf` fallback no matter what it was. Verified for every
        // documentKind: all four labels return application/pdf.
        //
        // The row already carries the answer: `mimeType` is derived from the
        // VERIFIED CONTENT at upload (schema.prisma:441-443), not from what the
        // customer named the file. Prefer it, and keep the label-derived guess
        // only for legacy rows written before that column existed.
        const mimeType = document.mimeType || documentMimeType(document.fileName)

        // Compute document hash for extraction caching
        const docHash = await hashDocumentBuffer(buffer)
        await setDocumentHash(document.id, docHash)

        return {
            documentId: document.id,
            documentHash: docHash,
            document: {
                data: buffer.toString("base64"),
                mimeType,
            },
        }
    }

    /**
     * Fold an extraction result into the policy's metadata.
     *
     * The evidence gate at the top is the guard against a document that is not a
     * policy overwriting one that is. Two of the sixteen documents in the
     * reference corpus are a terms-and-conditions booklet and a set of blank
     * statutory forms; both name an insurer on every page, and the per-field
     * fallbacks below cannot catch them because the providers substitute
     * 'Unknown Insurer' and 'PENDING-<timestamp>' for empty values — which are
     * truthy, and therefore win every `||`.
     *
     * When the evidence is insufficient the stored values stand unchanged. The
     * document is still kept; it is simply not treated as a contract.
     */
    /**
     * Is this renewal document about THIS policy?
     *
     * The customer asserts the pairing by choosing the policy and attaching the
     * file; nothing verifies it. Attach the wrong ανανεωτήριο and the period of
     * a different contract is written over this one — silently, because a
     * renewal is trusted precisely to move dates.
     *
     * Only renewal notices are checked. A schedule re-upload is the policy
     * itself and is allowed to restate its own number.
     */
    private assessRenewal(policy: any, extraction: AIPolicyExtractionResponse): RenewalMatch {
        if (extraction.documentKind !== "renewal_notice") return { matches: true }
        return assessRenewalMatch({
            storedPolicyNumber: policy.policyNumber,
            extractedPolicyNumber: extraction.policyNumber,
        })
    }

    /** The record the wallet reads to explain a refused renewal. */
    private renewalReviewRecord(match: RenewalMatch, now: Date): Record<string, unknown> | null {
        if (match.matches) return null
        return {
            status: "policy_number_mismatch",
            expectedPolicyNumber: match.expected,
            foundPolicyNumber: match.found,
            at: now.toISOString(),
        }
    }

    private buildMetadata(policy: any, extraction: AIPolicyExtractionResponse): PolicyMetadata {
        if (extraction.evidence && !extraction.evidence.sufficient) {
            // NARROW EXCEPTION — a renewal notice on an ALREADY-IDENTIFIED policy.
            //
            // The gate above exists to stop a document that is NOT a policy from
            // overwriting one that is. A renewal notice attached to a policy the
            // customer named is not that case: they told us it renews THIS
            // contract by choosing the action, and the one fact it genuinely
            // establishes is the new PERIOD.
            //
            // Without this, every non-pro renewal was silently discarded here —
            // `assessExtractionEvidence` rejects `renewal_notice` by definition
            // (POLICY_BEARING_KINDS is schedule + certificate only), so the
            // dates never moved and the wallet went on saying «έχει λήξει» for
            // ever. Not "until you refresh": for ever. Only the deep pipeline
            // survived, because it writes dates from the raw extraction.
            //
            // Identity is deliberately NOT taken from the notice: it names a
            // policy, it does not define one. That is what keeps the booklet and
            // blank-forms cases the gate was built for still closed.
            // ...and only when it names THIS policy. A renewal that names a
            // different contract must not move this one's period; that is the
            // whole point of trusting it with the dates in the first place.
            const renewsAnIdentifiedPolicy =
                extraction.evidence.reason === "not_a_policy_document" &&
                extraction.documentKind === "renewal_notice" &&
                !isPlaceholderInsurerName(policy.insurerName) &&
                !isPlaceholderPolicyNumber(policy.policyNumber) &&
                this.assessRenewal(policy, extraction).matches

            if (renewsAnIdentifiedPolicy) {
                logger("info", "Renewal notice accepted for period only — identity kept from the stored policy", {
                    policyId: policy.id,
                    documentKind: extraction.documentKind,
                })
                return {
                    insurerName: policy.insurerName,
                    policyNumber: policy.policyNumber,
                    lineOfBusiness: normalizeLineOfBusiness(policy.lineOfBusiness),
                    startDate: parseDateMaybe(extraction.startDate, policy.startDate),
                    endDate: parseDateMaybe(extraction.endDate, policy.endDate),
                    premiumAmount:
                        typeof extraction.premiumAmount === "number"
                            ? extraction.premiumAmount
                            : policy.premiumAmount
                              ? Number(policy.premiumAmount)
                              : null,
                    // A notice quotes a price for the next term; it does not
                    // restate the cover. The stored summary remains the truth.
                    coverageSummary: policy.coverageSummary,
                }
            }

            logger("warn", "Extraction rejected as non-policy evidence — keeping stored metadata", {
                policyId: policy.id,
                reason: extraction.evidence.reason,
                documentKind: extraction.documentKind,
            })
            return {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: normalizeLineOfBusiness(policy.lineOfBusiness),
                startDate: policy.startDate,
                endDate: policy.endDate,
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
                coverageSummary: policy.coverageSummary,
            }
        }

        return {
            insurerName: extraction.insurerName || policy.insurerName,
            policyNumber: extraction.policyNumber || policy.policyNumber,
            lineOfBusiness: resolveLineOfBusiness(policy, extraction),
            startDate: parseDateMaybe(extraction.startDate, policy.startDate),
            endDate: parseDateMaybe(extraction.endDate, policy.endDate),
            premiumAmount:
                typeof extraction.premiumAmount === "number"
                    ? extraction.premiumAmount
                    : policy.premiumAmount
                      ? Number(policy.premiumAmount)
                      : null,
            coverageSummary: extraction.coverageSummary || policy.coverageSummary,
        }
    }

    private async getGapDefinitionsForPolicy(lineOfBusiness: string): Promise<GapDefinitionForAI[]> {
        const defs = await db.gapDefinition.findMany({
            where: {
                lineOfBusiness: {
                    equals: normalizeLineOfBusiness(lineOfBusiness),
                    mode: "insensitive",
                },
                isActive: true,
            },
        })

        return defs.map((def) => ({
            slug: def.slug,
            name: def.name,
            description: def.description,
            checkCriteria:
                (def.detectionLogic as any)?.check ||
                def.description ||
                "Check this gap against policy coverage",
        }))
    }

    private extractStoredClarity(
        acordData: Record<string, unknown> | null
    ): AIPolicyClarityResponse | null {
        const clarity = (acordData as any)?.analysis?.clarity
        if (!clarity || typeof clarity !== "object") return null

        return {
            plainLanguageSummary: clarity.plainLanguageSummary || FALLBACK_STORED_SUMMARY,
            coverageSnapshot: clarity.coverageSnapshot || {
                covered: [],
                notCovered: [],
                limits: [],
                deductibles: [],
                exclusions: [],
            },
            savingsOpportunities: clarity.savingsOpportunities || [],
            coverageGaps: clarity.coverageGaps || [],
            checklistScores: clarity.checklistScores || [],
            priorityActions: clarity.priorityActions || [],
            acordData: clarity.acordData,
        }
    }

    private extractStoredGapAnalysisFromResult(
        resultJson: Record<string, any> | null
    ): AIGapAnalysisResponse | null {
        const gapResults = resultJson?.gapResults
        if (!Array.isArray(gapResults)) return null

        return {
            verifiedMetadata: (resultJson?.metadata as any) || {},
            gapResults,
            acordData: resultJson?.acordData,
        }
    }

    private async persistAnalysisArtifacts(params: {
        runId: string
        language: "en" | "el"
        policy: any
        extraction: AIPolicyExtractionResponse
        clarity: AIPolicyClarityResponse
        gapAnalysis: AIGapAnalysisResponse
        gapDefinitions: GapDefinitionForAI[]
        metadata: PolicyMetadata
        pipeline: {
            status: "completed" | "completed_with_warnings"
            missingSections: string[]
            lastFailureCode: string | null
            lastFailureAt: string | null
            provider: AIServiceType
        }
    }) {
        const {
            runId,
            language,
            policy,
            extraction,
            clarity,
            gapAnalysis,
            gapDefinitions,
            metadata,
            pipeline,
        } = params

        const existingAcord = (policy.acordData as Record<string, any> | null) || {}
        const enriched = enrichExtractionPayload(
            {
                insurerName: extraction.insurerName || metadata.insurerName,
                policyNumber: extraction.policyNumber || metadata.policyNumber,
                lineOfBusiness: metadata.lineOfBusiness,
                startDate: extraction.startDate,
                endDate: extraction.endDate,
                premiumAmount: extraction.premiumAmount,
                issueDate: extraction.issueDate,
                premiumFrequency: extraction.premiumFrequency,
                renewalDate: extraction.renewalDate,
                exclusions: clarity.coverageSnapshot.exclusions,
                // Re-feed the extraction step's confidence so the persisted
                // acordData keeps the real per-field scores (re-enriching
                // without this clobbers them with an empty map).
                extractionConfidence: extraction.extractionMeta
                    ? {
                          overall: extraction.extractionMeta.overallConfidence,
                          requiresReview: extraction.extractionMeta.requiresReview,
                          fields: extraction.extractionMeta.fieldConfidence,
                      }
                    : undefined,
                acordData: {
                    ...(extraction.acordData || {}),
                    ...(clarity.acordData || {}),
                },
            },
            existingAcord,
            pipeline.provider
        )

        const compactClarity = {
            generatedAt: new Date().toISOString(),
            plainLanguageSummary: clarity.plainLanguageSummary,
            coverageSnapshot: clarity.coverageSnapshot,
            savingsOpportunities: clarity.savingsOpportunities,
            checklistScores: clarity.checklistScores,
            priorityActions: clarity.priorityActions,
        }

        // Does this renewal name THIS policy? Computed once and used three ways
        // below: it withholds the period, withholds the identity, and skips the
        // renewal close-out. The deep path writes dates straight from the raw
        // extraction, so without this check attaching the wrong ανανεωτήριο
        // silently rewrites the period of a contract it does not describe.
        const renewalMatch = this.assessRenewal(policy, extraction)
        const renewalReview = this.renewalReviewRecord(renewalMatch, new Date())

        const mergedAcord = {
            ...enriched.acordData,
            ...(extraction.documentKind === "renewal_notice"
                // Written on every renewal run — including a matching one, where
                // it is undefined — so a corrected re-upload clears the error the
                // customer is reading rather than leaving it stranded.
                ? { renewalReview: renewalReview ?? undefined }
                : {}),
            // A fresh extraction supersedes any earlier user confirmation or
            // flag — the user must review the new values.
            extraction: {
                ...((enriched.acordData as any)?.extraction || {}),
                reviewState: "unconfirmed",
                confirmedAt: null,
                flaggedAt: null,
                // Deterministic parse state per date field: 'failed'/'missing'
                // dates must never display as today's date or count as ΕΝΕΡΓΟ.
                dateParse: {
                    startDate: dateParseState(extraction.startDate),
                    endDate: dateParseState(extraction.endDate),
                    issueDate: dateParseState(extraction.issueDate),
                    renewalDate: dateParseState(extraction.renewalDate),
                },
            },
            analysis: {
                ...((enriched.acordData as any)?.analysis || {}),
                clarity: compactClarity,
                pipeline: {
                    runId,
                    provider: pipeline.provider,
                    status: pipeline.status,
                    missingSections: pipeline.missingSections,
                    lastFailureCode: pipeline.lastFailureCode,
                    lastFailureAt: pipeline.lastFailureAt,
                    completedAt: new Date().toISOString(),
                },
            },
        }

        const coverageSummary =
            language === "el"
                ? clarity.plainLanguageSummary.el
                : clarity.plainLanguageSummary.en

        // ── The rules decide. The model only describes. ──────────────────────
        //
        // This block used to merge two AI sources: gap_detection contributed a
        // per-slug `isDetected` boolean the model chose (with severity then
        // hardcoded to "medium"), and the clarity pass contributed whole gaps
        // whose severity was a model-emitted enum with no rubric behind it in
        // any prompt. Whichever source spoke first won, so a hardcoded "medium"
        // routinely overwrote a considered severity for the same slug.
        //
        // Now the only question the model answers is "how would you word this
        // one?" — asked about gaps that the deterministic evaluator has already
        // found in the extracted AcordData. A slug the rules did not produce
        // cannot become a GapInstance no matter what the model says about it.
        const ruleDecided = await decideGapsForPolicy(policy, mergedAcord)

        // AI prose, keyed by slug, for attaching to a decided gap. Both sources
        // are welcome HERE, because at this point neither can create anything.
        const prose = new Map<
            string,
            { explanationEn: string; explanationEl: string; suggestionEn: string; suggestionEl: string }
        >()
        for (const gap of gapAnalysis.gapResults) {
            prose.set(gap.slug, {
                explanationEn:
                    typeof gap.explanation === "string" ? gap.explanation : gap.explanation.en,
                explanationEl:
                    typeof gap.explanation === "string" ? gap.explanation : gap.explanation.el,
                suggestionEn:
                    typeof gap.suggestion === "string" ? gap.suggestion : gap.suggestion.en,
                suggestionEl:
                    typeof gap.suggestion === "string" ? gap.suggestion : gap.suggestion.el,
            })
        }
        for (const gap of clarity.coverageGaps) {
            if (prose.has(gap.slug)) continue
            prose.set(gap.slug, {
                explanationEn: gap.evidence.en,
                explanationEl: gap.evidence.el,
                suggestionEn: gap.recommendation.en,
                suggestionEl: gap.recommendation.el,
            })
        }

        const detectedGaps = new Map<
            string,
            {
                severity: string
                gapDefinitionId: string
                ruleId: string
                ruleInputs: Record<string, unknown>
                explanationEn: string
                explanationEl: string
                suggestionEn: string
                suggestionEl: string
            }
        >()
        for (const decided of ruleDecided) {
            const text = prose.get(decided.slug)
            detectedGaps.set(decided.slug, {
                // Severity belongs to the definition the rule fired on — never
                // to the model, and never to a literal at the write site.
                severity: decided.severity,
                gapDefinitionId: decided.gapDefinitionId,
                ruleId: decided.ruleId,
                ruleInputs: decided.ruleInputs,
                // No prose is not a reason to hide a gap the rules found; the
                // definition's own description carries it instead.
                explanationEn: text?.explanationEn ?? decided.fallbackDescription,
                explanationEl: text?.explanationEl ?? decided.fallbackDescription,
                suggestionEn: text?.suggestionEn ?? "",
                suggestionEl: text?.suggestionEl ?? "",
            })
        }

        // `metadata.lineOfBusiness` has already been through resolveLineOfBusiness
        // — it is normalized, evidence-gated and respects a confirmed branch.
        // Reading `extraction.lineOfBusiness` again here would route around all three.
        const normalizedLob = metadata.lineOfBusiness
        const now = new Date()

        // Resolve gap definitions BEFORE the transaction. They are shared
        // reference data (unique by slug), so holding the interactive tx open
        // for a per-gap findUnique/create + gapInstance.create round-trip was
        // what pushed the finalize past its timeout on documents with several
        // gaps ("Transaction already closed / expired transaction"). We build
        // the instance rows here; the tx below then does a fixed handful of
        // writes regardless of gap count. upsert is race-safe if two analyses
        // create the same slug concurrently.
        const gapRows: Array<{
            policyId: string
            gapDefinitionId: string
            severity: string
            status: string
            aiExplanation: string | null
            aiExplanationEl: string | null
            aiSuggestion: string | null
            aiSuggestionEl: string | null
            detectedAt: Date
            ruleId: string
            ruleInputs: any
            engineVersion: string
        }> = []

        // The clarity AI emits free vocabulary, and each novel slug used to be
        // upserted as an ACTIVE definition — which getGapDefinitionsForPolicy
        // then fed into every future gap-detection prompt for the LoB with the
        // junk "Auto-created…" description as its checkCriteria. Unbounded
        // prompt bloat (motor reached 8 checks, 3 redundant). Two guards now:
        // (1) canonicalize by CONCEPT onto an existing definition — a spelling
        // or alias variant attaches to the original row and mints nothing;
        // (2) a genuinely new concept mints its definition INACTIVE, so it
        // renders on this policy but joins prompts only when an admin
        // deliberately activates it in /admin/gaps.
        const lobDefinitions = await db.gapDefinition.findMany({
            where: {
                lineOfBusiness: { equals: normalizedLob, mode: "insensitive" },
            },
            select: { id: true, slug: true, isActive: true, createdAt: true },
        })

        // Every entry here came from a rule firing on a definition that already
        // existed, so the definition id is known and there is nothing to mint.
        //
        // What used to be here: if a model emitted a slug no definition matched,
        // this code CREATED a GapDefinition from the model's own output —
        // taking its severity, stamping `ruleId: "ai_<slug>"` and
        // `detectionLogic: {source: "ai_clarity_pipeline"}`. That is how all 41
        // gap definitions in production came to be AI-authored, and how the same
        // risk ended up carrying different severities under different spellings
        // (cyber_risk_gap=critical, cyber_liability=medium). A model can no
        // longer add to the catalogue; a human adds definitions, and rules
        // decide when they apply.
        const seenDefinitionIds = new Set<string>()

        for (const [, details] of detectedGaps.entries()) {
            if (seenDefinitionIds.has(details.gapDefinitionId)) continue
            seenDefinitionIds.add(details.gapDefinitionId)
            gapRows.push({
                policyId: policy.id,
                gapDefinitionId: details.gapDefinitionId,
                severity: details.severity,
                status: "open",
                aiExplanation: details.explanationEn,
                aiExplanationEl: details.explanationEl,
                aiSuggestion: details.suggestionEn,
                aiSuggestionEl: details.suggestionEl,
                detectedAt: now,
                // Provenance: which rule fired, on what it read, under which
                // engine. A finding nobody can re-derive is an assertion.
                ruleId: details.ruleId,
                ruleInputs: details.ruleInputs as any,
                engineVersion: GAP_ENGINE_VERSION,
            })
        }

        // All writes are atomic: if any step fails, no partial state is
        // persisted. Only the policy+gap swap runs inside the tx now — no
        // per-gap round-trips — so it completes well within the timeout.
        await db.$transaction(async (tx) => {
            await tx.policy.update({
                where: { id: policy.id },
                data: {
                    // On a mismatch the document describes some OTHER contract,
                    // so none of its identity or period may land here. Everything
                    // stays as recorded and the wallet explains why.
                    insurerName: renewalMatch.matches
                        ? extraction.insurerName || metadata.insurerName
                        : policy.insurerName,
                    policyNumber: renewalMatch.matches
                        ? extraction.policyNumber || metadata.policyNumber
                        : policy.policyNumber,
                    lineOfBusiness: normalizedLob,
                    startDate: renewalMatch.matches
                        ? parseDateMaybe(extraction.startDate, policy.startDate)
                        : policy.startDate,
                    endDate: renewalMatch.matches
                        ? parseDateMaybe(extraction.endDate, policy.endDate)
                        : policy.endDate,
                    premiumAmount:
                        typeof extraction.premiumAmount === "number"
                            ? extraction.premiumAmount
                            : policy.premiumAmount,
                    coverageSummary,
                    acordData: mergedAcord,
                    lastAnalyzedAt: now,
                    status: "active",
                },
            })

            // THE THIRD DATE-MOVING PATH.
            //
            // The other two — the auto-dedupe in policy.service and the approved
            // merge in policy-merge.service — close out the PolicyRenewal row
            // keyed to the date the policy has just moved past. This one did
            // not, even though `closeSupersededRenewals` names "a renewal
            // document is attached" as the exact case it exists for.
            //
            // Left open, that row stays pending/overdue for ever: it keeps
            // counting toward /renewals and /insights, and because remindersSent
            // is still its own array the reminder ladder can fire again. The
            // customer renewed, and the product goes on telling them — and their
            // adviser — that they did not. In the transaction deliberately: the
            // close-out lands or rolls back with the date change that caused it.
            const movedEndDate = renewalMatch.matches
                ? parseDateMaybe(extraction.endDate, policy.endDate)
                : policy.endDate
            if (movedEndDate && (!policy.endDate || movedEndDate.getTime() > policy.endDate.getTime())) {
                await closeSupersededRenewals(
                    tx,
                    policy.id,
                    movedEndDate,
                    (extraction.insurerName || metadata.insurerName || "").trim().toLowerCase() ===
                        (policy.insurerName || "").trim().toLowerCase()
                )
            }

            await tx.policyDocument.updateMany({
                where: { policyId: policy.id },
                data: { processingStatus: "completed" },
            })

            await tx.gapInstance.deleteMany({
                where: { policyId: policy.id },
            })

            if (gapRows.length > 0) {
                await tx.gapInstance.createMany({ data: gapRows })
            }
        })

        // The slugs the RULES decided, returned so the run's stored resultJson can
        // record them. Without this the run keeps only AI prose keyed by slug, which
        // is not a detection list — so a run-to-run gap diff had nothing truthful to
        // read and silently reported no change on every comparison.
        return ruleDecided.map((d) => d.slug)
    }

    private async failRun(
        runId: string,
        status: "failed" | "blocked",
        error: OrchestrationError,
        leaseId?: string
    ) {
        const run = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
            include: { policy: true },
        })
        if (!run) return

        const remediationSummary: PipelineRemediationSummary = {
            providerAttempts: error.remediationProviderAttempts || [],
            degradedSteps: [],
            missingArtifacts: [],
            finalUserMessageKey:
                error.userMessageKey ||
                (status === "blocked" ? "analysis.errors.tokenLimit" : "analysis.errors.generic"),
            failoverUsed: (error.remediationProviderAttempts || []).some(
                (attempt) => attempt.remediationType === "provider_failover"
            ),
            retryScope: "full",
        }

        const runUpdate = await db.policyAnalysisRun.updateMany({
            where: leaseId
                ? {
                      id: runId,
                      executionLeaseId: leaseId,
                  }
                : {
                      id: runId,
                  },
            data: {
                status,
                blockedReason: status === "blocked" ? error.blockedReason || error.code : null,
                failureCode: error.code,
                failureMessage: error.message,
                remediationSummary: remediationSummary as any,
                finishedAt: new Date(),
            },
        })

        if (runUpdate.count !== 1) {
            logger("warn", "Skipping failRun update due to lost execution lease", {
                runId,
                status,
                leaseId: leaseId || null,
            })
            return
        }

        await db.policy.update({
            where: { id: run.policyId },
            data: {
                status: "action_needed",
                acordData: {
                    ...((run.policy.acordData as any) || {}),
                    analysis: {
                        ...((((run.policy.acordData as any)?.analysis as Record<string, unknown>) ||
                            {}) as Record<string, unknown>),
                        pipeline: {
                            ...(((((run.policy.acordData as any)?.analysis?.pipeline as Record<
                                string,
                                unknown
                            >) ||
                                {}) as Record<string, unknown>)),
                            runId,
                            provider: run.provider,
                            status,
                            missingSections: [],
                            lastFailureCode: error.code,
                            lastFailureAt: new Date().toISOString(),
                        },
                    },
                    processingError: {
                        code: error.code,
                        message: error.message,
                        retryable: error.retryable || status === "blocked",
                        occurredAt: new Date().toISOString(),
                    },
                },
            },
        })

        await db.policyDocument.updateMany({
            where: { policyId: run.policyId },
            data: { processingStatus: "failed" },
        })

        logger("error", "Policy analysis orchestration failed", {
            runId,
            policyId: run.policyId,
            status,
            code: error.code,
            message: error.message,
        })

        const startedAtMs = run.startedAt?.getTime()
        emitAnalysisRunTelemetry({
            runId,
            policyId: run.policyId,
            status,
            provider: (run.provider as AIServiceType) || "gemini",
            failoverUsed: remediationSummary.failoverUsed,
            degradedCompletion: false,
            degradedSteps: [],
            actualTotalTokens: run.actualTotalTokens || 0,
            durationMs: startedAtMs ? Math.max(0, Date.now() - startedAtMs) : undefined,
            failureCode: error.code,
        })
    }

    private async loadAuthorizedPolicy(policyId: string, userId: string) {
        const policy = await db.policy.findUnique({
            where: { id: policyId },
            include: {
                documents: {
                    orderBy: { uploadedAt: "desc" },
                },
            },
        })
        if (!policy) {
            throw new Error("Policy not found")
        }

        const isOwner = policy.ownerUserId === userId
        if (isOwner) return policy

        // Grant-level rule: write/manage grants (managing agents) may trigger
        // analysis; pure read/view grants remain read-only viewers (M4).
        const grants = await db.accessGrant.findMany({
            where: {
                granteeUserId: userId,
                scope: `policy:${policyId}`,
                status: "active",
            },
            select: { permissions: true },
        })
        if (grants.length > 0) {
            const { normalizePermissions } = await import("@/lib/policy-access")
            const canWrite = grants.some((grant) =>
                ["write", "manage"].includes(normalizePermissions(grant.permissions))
            )
            if (canWrite) return policy

            throw new OrchestrationError("Shared viewers cannot trigger policy analysis", {
                code: "SHARED_VIEWER_NOT_ALLOWED",
                hardFailure: true,
                blockedReason: "forbidden",
            })
        }

        // The managing-agent arm, and it must stay as narrow as
        // computePolicyAccess's `canAnalyze`: a live relationship AND this agent
        // having uploaded the policy. A relationship on its own is not consent —
        // an agent creates it unilaterally by typing an email address — so
        // accepting one here would have let any agent spend tokens reading the
        // document bytes of ANY policy their customer owns, including the ones
        // the customer uploaded privately. No caller could reach that today
        // (every one pre-checks getPolicyAccess), which is exactly why it needed
        // closing: the next caller would not have known.
        const isManagingAgent = policy.createdByUserId === userId
        if (isManagingAgent) {
            const hasRelationship = await db.customerRelationship.findFirst({
                where: {
                    agentUserId: userId,
                    policyholderUserId: policy.ownerUserId,
                    status: { notIn: ["inactive", "terminated"] },
                },
            })
            if (hasRelationship) return policy
        }

        throw new Error("Unauthorized access to policy")
    }
}


