"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t } = useLanguage()

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token')
            const email = searchParams.get('email')

            if (!token || !email) {
                setStatus('error')
                setMessage('Invalid verification link')
                return
            }

            try {
                // Call API to verify the token
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, email })
                })

                const data = await response.json()

                if (data.success) {
                    setStatus('success')
                    setMessage('Email verified successfully!')
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        router.push('/auth/signin?verified=true')
                    }, 3000)
                } else {
                    setStatus('error')
                    setMessage(data.error || 'Verification failed')
                }
            } catch (error) {
                setStatus('error')
                setMessage('Something went wrong. Please try again.')
            }
        }

        verifyEmail()
    }, [searchParams, router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 py-12 transition-colors duration-500">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-teal-100/30 dark:bg-teal-900/20 blur-3xl opacity-60" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 dark:bg-blue-900/20 blur-3xl opacity-50" />
            </div>

            <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/80 dark:bg-stone-900/60 backdrop-blur-2xl p-10 shadow-2xl border border-white/50 dark:border-white/5 relative z-10 transition-all">
                {status === 'verifying' && (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 dark:border-teal-400"></div>
                        </div>
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                            Verifying Email...
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 font-medium leading-relaxed">
                            Please wait while we verify your email address securely.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-6 animate-in zoom-in-50 duration-500">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full p-6 shadow-lg">
                                    <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                            Verification Successful!
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 font-medium">
                            Your email has been successfully verified. Redirecting you to login...
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-4 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                Continue to Login
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-6 animate-in shake duration-500">
                        <div className="flex justify-center">
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-6 border border-red-100 dark:border-red-900/30">
                                <svg className="w-16 h-16 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
                            Verification Failed
                        </h2>
                        <p className="text-stone-600 dark:text-stone-400 font-medium">
                            {message}
                        </p>
                        <div className="pt-4 space-y-3">
                            <Link
                                href="/auth/signup"
                                className="block w-full rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-6 py-4 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                Try Again
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="block w-full rounded-2xl border-2 border-stone-200 dark:border-stone-700 px-6 py-4 text-stone-600 dark:text-stone-300 font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
