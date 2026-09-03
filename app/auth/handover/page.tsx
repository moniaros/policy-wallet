"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { Loader2, Smartphone } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { AuthShell } from "@/components/auth/AuthShell"
import { Button } from "@/src/design-system"

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
        <AuthShell>
            <div className="text-center">
                <div className="mx-auto mb-g-6 flex size-20 items-center justify-center rounded-g-pill bg-state-covered-fill">
                    <Smartphone aria-hidden className="size-10 text-state-covered" strokeWidth={2} />
                </div>

                <h1 className="text-g-display-md font-bold text-fg-primary">
                    {isMobile
                        ? t("Άνοιγμα στην εφαρμογή PolicyWallet;", "Open in PolicyWallet App?")
                        : t("Καλώς ήρθατε στο PolicyWallet", "Welcome to PolicyWallet")}
                </h1>
                <p className="mt-g-3 text-g-body text-fg-secondary">
                    {isMobile
                        ? t("Εντοπίσαμε ότι χρησιμοποιείτε κινητό. Για καλύτερη εμπειρία, χρησιμοποιήστε την εφαρμογή μας.", "We detected you are on mobile. For the best experience, use our native app.")
                        : t("Πατήστε παρακάτω για να συνεχίσετε στο ασφαλές ψηφιακό πορτοφόλι ασφάλισής σας.", "Click below to continue to your secure insurance wallet.")}
                </p>

                <div className="mt-g-8 flex flex-col gap-g-4">
                    {isMobile && (
                        <Button type="button" size="lg" onClick={handleOpenApp} className="w-full">
                            {t("Άνοιγμα εφαρμογής PolicyWallet", "Open PolicyWallet App")}
                        </Button>
                    )}

                    <Button
                        type="button"
                        size="lg"
                        variant={isMobile ? "secondary" : "primary"}
                        onClick={handleContinueWeb}
                        className="w-full"
                    >
                        {isMobile
                            ? t("Συνέχεια στον browser", "Continue in Browser")
                            : t("Συνέχεια στο Πορτοφόλι", "Continue to Wallet")}
                    </Button>
                </div>

                <div className="mt-g-8 border-t border-border-subtle pt-g-6">
                    <p className="flex items-center justify-center gap-g-2 text-g-caption text-fg-secondary">
                        <span aria-hidden className="size-2 rounded-g-pill bg-state-covered motion-safe:animate-pulse" />
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
        </AuthShell>
    )
}

export default function HandoverPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-dvh items-center justify-center bg-surface-base">
                <Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" />
            </div>
        }>
            <HandoverContent />
        </Suspense>
    )
}
