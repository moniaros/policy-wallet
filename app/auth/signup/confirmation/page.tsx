"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

function ConfirmationContent() {
    const searchParams = useSearchParams()
    const { t } = useLanguage()

    const email = searchParams.get("email") || ""
    const role = searchParams.get("role") as "policyholder" | "agent" || "policyholder"

    const nextSteps = role === "agent" ? t.auth.nextStepsAgent : t.auth.nextStepsPolicyholder

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-teal-50/30 to-stone-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-teal-100/40 to-blue-100/40 blur-3xl opacity-60 animate-pulse" />
                <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-emerald-100/40 to-teal-100/40 blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-2xl space-y-8 rounded-3xl bg-white/90 backdrop-blur-2xl p-10 sm:p-12 shadow-2xl border border-white/60 relative z-10 transition-all duration-300">
                {/* Success Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full p-6 shadow-lg">
                            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                        {t.auth.accountCreated}
                    </h1>
                    <p className="text-xl font-semibold text-stone-700">
                        {t.auth.verifyEmailSent}
                    </p>
                </div>

                {/* Email Info Card */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200/50 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-stone-700 font-medium">
                                {t.auth.verificationEmailSent}
                            </p>
                            <p className="text-lg font-bold text-teal-700 break-all">
                                {email}
                            </p>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                {t.auth.clickLinkToVerify}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {t.auth.nextSteps}
                    </h3>
                    <ol className="space-y-3">
                        {nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-3 group">
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-md group-hover:scale-110 transition-transform">
                                    {index + 1}
                                </div>
                                <p className="text-stone-700 pt-0.5 group-hover:text-teal-700 transition-colors">
                                    {step}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Help Section */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-semibold text-stone-700">
                        {t.auth.didntReceiveEmail}
                    </p>
                    <ul className="text-sm text-stone-600 space-y-2 ml-5 list-disc">
                        <li>{t.auth.checkSpam}</li>
                        <li>Βεβαιωθείτε ότι η διεύθυνση email είναι σωστή</li>
                        <li>Περιμένετε μερικά λεπτά - μπορεί να υπάρχει καθυστέρηση</li>
                    </ul>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    <Link
                        href="/auth/signin"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/30 transition-all hover:shadow-xl hover:shadow-teal-600/40 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                        {t.auth.proceedToLogin}
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-stone-500 pt-4">
                    {t.auth.welcomeToPolicyWallet} 🎉
                </p>
            </div>
        </div>
    )
}

export default function SignUpConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        }>
            <ConfirmationContent />
        </Suspense>
    )
}
