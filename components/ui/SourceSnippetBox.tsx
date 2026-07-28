import { Quote } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Verbatim document snippet backing an AI-extracted value — the provenance
 * counterpart of ConfidenceBadge. Renders nothing without a snippet or
 * page reference. Copy arrives pre-resolved.
 */
export function SourceSnippetBox({
    snippet,
    page,
    labels,
    className,
}: {
    snippet?: string
    page?: number
    labels: { fromDocument: string; pageAbbrev: string }
    className?: string
}) {
    if (!snippet && page === undefined) return null

    return (
        <div
            className={cn(
                'rounded-lg border-l-2 border-primary/40 bg-black/[0.03] px-3 py-2 dark:border-mint/40 dark:bg-white/[0.04]',
                className
            )}
        >
            <p className="flex items-center gap-1.5 text-kicker font-bold uppercase tracking-wider text-muted-foreground">
                <Quote className="h-3 w-3 text-primary dark:text-mint" aria-hidden />
                {labels.fromDocument}
                {page !== undefined && <span>· {labels.pageAbbrev} {page}</span>}
            </p>
            {snippet && (
                <p className="mt-1 text-xs italic leading-relaxed text-black/65 dark:text-white/70">
                    “{snippet}”
                </p>
            )}
        </div>
    )
}
