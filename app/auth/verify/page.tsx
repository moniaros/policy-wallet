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
            const token_hash = searchParams.get('token_hash')
            const type = searchParams.get('type')

            if (!token_hash || type !== 'email') {
                setStatus('error')
                setMessage('Invalid verification link')
                return
            }

            try {
                // Call Supabase to confirm the email
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token_hash, type })
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-teal-50/30 to-stone-50 px-4 py-12">
            <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/90 backdrop-blur-2xl p-10 shadow-2xl border border-white/60">
                {status === 'verifying' && (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-stone-800">
                            Επαλήθευση Email...
                        </h2>
                        <p className="text-stone-600">
                            Παρακαλώ περιμένετε ενώ επαληθεύουμε τη διεύθυνση email σας.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-6">
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
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                            Επιτυχής Επαλήθευση!
                        </h2>
                        <p className="text-stone-600">
                            Το email σας επαληθεύτηκε με επιτυχία. Θα ανακατευθυνθείτε στη σελίδα σύνδεσης...
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                                Συνέχεια στη Σύνδεση
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-red-100 rounded-full p-6">
                                <svg className="w-16 h-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-red-600">
                            Αποτυχία Επαλήθευσης
                        </h2>
                        <p className="text-stone-600">
                            {message}
                        </p>
                        <div className="pt-4 space-y-3">
                            <Link
                                href="/auth/signup"
                                className="block w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                                Δοκιμάστε Ξανά
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="block w-full rounded-xl border-2 border-stone-300 px-6 py-3 text-stone-700 font-bold hover:bg-stone-50 transition-all"
                            >
                                Επιστροφή στη Σύνδεση
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
