"use client"

import React, { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { PublicPricingFaqItem } from "@/lib/pricing/public-pricing-content"

export interface PricingFAQProps {
    language: "el" | "en"
    items: PublicPricingFaqItem[]
    className?: string
}

export function PricingFAQ({ language, items, className = "" }: PricingFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <div className={`mx-auto max-w-3xl ${className}`}>
            <div className="space-y-4">
                {items.map((item, idx) => {
                    const isOpen = openIndex === idx
                    const panelId = `pricing-faq-panel-${idx}`
                    const buttonId = `pricing-faq-button-${idx}`
                    return (
                        <div
                            key={`${item.question.en}-${idx}`}
                            className={`overflow-hidden rounded-xl border-2 bg-white transition-all duration-200 dark:bg-slate-900 ${
                                isOpen
                                    ? "border-[#29685B] shadow-md shadow-[#29685B]/10 dark:border-[#89D9B2]/60"
                                    : "border-slate-200 hover:border-[#29685B]/40 dark:border-slate-700 dark:hover:border-[#89D9B2]/30"
                            }`}
                        >
                            <button
                                id={buttonId}
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? null : idx)}
                                aria-expanded={isOpen ? "true" : "false"}
                                aria-controls={panelId}
                                className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29685B]/40 dark:hover:bg-slate-800"
                            >
                                <span className="pr-4 font-bold text-slate-900 dark:text-white">{item.question[language]}</span>
                                <span
                                    className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                                        isOpen
                                            ? "bg-[#29685B] text-white"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                >
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${
                                            isOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </span>
                            </button>
                            <div
                                id={panelId}
                                role="region"
                                aria-labelledby={buttonId}
                                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="px-6 pb-5 leading-relaxed text-slate-600 dark:text-slate-300">
                                        {item.answer[language]}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
