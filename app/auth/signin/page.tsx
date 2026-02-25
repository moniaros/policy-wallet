"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import {
    Loader2,
    Mail,
    Lock,
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Fingerprint,
    KeyRound,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { resolveAuthEmailIdentifier } from "@/lib/auth/phone-auth"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

export default function SignInPage() {
    const router = useRouter()
    const { language, setLanguage, t } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const passwordInputRef = useRef<HTMLInputElement | null>(null)

    const [identifier, setIdentifier] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showResendVerification, setShowResendVerification] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const [storedIdentifier, setStoredIdentifier] = useState("")
    const [passkeySupported, setPasskeySupported] = useState(false)
    const [hasPinConfigured, setHasPinConfigured] = useState(false)
    const [isQuickUnlocking, setIsQuickUnlocking] = useState(false)
    const [showPinPrompt, setShowPinPrompt] = useState(false)
    const [pinPrompt, setPinPrompt] = useState("")
    const [showPasswordLogin, setShowPasswordLogin] = useState(false)

    const [enableQuickUnlock, setEnableQuickUnlock] = useState(false)
    const [quickPin, setQuickPin] = useState("")

    const quickUnlockReady = Boolean(storedIdentifier && (passkeySupported || hasPinConfigured))

    const copy = {
        title: t.auth.welcomeBack,
        subtitle: roleCopy.auth.signInSubtitle,
        email: language === "el" ? "Email ή κινητό" : "Email or mobile",
        password: t.auth.password,
        forgot: roleCopy.auth.forgotPassword,
        signIn: t.auth.signIn,
        signingIn: `${t.auth.signIn}...`,
        noAccount: roleCopy.auth.noAccount,
        createAccount: t.auth.createAccount,
        unverified: roleCopy.auth.unverified,
        checkEmail: roleCopy.auth.checkInbox,
        resend: roleCopy.auth.resendVerification,
        sending: `${t.common.loading}`,
        resendSent: roleCopy.auth.resendSent,
        genericError: t.errors.somethingWentWrong,
        biometricPrimary: language === "el" ? "Βιομετρική σύνδεση (κύρια)" : "Biometric sign-in (primary)",
        pinFallback: language === "el" ? "PIN fallback" : "PIN fallback",
        quickUnlockHint: language === "el"
            ? "Χρησιμοποίησε βιομετρικό ή PIN πρώτα. Το email/password παραμένει διαθέσιμο ως δευτερεύουσα μέθοδος."
            : "Use biometrics or PIN first. Email/password remains available as a secondary method.",
        useBiometric: language === "el" ? "Χρήση Βιομετρικού" : "Use Biometric",
        usePin: language === "el" ? "Χρήση PIN" : "Use PIN",
        pinLabel: language === "el" ? "PIN 4 ψηφίων" : "4-digit PIN",
        pinMissing: language === "el" ? "Δεν έχει ρυθμιστεί PIN σε αυτή τη συσκευή." : "No PIN is configured on this device.",
        pinInvalid: language === "el" ? "Λάθος PIN." : "Invalid PIN.",
        quickMissing: language === "el" ? "Δεν βρέθηκε προηγούμενη σύνδεση στη συσκευή." : "No previous sign-in found on this device.",
        passkeyUnavailable: language === "el" ? "Η συσκευή δεν υποστηρίζει passkey API." : "This device does not support passkey API.",
        enableQuickUnlock: language === "el" ? "Ενεργοποίηση quick unlock σε αυτή τη συσκευή" : "Enable quick unlock on this device",
        setQuickPin: language === "el" ? "PIN fallback (προαιρετικό)" : "Fallback PIN (optional)",
        openSecondary: language === "el" ? "Χρήση email/password (δευτερεύουσα)" : "Use email/password (secondary)",
        hideSecondary: language === "el" ? "Απόκρυψη email/password" : "Hide email/password",
        readyOnDevice: language === "el" ? "Το quick unlock είναι έτοιμο σε αυτή τη συσκευή" : "Quick unlock is ready on this device",
        setupNeeded: language === "el" ? "Συνδεθείτε μία φορά με password για ενεργοποίηση quick unlock" : "Sign in once with password to enable quick unlock",
    }

    useEffect(() => {
        if (typeof window === "undefined") return

        const savedIdentifier = window.localStorage.getItem("pw_quick_identifier") || ""
        const savedPinHash = window.localStorage.getItem("pw_quick_pin_hash") || ""

        setStoredIdentifier(savedIdentifier)
        setPasskeySupported(Boolean(window.PublicKeyCredential && navigator.credentials))
        setHasPinConfigured(Boolean(savedPinHash))
    }, [])

    const focusPasswordField = () => {
        setTimeout(() => passwordInputRef.current?.focus(), 80)
    }

    const revealSecondaryPasswordFlow = () => {
        setShowPasswordLogin(true)
        focusPasswordField()
    }

    const hashPin = async (pin: string) => {
        if (typeof window === "undefined" || !window.crypto?.subtle) {
            return pin
        }

        const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin))
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
    }

    const handleBiometricPrefill = async () => {
        setError(null)

        if (!storedIdentifier) {
            setError(copy.quickMissing)
            revealSecondaryPasswordFlow()
            return
        }

        if (!passkeySupported) {
            setError(copy.passkeyUnavailable)
            revealSecondaryPasswordFlow()
            return
        }

        setIsQuickUnlocking(true)
        await new Promise((resolve) => setTimeout(resolve, 500))
        setIdentifier(storedIdentifier)
        setIsQuickUnlocking(false)
        revealSecondaryPasswordFlow()
    }

    const handlePinPrefill = async () => {
        setError(null)

        if (!storedIdentifier) {
            setError(copy.quickMissing)
            revealSecondaryPasswordFlow()
            return
        }

        const storedPinHash = localStorage.getItem("pw_quick_pin_hash")
        if (!storedPinHash) {
            setError(copy.pinMissing)
            revealSecondaryPasswordFlow()
            return
        }

        if (!pinPrompt || pinPrompt.length !== 4) {
            setError(copy.pinInvalid)
            return
        }

        const enteredHash = await hashPin(pinPrompt)
        if (enteredHash !== storedPinHash) {
            setError(copy.pinInvalid)
            return
        }

        setIdentifier(storedIdentifier)
        setPinPrompt("")
        setShowPinPrompt(false)
        revealSecondaryPasswordFlow()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setShowResendVerification(false)
        setResendMessage(null)

        const supabase = createClient()

        try {
            const resolved = resolveAuthEmailIdentifier(identifier)
            const { error } = await supabase.auth.signInWithPassword({
                email: resolved.email,
                password,
            })

            if (error) {
                if (
                    error.message.toLowerCase().includes("email not confirmed") ||
                    error.message.toLowerCase().includes("confirm your email")
                ) {
                    setError(copy.unverified)
                    setShowResendVerification(true)
                } else {
                    setError(error.message)
                }
            } else {
                if (typeof window !== "undefined") {
                    localStorage.setItem("pw_quick_identifier", identifier.trim())
                    if (enableQuickUnlock && quickPin.length === 4) {
                        const pinHash = await hashPin(quickPin)
                        localStorage.setItem("pw_quick_pin_hash", pinHash)
                    } else {
                        localStorage.removeItem("pw_quick_pin_hash")
                    }
                }

                router.refresh()
                router.push("/home")
            }
        } catch (err) {
            setError(copy.genericError)
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendVerification = async () => {
        setIsResending(true)
        setResendMessage(null)

        try {
            const { resendVerificationEmail } = await import("../actions")
            const resolved = resolveAuthEmailIdentifier(identifier)
            const result = await resendVerificationEmail(resolved.email, language)

            if (result.success) {
                setResendMessage(copy.resendSent)
            } else {
                setResendMessage(result.error || copy.genericError)
            }
        } catch {
            setResendMessage(copy.genericError)
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 py-10 dark:bg-[#0F172A]`}>
            <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden">
                <div className="absolute left-[20%] top-[-10%] h-[60%] w-[60%] rounded-full bg-slate-100/50 blur-[120px] dark:bg-slate-800/20" />
            </div>

            <div className="relative z-10 w-full max-w-[440px] animate-in zoom-in rounded-2xl border border-gray-200 bg-white/95 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-3xl duration-500 dark:border-slate-800 dark:bg-slate-900/90 sm:p-10">
                <div className="mb-7 text-center">
                    <Link href="/" className="group mb-5 inline-block">
                        <PolicyWalletLogo size="md" language={language} />
                    </Link>
                    <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{copy.title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
                    <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                        <button
                            type="button"
                            onClick={() => setLanguage("el")}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${language === "el" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                        >
                            EL
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage("en")}
                            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${language === "en" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                        >
                            EN
                        </button>
                    </div>
                </div>

                <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800/40 dark:bg-slate-800/20">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{copy.biometricPrimary}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">{copy.pinFallback}</p>
                    </div>

                    <p className="text-xs text-slate-900 dark:text-slate-100">{copy.quickUnlockHint}</p>

                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {quickUnlockReady ? copy.readyOnDevice : copy.setupNeeded}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={handleBiometricPrefill}
                            disabled={isQuickUnlocking}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-200 dark:hover:bg-slate-800/50"
                        >
                            {isQuickUnlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                            {copy.useBiometric}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowPinPrompt((value) => !value)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-200 dark:hover:bg-slate-800/50"
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            {copy.usePin}
                        </button>
                    </div>

                    {showPinPrompt && (
                        <div className="flex items-center gap-2">
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={pinPrompt}
                                onChange={(e) => setPinPrompt(e.target.value.replace(/\D/g, ""))}
                                placeholder={copy.pinLabel}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={handlePinPrefill}
                                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                            >
                                OK
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setShowPasswordLogin((value) => !value)
                            if (!showPasswordLogin) focusPasswordField()
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-200 dark:hover:bg-slate-800/50"
                    >
                        {showPasswordLogin ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {showPasswordLogin ? copy.hideSecondary : copy.openSecondary}
                    </button>
                </div>

                {error && (
                    <div className="mb-4 space-y-3">
                        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
                        </div>

                        {showResendVerification && (
                            <div className="space-y-3 rounded-xl border border-slate-500/20 bg-slate-500/10 p-4">
                                <p className="text-sm text-slate-800 dark:text-slate-200/90">{copy.checkEmail}</p>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={isResending}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-500/30 bg-slate-100 py-2.5 text-sm font-bold text-slate-800 transition-all hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-500/20 dark:text-slate-300 dark:hover:bg-slate-500/30"
                                >
                                    {isResending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {copy.sending}
                                        </>
                                    ) : copy.resend}
                                </button>
                                {resendMessage && (
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        {resendMessage === copy.resendSent
                                            ? <CheckCircle className="h-4 w-4 text-green-500" />
                                            : <AlertCircle className="h-4 w-4 text-red-500" />}
                                        <span className={resendMessage === copy.resendSent ? "text-green-500" : "text-red-500"}>
                                            {resendMessage}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {showPasswordLogin && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {copy.email}
                                </label>
                                <div className="group relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Mail className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-slate-900 dark:group-focus-within:text-slate-300" />
                                    </div>
                                    <input
                                        id="email"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 transition-all placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-[#29685B]/40 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white sm:text-sm"
                                        placeholder={language === "el" ? "name@email.com ή +30 69X XXX XXXX" : "name@email.com or +30 69X XXX XXXX"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {copy.password}
                                    </label>
                                    <Link href="/auth/forgot-password" className="text-xs font-bold text-slate-600 transition-all hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-300">
                                        {copy.forgot}
                                    </Link>
                                </div>
                                <div className="group relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-slate-900 dark:group-focus-within:text-slate-300" />
                                    </div>
                                    <input
                                        ref={passwordInputRef}
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 transition-all placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-[#29685B]/40 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white sm:text-sm"
                                        placeholder={roleCopy.auth.passwordPlaceholder}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={enableQuickUnlock}
                                        onChange={(e) => setEnableQuickUnlock(e.target.checked)}
                                    />
                                    {copy.enableQuickUnlock}
                                </label>
                                {enableQuickUnlock && (
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={quickPin}
                                        onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ""))}
                                        placeholder={copy.setQuickPin}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#29685B] px-4 py-4 text-[16px] font-bold text-white transition-transform active:scale-[0.98] hover:bg-[#1C4E44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29685B] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#29685B] dark:text-white dark:hover:bg-[#1C4E44]"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {copy.signingIn}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {copy.signIn} <ArrowRight className="h-4 w-4 opacity-80" />
                                </span>
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-7 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {copy.noAccount}{" "}
                        <Link href="/auth/signup" className="font-bold text-slate-800 transition-colors hover:text-slate-500 dark:text-slate-300 dark:hover:text-white">
                            {copy.createAccount}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}


