"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmailToken } from "./actions"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setMessage("No token provided")
            return
        }

        verifyEmailToken(token)
            .then((result) => {
                if (result.success) {
                    setStatus("success")
                } else {
                    setStatus("error")
                    setMessage(result.error || "Verification failed")
                }
            })
            .catch(() => {
                setStatus("error")
                setMessage("Something went wrong")
            })
    }, [token])

    return (
        <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-stone-100 text-center">
                <Link href="/" className="inline-block font-bold text-2xl text-teal-700 mb-6">
                    PolicyWallet
                </Link>

                {status === "loading" && (
                    <div className="flex flex-col items-center">
                        <svg className="h-10 w-10 animate-spin text-teal-600 mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <h2 className="text-xl font-bold text-stone-900">Verifying your email...</h2>
                    </div>
                )}

                {status === "success" && (
                    <div>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900 mb-2">Email Verified!</h2>
                        <p className="text-stone-600 mb-8">
                            Your email has been successfully verified. You can now access all features.
                        </p>
                        <Link href="/wallet" className="block w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-teal-700 transition-all">
                            Go to Dashboard
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900 mb-2">Verification Failed</h2>
                        <p className="text-stone-600 mb-8">
                            {message}. The link may be invalid or expired.
                        </p>
                        <Link href="/auth/signin" className="text-teal-600 hover:underline font-medium">
                            Back to Sign In
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
