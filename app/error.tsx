"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

/**
 * Root error boundary.
 *
 * Bilingual on purpose: this catches errors that may have occurred above the
 * LanguageProvider, so it cannot read the user's language — and the product is
 * Greek-default with an English option. Showing only English (as it used to)
 * left a Greek user, the majority, with a wall of English at the worst moment.
 * Greek leads (the app default); English follows in muted text so every user
 * understands what happened and what to do.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-900">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/10">
                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>

            <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                Κάτι πήγε στραβά
            </h1>
            <p className="mb-2 max-w-md text-center text-lg text-neutral-600 dark:text-neutral-400">
                Παρουσιάστηκε ένα απροσδόκητο σφάλμα. Η ομάδα μας ειδοποιήθηκε.
            </p>
            <p className="mb-10 max-w-md text-center text-sm text-neutral-400 dark:text-neutral-500">
                Something went wrong. Our team has been notified.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => reset()} className="pw-primary-button justify-center">
                    <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Δοκιμάστε ξανά · Try again
                </button>

                <Link href="/" className="pw-secondary-button justify-center">
                    Αρχική · Home
                </Link>
            </div>

            {error.digest && (
                <div className="mt-12 font-mono text-xs text-neutral-400 dark:text-neutral-600">
                    Κωδικός συμβάντος · Incident ID: {error.digest}
                </div>
            )}
        </div>
    )
}
