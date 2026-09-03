"use client"

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { CheckCircle2, ChevronDown, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardHead } from '@/components/dashboard/home/CardHead'

export interface Notice {
    id: string
    /** One short line. Detail belongs behind the toggle, not here. */
    text: string
    policyId?: string
}

/**
 * The wallet's attention list, as ONE card: chip · title · count, then one
 * sub-card row per notice. Shows the first two; the rest collapse behind a
 * soft «+N ακόμη» pill so a messy portfolio costs a few pixels, not a
 * screenful.
 *
 * Direction A (2026-09-03): this was a full-width red box. Red is reserved
 * for "act now"; these notices are expired cover, unreadable terms and
 * failed extractions — things to look at, not emergencies — so the card is
 * white like its neighbours and the amber sits on the icon and the count
 * alone, the same budget the dashboard's attention list spends.
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
        // A quiet line, not a green banner: the check ran over every policy
        // in the wallet, so the statement is honest — but reassurance is not
        // the wallet's headline, and a tinted box made it one.
        return (
            <p className="mb-4 flex items-center gap-2 px-1 text-caption text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.wallet.notices.allClear}
            </p>
        )
    }

    const VISIBLE = 2
    const shown = expanded ? notices : notices.slice(0, VISIBLE)
    const hiddenCount = notices.length - shown.length

    return (
        <section className="pw-card pw-pad mb-4" aria-labelledby="wallet-notices-heading">
            <CardHead
                icon={TriangleAlert}
                title={t.wallet.notices.title}
                id="wallet-notices-heading"
                meta={
                    /* The SAME fact as the overview's «Χρειάζεται προσοχή»:
                       PolicyWallet builds `notices` with the identical
                       isAttentionKey filter that produces attentionCount, so
                       this pill and the cell must always agree — same key, and
                       the count metric checks it instead of a human arguing it. */
                    <span
                        data-count="portfolio.attentionCount"
                        className="rounded-full bg-status-warning-tint px-2 py-0.5 text-caption font-semibold tabular-nums text-status-warning"
                    >
                        {notices.length}
                    </span>
                }
            />

            <ul className="mt-4 space-y-2">
                {shown.map((notice) => {
                    const row = 'pw-subcard flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-sm leading-snug text-foreground'
                    return (
                        <li key={notice.id}>
                            {notice.policyId && onSelect ? (
                                <button
                                    type="button"
                                    onClick={() => onSelect(notice.policyId!)}
                                    className={cn(row, 'cursor-pointer transition-colors')}
                                >
                                    <TriangleAlert className="h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">{notice.text}</span>
                                </button>
                            ) : (
                                <span className={row}>
                                    <TriangleAlert className="h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">{notice.text}</span>
                                </span>
                            )}
                        </li>
                    )
                })}
            </ul>

            {notices.length > VISIBLE && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="pw-soft-button mt-3 cursor-pointer !text-caption"
                >
                    {expanded ? (
                        t.wallet.notices.showLess
                    ) : (
                        // «+N ακόμη» is a quantity too: the attention notices the
                        // toggle is hiding. Uninstrumented, the value scan reads
                        // it as a bare number contradicting the cells above.
                        <span data-count="portfolio.attentionCollapsedCount">
                            {t.wallet.notices.showMore.replace('{count}', String(hiddenCount))}
                        </span>
                    )}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                </button>
            )}
        </section>
    )
}
