"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmailToken } from "./actions"
import { Loader2 } from "lucide-react"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token || !email) {
            setStatus("error")
            setMessage("Invalid verification link")
            return
        }

        verifyEmailToken(token, email)
            .then((result) => {
                if (result.success) {
                    setStatus("success")
                } else {
                    setStatus("error")
                    setMessage(result.error || "Verification failed")
                }
            })
            .catch((err) => {
                console.error("Verification error:", err)
                setStatus("error")
                setMessage("An unexpected error occurred")
            })
    }, [token, email, router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
            {/* Emerald/Teal Liquid Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500 hover:shadow-emerald-500/5 transition-all text-center">
                <Link href="/" className="inline-block group mb-8">
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        Policy<span className="text-emerald-500">Wallet</span>
                    </h1>
                </Link>

                {status === "loading" && (
                    <div className="flex flex-col items-center py-8">
                        <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-6" />
                        <h2 className="text-xl font-bold text-white">Verifying your email...</h2>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-2">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                            <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Email Verified!</h2>
                        <p className="text-slate-400 mb-8">
                            Your email has been successfully verified. You can now access all features.
                        </p>
                        <Link href="/auth/signin" className="block w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                            Sign In Now
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-2">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Verification Failed</h2>
                        <p className="text-slate-400 mb-8">
                            {message}. The link may be invalid or expired.
                        </p>
                        <Link href="/auth/signin" className="text-emerald-500 hover:text-emerald-400 font-bold hover:underline transition-colors">
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
