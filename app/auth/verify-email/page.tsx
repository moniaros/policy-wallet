"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmailToken } from "./actions"
import { Loader2 } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { useLanguage } from "@/contexts/LanguageContext"
import { authHref } from "@/lib/seo/locale-links"
import { AuthShell } from "@/components/auth/AuthShell"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { language } = useLanguage()
    // Internal auth links must carry the pinned language; a bare href
    // dropped an English visitor onto the Greek sign-in page.
    const authLocale: "el" | "en" = language === "el" ? "el" : "en"
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!token || !email) {
            setStatus("error")
            setMessage(t("Μη έγκυρος σύνδεσμος επαλήθευσης", "Invalid verification link"))
            return
        }

        trackLandingEvent("email_verification_viewed", {
            source: "verify_email_page",
            email_domain: email.includes("@") ? email.split("@")[1] : "unknown",
        })

        verifyEmailToken(token, email, language === "el" ? "el" : "en")
            .then((result) => {
                if (result.success) {
                    setStatus("success")
                    trackLandingEvent("email_verified", {
                        source: "verify_email_page",
                        email_domain: email.includes("@") ? email.split("@")[1] : "unknown",
                    })
                } else {
                    setStatus("error")
                    setMessage(result.error || t("Η επαλήθευση απέτυχε", "Verification failed"))
                }
            })
            .catch((err) => {
                console.error("Verification error:", err)
                setStatus("error")
                setMessage(t("Παρουσιάστηκε σφάλμα", "An unexpected error occurred"))
            })
    }, [token, email, router])

    return (
        <AuthShell>
            <div className="text-center">
                {status === "loading" && (
                    <div className="flex flex-col items-center py-8">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {t("Επαλήθευση email...", "Verifying your email...")}
                        </h1>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-2">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 border border-primary/20">
                            <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                            {t("Το email επαληθεύτηκε!", "Email Verified!")}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            {t(
                                "Το email σας επαληθεύτηκε επιτυχώς. Μπορείτε πλέον να χρησιμοποιήσετε όλες τις λειτουργίες.",
                                "Your email has been successfully verified. You can now access all features."
                            )}
                        </p>
                        <Link href={authHref("/auth/signin", authLocale)} className="block w-full rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-white dark:text-[#1A2420] transition-all hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg">
                            {t("Συνέχεια στην εφαρμογή", "Continue to App")}
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-2">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                            {t("Η επαλήθευση απέτυχε", "Verification Failed")}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            {message}. {t("Ο σύνδεσμος μπορεί να μην είναι έγκυρος ή να έχει λήξει.", "The link may be invalid or expired.")}
                        </p>
                        <Link href={authHref("/auth/signin", authLocale)} className="font-bold text-primary hover:underline transition-colors">
                            {t("Επιστροφή στη σύνδεση", "Back to Sign In")}
                        </Link>
                    </div>
                )}
            </div>
        </AuthShell>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-surface-base"><Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" /></div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
