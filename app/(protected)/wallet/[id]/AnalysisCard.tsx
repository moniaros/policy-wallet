"use client"
import { useState } from "react"
import { analyzeGaps } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Sparkles, AlertTriangle, Lightbulb } from "lucide-react"

import { useLanguage } from "@/contexts/LanguageContext"

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

export function AnalysisCard({ policyId, gaps }: { policyId: string, gaps: Gap[] }) {
    const [analyzing, setAnalyzing] = useState(false)
    const router = useRouter()
    const { t, language } = useLanguage()

    const handleAnalyze = async () => {
        setAnalyzing(true)
        const toastId = toast.loading(t.analysis.analyzing)
        const res = await analyzeGaps(policyId)
        setAnalyzing(false)
        if (res.error) {
            toast.error(res.error, { id: toastId })
        } else {
            toast.success(`${t.analysis.analysisComplete}${res.count}${t.analysis.issues}`, { id: toastId })
            router.refresh()
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
                        <h2 className="text-lg font-black">{t.analysis.title}</h2>
                        <p className="text-sm text-emerald-100 mt-0.5">On-demand coverage gap analysis</p>
                    </div>
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all disabled:opacity-50 backdrop-blur-sm border border-white/30 hover:shadow-lg"
                >
                    {analyzing ? t.analysis.analyzing : t.analysis.runAnalysis}
                </button>
            </div>
            <div className="p-6">
                {gaps.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">
                            {t.analysis.noGaps}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            Click "Run Analysis" to check for coverage gaps
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {gaps.map((gap) => {
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
                                            <h4 className="font-bold text-red-900 dark:text-red-100 text-sm mb-2">
                                                {gap.definition.title || t.analysis.gapDetected}
                                            </h4>
                                            <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed mb-3">
                                                {explanation}
                                            </p>
                                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
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
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
