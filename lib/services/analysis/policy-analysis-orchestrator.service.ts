import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { z } from "zod"
import { db } from "@/lib/db"
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
import { getModelForStep } from "@/lib/services/ai/model-router"
import { detectDeterministicSavings } from "./deterministic-savings"
import { resolveUserEntitlements, resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import {
    emitAnalysisRunTelemetry,
    emitAnalysisStepTelemetry,
} from "./step-telemetry"

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
const RUN_EXECUTION_LEASE_TTL_MS = 8 * 60 * 1000 // 8 min — matches real serverless timeout ceiling

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

class OrchestrationError extends Error {
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

function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    return (
        msg.includes("timeout") ||
        msg.includes("aborted") ||
        msg.includes("deadline") ||
        msg.includes("429") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("temporarily") ||
        msg.includes("overloaded")
    )
}

function normalizeLineOfBusiness(value: string | null | undefined): string {
    const lob = (value || "other").toLowerCase().trim()
    if (lob === "auto") return "motor"
    if (lob === "vehicle") return "motor"
    return lob
}

// Extracted dates arrive as DD-MM-YYYY (prompt normalization), Greek month
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
function getDefaultModelForStep(provider: AIServiceType, stepKey: PolicyAnalysisStepKey): string | undefined {
    return getModelForStep(provider, stepKey)
}

function fallbackModelForProvider(provider: AIServiceType): string | undefined {
    if (provider === "gemini") return env.GEMINI_MODEL_FALLBACK
    return undefined
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
            const extraction = await service.extractPolicyData(prepared.document)
            const metadata = this.buildMetadata(policy, extraction)

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
                    status: "active",
                },
            })
            await db.policyDocument.updateMany({
                where: { policyId },
                data: { processingStatus: "completed" },
            })
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
                    provider: "gemini",
                    model: env.GEMINI_MODEL_CLARITY_ANALYSIS,
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
                    provider: "gemini",
                    model: env.GEMINI_MODEL_CLARITY_ANALYSIS,
                    status: "blocked",
                    blockedReason: "free_tier_ai_locked",
                    failureCode: "UPGRADE_REQUIRED",
                    failureMessage: "Full AI analysis is a Plus feature; free and Starter plans get the basic summary only",
                    finishedAt: new Date(),
                },
            })
        }

        const gapDefinitionsCount = await db.gapDefinition.count({
            where: {
                lineOfBusiness: {
                    equals: normalizeLineOfBusiness(policy.lineOfBusiness),
                    mode: "insensitive",
                },
                isActive: true,
            },
        })

        const estimation = estimatePolicyAnalysisTokenBudget({
            hasDocument: policy.documents.length > 0,
            gapDefinitionsCount,
            checklistPillarsCount: INSURANCE_CLARITY_CHECKLIST.length,
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
                provider: "gemini",
                model: env.GEMINI_MODEL_CLARITY_ANALYSIS,
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
                                provider: "gemini",
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
            return currentRun
        }

        let lastError: OrchestrationError | null = null
        const runStartedAt = existing.startedAt || new Date()

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
                isRemediationAlertingEnabled(terminalRun.userId, terminalRun.user?.roles) &&
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
            run.provider === "gemini" || run.provider === "openai" || run.provider === "mock"
                ? (run.provider as AIServiceType)
                : "gemini"

        const fallbackOpenAI = getAIService("openai")
        const primaryService = getAIService(primaryProvider)
        const failoverEnabled = isOpenAIFailoverEnabled(run.userId, userRoles)
        const degradedEnabled = isDegradedCompletionEnabled(run.userId, userRoles)
        const fullFailoverAllowed = isFullFailoverAllowed(run.userId, userRoles)

        if (!primaryService.isAvailable()) {
            if (!(failoverEnabled && fallbackOpenAI.isAvailable())) {
                throw new OrchestrationError("AI service unavailable", {
                    code: "AI_UNAVAILABLE",
                    hardFailure: true,
                })
            }
        }

        const gapDefinitions = await this.getGapDefinitionsForPolicy(policy.lineOfBusiness)
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
                        fileName: prepared.fileName,
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
                                detected: gapAnalysis.gapResults.filter((item) => item.isDetected).length,
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
                const allEnglish = await batchTranslateToEnglish(allGreekTexts)
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
                await this.persistAnalysisArtifacts({
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

        const runSingleAttempt = async (input: {
            provider: AIServiceType
            remediationType: RemediationType
            modelOverride?: string
        }): Promise<StepExecutionPayload<T> | null> => {
            stepAttemptCounter += 1
            const stepStartedAtMs = Date.now()
            const resolvedModel =
                input.modelOverride || getDefaultModelForStep(input.provider, params.stepKey)

            await this.heartbeatRunLease(params.runId, params.leaseId)

            // Atomically reserve tokens — collapses the TOCTOU window between check and usage recording.
            const preflight = await reserveTokens(params.userId, params.estimatedTokens)
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
            if (!service.isAvailable() && params.stepKey !== "document_load_and_validation") {
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
                if (reservationSource === 'subscription') {
                    await releaseTokenReservation(params.userId, params.estimatedTokens).catch(() => {})
                }
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
                    if (reservationSource === 'subscription') {
                        await releaseTokenReservation(params.userId, params.estimatedTokens).catch(() => {})
                    }
                    return null
                }
            }

            try {
                const payload = await params.execute({
                    modelOverride: input.modelOverride,
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
                await this.heartbeatRunLease(params.runId, params.leaseId)
                // Release the subscription reservation — actual usage is recorded by trackTokenUsage in the AI service layer.
                // Purchased-token path does not use reserved_tokens so must not release.
                if (reservationSource === 'subscription') {
                    await releaseTokenReservation(params.userId, params.estimatedTokens).catch(() => {})
                }

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

                if (reservationSource === 'subscription') {
                    await releaseTokenReservation(params.userId, params.estimatedTokens).catch(() => {})
                }
                return null
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
                isAnthropicFailoverEnabled(params.userId, params.userRoles)
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
                isOpenAIFailoverEnabled(params.userId, params.userRoles)
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
        fileName: string
        documentId: string
        documentHash: string
    }> {
        const document = await db.policyDocument.findFirst({
            where: { policyId },
            orderBy: { uploadedAt: "desc" },
        })
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

        const lowerFileName = document.fileName.toLowerCase()
        let mimeType = "application/pdf"
        if (lowerFileName.endsWith(".png")) mimeType = "image/png"
        if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) mimeType = "image/jpeg"
        if (lowerFileName.endsWith(".webp")) mimeType = "image/webp"

        // Compute document hash for extraction caching
        const docHash = await hashDocumentBuffer(buffer)
        await setDocumentHash(document.id, docHash)

        return {
            fileName: document.fileName,
            documentId: document.id,
            documentHash: docHash,
            document: {
                data: buffer.toString("base64"),
                mimeType,
                fileName: document.fileName,
            },
        }
    }

    private buildMetadata(policy: any, extraction: AIPolicyExtractionResponse): PolicyMetadata {
        return {
            insurerName: extraction.insurerName || policy.insurerName,
            policyNumber: extraction.policyNumber || policy.policyNumber,
            lineOfBusiness: normalizeLineOfBusiness(extraction.lineOfBusiness || policy.lineOfBusiness),
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

        const mergedAcord = {
            ...enriched.acordData,
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

        // Collect detected gaps from both AI sources before entering the transaction.
        const detectedGaps = new Map<
            string,
            {
                severity: string
                explanationEn: string
                explanationEl: string
                suggestionEn: string
                suggestionEl: string
            }
        >()

        for (const gap of gapAnalysis.gapResults) {
            if (!gap.isDetected) continue
            detectedGaps.set(gap.slug, {
                severity: "medium",
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
            if (detectedGaps.has(gap.slug)) continue
            detectedGaps.set(gap.slug, {
                severity: gap.severity,
                explanationEn: gap.evidence.en,
                explanationEl: gap.evidence.el,
                suggestionEn: gap.recommendation.en,
                suggestionEl: gap.recommendation.el,
            })
        }

        const normalizedLob = normalizeLineOfBusiness(extraction.lineOfBusiness || metadata.lineOfBusiness)
        const now = new Date()

        // All writes are atomic: if any step fails, no partial state is persisted.
        await db.$transaction(async (tx) => {
            await tx.policy.update({
                where: { id: policy.id },
                data: {
                    insurerName: extraction.insurerName || metadata.insurerName,
                    policyNumber: extraction.policyNumber || metadata.policyNumber,
                    lineOfBusiness: normalizedLob,
                    startDate: parseDateMaybe(extraction.startDate, policy.startDate),
                    endDate: parseDateMaybe(extraction.endDate, policy.endDate),
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

            await tx.policyDocument.updateMany({
                where: { policyId: policy.id },
                data: { processingStatus: "completed" },
            })

            await tx.gapInstance.deleteMany({
                where: { policyId: policy.id },
            })

            for (const [slug, details] of detectedGaps.entries()) {
                // Resolve or create the gap definition inside the transaction
                let definition = await tx.gapDefinition.findUnique({ where: { slug } })
                if (!definition) {
                    const source = gapDefinitions.find((item) => item.slug === slug)
                    const fallbackTitle = slug
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())
                    definition = await tx.gapDefinition.create({
                        data: {
                            slug,
                            name: source?.name || fallbackTitle,
                            title: source?.name || fallbackTitle,
                            description: source?.description || "Auto-created from AI clarity analysis",
                            lineOfBusiness: normalizedLob,
                            severity: details.severity,
                            defaultSeverity: details.severity,
                            ruleId: `ai_${slug}`,
                            detectionLogic: { source: "ai_clarity_pipeline" },
                            isActive: true,
                        },
                    })
                }

                await tx.gapInstance.create({
                    data: {
                        policyId: policy.id,
                        gapDefinitionId: definition.id,
                        severity: details.severity,
                        status: "open",
                        aiExplanation: details.explanationEn,
                        aiExplanationEl: details.explanationEl,
                        aiSuggestion: details.suggestionEn,
                        aiSuggestionEl: details.suggestionEl,
                        detectedAt: now,
                    },
                })
            }
        })
    }

    private async ensureGapDefinition(params: {
        slug: string
        lineOfBusiness: string
        severity: string
        sourceDefinitions: GapDefinitionForAI[]
    }) {
        const existing = await db.gapDefinition.findUnique({
            where: { slug: params.slug },
        })
        if (existing) return existing

        const source = params.sourceDefinitions.find((item) => item.slug === params.slug)
        const fallbackTitle = params.slug
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())

        return db.gapDefinition.create({
            data: {
                slug: params.slug,
                name: source?.name || fallbackTitle,
                title: source?.name || fallbackTitle,
                description: source?.description || "Auto-created from AI clarity analysis",
                lineOfBusiness: params.lineOfBusiness,
                severity: params.severity,
                defaultSeverity: params.severity,
                ruleId: `ai_${params.slug}`,
                detectionLogic: { source: "ai_clarity_pipeline" },
                isActive: true,
            },
        })
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

        const hasRelationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: userId,
                policyholderUserId: policy.ownerUserId,
                status: { not: "inactive" },
            },
        })
        if (hasRelationship) return policy

        throw new Error("Unauthorized access to policy")
    }
}


