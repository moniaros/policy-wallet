"use client"

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate, formatTime } from '@/lib/i18n/format'

interface NotificationCardProps {
    event: any
    onNavigate: (type: string, id: string) => void
}

export function NotificationCard({ event, onNavigate }: NotificationCardProps) {
    const { language, t } = useLanguage()
    const lang = language as 'el' | 'en'
    const isFailed = event.status === 'failed'

    return (
        <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm active:scale-[0.99] transition-transform relative overflow-hidden">
            {/* Status Indicator Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isFailed ? 'bg-red-500' : 'bg-primary'
                }`} />

            <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-kicker font-black tracking-widest uppercase text-stone-400">
                        {formatDate(event.created_at, lang)} • {formatTime(event.created_at, lang)}
                    </span>
                    <span className={`text-kicker font-bold px-2 py-0.5 rounded-full ${isFailed
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                        }`}>
                        {event.channel}
                    </span>
                </div>

                <h3 className="font-bold text-stone-900 dark:text-white text-sm mb-1">
                    {event.subject}
                </h3>

                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">
                    {event.message}
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100 dark:border-stone-700/50">
                    {event.related_policy_name && (
                        <button
                            onClick={() => onNavigate('policy', event.related_policy_id)}
                            className="text-kicker font-bold text-primary dark:text-mint uppercase tracking-wide flex items-center gap-1 hover:underline"
                        >
                            {t.notifications.viewPolicy}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
