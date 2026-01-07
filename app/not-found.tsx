"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 px-6">
            <div className="flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-teal-50 dark:bg-teal-900/10">
                <ShieldAlert className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
                Page Not Found
            </h1>

            <p className="text-lg text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-10">
                The policy or page you are looking for doesn't exist or has been moved.
            </p>

            <Link
                href="/"
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
            >
                Return to Safety
            </Link>

            <div className="mt-16 text-neutral-400 dark:text-neutral-600 text-sm">
                Error Code: 404_POLICY_MISSING
            </div>
        </div>
    )
}
