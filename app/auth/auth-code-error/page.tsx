"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { IBM_Plex_Sans } from "next/font/google"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

export default function AuthCodeErrorPage() {
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-12 dark:bg-black`}>
            <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-[#111111] sm:p-10 text-center">
                <Link href="/" className="inline-block mb-8">
                    <PolicyWalletLogo size="md" language={language} />
                </Link>

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {t("Η ταυτοποίηση απέτυχε", "Authentication Failed")}
                </h1>
                <p className="text-slate-600 dark:text-slate-500 mb-2">
                    {t("Παρουσιάστηκε πρόβλημα κατά τη σύνδεσή σας.", "There was a problem signing you in.")}
                </p>
                <p className="text-sm text-slate-500 mb-8">
                    {t("Ο σύνδεσμος σύνδεσης μπορεί να έχει λήξει ή να μην είναι έγκυρος.", "The sign-in link may have expired or is invalid.")}
                </p>

                <Link
                    href="/auth/signin"
                    className="block w-full rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-white dark:text-[#1A2420] transition-all hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg"
                >
                    {t("Επιστροφή στη σύνδεση", "Return to Sign In")}
                </Link>
            </div>
        </div>
    )
}
