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
                <p className="text-body-sm font-medium text-status-success">
                    {t.wallet.notices.allClear}
                </p>
            </div>
        )
    }

    const VISIBLE = 2
    const shown = expanded ? notices : notices.slice(0, VISIBLE)
    const hiddenCount = notices.length - shown.length

    return (
        <div className="mb-5 rounded-2xl border border-status-danger-edge bg-status-danger-tint px-4 py-3">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-status-danger" />
                <h2 className="text-body-sm font-semibold text-status-danger">
                    {t.wallet.notices.title}
                </h2>
                {/* The SAME fact as the KPI tile's «Χρειάζονται προσοχή»:
                    PolicyWallet builds `notices` with the identical
                    isAttentionKey filter that produces attentionCount, so this
                    pill and the tile must always agree — same key, and the
                    count metric now checks it instead of a human arguing it. */}
                <span data-count="portfolio.attentionCount" className="rounded-full bg-[#B91C1C]/10 px-1.5 py-0.5 text-kicker font-bold tabular-nums text-status-danger dark:bg-red-300/15">
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
                                className="cursor-pointer text-left text-body-sm text-[#7F1D1D] underline-offset-2 hover:underline dark:text-red-200"
                            >
                                {notice.text}
                            </button>
                        ) : (
                            <span className="text-body-sm text-[#7F1D1D] dark:text-red-200">{notice.text}</span>
                        )}
                    </li>
                ))}
            </ul>

            {notices.length > VISIBLE && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-micro font-semibold text-status-danger hover:underline"
                >
                    {expanded ? (
                        t.wallet.notices.showLess
                    ) : (
                        // «+N ακόμη» is a quantity too: the attention notices the
                        // toggle is hiding. Uninstrumented, the value scan reads
                        // it as a bare number contradicting the tiles above.
                        <span data-count="portfolio.attentionCollapsedCount">
                            {t.wallet.notices.showMore.replace('{count}', String(hiddenCount))}
                        </span>
                    )}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                </button>
            )}
        </div>
    )
}
