"use client"
import { useEffect, useMemo, useState } from "react"
import { runPolicyAnalysis, ignoreGap, notifyAgentAboutGap } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Sparkles, AlertTriangle, Lightbulb, EyeOff, MessageSquare, Loader2, RefreshCw } from "lucide-react"
import { LimitReachedModal } from "@/components/account/LimitReachedModal"

import { useLanguage } from "@/contexts/LanguageContext"
import { toGreekUppercaseNoAccents } from "@/lib/i18n/text-format"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

interface Gap {
    id: string
    aiExplanation: string | null
    aiExplanationEl: string | null
    aiSuggestion: string | null
    aiSuggestionEl: string | null
    definition: {
        title: string
        severity: string
    }
}

interface AnalysisCardProps {
    policyId: string
    gaps: Gap[]
    policyStatus?: string
    processingError?: { code?: string; message?: string } | null
    analysisPipeline?: {
        runId?: string
        status?: string
        missingSections?: string[]
        lastFailureCode?: string | null
        lastFailureAt?: string | null
    } | null
}

export function AnalysisCard({
    policyId,
    gaps,
    policyStatus,
    processingError,
    analysisPipeline,
}: AnalysisCardProps) {
    const [analyzing, setAnalyzing] = useState(false)
    const [runId, setRunId] = useState<string | null>(null)
    const [runStatus, setRunStatus] = useState<string>(policyStatus === "analyzing" ? "running" : "idle")
    const [runProgress, setRunProgress] = useState<number>(0)
    const [runStepLabel, setRunStepLabel] = useState<string | null>(null)
    const [runStepHint, setRunStepHint] = useState<string | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const [analysisWarning, setAnalysisWarning] = useState<string | null>(null)
    const [missingArtifacts, setMissingArtifacts] = useState<string[]>([])
    const [lastCompletedRunId, setLastCompletedRunId] = useState<string | null>(null)
    const [retryingMissing, setRetryingMissing] = useState(false)
    const [ignoring, setIgnoring] = useState<string | null>(null)
    const [notifying, setNotifying] = useState<string | null>(null)
    const [gapLimitReached, setGapLimitReached] = useState(false)
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
    }

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
        setAnalysisError(null)
        setAnalysisWarning(null)
        setMissingArtifacts([])
        setLastCompletedRunId(null)
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

            if (res.error === "TOKEN_LIMIT_BLOCKED" || res.error === "LIMIT_REACHED") {
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

        try {
            const response = await fetch(
                `/api/v1/policies/${policyId}/analysis-runs/${lastCompletedRunId}/retry-missing`,
                {
                    method: "POST",
                }
            )
            const payload = await response.json()
            if (!response.ok) {
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

        return () => {
            cancelled = true
            clearInterval(interval)
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
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 flex justify-between items-center">
                <div className="flex items-center gap-3 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black">{analysisTitle}</h2>
                        <p className="text-sm text-emerald-100 mt-0.5">{t.wallet.analysisSubtitle}</p>
                    </div>
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={analysisInProgress}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all disabled:opacity-50 backdrop-blur-sm border border-white/30 hover:shadow-lg"
                >
                    {analysisInProgress ? statusCopy.inProgress : t.analysis.runAnalysis}
                </button>
            </div>
            {analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                        <div className="flex items-start gap-3">
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-300" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                    {runStepLabel || statusCopy.inProgress}
                                </p>
                                <p className="mt-1 text-xs text-emerald-800/85 dark:text-emerald-200/90">
                                    {runStepHint || statusCopy.autoRefreshHint}
                                </p>
                            </div>
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                                {runProgress}%
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900/60">
                            <div
                                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
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
                                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                                    {analysisWarning}
                                </p>
                                {missingArtifacts.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {missingArtifacts.map((artifact) => (
                                            <span
                                                key={artifact}
                                                className="rounded-full border border-amber-300/70 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:border-amber-600/70 dark:bg-amber-900/40 dark:text-amber-100"
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
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/80"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        {retryingMissing
                                            ? statusCopy.retrying
                                            : statusCopy.retryMissing}
                                    </button>
                                )}
                                <button
                                    onClick={handleAnalyze}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/80"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    {statusCopy.retryFull || statusCopy.retry}
                                </button>
                            </div>
                        </div>
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
                                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                                    {analysisError}
                                </p>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/80"
                            >
                                <RefreshCw className="h-3 w-3" />
                                {statusCopy.retry}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="p-6">
                {uniqueGaps.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">
                            {t.analysis.noGaps}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            {t.wallet.runAnalysisDesc}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {uniqueGaps.map((gap) => {
                            const explanation = language === 'el' ? (gap.aiExplanationEl || gap.aiExplanation) : gap.aiExplanation
                            const suggestion = language === 'el' ? (gap.aiSuggestionEl || gap.aiSuggestion) : gap.aiSuggestion

                            return (
                                <div key={gap.id} className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-5 rounded-xl border border-red-200 dark:border-red-900/30 transition-all duration-300 hover:shadow-md">
                                    <div className="flex gap-4">
                                        <div className="shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                                                <AlertTriangle className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-red-900 dark:text-red-100 text-sm mb-2">
                                                    {gap.definition.title || t.analysis.gapDetected}
                                                </h4>

                                                <div className="flex gap-2">
                                                    {/* Ignore Button */}
                                                    <button
                                                        onClick={() => handleIgnore(gap.id)}
                                                        disabled={ignoring === gap.id}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-white/50 hover:text-slate-600 dark:hover:bg-slate-800/50 dark:hover:text-slate-300 transition-colors"
                                                        title={actionCopy.hide}
                                                    >
                                                        <EyeOff className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed mb-3">
                                                {explanation}
                                            </p>

                                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg mb-4">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/50 rounded-lg text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
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
            </div>
            <LimitReachedModal
                isOpen={gapLimitReached}
                reason="gap_limit"
                language={language as 'el' | 'en'}
                onDismiss={() => setGapLimitReached(false)}
            />
        </div>
    )
}
