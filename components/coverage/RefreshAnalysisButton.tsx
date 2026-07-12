"use client"

import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { refreshCoverageAnalysis } from "@/app/(protected)/coverage-insights/actions"

/** Explicit "re-run the analysis" affordance — copy arrives pre-resolved. */
export function RefreshAnalysisButton({
    labels,
}: {
    labels: { refresh: string; refreshing: string; failed: string }
}) {
    const [isPending, startTransition] = useTransition()

    const handleClick = () => {
        startTransition(async () => {
            const result = await refreshCoverageAnalysis()
            if (!result.ok) toast.error(labels.failed)
        })
    }

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black/70 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60 dark:border-white/15 dark:bg-black dark:text-white/75 dark:hover:border-mint/40 dark:hover:text-mint cursor-pointer disabled:cursor-default"
        >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden />
            {isPending ? labels.refreshing : labels.refresh}
        </button>
    )
}
