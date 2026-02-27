import fs from "fs/promises"
import path from "path"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { canUserUseTokens } from "@/lib/token-tracking"
import { getAIService } from "@/lib/services/ai"
import { enrichExtractionPayload } from "@/lib/services/ai/extraction-enrichment"
import type {
    AIDocument,
    AIGapAnalysisResponse,
    AIPolicyClarityResponse,
    AIPolicyExtractionResponse,
    GapDefinitionForAI,
    PolicyMetadata,
} from "@/lib/services/ai/ai-service.interface"
import {
    INSURANCE_CLARITY_CHECKLIST,
    INSURANCE_CLARITY_CHECKLIST_TOTAL_CHECKS,
} from "./insurance-clarity-checklist"
import {
    estimatePolicyAnalysisTokenBudget,
    type PolicyAnalysisStepKey,
} from "./token-budget-estimator"

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
}

class OrchestrationError extends Error {
    code: string
    retryable: boolean
    hardFailure: boolean
    blockedReason?: string

    constructor(
        message: string,
        options: {
            code: string
            retryable?: boolean
            hardFailure?: boolean
            blockedReason?: string
        }
    ) {
        super(message)
        this.code = options.code
        this.retryable = options.retryable ?? false
        this.hardFailure = options.hardFailure ?? false
        this.blockedReason = options.blockedReason
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

function parseDateMaybe(input: string | undefined, fallback: Date): Date {
    if (!input) return fallback
    const parsed = new Date(input)
    if (Number.isNaN(parsed.getTime())) return fallback
    return parsed
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export class PolicyAnalysisOrchestratorService {
    async createRun(policyId: string, userId: string) {
        const policy = await this.loadAuthorizedPolicy(policyId, userId)
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

        const run = await db.policyAnalysisRun.create({
            data: {
                policyId,
                userId,
                provider: "gemini",
                model: env.GEMINI_MODEL_CLARITY_ANALYSIS,
                status: "queued",
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
                        processingError: {
                            code: "TOKEN_LIMIT_BLOCKED",
                            message: `Policy analysis blocked due to token limits (${gate.reason || "insufficient tokens"})`,
                            retryable: true,
                            occurredAt: new Date().toISOString(),
                        },
                    },
                },
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

    async executeRun(runId: string, language: "en" | "el" = "en") {
        const existing = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
        })
        if (!existing) {
            throw new Error("Analysis run not found")
        }
        if (existing.status === "blocked" || existing.status === "completed") {
            return existing
        }

        let lastError: OrchestrationError | null = null

        for (let runAttempt = existing.runAttempt; runAttempt <= MAX_RUN_ATTEMPTS; runAttempt++) {
            await db.policyAnalysisRun.update({
                where: { id: runId },
                data: {
                    status: "running",
                    runAttempt,
                    startedAt: existing.startedAt || new Date(),
                    failureCode: null,
                    failureMessage: null,
                },
            })

            try {
                await this.executePipelineAttempt(runId, language)
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
                    await this.failRun(runId, "blocked", orchestrationError)
                    return db.policyAnalysisRun.findUnique({ where: { id: runId } })
                }

                if (
                    orchestrationError.hardFailure ||
                    !orchestrationError.retryable ||
                    runAttempt >= MAX_RUN_ATTEMPTS
                ) {
                    await this.failRun(runId, "failed", orchestrationError)
                    return db.policyAnalysisRun.findUnique({ where: { id: runId } })
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

        if (lastError) {
            await this.failRun(runId, "failed", lastError)
        }
        return db.policyAnalysisRun.findUnique({ where: { id: runId } })
    }

    private async executePipelineAttempt(runId: string, language: "en" | "el") {
        const run = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
            include: {
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

        const policy = run.policy
        const aiService = getAIService()
        if (!aiService.isAvailable()) {
            throw new OrchestrationError("AI service unavailable", {
                code: "AI_UNAVAILABLE",
                hardFailure: true,
            })
        }

        const gapDefinitions = await this.getGapDefinitionsForPolicy(policy.lineOfBusiness)
        const tokenBudget = estimatePolicyAnalysisTokenBudget({
            hasDocument: policy.documents.length > 0,
            gapDefinitionsCount: gapDefinitions.length,
            checklistPillarsCount: INSURANCE_CLARITY_CHECKLIST.length,
        })

        let totalInputTokens = 0
        let totalOutputTokens = 0
        const stepScores: number[] = []

        const docStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "document_load_and_validation",
            estimatedTokens: tokenBudget.byStep.document_load_and_validation,
            allowFallback: false,
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
        stepScores.push(docStep.successPct)

        const extractionStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "metadata_extraction_and_verification",
            estimatedTokens: tokenBudget.byStep.metadata_extraction_and_verification,
            allowFallback: true,
            execute: async ({ modelOverride }) => {
                const extraction = await aiService.extractPolicyData(docStep.result.document, {
                    userId: run.userId,
                    policyId: policy.id,
                    modelOverride,
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
                    },
                    usage: extraction.usage,
                }
            },
        })
        stepScores.push(extractionStep.successPct)
        totalInputTokens += extractionStep.usage?.inputTokens || 0
        totalOutputTokens += extractionStep.usage?.outputTokens || 0

        const metadata = this.buildMetadata(policy, extractionStep.result)

        const clarityStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "plain_language_translation",
            estimatedTokens: tokenBudget.byStep.plain_language_translation,
            allowFallback: true,
            execute: async ({ modelOverride }) => {
                const clarity = await aiService.analyzePolicyClarity(
                    docStep.result.document,
                    metadata,
                    INSURANCE_CLARITY_CHECKLIST,
                    {
                        userId: run.userId,
                        policyId: policy.id,
                        modelOverride,
                    }
                )
                const avgScore = clarity.checklistScores.length
                    ? Math.round(
                          clarity.checklistScores.reduce((sum, item) => sum + item.successPct, 0) /
                              clarity.checklistScores.length
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
                    },
                    usage: clarity.usage,
                }
            },
        })
        stepScores.push(clarityStep.successPct)
        totalInputTokens += clarityStep.usage?.inputTokens || 0
        totalOutputTokens += clarityStep.usage?.outputTokens || 0

        const coverageMappingStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "coverage_mapping",
            estimatedTokens: tokenBudget.byStep.coverage_mapping,
            allowFallback: false,
            execute: async () => {
                const snapshot = clarityStep.result.coverageSnapshot
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
        stepScores.push(coverageMappingStep.successPct)

        const gapStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "gap_detection",
            estimatedTokens: tokenBudget.byStep.gap_detection,
            allowFallback: true,
            execute: async ({ modelOverride }) => {
                const gapResult = await aiService.analyzeGaps(
                    docStep.result.document,
                    metadata,
                    gapDefinitions,
                    {
                        userId: run.userId,
                        policyId: policy.id,
                        modelOverride,
                    }
                )
                const total = Math.max(gapDefinitions.length, 1)
                const checksPassed = Math.min(gapResult.gapResults.length, total)
                return {
                    result: gapResult,
                    successPct: Math.round((checksPassed / total) * 100),
                    logMessage: "Gap detection completed",
                    logJson: {
                        checked: gapDefinitions.length,
                        returned: gapResult.gapResults.length,
                        detected: gapResult.gapResults.filter((item) => item.isDetected).length,
                    },
                    usage: gapResult.usage,
                }
            },
        })
        stepScores.push(gapStep.successPct)
        totalInputTokens += gapStep.usage?.inputTokens || 0
        totalOutputTokens += gapStep.usage?.outputTokens || 0

        const savingsStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "savings_detection",
            estimatedTokens: tokenBudget.byStep.savings_detection,
            allowFallback: false,
            execute: async () => {
                const savings = clarityStep.result.savingsOpportunities
                const checksPassed = savings.length > 0 ? 3 : 2
                return {
                    result: savings,
                    successPct: Math.round((checksPassed / 3) * 100),
                    logMessage: "Savings opportunities scored",
                    logJson: {
                        count: savings.length,
                        withEstimate: savings.filter((item) => item.estimatedAnnualSavingsEur !== null).length,
                    },
                }
            },
        })
        stepScores.push(savingsStep.successPct)

        const checklistStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "checklist_scoring_and_actions",
            estimatedTokens: tokenBudget.byStep.checklist_scoring_and_actions,
            allowFallback: false,
            execute: async () => {
                const checklistScores = clarityStep.result.checklistScores
                const totalChecks = checklistScores.reduce((sum, item) => sum + item.checksTotal, 0)
                const passedChecks = checklistScores.reduce((sum, item) => sum + item.checksPassed, 0)
                const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0
                return {
                    result: {
                        checklistScores,
                        priorityActions: clarityStep.result.priorityActions,
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
        stepScores.push(checklistStep.successPct)

        const persistenceStep = await this.executeStepWithRetry({
            runId,
            userId: run.userId,
            stepKey: "persistence_and_finalize",
            estimatedTokens: tokenBudget.byStep.persistence_and_finalize,
            allowFallback: false,
            execute: async () => {
                await this.persistAnalysisArtifacts({
                    runId,
                    language,
                    policy,
                    extraction: extractionStep.result,
                    clarity: clarityStep.result,
                    gapAnalysis: gapStep.result,
                    gapDefinitions,
                    metadata,
                })
                return {
                    result: { persisted: true },
                    successPct: 100,
                    logMessage: "Policy clarity analysis persisted",
                    logJson: {
                        runId,
                        policyId: policy.id,
                    },
                }
            },
        })
        stepScores.push(persistenceStep.successPct)

        const actualTotalTokens = totalInputTokens + totalOutputTokens
        const overallSuccessPct = stepScores.length
            ? Math.round(stepScores.reduce((sum, value) => sum + value, 0) / stepScores.length)
            : 0

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
            plainLanguageSummary: clarityStep.result.plainLanguageSummary,
            coverageSnapshot: clarityStep.result.coverageSnapshot,
            savingsOpportunities: clarityStep.result.savingsOpportunities,
            coverageGaps: clarityStep.result.coverageGaps,
            checklistScores: clarityStep.result.checklistScores,
            priorityActions: clarityStep.result.priorityActions,
            gapResults: gapStep.result.gapResults,
            run: {
                runId,
                generatedAt: new Date().toISOString(),
            },
        }

        await db.policyAnalysisRun.update({
            where: { id: runId },
            data: {
                status: "completed",
                overallSuccessPct,
                actualInputTokens: totalInputTokens,
                actualOutputTokens: totalOutputTokens,
                actualTotalTokens,
                resultJson: resultJson as any,
                finishedAt: new Date(),
            },
        })

        logger("info", "Policy analysis orchestration completed", {
            runId,
            policyId: policy.id,
            overallSuccessPct,
            actualTotalTokens,
        })
    }

    private async executeStepWithRetry<T>(params: {
        runId: string
        userId: string
        stepKey: PolicyAnalysisStepKey
        estimatedTokens: number
        allowFallback: boolean
        execute: (options: { modelOverride?: string }) => Promise<StepExecutionPayload<T>>
    }): Promise<StepExecutionPayload<T>> {
        let latestError: unknown = null

        for (let attempt = 1; attempt <= MAX_STEP_ATTEMPTS; attempt++) {
            const preflight = await canUserUseTokens(params.userId, params.estimatedTokens)
            if (!preflight.allowed) {
                throw new OrchestrationError("Insufficient tokens for step execution", {
                    code: "TOKEN_LIMIT_BLOCKED",
                    hardFailure: true,
                    blockedReason: preflight.reason || "insufficient_tokens",
                })
            }

            const step = await db.policyAnalysisStep.create({
                data: {
                    runId: params.runId,
                    stepKey: params.stepKey,
                    stepOrder: STEP_ORDER[params.stepKey],
                    status: "running",
                    attempt,
                    startedAt: new Date(),
                    logMessage: `Running step ${params.stepKey}`,
                },
            })

            try {
                const payload = await params.execute({})
                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: "completed",
                        successPct: payload.successPct,
                        inputTokens: payload.usage?.inputTokens || 0,
                        outputTokens: payload.usage?.outputTokens || 0,
                        totalTokens: payload.usage?.totalTokens || 0,
                        logMessage: payload.logMessage,
                        logJson: payload.logJson as any,
                        finishedAt: new Date(),
                    },
                })
                return payload
            } catch (error) {
                latestError = error
                const transient = isTransientError(error)
                const hasNextAttempt = transient && attempt < MAX_STEP_ATTEMPTS
                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: hasNextAttempt ? "retrying" : "failed",
                        errorCode: transient ? "TRANSIENT_ERROR" : "STEP_ERROR",
                        errorMessage: error instanceof Error ? error.message : String(error),
                        logMessage: hasNextAttempt
                            ? `Retrying step ${params.stepKey} after transient error`
                            : `Step ${params.stepKey} failed`,
                        finishedAt: new Date(),
                    },
                })

                if (!hasNextAttempt) {
                    break
                }
                await sleep(STEP_BACKOFF_MS[attempt - 1] || 10000)
            }
        }

        if (params.allowFallback && isTransientError(latestError)) {
            const preflight = await canUserUseTokens(params.userId, params.estimatedTokens)
            if (!preflight.allowed) {
                throw new OrchestrationError("Insufficient tokens for fallback attempt", {
                    code: "TOKEN_LIMIT_BLOCKED",
                    hardFailure: true,
                    blockedReason: preflight.reason || "insufficient_tokens",
                })
            }

            const fallbackAttempt = MAX_STEP_ATTEMPTS + 1
            const step = await db.policyAnalysisStep.create({
                data: {
                    runId: params.runId,
                    stepKey: params.stepKey,
                    stepOrder: STEP_ORDER[params.stepKey],
                    status: "running",
                    attempt: fallbackAttempt,
                    startedAt: new Date(),
                    logMessage: `Fallback model retry for ${params.stepKey}`,
                },
            })

            try {
                const payload = await params.execute({
                    modelOverride: env.GEMINI_MODEL_FALLBACK,
                })
                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: "completed",
                        successPct: payload.successPct,
                        inputTokens: payload.usage?.inputTokens || 0,
                        outputTokens: payload.usage?.outputTokens || 0,
                        totalTokens: payload.usage?.totalTokens || 0,
                        logMessage: `${payload.logMessage} (fallback model)`,
                        logJson: {
                            ...(payload.logJson || {}),
                            fallbackModel: env.GEMINI_MODEL_FALLBACK,
                        },
                        finishedAt: new Date(),
                    },
                })
                return payload
            } catch (fallbackError) {
                await db.policyAnalysisStep.update({
                    where: { id: step.id },
                    data: {
                        status: "failed",
                        errorCode: "FALLBACK_FAILED",
                        errorMessage:
                            fallbackError instanceof Error
                                ? fallbackError.message
                                : String(fallbackError),
                        finishedAt: new Date(),
                    },
                })
                throw new OrchestrationError(
                    fallbackError instanceof Error
                        ? fallbackError.message
                        : "Fallback step execution failed",
                    {
                        code: "FALLBACK_FAILED",
                        retryable: true,
                    }
                )
            }
        }

        throw new OrchestrationError(
            latestError instanceof Error ? latestError.message : "Step execution failed",
            {
                code: isTransientError(latestError) ? "TRANSIENT_STEP_FAILURE" : "STEP_FAILURE",
                retryable: isTransientError(latestError),
            }
        )
    }

    private async prepareDocument(policyId: string): Promise<{
        document: AIDocument
        fileName: string
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

        let buffer: Buffer
        if (document.fileUrl.startsWith("http")) {
            const response = await fetch(document.fileUrl)
            if (!response.ok) {
                throw new OrchestrationError(
                    `Failed to fetch document: ${response.status} ${response.statusText}`,
                    {
                        code: "DOCUMENT_FETCH_FAILED",
                        retryable: true,
                    }
                )
            }
            const arrayBuffer = await response.arrayBuffer()
            buffer = Buffer.from(arrayBuffer)
        } else {
            const relativePath = document.fileUrl.startsWith("/")
                ? document.fileUrl.slice(1)
                : document.fileUrl
            const filePath = path.join(process.cwd(), "public", relativePath)
            buffer = await fs.readFile(filePath)
        }

        const lowerFileName = document.fileName.toLowerCase()
        let mimeType = "application/pdf"
        if (lowerFileName.endsWith(".png")) mimeType = "image/png"
        if (lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")) mimeType = "image/jpeg"
        if (lowerFileName.endsWith(".webp")) mimeType = "image/webp"

        return {
            fileName: document.fileName,
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

    private async persistAnalysisArtifacts(params: {
        runId: string
        language: "en" | "el"
        policy: any
        extraction: AIPolicyExtractionResponse
        clarity: AIPolicyClarityResponse
        gapAnalysis: AIGapAnalysisResponse
        gapDefinitions: GapDefinitionForAI[]
        metadata: PolicyMetadata
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
                exclusions: clarity.coverageSnapshot.exclusions,
                acordData: {
                    ...(extraction.acordData || {}),
                    ...(clarity.acordData || {}),
                },
            },
            existingAcord
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
            analysis: {
                ...((enriched.acordData as any)?.analysis || {}),
                clarity: compactClarity,
                pipeline: {
                    runId,
                    provider: "gemini",
                    completedAt: new Date().toISOString(),
                },
            },
        }

        const coverageSummary =
            language === "el"
                ? clarity.plainLanguageSummary.el
                : clarity.plainLanguageSummary.en

        await db.policy.update({
            where: { id: policy.id },
            data: {
                insurerName: extraction.insurerName || metadata.insurerName,
                policyNumber: extraction.policyNumber || metadata.policyNumber,
                lineOfBusiness: normalizeLineOfBusiness(extraction.lineOfBusiness || metadata.lineOfBusiness),
                startDate: parseDateMaybe(extraction.startDate, policy.startDate),
                endDate: parseDateMaybe(extraction.endDate, policy.endDate),
                premiumAmount:
                    typeof extraction.premiumAmount === "number"
                        ? extraction.premiumAmount
                        : policy.premiumAmount,
                coverageSummary,
                acordData: mergedAcord,
                lastAnalyzedAt: new Date(),
                status: "active",
            },
        })

        await db.policyDocument.updateMany({
            where: { policyId: policy.id },
            data: { processingStatus: "completed" },
        })

        await db.gapInstance.deleteMany({
            where: { policyId: policy.id },
        })

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

        for (const [slug, details] of detectedGaps.entries()) {
            const definition = await this.ensureGapDefinition({
                slug,
                lineOfBusiness: normalizeLineOfBusiness(extraction.lineOfBusiness || metadata.lineOfBusiness),
                severity: details.severity,
                sourceDefinitions: gapDefinitions,
            })

            await db.gapInstance.create({
                data: {
                    policyId: policy.id,
                    gapDefinitionId: definition.id,
                    severity: details.severity,
                    status: "open",
                    aiExplanation: details.explanationEn,
                    aiExplanationEl: details.explanationEl,
                    aiSuggestion: details.suggestionEn,
                    aiSuggestionEl: details.suggestionEl,
                    detectedAt: new Date(),
                },
            })
        }
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
        error: OrchestrationError
    ) {
        const run = await db.policyAnalysisRun.findUnique({
            where: { id: runId },
            include: { policy: true },
        })
        if (!run) return

        await db.policyAnalysisRun.update({
            where: { id: runId },
            data: {
                status,
                blockedReason: status === "blocked" ? error.blockedReason || error.code : null,
                failureCode: error.code,
                failureMessage: error.message,
                finishedAt: new Date(),
            },
        })

        await db.policy.update({
            where: { id: run.policyId },
            data: {
                status: "action_needed",
                acordData: {
                    ...((run.policy.acordData as any) || {}),
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

        const hasAccess = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: userId,
                status: "active",
            },
        })
        if (hasAccess) return policy

        const hasRelationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: userId,
                policyholderUserId: policy.ownerUserId,
            },
        })
        if (hasRelationship) return policy

        throw new Error("Unauthorized access to policy")
    }
}
