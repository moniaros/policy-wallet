"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RotateCw } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Section-level boundaries.
 *
 * The shared `RouteError` opens its own `pw-page-shell` (min-h-screen), and a
 * settings section renders INSIDE the settings shell — using it there would
 * stack two full-height shells and push the recovery button below the fold.
 * These are sized for the content pane.
 */

export function SettingsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { t } = useLanguage()

    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <div role="alert" className="pw-card pw-pad-roomy text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100/80 dark:bg-amber-900/25">
                <AlertTriangle aria-hidden="true" className="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <h2 className="text-lead font-semibold text-black dark:text-white">
                {t.errors.somethingWentWrong}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t.settings.loadFailed}
            </p>
            <button type="button" onClick={reset} className="pw-primary-button mt-5">
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                {t.settings.retry}
            </button>
        </div>
    )
}
