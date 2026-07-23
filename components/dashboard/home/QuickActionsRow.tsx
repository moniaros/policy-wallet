import Link from "next/link"
import { FileText, Sparkles, Upload } from "lucide-react"

export interface RecentDocumentItem {
    id: string
    policyId: string
    fileName: string
    insurerName: string | null
}

/** AI-analysis teaser + quick upload + recent documents row on /home. */
export function QuickActionsRow({
    openGapCount,
    recentDocuments,
    labels,
}: {
    openGapCount: number
    recentDocuments: RecentDocumentItem[]
    labels: {
        aiAnalysis: string
        aiSummary: string
        viewDetails: string
        quickUpload: string
        addNewPolicy: string
        recentDocuments: string
        noDocuments: string
    }
}) {
    return (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Link href="/coverage-insights" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.aiAnalysis}</p>
                <div className="mt-3 flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-primary dark:text-mint" />
                    <div className="flex-1">
                        <p className="text-sm text-black/80 dark:text-white/80">{labels.aiSummary}</p>
                        {openGapCount > 0 && (
                            <p className="mt-1.5 text-xs font-semibold text-primary dark:text-mint">{labels.viewDetails}</p>
                        )}
                    </div>
                </div>
            </Link>

            <Link href="/wallet/add" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.quickUpload}</p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white dark:text-[#1A2420]">
                        <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.addNewPolicy}</p>
                </div>
            </Link>

            <div className="pw-card pw-pad">
                <p className="pw-kicker">{labels.recentDocuments}</p>
                <div className="mt-3">
                    {recentDocuments.length === 0 ? (
                        <p className="text-sm text-black/55 dark:text-white/65">{labels.noDocuments}</p>
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
                                        <FileText className="h-4 w-4 flex-shrink-0 text-black/45 dark:text-white/55" />
                                    </div>
                                    <p className="mt-2 truncate text-micro text-black/45 dark:text-white/60">
                                        {document.insurerName}
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
