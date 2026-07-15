"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RotateCw } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Route-scoped error boundary for the authenticated app. Without it, a render
 * error on any protected page fell through to the root boundary and tore down
 * the whole app shell. This keeps the nav/shell and offers a scoped recovery.
 */
export default function ProtectedError({
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
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                    >
                        <RotateCw className="h-4 w-4" />
                        {t.errors.tryAgain}
                    </button>
                    <Link
                        href="/home"
                        className="rounded-full px-5 py-2.5 text-sm font-semibold text-black/70 transition-colors hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                    >
                        {t.nav.home}
                    </Link>
                </div>
            </div>
        </div>
    )
}
