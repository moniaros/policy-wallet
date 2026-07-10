"use client"

import { GapSeverity, getSeverityColor, getSeverityLabel } from "@/lib/gap-detection"
import { useLanguage } from "@/contexts/LanguageContext"
import { updateGapStatus } from "@/app/(protected)/coverage-insights/actions"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface GapCardProps {
    gap: {
        id: string
        title: string
        description: string
        severity: string
        status: string
        detectedAt: Date
        aiExplanation?: string | null
        aiSuggestion?: string | null
        definition: {
            title: string
            description: string
        }
    }
}

export function GapCard({ gap }: GapCardProps) {
    const { language } = useLanguage()
    const severity = gap.severity as GapSeverity
    const colors = getSeverityColor(severity)
    const label = getSeverityLabel(severity, language as 'el' | 'en')
    const [isUpdating, setIsUpdating] = useState(false)
    const router = useRouter()

    const handleUpdate = async (status: 'acknowledged' | 'dismissed') => {
        setIsUpdating(true)
        try {
            await updateGapStatus(gap.id, status)
            router.refresh()
        } catch (error) {
            console.error("Failed to update gap status:", error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className={`p-6 rounded-2xl border ${colors.border} ${colors.bg} transition-all hover:shadow-md ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                        {label}
                    </span>
                </div>
                <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                    {new Date(gap.detectedAt).toLocaleDateString()}
                </span>
            </div>

            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
                {gap.definition.title}
            </h3>

            <p className="text-stone-600 dark:text-stone-400 text-sm mb-6 leading-relaxed">
                {gap.definition.description}
            </p>

            {/* AI Content Area */}
            <div className="bg-white/50 dark:bg-stone-900/30 rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1 px-2 bg-[#EEF2FF] dark:bg-indigo-900/50 text-[#4F46E5] dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        AI Insight
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-tighter mb-1">Recommendation</h4>
                        <p className="text-sm text-stone-800 dark:text-stone-200 font-medium">
                            {gap.aiSuggestion || "We recommend reviewing this gap with your insurance agent to ensure you remain fully protected."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <button
                    onClick={() => handleUpdate('acknowledged')}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isUpdating ? 'Updating...' : 'Acknowledge'}
                </button>
                <button
                    onClick={() => handleUpdate('dismissed')}
                    disabled={isUpdating}
                    className="px-4 py-2.5 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-lg text-sm font-bold hover:bg-white dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                    Dismiss
                </button>
            </div>
        </div>
    )
}
