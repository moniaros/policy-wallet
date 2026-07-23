"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import type { GapCoverageArea } from "@/lib/wallet/gap-report"
import { AREA_CHIP_KEY } from "./chips"

interface GapGroupSectionProps {
    area: GapCoverageArea
    count: number
    copy: { areas: Record<string, string> }
    children: React.ReactNode
}

/** Collapsible coverage-area group; expanded by default. */
export function GapGroupSection({ area, count, copy, children }: GapGroupSectionProps) {
    const [open, setOpen] = useState(true)
    const label = copy.areas[AREA_CHIP_KEY[area]]

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="mb-2.5 flex w-full items-center justify-between text-left"
            >
                <span className="text-kicker font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                    {label} ({count})
                </span>
                {open ? (
                    <ChevronUp className="h-3.5 w-3.5 text-black/40 dark:text-white/45" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-black/40 dark:text-white/45" />
                )}
            </button>
            {open && <div className="space-y-2.5">{children}</div>}
        </div>
    )
}
