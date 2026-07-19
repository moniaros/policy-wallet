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
        <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label={t.common.back}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-bold text-slate-900 dark:text-white">
                        {reviewCopy.title}
                    </span>
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8 dark:border-slate-800 dark:bg-slate-900">
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
