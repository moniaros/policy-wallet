"use client"

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'

export interface PricingFAQProps {
    language: 'el' | 'en'
    className?: string
}

export function PricingFAQ({ language, className = '' }: PricingFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0)
    const faqItems = subscriptionCopy.faq

    return (
        <div className={`max-w-3xl mx-auto ${className}`}>
            <div className="space-y-4">
                {faqItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700"
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <span className="font-bold text-slate-900 dark:text-white pr-4">
                                {item.question[language]}
                            </span>
                            <ChevronDown
                                className={`w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0 transition-transform duration-200 ${openIndex === idx ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>
                        {openIndex === idx && (
                            <div className="px-6 pb-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                                {item.answer[language]}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
