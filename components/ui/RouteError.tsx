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

    /**
     * Next implements `redirect()` and `notFound()` by THROWING. Those throws
     * travel the same path as a real failure and land here, so a boundary that
     * renders every error it receives converts a 307 into a **200 with an error
     * page** — and serialises `NEXT_REDIRECT` into the HTML.
     *
     * That is not hypothetical. `/coverage` is a legacy redirect to
     * `/protection` (a KEEP row); it returned 200 with the redirect error
     * embedded five times in the body, and the customer saw «Κάτι πήγε στραβά»
     * instead of arriving. `/home` looked fine only because `proxy.ts` owns
     * that path and redirects before the page ever runs, which hid the bug for
     * every page-level redirect under `(protected)` — all 26 boundaries that
     * share this component.
     *
     * Re-thrown so the framework can finish what it started. Checked by digest,
     * which is the contract Next exposes to a client boundary.
     */
    const isFrameworkControlFlow =
        typeof error?.digest === "string" &&
        (error.digest.startsWith("NEXT_REDIRECT") || error.digest.startsWith("NEXT_NOT_FOUND"))

    useEffect(() => {
        // A redirect is not an incident. Reporting one wakes somebody for a
        // working feature and buries the failures that matter.
        if (isFrameworkControlFlow) return
        Sentry.captureException(error)
    }, [error, isFrameworkControlFlow])

    if (isFrameworkControlFlow) throw error

    const isAgentHome = homeHref.startsWith("/dashboard/agent")
    const homeLabel = isAgentHome ? t.nav.dashboard : t.nav.home

    return (
        <div className="pw-page-shell">
            <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/80 dark:bg-amber-900/25">
                    <AlertTriangle className="h-7 w-7 text-amber-700 dark:text-amber-400" />
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

                {/* Next's digest is the only handle that ties what the user saw to
                    the Sentry event captured above. app/error.tsx already shows it;
                    this component backs 19 route boundaries and did not, so which
                    boundary happened to fire decided whether a policyholder ringing
                    their advisor had a reference to quote. */}
                {error.digest && (
                    <p className="mt-10 font-mono text-micro text-muted-foreground">
                        {t.errors.incidentId}: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
