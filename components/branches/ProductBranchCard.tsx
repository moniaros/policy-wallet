import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { BranchTileState } from '@/lib/insurance/branch-page'

/**
 * One insurance branch on the /protection branch-lens grid. Server-safe — all
 * copy (and the icon) arrives pre-resolved (EmptyState convention).
 *
 * Direction A (2026-09-03): the tile is the card anatomy — a 36px chip, a
 * sentence-case title, a caption — and its state is a pill on the status
 * tokens. Amber is reserved for «Χρειάζεται προσοχή»; a line the customer
 * never bought and a line nothing has assessed both sit on the neutral pill,
 * told apart by their LABEL, never by colour alone (WCAG 1.4.1). The tile no
 * longer fades for the neutral state either: the label of the branches a
 * policyholder holds no cover in is the one they most need to read.
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
    /** The branch id — the data-count subject for branch.policyCount. */
    branchId?: string
}

const STATE_STYLES: Record<BranchTileState, { pill: string; dot: string }> = {
    covered: {
        pill: 'bg-status-success-tint text-status-success',
        dot: 'bg-status-success',
    },
    attention: {
        pill: 'bg-status-warning-tint text-status-warning',
        dot: 'bg-status-warning',
    },
    not_held: {
        // §2.2: an unowned line is *not held*, never a finding. This pill was
        // rose («Πιθανό κενό») — a red chip claiming exposure for a product
        // the customer never bought. The register is neutral and the
        // distinction from 'neutral' (not assessed) is carried by the LABEL
        // text, never by colour alone (WCAG 1.4.1).
        pill: 'bg-muted text-foreground',
        dot: 'bg-muted-foreground/50',
    },
    neutral: {
        // Full-contrast label on the grey pill: the pixel audit measured the
        // old text-black/55 at 3.15:1 on the tiles a policyholder most needs
        // to read. De-emphasis belongs to the pill and the dot, not to the
        // legibility of the label.
        pill: 'bg-muted text-foreground',
        dot: 'bg-muted-foreground/50',
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
    branchId,
}: ProductBranchCardProps) {
    const styles = STATE_STYLES[state]

    return (
        <Link
            href={href}
            className="pw-card group flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5"
        >
            <div className="flex items-start justify-between gap-3">
                <span className="pw-card-chip" aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
                        styles.pill
                    )}
                >
                    <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden />
                    {stateLabel}
                </span>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted-foreground">{tagline}</p>
            </div>
            {policyCount > 0 && (
                // Subject-scoped: «22 ασφαλιστήρια» on the motor tile and «7»
                // on home are two subjects of one key, and their sum is the
                // wallet's portfolio.policyCount — the one §2.8 relation that
                // already reconciled.
                <p
                    className="mt-auto text-caption font-semibold text-muted-foreground"
                    data-count="branch.policyCount"
                    data-count-subject={branchId}
                >
                    {policyCountLabel}
                </p>
            )}
        </Link>
    )
}
