"use client"

import { useTransition } from "react"
import { ArrowRight, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { refreshCoverageAnalysis } from "@/app/(protected)/protection/actions"

/**
 * The next-step banner's primary when the step is «Ελέγξτε τα ασφαλιστήριά
 * μου»: the same server action as the meta line's refresh control, wearing
 * the page's one primary button. Pending state in place; failure as a toast.
 */
export function AnalyseNowButton({ labels }: { labels: { idle: string; pending: string; failed: string } }) {
    const [isPending, startTransition] = useTransition()
    return (
        <button
            type="button"
            data-action="analyse"
            disabled={isPending}
            onClick={() =>
                startTransition(async () => {
                    const result = await refreshCoverageAnalysis()
                    if (!result.ok) toast.error(labels.failed)
                })
            }
            className="pw-primary-button inline-flex min-h-11 items-center gap-2"
        >
            {isPending ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? labels.pending : labels.idle}
            {!isPending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
    )
}
