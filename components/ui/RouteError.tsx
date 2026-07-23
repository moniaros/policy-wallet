"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RotateCw } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Shared, localized route error UI. Reused by the app-wide protected boundary
 * and by per-route agent boundaries so a failure on one screen (e.g. a widget
 * throwing on /renewals) is scoped to that screen and retryable in place,
 * rather than tearing down the whole protected content area. Agent routes point
 * `homeHref` at the agent dashboard; the recovery label follows.
 * (Default is /dashboard — /home is now only a redirect to it.)
 */
export function RouteError({
    error,
    reset,
    homeHref = "/dashboard",
}: {
    error: Error & { digest?: string }
    reset: () => void
    homeHref?: string
}) {
    const { t } = useLanguage()

    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    const isAgentHome = homeHref.startsWith("/dashboard/agent")
    const homeLabel = isAgentHome ? t.nav.dashboard : t.nav.home

    return (
        <div className="pw-page-shell">
            <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/80 dark:bg-amber-900/25">
                    <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-xl font-semibold text-black dark:text-white">
                    {t.errors.somethingWentWrong}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                    {t.errors.errorBoundaryBody}
                </p>
                <div className="mt-6 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="pw-primary-button"
                    >
                        <RotateCw className="h-4 w-4" />
                        {t.errors.tryAgain}
                    </button>
                    <Link
                        href={homeHref}
                        className="rounded-full px-5 py-2.5 text-sm font-semibold text-black/70 transition-colors hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                    >
                        {homeLabel}
                    </Link>
                </div>
            </div>
        </div>
    )
}
