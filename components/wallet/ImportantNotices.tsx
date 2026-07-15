"use client"

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { AlertTriangle, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Notice {
    id: string
    /** One short line. Detail belongs behind the toggle, not here. */
    text: string
    policyId?: string
}

/**
 * One soft alert box for the whole wallet, replacing the stack of full-width
 * red/amber blocks. Shows the first two notices; the rest collapse behind a
 * "show more" toggle so a messy portfolio costs a few pixels, not a screenful.
 */
export function ImportantNotices({
    notices,
    onSelect,
}: {
    notices: Notice[]
    onSelect?: (policyId: string) => void
}) {
    const { t } = useLanguage()
    const [expanded, setExpanded] = useState(false)

    if (notices.length === 0) {
        return (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-primary-tint px-4 py-2.5 dark:border-primary/30 dark:bg-primary/10">
                <Sparkles className="h-4 w-4 shrink-0 text-primary dark:text-mint" />
                <p className="text-[13px] font-medium text-[#166534] dark:text-mint">
                    {t.wallet.notices.allClear}
                </p>
            </div>
        )
    }

    const VISIBLE = 2
    const shown = expanded ? notices : notices.slice(0, VISIBLE)
    const hiddenCount = notices.length - shown.length

    return (
        <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#B91C1C] dark:text-red-300" />
                <h2 className="text-[13px] font-semibold text-[#B91C1C] dark:text-red-300">
                    {t.wallet.notices.title}
                </h2>
                <span className="rounded-full bg-[#B91C1C]/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#B91C1C] dark:bg-red-300/15 dark:text-red-300">
                    {notices.length}
                </span>
            </div>

            <ul className="mt-1.5 space-y-1">
                {shown.map((notice) => (
                    <li key={notice.id} className="flex items-start gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#B91C1C]/50 dark:bg-red-300/50"
                        />
                        {notice.policyId && onSelect ? (
                            <button
                                type="button"
                                onClick={() => onSelect(notice.policyId!)}
                                className="cursor-pointer text-left text-[13px] text-[#7F1D1D] underline-offset-2 hover:underline dark:text-red-200"
                            >
                                {notice.text}
                            </button>
                        ) : (
                            <span className="text-[13px] text-[#7F1D1D] dark:text-red-200">{notice.text}</span>
                        )}
                    </li>
                ))}
            </ul>

            {notices.length > VISIBLE && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#B91C1C] hover:underline dark:text-red-300"
                >
                    {expanded
                        ? t.wallet.notices.showLess
                        : t.wallet.notices.showMore.replace('{count}', String(hiddenCount))}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                </button>
            )}
        </div>
    )
}
