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
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
            {/* Emerald/Teal Liquid Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse-slow delay-700" />
            </div>

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in duration-500 hover:shadow-emerald-500/5 transition-all text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">
                    {isMobile ? "Open in PolicyWallet App?" : "Welcome to PolicyWallet"}
                </h1>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    {isMobile
                        ? "We detected you are on mobile. For the best experience, use our native app."
                        : "Click below to continue to your secure insurance wallet."
                    }
                </p>

                <div className="space-y-4">
                    {isMobile && (
                        <button
                            onClick={handleOpenApp}
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] hover:-translate-y-0.5"
                        >
                            Open PolicyWallet App
                        </button>
                    )}

                    <button
                        onClick={handleContinueWeb}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 ${isMobile
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                            }`}
                    >
                        {isMobile ? "Continue in Browser" : "Continue to Wallet"}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Securely authenticating {email}...
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function HandoverPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-slate-900 text-emerald-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        }>
            <HandoverContent />
        </Suspense>
    )
}
