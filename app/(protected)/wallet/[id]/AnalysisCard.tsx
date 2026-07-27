"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { runPolicyAnalysis, ignoreGap, notifyAgentAboutGap, confirmGap } from "../actions"
import { requestAiConsent } from "@/app/(protected)/agent/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Sparkles, AlertTriangle, Lightbulb, EyeOff, MessageSquare, Loader2, RefreshCw, HelpCircle } from "lucide-react"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import type { FeatureKey } from "@/lib/monetization/feature-gates"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { AiConsentModal } from "@/components/ui/AiConsentModal"

import { useLanguage } from "@/contexts/LanguageContext"
import { toGreekUppercaseNoAccents } from "@/lib/i18n/text-format"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { GapReportList } from "@/components/wallet/gap-report/GapReportList"
import type { GapReportItem } from "@/lib/wallet/gap-report"

interface Gap {
    id: string
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
    /** Evidence ladder: probable (AI) → confirmed (advisor) → validated. */
    validationState?: 'probable' | 'confirmed' | 'validated'
    definition: {
        title: string
        severity: string
    }
}

/** Which feature gate each blocked-analysis reason maps to. */
const LIMIT_REASON_TO_FEATURE: Record<"gap_limit" | "token_limit" | "feature_locked", FeatureKey> = {
    gap_limit: "advanced_gap_detection",
    token_limit: "token_topup",
    feature_locked: "full_ai_policy_analysis",
}

interface AnalysisCardProps {
    policyId: string
    gaps: Gap[]
    /** Agent viewing a customer's policy: offer "request consent" instead of the self-consent modal. */
    canRequestOwnerConsent?: boolean
    policyStatus?: string
    processingError?: { code?: string; message?: string } | null
    analysisPipeline?: {
        runId?: string
        status?: string
        missingSections?: string[]
        lastFailureCode?: string | null
        lastFailureAt?: string | null
    } | null
    /**
     * Deduped, Greek-titled report items (owner wallet view). When absent
     * (agent customers page) the legacy card list renders unchanged.
     */
    report?: {
        items: GapReportItem[]
        reportUnlocked: boolean
    }
    tier?: "free" | "plus" | "pro"
    /** Free-tier owners: complimentary deep analysis still unused? (null = n/a) */
    trialAnalysisAvailable?: boolean | null
    /**
     * Advisor with write access on the agent customers page: show the
     * probable → confirmed action on each gap (evidence ladder). The owner
     * never sees this — confirmation MEANS "an advisor agrees".
     */
    canConfirmGaps?: boolean
}

export function AnalysisCard({
    policyId,
    gaps,
    canRequestOwnerConsent = false,
    policyStatus,
    processingError,
    analysisPipeline,
    report,
    tier,
    trialAnalysisAvailable = null,
    canConfirmGaps = false,
}: AnalysisCardProps) {
    const [analyzing, setAnalyzing] = useState(false)
    const [runId, setRunId] = useState<string | null>(null)
    const [runStatus, setRunStatus] = useState<string>(policyStatus === "analyzing" ? "running" : "idle")
    const [runProgress, setRunProgress] = useState<number>(0)
    const [runStepLabel, setRunStepLabel] = useState<string | null>(null)
    const [runStepHint, setRunStepHint] = useState<string | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    // Evidence ladder: which gap is mid-confirmation, and which confirmed this
    // session (optimistic chip flip without a refetch).
    const [confirmingGapId, setConfirmingGapId] = useState<string | null>(null)
    const [confirmedGapIds, setConfirmedGapIds] = useState<Set<string>>(new Set())
    const [analysisWarning, setAnalysisWarning] = useState<string | null>(null)
    const [missingArtifacts, setMissingArtifacts] = useState<string[]>([])
    const [lastCompletedRunId, setLastCompletedRunId] = useState<string | null>(null)
    const [retryingMissing, setRetryingMissing] = useState(false)
    const [ignoring, setIgnoring] = useState<string | null>(null)
    const [notifying, setNotifying] = useState<string | null>(null)
    const [gapLimitReached, setGapLimitReached] = useState(false)
    const [limitReason, setLimitReason] = useState<"gap_limit" | "token_limit" | "feature_locked">("gap_limit")
    const [agentUpgradeRequired, setAgentUpgradeRequired] = useState(false)
    const [consentModalOpen, setConsentModalOpen] = useState(false)
    const [showConsentRequest, setShowConsentRequest] = useState(false)
    const [requestingConsent, setRequestingConsent] = useState(false)
    // True once the viewer has granted consent this session; a second
    // AI_CONSENT_REQUIRED after that means the policy OWNER's consent is missing
    // (agent-view case) and re-prompting the viewer cannot resolve it.
    const [consentGranted, setConsentGranted] = useState(false)
    const router = useRouter()
    const { t, language } = useLanguage()
    const analysisTitle = toGreekUppercaseNoAccents(t.analysis.title, t.common?.locale || 'el-GR')
    const stepsCopy = t.analysis.steps
    const statusCopy = t.analysis.status
    const errorCopy = t.analysis.errors
    const actionCopy = t.analysis.actions
    const stepLabels = useMemo(
        () => ({
            document_load_and_validation: stepsCopy.document_load_and_validation,
            metadata_extraction_and_verification: stepsCopy.metadata_extraction_and_verification,
            plain_language_translation: stepsCopy.plain_language_translation,
            coverage_mapping: stepsCopy.coverage_mapping,
            gap_detection: stepsCopy.gap_detection,
            savings_detection: stepsCopy.savings_detection,
            checklist_scoring_and_actions: stepsCopy.checklist_scoring_and_actions,
            persistence_and_finalize: stepsCopy.persistence_and_finalize,
        }),
        [stepsCopy.checklist_scoring_and_actions, stepsCopy.coverage_mapping, stepsCopy.document_load_and_validation, stepsCopy.gap_detection, stepsCopy.metadata_extraction_and_verification, stepsCopy.persistence_and_finalize, stepsCopy.plain_language_translation, stepsCopy.savings_detection]
    )

    const resolveErrorMessage = (code?: string | null, fallback?: string | null) => {
        const normalizedCode = String(code || "").toUpperCase()
        const normalizedFallback = String(fallback || "")
        if (
            normalizedCode.includes("TOKEN_LIMIT_BLOCKED") ||
            normalizedFallback.includes("monthly_limit_reached") ||
            normalizedFallback.includes("insufficient_tokens")
        ) {
            return errorCopy.tokenLimit
        }
        if (normalizedCode.includes("TIMEOUT") || normalizedFallback.toLowerCase().includes("timeout")) {
            return errorCopy.timeout
        }
        if (normalizedCode.includes("SCHEMA")) {
            return errorCopy.schema
        }
        if (normalizedCode.includes("DOCUMENT")) {
            return errorCopy.document
        }
        if (normalizedCode.includes("AUTH")) {
            return errorCopy.auth
        }
        if (normalizedCode.includes("EXTERNAL_SERVICE")) {
            return errorCopy.unavailable
        }
        return errorCopy.generic
    }

    const resolveUserMessageKey = (messageKey?: string | null) => {
        if (!messageKey) return null
        if (messageKey === "analysis.errors.tokenLimit") return errorCopy.tokenLimit
        if (messageKey === "analysis.errors.schema") return errorCopy.schema
        if (messageKey === "analysis.errors.document") return errorCopy.document
        if (messageKey === "analysis.errors.auth") return errorCopy.auth
        if (messageKey === "analysis.errors.timeout") return errorCopy.timeout
        if (messageKey === "analysis.status.completedWithWarnings") {
            return statusCopy.completedWithWarningsHint
        }
        return null
    }

    const missingArtifactLabels: Record<string, string> = {
        plain_language_summary: stepLabels.plain_language_translation,
        coverage_snapshot: stepLabels.coverage_mapping,
        coverage_map: stepLabels.coverage_mapping,
        gap_results: stepLabels.gap_detection,
        savings_opportunities: stepLabels.savings_detection,
        checklist_scores: stepLabels.checklist_scoring_and_actions,
        priority_actions: stepLabels.checklist_scoring_and_actions,
        translation: t.analysis.translationIncomplete,
    }

    const translationWarning = missingArtifacts.includes("translation")

    const backgroundInProgress = policyStatus === "analyzing" && !runId && !analyzing
    const analysisInProgress = analyzing || runStatus === "queued" || runStatus === "running" || backgroundInProgress

    // Deduplicate gaps based on content
    const uniqueGaps = useMemo(() => {
        const seen = new Set();
        return gaps.filter(gap => {
            // Determine content based on language to ensure visual duplication is caught
            // But fundamentally duplication is about the gap concept, so title + explanation is a good key.
            // We use English explanation as fallback key if available to be stable across lang switches, 
            // but finding itself might be duplicated in DB.
            const explanation = gap.aiExplanation || gap.aiExplanationEl || '';
            const key = `${gap.definition.title}|${explanation}`;

            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [gaps]);

    useEffect(() => {
        if (backgroundInProgress && !analyzing) {
            setRunStatus("running")
            setRunStepLabel(statusCopy.background)
            setRunStepHint(statusCopy.backgroundHint)
            setRunProgress((prev) => (prev > 0 ? prev : 20))
        }
    }, [backgroundInProgress, analyzing, statusCopy.background, statusCopy.backgroundHint])

    useEffect(() => {
        if (!analysisInProgress && processingError) {
            setAnalysisWarning(null)
            setAnalysisError(resolveErrorMessage(processingError.code, processingError.message))
        }
    }, [analysisInProgress, processingError])

    useEffect(() => {
        if (analysisInProgress || !analysisPipeline) return
        const status = String(analysisPipeline.status || "")
        if (status === "completed_with_warnings") {
            const warningMessage = statusCopy.completedWithWarningsHint
            setAnalysisError(null)
            setAnalysisWarning(warningMessage)
            setMissingArtifacts(
                Array.isArray(analysisPipeline.missingSections)
                    ? analysisPipeline.missingSections
                    : []
            )
            setLastCompletedRunId(analysisPipeline.runId || null)
            setRunStatus(status)
        }
    }, [analysisInProgress, analysisPipeline, statusCopy.completedWithWarningsHint])

    const handleAnalyze = async () => {
        // Re-entrancy guard: this runs a metered AI job, so a double-fire costs
        // the user tokens twice. Guarding here covers EVERY call site (the
        // header button, both retry buttons, and the consent-modal callback)
        // rather than relying on each one remembering to disable itself.
        if (analysisInProgress) return
        setAnalysisError(null)
        setAnalysisWarning(null)
        setMissingArtifacts([])
        setLastCompletedRunId(null)
        setAgentUpgradeRequired(false)
        setAnalyzing(true)
        setRunId(null)
        setRunStatus("queued")
        setRunProgress(5)
        setRunStepLabel(statusCopy.queued)
        setRunStepHint(statusCopy.starting)

        const toastId = toast.loading(t.toast.analysisStarting)
        const res = await runPolicyAnalysis(policyId)

        if ("error" in res && res.error) {
            setAnalyzing(false)
            setRunStatus("failed")

            if (res.error === "AI_CONSENT_REQUIRED") {
                toast.dismiss(toastId)
                if (canRequestOwnerConsent) {
                    // The viewer is an agent — they cannot consent for the data
                    // subject; offer to request the owner's consent instead.
                    setAnalysisError(t.common.aiConsentOwnerRequired)
                    setShowConsentRequest(true)
                } else if (consentGranted) {
                    setAnalysisError(t.common.aiConsentOwnerRequired)
                } else {
                    setRunStatus("idle")
                    setConsentModalOpen(true)
                }
                return
            }

            if (res.error === "AGENT_UPGRADE_REQUIRED") {
                // Agent on the free plan: manual re-analysis is a paid-plan
                // feature. Not the b2c UpgradeModal — that checkout targets
                // b2c plans; agents go to /agent/pricing.
                toast.dismiss(toastId)
                setRunStatus("idle")
                setAgentUpgradeRequired(true)
                return
            }

            if (res.error === "TOKEN_LIMIT_BLOCKED" || res.error === "LIMIT_REACHED" || res.error === "UPGRADE_REQUIRED") {
                setLimitReason(
                    res.error === "TOKEN_LIMIT_BLOCKED" ? "token_limit"
                        : res.error === "UPGRADE_REQUIRED" ? "feature_locked"
                            : "gap_limit"
                )
                setGapLimitReached(true)
                setAnalysisError(resolveErrorMessage(res.error, res.error))
                toast.dismiss(toastId)
                return
            }

            const friendly = resolveErrorMessage(res.error, res.error)
            setAnalysisError(friendly)
            toast.error(friendly, { id: toastId })
            return
        }

        if ("runId" in res && res.runId) {
            setRunId(res.runId)
            toast.success(t.toast.analysisStarted, { id: toastId })
        } else {
            setAnalyzing(false)
            setRunStatus("failed")
            setAnalysisError(errorCopy.generic)
            toast.error(errorCopy.generic, { id: toastId })
        }
    }

    const handleRetryMissing = async () => {
        if (!lastCompletedRunId) return
        setRetryingMissing(true)
        setAnalysisError(null)
        setAnalysisWarning(null)
        setAgentUpgradeRequired(false)

        try {
            const response = await fetch(
                `/api/v1/policies/${policyId}/analysis-runs/${lastCompletedRunId}/retry-missing`,
                {
                    method: "POST",
                }
            )
            const payload = await response.json()
            if (!response.ok) {
                if (payload?.error?.code === "AGENT_UPGRADE_REQUIRED") {
                    setAgentUpgradeRequired(true)
                    return
                }
                const message = payload?.error?.message || payload?.message || null
                const friendly = resolveErrorMessage("RETRY_MISSING_FAILED", message) || statusCopy.retryFailed
                setAnalysisError(friendly)
                toast.error(friendly)
                return
            }

            const newRunId = payload?.data?.run_id
            if (newRunId) {
                setRunId(String(newRunId))
                setRunStatus("queued")
                setRunProgress(10)
                setRunStepLabel(statusCopy.queued)
                setRunStepHint(statusCopy.retryMissingHint)
                setAnalyzing(true)
                toast.success(statusCopy.retryMissingStarted)
                return
            }

            setAnalysisError(errorCopy.generic)
        } catch {
            setAnalysisError(errorCopy.generic)
        } finally {
            setRetryingMissing(false)
        }
    }

    useEffect(() => {
        if (!runId) return

        let cancelled = false

        const pollRun = async () => {
            // Skip while the tab is hidden — this fired every 2.5s regardless, so a
            // backgrounded phone kept polling the analysis endpoint indefinitely.
            // (The shared hooks/usePolling covers the wallet and upload pollers;
            // this effect's cancellation flag and ~20 dependencies make a full
            // migration riskier than the win, so it takes the guard in place.)
            if (typeof document !== "undefined" && document.hidden) return
            try {
                const response = await fetch(`/api/v1/policies/${policyId}/analysis-runs/${runId}`, {
                    method: "GET",
                    cache: "no-store",
                })

                if (!response.ok) {
                    throw new Error(`Run status fetch failed (${response.status})`)
                }

                const payload = await response.json()
                const run = payload?.data
                if (!run || cancelled) return

                const status = String(run.status || "running")
                const resolvedRunId = String(run.run_id || runId)
                setRunStatus(status)

                const steps = Array.isArray(run.steps) ? run.steps : []
                const latestByKey = new Map<string, any>()
                for (const step of steps) {
                    const existing = latestByKey.get(step.key)
                    if (!existing || Number(step.attempt || 0) >= Number(existing.attempt || 0)) {
                        latestByKey.set(step.key, step)
                    }
                }

                const latestSteps = Array.from(latestByKey.values())
                const runningStep = latestSteps.find((step) => step.status === "running" || step.status === "retrying")
                const completedSteps = latestSteps.filter((step) => step.status === "completed").length

                const overallProgress =
                    typeof run.overall_success_pct === "number"
                        ? run.overall_success_pct
                        : Math.round((completedSteps / 8) * 100)

                if (status === "queued") {
                    setRunProgress(10)
                    setRunStepLabel(statusCopy.queued)
                    setRunStepHint(statusCopy.starting)
                } else if (status === "running") {
                    setRunProgress(Math.max(12, Math.min(95, overallProgress || 0)))
                    if (runningStep?.key) {
                        setRunStepLabel(
                            stepLabels[runningStep.key as keyof typeof stepLabels] || statusCopy.inProgress
                        )
                    } else {
                        setRunStepLabel(statusCopy.inProgress)
                    }
                    setRunStepHint(runningStep?.log_message || statusCopy.inProgressHint)
                } else if (status === "completed") {
                    setRunProgress(100)
                    setRunStepLabel(statusCopy.completed)
                    setRunStepHint(statusCopy.completedHint)
                    setAnalyzing(false)
                    setRunId(null)
                    setLastCompletedRunId(resolvedRunId)
                    setAnalysisWarning(null)
                    setMissingArtifacts([])
                    toast.success(statusCopy.completed)
                    router.refresh()
                } else if (status === "completed_with_warnings") {
                    const warningMessage =
                        resolveUserMessageKey(run.final_user_message_key) ||
                        statusCopy.completedWithWarningsHint
                    const missing = Array.isArray(run.missing_artifacts)
                        ? (run.missing_artifacts as string[])
                        : []
                    setRunProgress(100)
                    setRunStepLabel(statusCopy.completedWithWarnings)
                    setRunStepHint(warningMessage)
                    setAnalyzing(false)
                    setRunId(null)
                    setLastCompletedRunId(resolvedRunId)
                    setAnalysisError(null)
                    setAnalysisWarning(warningMessage)
                    setMissingArtifacts(missing)
                    toast.warning(statusCopy.completedWithWarnings)
                    router.refresh()
                } else if (status === "blocked" || status === "failed") {
                    const message =
                        resolveUserMessageKey(run.final_user_message_key) ||
                        resolveErrorMessage(run.failure_code, run.failure_message)
                    setAnalysisError(message)
                    setAnalysisWarning(null)
                    setMissingArtifacts([])
                    setAnalyzing(false)
                    setRunId(null)
                    if (status === "blocked") {
                        setGapLimitReached(true)
                    } else {
                        toast.error(message)
                    }
                }
            } catch {
                if (!cancelled) {
                    setRunStepHint(statusCopy.stillProcessingHint)
                }
            }
        }

        pollRun()
        const interval = setInterval(pollRun, 2500)
        const onVisible = () => { if (!document.hidden) void pollRun() }
        document.addEventListener("visibilitychange", onVisible)

        return () => {
            cancelled = true
            clearInterval(interval)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [
        errorCopy.auth,
        errorCopy.document,
        errorCopy.generic,
        errorCopy.schema,
        errorCopy.timeout,
        errorCopy.tokenLimit,
        policyId,
        router,
        runId,
        statusCopy.completed,
        statusCopy.completedHint,
        statusCopy.completedWithWarnings,
        statusCopy.completedWithWarningsHint,
        statusCopy.inProgress,
        statusCopy.inProgressHint,
        statusCopy.queued,
        statusCopy.starting,
        stepLabels,
    ])

    const handleIgnore = async (gapId: string) => {
        setIgnoring(gapId)
        const res = await ignoreGap(gapId)
        setIgnoring(null)

        if (res.error) {
            toast.error(mapWalletErrorToMessage(res.error, t, "analysis"))
        } else {
            toast.success(actionCopy.hidden)
            router.refresh()
        }
    }

    // Report items may carry duplicateIds (DB-level twins under slug-spelling
    // variants) — hide the whole set or the twin resurfaces on refresh.
    const handleIgnoreMany = async (gapIds: string[]) => {
        if (gapIds.length === 0) return
        setIgnoring(gapIds[0])
        let error: string | null = null
        for (const gapId of gapIds) {
            const res = await ignoreGap(gapId)
            if (res.error) error = res.error
        }
        setIgnoring(null)

        if (error) {
            toast.error(mapWalletErrorToMessage(error, t, "analysis"))
        } else {
            toast.success(actionCopy.hidden)
            router.refresh()
        }
    }

    const handleNotify = async (gapId: string) => {
        setNotifying(gapId)
        const res = await notifyAgentAboutGap(gapId, policyId)
        setNotifying(null)

        if (res.error) {
            toast.error(mapWalletErrorToMessage(res.error, t, "analysis"))
        } else {
            toast.success(actionCopy.agentNotified)
        }
    }

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="bg-primary p-6 flex justify-between items-center">
                <div className="flex items-center gap-3 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black">{analysisTitle}</h2>
                        <p className="text-sm text-white/80 mt-0.5">{t.wallet.analysisSubtitle}</p>
                    </div>
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={analysisInProgress}
                    // Dark label on a translucent white panel over the brand teal: at /20 the
                    // effective surface is #54867c and the label measures 4.32:1. /35 lifts it
                    // to ~5.9 while keeping the glass treatment.
                    className="pw-secondary-button bg-white/35 backdrop-blur-sm"
                >
                    {analysisInProgress ? statusCopy.inProgress : t.analysis.runAnalysis}
                </button>
            </div>
            {/* Agent on the free plan hit the paid-only manual re-analysis
                gate — upsell the AGENT plans (not the b2c UpgradeModal). */}
            {agentUpgradeRequired && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-amber-200 bg-[#FEF3C7]/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#92400E] dark:text-amber-400" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#92400E] dark:text-amber-400">
                                    {t.analysis.errors.agentUpgradeRequired}
                                </p>
                                <p className="mt-1 text-xs text-[#92400E]/80 dark:text-amber-400/80">
                                    {t.analysis.errors.agentUpgradeRequiredHint}
                                </p>
                                <Link
                                    href="/agent/pricing"
                                    className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                                >
                                    {t.analysis.actions.viewAgentPlans}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* The complimentary deep analysis exists server-side but was never
                advertised — say it before use, nudge the upgrade after. */}
            {tier === "free" && trialAnalysisAvailable === true && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary-tint px-4 py-3 dark:border-primary/35 dark:bg-primary/15">
                        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                        <p className="text-sm font-medium text-black/75 dark:text-white/80">
                            {t.analysis.freeTrialAvailable}
                        </p>
                    </div>
                </div>
            )}
            {tier === "free" && trialAnalysisAvailable === false && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <UpgradeTriggerCard
                        featureKey="full_ai_policy_analysis"
                        triggerSource="post_trial_analysis"
                        variant="inline"
                    />
                </div>
            )}
            {analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-primary/25 bg-primary-tint p-4 dark:border-primary/35 dark:bg-primary/15">
                        <div className="flex items-start gap-3">
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary dark:text-mint" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#166534] dark:text-mint">
                                    {runStepLabel || statusCopy.inProgress}
                                </p>
                                <p className="mt-1 text-xs text-[#166534]/85 dark:text-mint/90">
                                    {runStepHint || statusCopy.autoRefreshHint}
                                </p>
                            </div>
                            <span className="text-xs font-bold text-[#166534] dark:text-mint">
                                {runProgress}%
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${Math.max(8, Math.min(100, runProgress))}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {analysisWarning && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                    {statusCopy.completedWithWarnings}
                                </p>
                                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                                    {analysisWarning}
                                </p>
                                {missingArtifacts.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {missingArtifacts.map((artifact) => (
                                            <span
                                                key={artifact}
                                                className="rounded-full border border-amber-300/70 bg-white px-2 py-0.5 text-kicker font-bold text-amber-900 dark:border-amber-600/70 dark:bg-amber-900/40 dark:text-amber-100"
                                            >
                                                {missingArtifactLabels[artifact as keyof typeof missingArtifactLabels] || actionCopy.unknownSection}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {lastCompletedRunId && (
                                    <button
                                        onClick={handleRetryMissing}
                                        disabled={retryingMissing}
                                        className="pw-secondary-button border-amber-400/60 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        {retryingMissing
                                            ? statusCopy.retrying
                                            : statusCopy.retryMissing}
                                    </button>
                                )}
                                <button
                                    onClick={handleAnalyze}
                                    disabled={analysisInProgress || retryingMissing}
                                    className="pw-secondary-button border-amber-400/60 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                                >
                                    <RefreshCw className={`h-3 w-3 ${analysisInProgress ? "animate-spin" : ""}`} />
                                    {statusCopy.retryFull || statusCopy.retry}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {translationWarning && !analysisInProgress && (
                <div className="px-6 pt-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/40">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">{t.analysis.translationIncomplete}:</span>{" "}
                            {t.analysis.translationIncompleteHint}
                        </p>
                    </div>
                </div>
            )}
            {analysisError && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                    {statusCopy.attention}
                                </p>
                                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                                    {analysisError}
                                </p>
                            </div>
                            {showConsentRequest ? (
                                <button
                                    onClick={async () => {
                                        setRequestingConsent(true)
                                        const res = await requestAiConsent(policyId)
                                        if ("error" in res && res.error) {
                                            toast.error(mapWalletErrorToMessage(res.error, t, "generic"))
                                        } else if ("emailDelivered" in res && res.emailDelivered === false) {
                                            // The invite/notification exists but the email never
                                            // left — hand the agent the link instead of celebrating.
                                            const link = "inviteLink" in res ? res.inviteLink : undefined
                                            if (link) {
                                                navigator.clipboard?.writeText(link).catch(() => {})
                                                toast.warning(t.common.aiConsentEmailFailedLinkCopied)
                                            } else {
                                                toast.warning(t.common.aiConsentEmailFailed)
                                            }
                                            setShowConsentRequest(false)
                                            setAnalysisError(null)
                                        } else {
                                            toast.success(t.common.aiConsentRequestSent)
                                            setShowConsentRequest(false)
                                            setAnalysisError(null)
                                        }
                                        setRequestingConsent(false)
                                    }}
                                    disabled={requestingConsent}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/80"
                                >
                                    {t.common.aiConsentRequestAction}
                                </button>
                            ) : (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={analysisInProgress}
                                    className="pw-secondary-button border-amber-400/60 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                                >
                                    <RefreshCw className={`h-3 w-3 ${analysisInProgress ? "animate-spin" : ""}`} />
                                    {statusCopy.retry}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="p-6">
                {report && report.items.length > 0 ? (
                    <>
                        <GapReportList
                            items={report.items}
                            policyId={policyId}
                            reportUnlocked={report.reportUnlocked}
                            lang={language === "el" ? "el" : "en"}
                            copy={{
                                ...t.analysis.report,
                                recommendation: t.analysis.recommendation,
                                hide: actionCopy.hide,
                                sending: actionCopy.sending,
                                notifyAgent: actionCopy.viewMoreDetails,
                            }}
                            onIgnore={handleIgnoreMany}
                            onNotify={handleNotify}
                            ignoringId={ignoring}
                            notifyingId={notifying}
                        />
                        <AiDisclaimer />
                    </>
                ) : uniqueGaps.length === 0 || report ? (
                    missingArtifacts.includes("gap_results") ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <HelpCircle className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">
                                {t.analysis.gapCheckIncomplete}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t.analysis.gapCheckIncompleteHint}
                            </p>
                        </div>
                    ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-primary dark:text-mint" />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">
                            {t.analysis.noGaps}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t.wallet.runAnalysisDesc}
                        </p>
                    </div>
                    )
                ) : (
                    <div className="space-y-4">
                        {uniqueGaps.map((gap) => {
                            const explanation = language === 'el' ? (gap.aiExplanationEl || gap.aiExplanation) : gap.aiExplanation
                            const suggestion = language === 'el' ? (gap.aiSuggestionEl || gap.aiSuggestion) : gap.aiSuggestion
                            // Evidence ladder chip + advisor confirm action.
                            const gapValidation = confirmedGapIds.has(gap.id)
                                ? 'confirmed'
                                : (gap.validationState ?? 'probable')
                            const validationLabel = t.analysis.report.validationChip[gapValidation]

                            // Neutral styling, matching the canonical GapCard ("neutral by
                            // design — severity values are unvalidated"): every gap was
                            // rendered in alarming red regardless of its severity, so a
                            // low-severity finding looked as critical as an uninsured
                            // compulsory line — over-alarming and losing the priority signal.
                            // The recommendation keeps its soft amber highlight.
                            return (
                                <div key={gap.id} className="bg-white dark:bg-white/5 p-5 rounded-xl border border-black/10 dark:border-white/15 transition-all duration-300 hover:shadow-md">
                                    <div className="flex gap-4">
                                        <div className="shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center">
                                                <AlertTriangle className="w-5 h-5 text-black/55 dark:text-white/60" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <h4 className="font-bold text-foreground text-sm">
                                                        {gap.definition.title || t.analysis.gapDetected}
                                                    </h4>
                                                    <span
                                                        className={
                                                            gapValidation === 'probable'
                                                                ? "rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-black/55 dark:border-white/15 dark:bg-white/10 dark:text-white/60"
                                                                : "rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-primary/90 dark:border-primary/30 dark:bg-primary/10 dark:text-mint/90"
                                                        }
                                                    >
                                                        {validationLabel}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    {canConfirmGaps && gapValidation === 'probable' && (
                                                        <button
                                                            onClick={async () => {
                                                                setConfirmingGapId(gap.id)
                                                                const res = await confirmGap(gap.id)
                                                                setConfirmingGapId(null)
                                                                if (res && 'success' in res && res.success) {
                                                                    setConfirmedGapIds((prev) => new Set(prev).add(gap.id))
                                                                }
                                                            }}
                                                            disabled={confirmingGapId === gap.id}
                                                            className="rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 dark:border-primary/35 dark:text-mint dark:hover:bg-primary/10"
                                                        >
                                                            {confirmingGapId === gap.id
                                                                ? t.analysis.report.validationConfirming
                                                                : t.analysis.report.validationConfirmCta}
                                                        </button>
                                                    )}
                                                    {/* Ignore Button */}
                                                    <button
                                                        onClick={() => handleIgnore(gap.id)}
                                                        disabled={ignoring === gap.id}
                                                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white/50 hover:text-slate-600 dark:hover:bg-slate-800/50 dark:hover:text-slate-300 transition-colors"
                                                        title={actionCopy.hide}
                                                    >
                                                        <EyeOff className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-sm text-black/70 dark:text-white/75 leading-relaxed mb-3">
                                                {explanation}
                                            </p>

                                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg mb-4">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-amber-900 dark:text-amber-100 mb-1">
                                                            {t.analysis.recommendation}
                                                        </p>
                                                        <p className="text-xs text-amber-800 dark:text-amber-200">
                                                            {suggestion}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleNotify(gap.id)}
                                                    disabled={notifying === gap.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/15 rounded-lg text-xs font-bold text-black/75 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-sm"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    {notifying === gap.id
                                                        ? actionCopy.sending
                                                        : actionCopy.viewMoreDetails}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {!report && uniqueGaps.length > 0 && <AiDisclaimer />}
            </div>
            {/* Standard context-aware checkout (billing toggle + trial line;
                returnTo falls back to the current pathname) — replaced the
                legacy LimitReachedModal at this blocked-analysis moment. */}
            <UpgradeModal
                isOpen={gapLimitReached}
                onClose={() => setGapLimitReached(false)}
                featureKey={LIMIT_REASON_TO_FEATURE[limitReason]}
                triggerSource={`analysis_${limitReason}`}
            />
            <AiConsentModal
                isOpen={consentModalOpen}
                onClose={() => setConsentModalOpen(false)}
                onConsented={() => {
                    setConsentGranted(true)
                    setConsentModalOpen(false)
                    handleAnalyze()
                }}
                source="wallet_analysis_card"
            />
        </div>
    )
}
