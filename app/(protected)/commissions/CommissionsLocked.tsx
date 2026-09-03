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
        <div className="pw-page-shell">
            <div className="mx-auto max-w-reading px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* One card on the canvas, the empty-state anatomy: chip, title,
                    the sentence that says why, and the page's one primary action. */}
                <div className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                    <span className="pw-card-chip" aria-hidden="true">
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <h1 className="mt-4 text-h3 font-semibold tracking-tight text-foreground">
                        {t.commissionsLocked.title}
                    </h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                        {t.commissionsLocked.body}
                    </p>
                    <Link href="/agent/pricing" className="pw-primary-button mt-6">
                        {t.commissionsLocked.viewPlans}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
