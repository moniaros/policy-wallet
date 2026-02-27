"use client"
import { useEffect, useMemo, useState } from "react"
import { runPolicyAnalysis, ignoreGap, notifyAgentAboutGap } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Sparkles, AlertTriangle, Lightbulb, EyeOff, MessageSquare, Loader2, RefreshCw } from "lucide-react"
import { LimitReachedModal } from "@/components/account/LimitReachedModal"

import { useLanguage } from "@/contexts/LanguageContext"
import { toGreekUppercaseNoAccents } from "@/lib/i18n/text-format"

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
}

export function AnalysisCard({ policyId, gaps, policyStatus, processingError }: AnalysisCardProps) {
    const [analyzing, setAnalyzing] = useState(false)
    const [runId, setRunId] = useState<string | null>(null)
    const [runStatus, setRunStatus] = useState<string>(policyStatus === "analyzing" ? "running" : "idle")
    const [runProgress, setRunProgress] = useState<number>(0)
    const [runStepLabel, setRunStepLabel] = useState<string | null>(null)
    const [runStepHint, setRunStepHint] = useState<string | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const [ignoring, setIgnoring] = useState<string | null>(null)
    const [notifying, setNotifying] = useState<string | null>(null)
    const [gapLimitReached, setGapLimitReached] = useState(false)
    const router = useRouter()
    const { t, language } = useLanguage()
    const analysisTitle = toGreekUppercaseNoAccents(t.analysis.title, t.common?.locale || 'el-GR')
    const stepsCopy = t.analysis?.steps || {}
    const statusCopy = t.analysis?.status || {}
    const errorCopy = t.analysis?.errors || {}
    const stepLabels = useMemo(
        () => ({
            document_load_and_validation: stepsCopy.document_load_and_validation || "Loading policy document",
            metadata_extraction_and_verification: stepsCopy.metadata_extraction_and_verification || "Extracting core policy details",
            plain_language_translation: stepsCopy.plain_language_translation || "Generating plain-language summary",
            coverage_mapping: stepsCopy.coverage_mapping || "Mapping policy coverages",
            gap_detection: stepsCopy.gap_detection || "Checking coverage gaps",
            savings_detection: stepsCopy.savings_detection || "Detecting savings opportunities",
            checklist_scoring_and_actions: stepsCopy.checklist_scoring_and_actions || "Scoring checklist and actions",
            persistence_and_finalize: stepsCopy.persistence_and_finalize || "Saving analysis results",
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
            return errorCopy.tokenLimit || "Analysis is paused because token limits were reached. Upgrade or buy credits to continue."
        }
        if (normalizedCode.includes("TIMEOUT") || normalizedFallback.toLowerCase().includes("timeout")) {
            return errorCopy.timeout || "Analysis took longer than expected. Please retry in a moment."
        }
        if (normalizedCode.includes("EXTERNAL_SERVICE")) {
            return errorCopy.unavailable || "AI service is temporarily unavailable. Please try again shortly."
        }
        return fallback || errorCopy.generic || "Analysis failed. Please retry."
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
            setRunStepLabel(statusCopy.background || "Background analysis is running")
            setRunStepHint(statusCopy.backgroundHint || "This may take a few minutes for larger documents.")
            setRunProgress((prev) => (prev > 0 ? prev : 20))
        }
    }, [backgroundInProgress, analyzing, statusCopy.background, statusCopy.backgroundHint])

    useEffect(() => {
        if (!analysisInProgress && processingError) {
            setAnalysisError(resolveErrorMessage(processingError.code, processingError.message))
        }
    }, [analysisInProgress, processingError])

    const handleAnalyze = async () => {
        setAnalysisError(null)
        setAnalyzing(true)
        setRunId(null)
        setRunStatus("queued")
        setRunProgress(5)
        setRunStepLabel(statusCopy.queued || "Queued for analysis")
        setRunStepHint(statusCopy.starting || "Preparing your document for AI analysis...")

        const toastId = toast.loading(t.toast?.analysisStarting || statusCopy.starting || t.analysis.analyzing)
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
            toast.success(
                t.toast?.analysisStarted || statusCopy.inProgress || "Analysis started. Progress will update below.",
                { id: toastId }
            )
        } else {
            setAnalyzing(false)
            setRunStatus("failed")
            const fallback = errorCopy.generic || "Analysis failed. Please retry."
            setAnalysisError(fallback)
            toast.error(fallback, { id: toastId })
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
                    setRunStepLabel(statusCopy.queued || "Queued for analysis")
                    setRunStepHint(statusCopy.starting || "Preparing your document for AI analysis...")
                } else if (status === "running") {
                    setRunProgress(Math.max(12, Math.min(95, overallProgress || 0)))
                    if (runningStep?.key) {
                        setRunStepLabel(stepLabels[runningStep.key] || runningStep.key)
                    } else {
                        setRunStepLabel(statusCopy.inProgress || "AI analysis in progress")
                    }
                    setRunStepHint(runningStep?.log_message || statusCopy.inProgressHint || "We are validating and extracting policy insights.")
                } else if (status === "completed") {
                    setRunProgress(100)
                    setRunStepLabel(statusCopy.completed || "Analysis completed")
                    setRunStepHint(statusCopy.completedHint || "Refreshing insights...")
                    setAnalyzing(false)
                    setRunId(null)
                    toast.success(statusCopy.completed || "Analysis completed")
                    router.refresh()
                } else if (status === "blocked" || status === "failed") {
                    const message = resolveErrorMessage(run.failure_code, run.failure_message)
                    setAnalysisError(message)
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
                    setRunStepHint(statusCopy.inProgressHint || "We are still processing your analysis.")
                }
            }
        }

        pollRun()
        const interval = setInterval(pollRun, 2500)

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [runId, policyId, router, statusCopy.completed, statusCopy.completedHint, statusCopy.inProgress, statusCopy.inProgressHint, statusCopy.queued, statusCopy.starting, stepLabels])

    const handleIgnore = async (gapId: string) => {
        setIgnoring(gapId)
        const res = await ignoreGap(gapId)
        setIgnoring(null)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(language === 'el' ? 'Η ειδοποίηση αποκρύφθηκε' : 'Alert hidden')
            router.refresh()
        }
    }

    const handleNotify = async (gapId: string) => {
        setNotifying(gapId)
        const res = await notifyAgentAboutGap(gapId, policyId)
        setNotifying(null)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(res.message || (language === 'el' ? 'Ο ασφαλιστής ενημερώθηκε' : 'Agent notified'))
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
                    {analysisInProgress ? (statusCopy.inProgress || t.analysis.analyzing) : t.analysis.runAnalysis}
                </button>
            </div>
            {analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                        <div className="flex items-start gap-3">
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-300" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                    {runStepLabel || statusCopy.inProgress || "AI analysis in progress"}
                                </p>
                                <p className="mt-1 text-xs text-emerald-800/85 dark:text-emerald-200/90">
                                    {runStepHint || statusCopy.inProgressHint || "Your results will refresh automatically when this run finishes."}
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
            {analysisError && !analysisInProgress && (
                <div className="px-6 pt-5">
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                    {statusCopy.attention || "Action required"}
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
                                {statusCopy.retry || "Retry"}
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
                                                        title={language === 'el' ? 'Απόκρυψη' : 'Hide'}
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
                                                        ? (language === 'el' ? 'Αποστολή...' : 'Sending...')
                                                        : (language === 'el' ? 'Περισσότερες λεπτομέρειες' : 'View more details')}
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
