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
            className="pw-secondary-button text-black/70"
        >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden />
            {isPending ? labels.refreshing : labels.refresh}
        </button>
    )
}
