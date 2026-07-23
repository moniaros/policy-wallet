"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { IBM_Plex_Sans } from "next/font/google"
import { Loader2 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

function HandoverContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [isMobile, setIsMobile] = useState(false)
    const [appFallbackOpen, setAppFallbackOpen] = useState(false)
    const token = searchParams.get("token")
    const email = searchParams.get("email")
    const callbackUrl = searchParams.get("callbackUrl")

    useEffect(() => {
        const ua = navigator.userAgent
        setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
    }, [])

    const handleContinueWeb = () => {
        if (callbackUrl) {
            router.push(callbackUrl)
        } else {
            router.push("/")
        }
    }

    // The deep-link fallback used a native confirm(). It fires 2s after the app
    // launch attempt, so on a device that DID switch apps the OS dialog was
    // queued behind the user's back; the branded dialog is dismissible in-page.
    const handleOpenApp = () => {
        const deepLink = `policywallet://login?token=${token}&email=${email}`
        window.location.href = deepLink

        setTimeout(() => setAppFallbackOpen(true), 2000)
    }

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-12 dark:bg-black`}>
            <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/10 dark:bg-[#111111] sm:p-10 text-center">
                <div className="inline-block mb-8">
                    <PolicyWalletLogo size="md" language={language} />
                </div>

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 border border-primary/20">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {isMobile
                        ? t("Άνοιγμα στην εφαρμογή PolicyWallet;", "Open in PolicyWallet App?")
                        : t("Καλώς ήρθατε στο PolicyWallet", "Welcome to PolicyWallet")}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    {isMobile
                        ? t("Εντοπίσαμε ότι χρησιμοποιείτε κινητό. Για καλύτερη εμπειρία, χρησιμοποιήστε την εφαρμογή μας.", "We detected you are on mobile. For the best experience, use our native app.")
                        : t("Πατήστε παρακάτω για να συνεχίσετε στο ασφαλές ψηφιακό πορτοφόλι ασφάλισής σας.", "Click below to continue to your secure insurance wallet.")}
                </p>

                <div className="space-y-4">
                    {isMobile && (
                        <button
                            onClick={handleOpenApp}
                            className="pw-primary-button w-full"
                        >
                            {t("Άνοιγμα εφαρμογής PolicyWallet", "Open PolicyWallet App")}
                        </button>
                    )}

                    <button
                        onClick={handleContinueWeb}
                        className={`w-full py-3.5 rounded-full font-bold transition-all active:scale-[0.98] hover:-translate-y-0.5 ${isMobile
                            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-[#111111] dark:text-slate-300"
                            : "bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover hover:shadow-lg"
                            }`}
                    >
                        {isMobile
                            ? t("Συνέχεια στον browser", "Continue in Browser")
                            : t("Συνέχεια στο Πορτοφόλι", "Continue to Wallet")}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-white/10">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        {t(`Ασφαλής ταυτοποίηση ${email}...`, `Securely authenticating ${email}...`)}
                    </p>
                </div>
            </div>

            <ConfirmDialog
                open={appFallbackOpen}
                onOpenChange={setAppFallbackOpen}
                title={t("Η εφαρμογή δεν ανοίγει;", "App not opening?")}
                description={t("Θέλετε να συνεχίσετε στον browser;", "Would you like to stay on the web?")}
                confirmLabel={t("Συνέχεια στον browser", "Continue on the web")}
                onConfirm={handleContinueWeb}
            />
        </div>
    )
}

export default function HandoverPage() {
    return (
        <Suspense fallback={
            <div className={`${ibmPlexSans.className} flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-black`}>
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
        }>
            <HandoverContent />
        </Suspense>
    )
}
