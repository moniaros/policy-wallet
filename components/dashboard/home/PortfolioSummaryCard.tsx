import Link from "next/link"
import { FileText, Upload, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { displayInsurerName } from '@/lib/wallet/policy-identity'
import type { PremiumExclusionPart } from '@/lib/wallet/premium-exclusion-note'
import { CardHead } from "./CardHead"

export interface LobChip {
    id: string
    icon: LucideIcon
    /** What the amount is FOR. An icon is not a label. */
    branchLabel: string
    amountLabel: string
}

export interface RecentDocumentItem {
    id: string
    policyId: string
    fileName: string
    insurerName: string | null
}

/**
 * The portfolio zone: per-branch premium rows, the latest documents, and the
 * upload entry point. Server component.
 *
 * Direction A: the TOTAL left this card for the overview row (one render of
 * portfolio.totalAnnualPremium on the page); `totalLabel` still renders it
 * for callers that have nowhere else to put it. The per-branch breakdown
 * renders whenever it exists, whether or not the total is here.
 */
export function PortfolioSummaryCard({
    totalLabel,
    chips,
    recentDocuments,
    labels,
    excludedParts = [],
    showAddLink = true,
}: {
    /** Null hides the premium block (rendered elsewhere, or nothing measurable yet). */
    totalLabel: string | null
    /** False when the page already carries its one upload offer (the header button). */
    showAddLink?: boolean
    chips: LobChip[]
    recentDocuments: RecentDocumentItem[]
    labels: {
        kicker: string
        totalAnnualPremium: string
        recentDocuments: string
        noDocuments: string
        addNewPolicy: string
    }
    /**
     * Which policies the total could not count — one part per non-zero count
     * (premiumExclusionParts), so each number carries its own data-count
     * instead of three counts hiding in one string.
     */
    excludedParts?: PremiumExclusionPart[]
}) {
    return (
        <section className="pw-card pw-pad" aria-labelledby="portfolio-heading">
            <CardHead
                icon={Wallet}
                title={labels.kicker}
                id="portfolio-heading"
                meta={
                    showAddLink ? (
                        <Link
                            href="/wallet/add"
                            className="pw-inline-action inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                        >
                            <Upload className="h-3.5 w-3.5" aria-hidden />
                            {labels.addNewPolicy}
                        </Link>
                    ) : undefined
                }
            />

            {totalLabel && (
                <div className="mt-4">
                    <p className="text-h3 font-semibold tracking-tight text-foreground tabular-nums" data-fact="portfolio.totalAnnualPremium">{totalLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{labels.totalAnnualPremium}</p>
                    {excludedParts.length > 0 && (
                        <p className="mt-1 text-caption text-muted-foreground">
                            {excludedParts.map((part, i) => (
                                <span key={part.countKey}>
                                    {i > 0 && <span aria-hidden> · </span>}
                                    <span data-count={part.countKey}>{part.label}</span>
                                </span>
                            ))}
                        </p>
                    )}
                </div>
            )}

            {chips.length > 0 && (
                <ul className="mt-4 divide-y divide-border">
                    {chips.map((chip) => (
                        <li key={chip.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-muted text-foreground/70">
                                <chip.icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-foreground">{chip.branchLabel}</span>
                            <span className="text-sm font-semibold text-foreground tabular-nums" data-fact="portfolio.branchPremium" data-fact-subject={chip.id}>{chip.amountLabel}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-5">
                <p className="text-caption font-semibold text-muted-foreground">{labels.recentDocuments}</p>
                <div className="mt-2">
                    {recentDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{labels.noDocuments}</p>
                    ) : (
                        <ul className="space-y-2">
                            {recentDocuments.map((document) => (
                                <li key={document.id}>
                                    <Link
                                        href={`/wallet/${document.policyId}`}
                                        className="pw-subcard flex min-h-11 items-center gap-3 px-3 py-2.5 transition-colors"
                                    >
                                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-xs font-semibold text-foreground">{document.fileName}</span>
                                            <span className="block truncate text-micro text-muted-foreground">
                                                {displayInsurerName(document.insurerName)}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    )
}
