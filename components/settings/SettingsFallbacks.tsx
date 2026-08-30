"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RotateCw } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/src/design-system/primitives"

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
        <div role="alert" className="mx-g-4 rounded-g-card bg-surface-raised p-g-6 text-center shadow-g-raised tablet:mx-0">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-g-control bg-state-gap-fill">
                <AlertTriangle aria-hidden="true" className="h-6 w-6 text-state-gap" />
            </div>
            <h2 className="text-g-heading text-fg-primary">
                {t.errors.somethingWentWrong}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-g-app-body-sm leading-relaxed text-fg-secondary">
                {t.settings.loadFailed}
            </p>
            <Button type="button" onClick={reset} className="mx-auto mt-g-5">
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                {t.settings.retry}
            </Button>
        </div>
    )
}
