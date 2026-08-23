import Link from "next/link"
import { FileText, Upload } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { displayInsurerName } from '@/lib/wallet/policy-identity'

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
 * The portfolio zone: total annual premium + per-branch premium chips, the
 * latest documents, and the upload entry point — one card instead of three.
 * Server component.
 */
export function PortfolioSummaryCard({
    totalLabel,
    chips,
    recentDocuments,
    labels,
    excludedNote,
}: {
    /** Null hides the premium block (nothing measurable yet) but keeps documents. */
    totalLabel: string | null
    chips: LobChip[]
    recentDocuments: RecentDocumentItem[]
    labels: {
        kicker: string
        totalAnnualPremium: string
        recentDocuments: string
        noDocuments: string
        addNewPolicy: string
    }
    /** Says which policies the total could not count. Omitted when none. */
    excludedNote?: string
}) {
    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                <Link
                    href="/wallet/add"
                    className="pw-inline-action inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-mint"
                >
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    {labels.addNewPolicy}
                </Link>
            </div>

            {totalLabel && (
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-3xl font-semibold text-black dark:text-white">{totalLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{labels.totalAnnualPremium}</p>
                        {excludedNote && (
                            <p className="mt-1 text-kicker text-muted-foreground">{excludedNote}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {chips.map((chip) => (
                            <div key={chip.id} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 dark:border-white/15 dark:bg-white/5">
                                <chip.icon className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden />
                                <span className="text-xs text-black/60 dark:text-white/60">{chip.branchLabel}</span>
                                <span className="text-xs font-bold text-black/70 dark:text-white/75">{chip.amountLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={totalLabel ? "mt-5" : "mt-3"}>
                <p className="text-caption font-semibold text-black/60 dark:text-white/60">{labels.recentDocuments}</p>
                <div className="mt-2">
                    {recentDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{labels.noDocuments}</p>
                    ) : (
                        <div className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-1">
                            {recentDocuments.map((document) => (
                                <Link
                                    key={document.id}
                                    href={`/wallet/${document.policyId}`}
                                    className="min-w-[220px] snap-start rounded-xl border border-black/10 bg-black/5 px-3 py-3 transition hover:bg-black/10 dark:border-white/15 dark:bg-black/30 dark:hover:bg-black/40"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs font-semibold text-black dark:text-white">{document.fileName}</span>
                                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    </div>
                                    <p className="mt-2 truncate text-micro text-muted-foreground">
                                        {displayInsurerName(document.insurerName)}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
