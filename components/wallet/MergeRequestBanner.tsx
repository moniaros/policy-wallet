"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GitMerge, Loader2 } from "lucide-react"

import { decideMergeRequest } from "@/app/(protected)/wallet/actions"

interface MergeRequestBannerProps {
    requestId: string
    /** Who uploaded the duplicate — shown so the decision is informed. */
    requestedByLabel: string
    policyLabel: string
    copy: {
        title: string
        body: string
        approve: string
        reject: string
        approved: string
        rejected: string
        failed: string
    }
}

/**
 * The same policy exists twice — the policyholder uploaded it and so did their
 * agent (or vice versa). Keeping both is fine; merging them is the other
 * party's call, so we ask instead of silently overwriting one with the other.
 */
export function MergeRequestBanner({
    requestId,
    requestedByLabel,
    policyLabel,
    copy,
}: MergeRequestBannerProps) {
    const [pending, setPending] = useState<"approved" | "rejected" | null>(null)
    const router = useRouter()

    const decide = async (decision: "approved" | "rejected") => {
        if (pending) return
        setPending(decision)
        try {
            const result = await decideMergeRequest(requestId, decision)
            if ("error" in result && result.error) {
                toast.error(copy.failed)
                setPending(null)
                return
            }
            toast.success(decision === "approved" ? copy.approved : copy.rejected)
            if (decision === "approved" && result.mergedIntoPolicyId) {
                router.push(`/wallet/${result.mergedIntoPolicyId}`)
            }
            router.refresh()
        } catch {
            toast.error(copy.failed)
            setPending(null)
        }
    }

    return (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
                <GitMerge className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#92400E] dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#92400E] dark:text-amber-300">{copy.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                        {copy.body} {requestedByLabel} · {policyLabel}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => decide("approved")}
                            disabled={pending !== null}
                            className="inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60 dark:text-[#1A2420]"
                        >
                            {pending === "approved" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {copy.approve}
                        </button>
                        <button
                            type="button"
                            onClick={() => decide("rejected")}
                            disabled={pending !== null}
                            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-amber-400/60 bg-white px-4 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-200"
                        >
                            {pending === "rejected" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {copy.reject}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
