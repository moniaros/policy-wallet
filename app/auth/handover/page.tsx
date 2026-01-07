"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

function HandoverContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t } = useLanguage()
    const [isMobile, setIsMobile] = useState(false)
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const callbackUrl = searchParams.get("callbackUrl")

    useEffect(() => {
        const ua = navigator.userAgent
        setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))

        // Auto-redirect to app if mobile? Maybe just show button for better UX
    }, [])

    const handleContinueWeb = () => {
        if (callbackUrl) {
            router.push(callbackUrl)
        } else {
            router.push("/")
        }
    }

    const handleOpenApp = () => {
        // Construct deep link
        const deepLink = `policywallet://login?token=${token}&email=${email}`
        window.location.href = deepLink

        // Fallback if app not installed after 2 seconds
        setTimeout(() => {
            if (confirm("App not opening? Would you like to stay on the web?")) {
                handleContinueWeb()
            }
        }, 2000)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50 dark:bg-stone-900">
            <div className="max-w-md w-full bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-8 border border-stone-200 dark:border-stone-700 text-center">
                <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                    {isMobile ? "Open in PolicyWallet App?" : "Welcome to PolicyWallet"}
                </h1>
                <p className="text-stone-600 dark:text-stone-400 mb-8">
                    {isMobile
                        ? "We detected you are on mobile. For the best experience, use our native app."
                        : "Click below to continue to your secure insurance wallet."
                    }
                </p>

                <div className="space-y-4">
                    {isMobile && (
                        <button
                            onClick={handleOpenApp}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-semibold transition-all shadow-md active:scale-95"
                        >
                            Open PolicyWallet App
                        </button>
                    )}

                    <button
                        onClick={handleContinueWeb}
                        className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 py-3.5 rounded-xl font-semibold hover:bg-stone-50 transition-all active:scale-95"
                    >
                        {isMobile ? "Continue in Browser" : "Continue to Wallet"}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 dark:border-stone-700">
                    <p className="text-xs text-stone-500 dark:text-stone-500">
                        Securely authenticating {email}...
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function HandoverPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 text-stone-600">Loading handover...</div>}>
            <HandoverContent />
        </Suspense>
    )
}
