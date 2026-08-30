"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyReviewScreen } from "@/components/wallet/PolicyReviewScreen"
import type { PolicyReviewData } from "@/lib/wallet/policy-review"

interface PolicyReviewRouteClientProps {
    data: PolicyReviewData
    insurers: { id: string; name: string }[]
    types: { id: string; name: string; slug: string }[]
    /** Same-origin path to return to when done (sanitized server-side). */
    returnTo?: string | null
}

/**
 * Agent-only entry point for /wallet/[id]/review — reached from the
 * policy-detail banner or the agent customer-policy page.
 */
export function PolicyReviewRouteClient({ data, insurers, types, returnTo }: PolicyReviewRouteClientProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const reviewCopy = t.wallet.review

    return (
        <div className="pb-20">
            <div className="border-b border-border-hair">
                <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label={t.common.back}
                        className="grid min-h-11 min-w-11 place-items-center rounded-g-control text-fg-secondary transition-colors hover:bg-surface-sunken"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-bold text-fg-primary">
                        {reviewCopy.title}
                    </span>
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="rounded-g-sheet border border-border-subtle bg-surface-raised p-6 shadow-g-raised md:p-8">
                    <PolicyReviewScreen
                        data={data}
                        insurers={insurers}
                        types={types}
                        onDone={() => router.push(returnTo || `/wallet/${data.id}`)}
                    />
                </div>
            </div>
        </div>
    )
}
