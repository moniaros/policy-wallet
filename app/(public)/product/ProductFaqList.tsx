"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface ProductFaqEntry {
    q: string
    a: string
}

function FAQItem({ q, a }: ProductFaqEntry) {
    const [open, setOpen] = useState(false)

    return (
        <div className={`border-b border-[#E2E8F0] dark:border-slate-800 transition-colors duration-150 ${open ? "bg-white dark:bg-slate-900" : ""}`}>
            <button
                type="button"
                className="group flex w-full items-center justify-between px-1 py-5 text-left"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
            >
                <span className="text-body-lg font-medium text-[#0F172A] dark:text-white transition-colors duration-150 group-hover:text-[#29685B]">
                    {q}
                </span>
                {open ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-[#29685B] dark:text-[#A7F3D0]" />
                ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#5B6A7A] dark:text-slate-400 transition-colors duration-150 group-hover:text-[#29685B]" />
                )}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[300px] pb-5" : "max-h-0"}`}>
                <p className="px-1 text-body-lg leading-relaxed text-[#475569] dark:text-slate-300">{a}</p>
            </div>
        </div>
    )
}

/**
 * Accordion island. Entries arrive already translated so the client bundle
 * never has to carry marketing-content.ts or a language lookup.
 */
export function ProductFaqList({ entries }: { entries: readonly ProductFaqEntry[] }) {
    return (
        <div className="border-t border-[#E2E8F0] dark:border-slate-800">
            {entries.map((entry) => (
                <FAQItem key={entry.q} q={entry.q} a={entry.a} />
            ))}
        </div>
    )
}
