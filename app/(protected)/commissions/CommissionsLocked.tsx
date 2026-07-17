"use client"

import Link from "next/link"
import { Lock, ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Full-page gate for commission tracking (agent_pro / agency only). Rendered
 * instead of the dashboard for lower tiers, so the figures are never sent to
 * the client — the page used to render for every tier including agent_free.
 */
export function CommissionsLocked() {
    const { t } = useLanguage()

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
                {t.commissionsLocked.title}
            </h1>
            <p className="mt-3 text-stone-500 dark:text-stone-400">
                {t.commissionsLocked.body}
            </p>
            <Link
                href="/agent/pricing"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
                {t.commissionsLocked.viewPlans}
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    )
}
