"use client"

import { GapCard } from "./GapCard"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

interface GapListProps {
    gaps: any[] // We'll use the type from the query
}

export function GapList({ gaps }: GapListProps) {
    if (gaps.length === 0) {
        return (
            <div className="py-20 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">No Coverage Gaps Detected</h3>
                <p className="text-stone-500 max-w-sm mx-auto">Your portfolio looks great! Our intelligence engine hasn't found any significant gaps in your current coverage.</p>
            </div>
        )
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gaps.map((gap) => (
                    <GapCard key={gap.id} gap={gap} />
                ))}
            </div>
            <AiDisclaimer />
        </div>
    )
}
