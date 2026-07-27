import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { BranchTileState } from '@/lib/insurance/branch-page'

/**
 * One insurance branch on the /branches overview grid. Server-safe — all
 * copy (and the icon) arrives pre-resolved (EmptyState convention).
 */
export interface ProductBranchCardProps {
    icon: LucideIcon
    href: string
    title: string
    tagline: string
    state: BranchTileState
    stateLabel: string
    policyCount: number
    policyCountLabel: string
}

const STATE_STYLES: Record<BranchTileState, { pill: string; dot: string }> = {
    covered: {
        pill: 'bg-primary-tint text-[#166534] dark:bg-primary/15 dark:text-mint',
        dot: 'bg-primary dark:bg-mint',
    },
    attention: {
        pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    gap: {
        pill: 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300',
        dot: 'bg-rose-500',
    },
    neutral: {
        // Pixel audit measured the old text-black/55/text-white/60 at 3.15:1 in
        // light and 3.92:1 in dark — under the 4.5 floor in BOTH themes, on the
        // tiles a policyholder most needs to read: the branches they hold no
        // cover in. De-emphasis belongs to the surface and the dot, not to the
        // legibility of the label.
        pill: 'bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/85',
        dot: 'bg-black/30 dark:bg-white/30',
    },
}

export function ProductBranchCard({
    icon: Icon,
    href,
    title,
    tagline,
    state,
    stateLabel,
    policyCount,
    policyCountLabel,
}: ProductBranchCardProps) {
    const styles = STATE_STYLES[state]

    return (
        <Link
            href={href}
            className={cn(
                'pw-card group flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5',
                state === 'neutral' && 'opacity-80 hover:opacity-100'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-mint/10 dark:text-mint">
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-micro font-bold', styles.pill)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden />
                    {stateLabel}
                </span>
            </div>
            <div>
                <h3 className="text-sm font-black text-black dark:text-white">{title}</h3>
                {/* /55 measured 3.25:1 on the card surface — same shortfall as the
                    neutral pill above. Body copy needs the 4.5 floor. */}
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-black/70 dark:text-white/75">{tagline}</p>
            </div>
            {policyCount > 0 && (
                <p className="mt-auto text-xs font-bold text-black/70 dark:text-white/75">{policyCountLabel}</p>
            )}
        </Link>
    )
}
