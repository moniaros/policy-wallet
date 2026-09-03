"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmailToken } from "./actions"
import { Check, Loader2, X } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { useLanguage } from "@/contexts/LanguageContext"
import { authHref } from "@/lib/seo/locale-links"
import { AuthShell } from "@/components/auth/AuthShell"
import { AUTH_LINK_CLASS, AUTH_PRIMARY_LINK_CLASS } from "@/components/auth/FormField"

/**
 * Utility screen on the single-column AuthShell: the three outcomes share the
 * auth-code-error anatomy — a state disc, a display-md heading, one line of
 * body, one action — on the three-state tokens (covered / gap).
 */
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
                    <div className="flex flex-col items-center py-g-8">
                        <Loader2 aria-hidden className="mb-g-6 size-12 animate-spin text-fg-brand" />
                        <h1 className="text-g-display-md font-bold text-fg-primary">
                            {t("Επαλήθευση email...", "Verifying your email...")}
                        </h1>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-g-2">
                        <div className="mx-auto mb-g-6 flex size-20 items-center justify-center rounded-g-pill bg-state-covered-fill">
                            <Check aria-hidden className="size-10 text-state-covered" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-g-display-md font-bold text-fg-primary">
                            {t("Το email επαληθεύτηκε!", "Email Verified!")}
                        </h1>
                        <p className="mt-g-3 text-g-body text-fg-secondary">
                            {t(
                                "Το email σας επαληθεύτηκε επιτυχώς. Μπορείτε πλέον να χρησιμοποιήσετε όλες τις λειτουργίες.",
                                "Your email has been successfully verified. You can now access all features."
                            )}
                        </p>
                        <Link href={authHref("/auth/signin", authLocale)} className={`mt-g-8 ${AUTH_PRIMARY_LINK_CLASS}`}>
                            {t("Συνέχεια στην εφαρμογή", "Continue to App")}
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-g-2">
                        <div className="mx-auto mb-g-6 flex size-20 items-center justify-center rounded-g-pill border border-state-gap-border bg-state-gap-fill">
                            <X aria-hidden className="size-10 text-state-gap" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-g-display-md font-bold text-fg-primary">
                            {t("Η επαλήθευση απέτυχε", "Verification Failed")}
                        </h1>
                        <p className="mt-g-3 text-g-body text-fg-secondary">
                            {message}. {t("Ο σύνδεσμος μπορεί να μην είναι έγκυρος ή να έχει λήξει.", "The link may be invalid or expired.")}
                        </p>
                        <Link href={authHref("/auth/signin", authLocale)} className={`mt-g-8 ${AUTH_LINK_CLASS}`}>
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
