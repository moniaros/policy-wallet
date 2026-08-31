"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { authHref } from "@/lib/seo/locale-links"
import { AuthShell } from "@/components/auth/AuthShell"

/**
 * Callback failure page (expired/invalid link, provider refusal, or a social
 * round trip that returned no usable email). Utility screen: single-column
 * AuthShell, no trust panel.
 */
export default function AuthCodeErrorPage() {
    const { language } = useLanguage()
    const authLocale: "el" | "en" = language === "el" ? "el" : "en"
    const t = (el: string, en: string) => (language === "el" ? el : en)

    return (
        <AuthShell>
            <div className="text-center">
                <div className="mx-auto mb-g-6 flex size-20 items-center justify-center rounded-g-pill border border-state-gap-border bg-state-gap-fill">
                    <AlertTriangle aria-hidden className="size-10 text-state-gap" />
                </div>
                <h1 className="text-g-display-md font-bold text-fg-primary">
                    {t("Η ταυτοποίηση απέτυχε", "Authentication Failed")}
                </h1>
                <p className="mt-g-3 text-g-body text-fg-secondary">
                    {t("Παρουσιάστηκε πρόβλημα κατά τη σύνδεσή σας.", "There was a problem signing you in.")}
                </p>
                <p className="mt-g-2 text-g-body-sm text-fg-secondary">
                    {t("Ο σύνδεσμος σύνδεσης μπορεί να έχει λήξει ή να μην είναι έγκυρος.", "The sign-in link may have expired or is invalid.")}
                </p>
                <Link
                    href={authHref("/auth/signin", authLocale)}
                    className="mt-g-8 inline-flex min-h-12 w-full items-center justify-center rounded-g-pill bg-action-primary-bg px-g-6 text-base font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                >
                    {t("Επιστροφή στη σύνδεση", "Return to Sign In")}
                </Link>
            </div>
        </AuthShell>
    )
}
