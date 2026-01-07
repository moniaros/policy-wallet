"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 px-6">
            <div className="flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-red-50 dark:bg-red-900/10">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
                Something went wrong
            </h1>

            <p className="text-lg text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-10">
                We encountered an unexpected error while processing your request. Our team has been notified.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg transition-all hover:opacity-90 active:scale-95 shadow-md"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>

                <a
                    href="/"
                    className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold rounded-lg transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95"
                >
                    Go Home
                </a>
            </div>

            {error.digest && (
                <div className="mt-12 text-neutral-400 dark:text-neutral-600 text-xs font-mono">
                    Incident ID: {error.digest}
                </div>
            )}
        </div>
    )
}
