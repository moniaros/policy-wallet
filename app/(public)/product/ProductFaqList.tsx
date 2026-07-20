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
        <div className={`border-b border-[#E2E8F0] transition-colors duration-150 ${open ? "bg-white" : ""}`}>
            <button
                type="button"
                className="group flex w-full items-center justify-between px-1 py-5 text-left"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
            >
                <span className="text-[16px] font-medium text-[#0F172A] transition-colors duration-150 group-hover:text-[#29685B]">
                    {q}
                </span>
                {open ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-[#29685B]" />
                ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#64748B] transition-colors duration-150 group-hover:text-[#29685B]" />
                )}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-[300px] pb-5" : "max-h-0"}`}>
                <p className="px-1 text-[16px] leading-relaxed text-[#475569]">{a}</p>
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
        <div className="border-t border-[#E2E8F0]">
            {entries.map((entry) => (
                <FAQItem key={entry.q} q={entry.q} a={entry.a} />
            ))}
        </div>
    )
}
