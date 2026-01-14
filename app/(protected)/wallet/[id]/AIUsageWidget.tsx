"use client"

import React from 'react'

interface AIUsageWidgetProps {
    count: number
    limit: number
    t: any
}

export function AIUsageWidget({ count, limit, t }: AIUsageWidgetProps) {
    const percentage = Math.min((count / limit) * 100, 100)

    return (
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 dark:from-stone-800 dark:to-stone-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 15h-2v-6h2zm0-8h-2V7h2z" /></svg>
            </div>

            <h3 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">{t.wallet.aiPlanUsage}</h3>

            <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black">{count}</span>
                <span className="text-sm opacity-60 mb-1">/ {limit} {t.wallet.analyses}</span>
            </div>

            <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-6">
                <div
                    className="h-full bg-teal-400 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <button className="w-full py-3 bg-white text-stone-900 rounded-xl font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2 text-sm">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t.wallet.upgradePlan}
            </button>
        </div>
    )
}
