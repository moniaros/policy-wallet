"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { AlertCircle, ArrowRight, Fingerprint, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { resolveAuthEmailIdentifier } from "@/lib/auth/phone-auth"
import { getPostLoginRedirectByRole } from "@/lib/auth/role-routing"

const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin", "greek"], weight: ["400", "500", "600", "700"] })
type Tab = "email" | "phone"
type ResetStep = "request" | "verify" | "success"

function isPhoneLike(value: string) {
    const normalized = value.replace(/[^\d+]/g, "")
    return normalized.startsWith("+") || /^\d+$/.test(normalized)
}

function sanitizeCallbackUrl(callbackUrl: string | null): string | null {
    if (!callbackUrl) return null

    const trimmed = callbackUrl.trim()
    if (!trimmed.startsWith("/")) return null
    if (trimmed.startsWith("//")) return null
    return trimmed
}

export default function SignInPage() {
    const router = useRouter()
    const { language, setLanguage, t } = useLanguage()
    const isGreek = language === "el"
    const pwdRef = useRef<HTMLInputElement | null>(null)

    const [tab, setTab] = useState<Tab>("email")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showResend, setShowResend] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const [showReset, setShowReset] = useState(false)
    const [resetStep, setResetStep] = useState<ResetStep>("request")
    const [resetEmail, setResetEmail] = useState("")
    const [resetOtp, setResetOtp] = useState("")
    const [resetPassword, setResetPassword] = useState("")
    const [resetConfirmPassword, setResetConfirmPassword] = useState("")
    const [resetError, setResetError] = useState<string | null>(null)
    const [resetNotice, setResetNotice] = useState<string | null>(null)
    const [resetLoading, setResetLoading] = useState(false)

    const [biometricRegistered, setBiometricRegistered] = useState(false)
    const [storedIdentifier, setStoredIdentifier] = useState("")
    const [pinPrompt, setPinPrompt] = useState("")
    const [showPinPrompt, setShowPinPrompt] = useState(false)
    const [quickError, setQuickError] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        setBiometricRegistered(window.localStorage.getItem("biometric_registered") === "true")
        setStoredIdentifier(window.localStorage.getItem("pw_quick_identifier") || "")
    }, [])

    const hashPin = async (pin: string) => {
        if (typeof window === "undefined" || !window.crypto?.subtle) return pin
        const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin))
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
    }

    const applyStoredIdentifier = () => {
        if (!storedIdentifier) {
            setQuickError(isGreek ? "Δεν υπάρχει αποθηκευμένος λογαριασμός στη συσκευή." : "No saved account on this device.")
            return
        }
        if (isPhoneLike(storedIdentifier)) {
            setTab("phone")
            setPhone(storedIdentifier)
        } else {
            setTab("email")
            setEmail(storedIdentifier)
        }
        setQuickError(null)
        setTimeout(() => pwdRef.current?.focus(), 50)
    }

    const handlePinUnlock = async () => {
        const storedPinHash = typeof window !== "undefined" ? window.localStorage.getItem("pw_quick_pin_hash") : null
        if (!storedPinHash || pinPrompt.length !== 4) {
            setQuickError(isGreek ? "Λάθος PIN." : "Invalid PIN.")
            return
        }
        const enteredHash = await hashPin(pinPrompt)
        if (enteredHash !== storedPinHash) {
            setQuickError(isGreek ? "Λάθος PIN." : "Invalid PIN.")
            return
        }
        setShowPinPrompt(false)
        setPinPrompt("")
        applyStoredIdentifier()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setShowResend(false)
        setResendMessage(null)
        setLoading(true)

        const identifier = tab === "email" ? email.trim() : phone.trim()
        const supabase = createClient()

        try {
            const resolved = resolveAuthEmailIdentifier(identifier)
            const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: resolved.email, password })
            if (signInError) {
                if (signInError.message.toLowerCase().includes("confirm")) {
                    setError(isGreek ? "Ο λογαριασμός δεν έχει επιβεβαιωθεί." : "Account is not verified.")
                    setShowResend(true)
                } else {
                    setError(signInError.message)
                }
                return
            }

            if (typeof window !== "undefined") {
                window.localStorage.setItem("pw_quick_identifier", identifier)
            }

            const callbackUrl = sanitizeCallbackUrl(
                new URLSearchParams(window.location.search).get("callbackUrl")
            )
            const roleRoute = getPostLoginRedirectByRole(String(data.user?.user_metadata?.role || ""))
            router.refresh()
            router.push(callbackUrl || roleRoute)
        } catch {
            setError(isGreek ? "Αποτυχία σύνδεσης." : "Sign in failed.")
        } finally {
            setLoading(false)
        }
    }

    const resendVerification = async () => {
        setResending(true)
        setResendMessage(null)
        try {
            const identifier = tab === "email" ? email.trim() : phone.trim()
            const { resendVerificationEmail } = await import("../actions")
            const resolved = resolveAuthEmailIdentifier(identifier)
            const result = await resendVerificationEmail(resolved.email, language)
            setResendMessage(result.success ? (isGreek ? "Στάλθηκε email επιβεβαίωσης." : "Verification email sent.") : (result.error || "Error"))
        } finally {
            setResending(false)
        }
    }

    const requestOtp = async () => {
        setResetLoading(true); setResetError(null); setResetNotice(null)
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request_otp", email: resetEmail.trim() }),
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) { setResetError(payload.message || "OTP error"); return }
            setResetNotice(payload.message || "OTP sent")
            setResetStep("verify")
        } catch { setResetError(isGreek ? "Σφάλμα αποστολής OTP." : "OTP request failed.") } finally { setResetLoading(false) }
    }

    const submitReset = async () => {
        setResetError(null); setResetNotice(null)
        if (resetPassword.length < 8) { setResetError(isGreek ? "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες." : "Min 8 chars."); return }
        if (resetPassword !== resetConfirmPassword) { setResetError(isGreek ? "Οι κωδικοί δεν ταιριάζουν." : "Passwords do not match."); return }
        setResetLoading(true)
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_with_otp", email: resetEmail.trim(), otp: resetOtp.trim(), password: resetPassword }),
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) { setResetError(payload.message || "Reset failed."); return }
            setResetNotice(payload.message); setResetStep("success")
        } catch { setResetError(isGreek ? "Σφάλμα επαναφοράς." : "Reset failed.") } finally { setResetLoading(false) }
    }

    return (
        <div className={`${ibmPlexSans.className} flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4 py-10 dark:bg-black`}>
            <div className="w-full max-w-[460px] rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
                <div className="mb-6 text-center">
                    <Link href="/" className="mb-4 inline-block"><PolicyWalletLogo size="md" language={language} /></Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t.auth.welcomeBack}</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{isGreek ? "Συνδεθείτε για να συνεχίσετε." : "Sign in to continue."}</p>
                    <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                        <button type="button" onClick={() => setLanguage("el")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "el" ? "bg-white dark:bg-slate-700" : "text-slate-500"}`}>EL</button>
                        <button type="button" onClick={() => setLanguage("en")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "en" ? "bg-white dark:bg-slate-700" : "text-slate-500"}`}>EN</button>
                    </div>
                </div>

                {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle className="mr-1 inline h-4 w-4" />{error}</div>}
                {showResend && <button type="button" onClick={resendVerification} className="mb-3 w-full rounded-lg border border-slate-300 bg-slate-100 py-2 text-sm font-semibold">{resending ? (isGreek ? "Αποστολή..." : "Sending...") : (isGreek ? "Επαναποστολή επιβεβαίωσης" : "Resend verification")}</button>}
                {resendMessage && <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{resendMessage}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                        <button type="button" onClick={() => setTab("email")} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${tab === "email" ? "bg-white dark:bg-slate-700" : "text-slate-500"}`}>{isGreek ? "Email" : "Email"}</button>
                        <button type="button" onClick={() => setTab("phone")} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${tab === "phone" ? "bg-white dark:bg-slate-700" : "text-slate-500"}`}>{isGreek ? "Τηλέφωνο" : "Phone"}</button>
                    </div>
                    {tab === "email" ? (
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{isGreek ? "Email" : "Email"}
                            <div className="relative mt-1"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-3 text-sm" /></div>
                        </label>
                    ) : (
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{isGreek ? "Κινητό" : "Phone"}
                            <div className="relative mt-1"><Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-3 text-sm" /></div>
                        </label>
                    )}
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{isGreek ? "Κωδικός" : "Password"}
                        <div className="relative mt-1"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input ref={pwdRef} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-3 text-sm" /></div>
                    </label>
                    <button type="button" onClick={() => { setShowReset(true); setResetStep("request"); setResetEmail(email) }} className="text-xs font-semibold text-[#1E3A8A] hover:underline">{isGreek ? "Ξέχασα τον κωδικό μου" : "Forgot password"}</button>
                    <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1FDC86] px-4 py-3.5 font-bold text-slate-900 disabled:opacity-70">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {loading ? (isGreek ? "Σύνδεση..." : "Signing in...") : t.auth.signIn}
                    </button>
                </form>

                {biometricRegistered && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40">
                        <p className="mb-2 font-bold uppercase tracking-wide">{isGreek ? "Βιομετρικό / PIN (δευτερεύον)" : "Biometric / PIN (secondary)"}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={applyStoredIdentifier} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold"><Fingerprint className="mr-1 inline h-3.5 w-3.5" />{isGreek ? "Βιομετρικό" : "Biometric"}</button>
                            <button type="button" onClick={() => setShowPinPrompt((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold"><KeyRound className="mr-1 inline h-3.5 w-3.5" />PIN</button>
                        </div>
                        {showPinPrompt && <div className="mt-2 flex gap-2"><input type="password" maxLength={4} value={pinPrompt} onChange={(e) => setPinPrompt(e.target.value.replace(/\D/g, ""))} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={handlePinUnlock} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">OK</button></div>}
                        {quickError && <p className="mt-2 text-red-600">{quickError}</p>}
                    </div>
                )}

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Lock className="h-4 w-4 text-[#29685B]" />
                        <span>{isGreek ? "256-bit AES κρυπτογράφηση" : "256-bit AES encryption"}</span>
                        <span className="rounded-full border border-[#29685B]/30 bg-[#29685B]/10 px-2 py-0.5 text-xs font-bold text-[#29685B]">GDPR Compliant</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{isGreek ? "PolicyWallet δεν αποθηκεύει κωδικούς σε plaintext." : "PolicyWallet does not store passwords in plaintext."}</p>
                </div>

                <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                    {isGreek ? "Δεν έχετε λογαριασμό;" : "No account yet?"} <Link href="/auth/signup" className="font-bold text-slate-800 hover:text-slate-500 dark:text-slate-200">{isGreek ? "Εγγραφή" : "Create account"}</Link>
                </div>
            </div>

            {showReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                        <h2 className="text-lg font-bold">{isGreek ? "Επαναφορά κωδικού" : "Reset password"}</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{resetStep === "request" ? (isGreek ? "Εισάγετε email για OTP." : "Enter email for OTP.") : (isGreek ? "Εισάγετε OTP και νέο κωδικό." : "Enter OTP and new password.")}</p>
                        {resetError && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</p>}
                        {resetNotice && <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{resetNotice}</p>}
                        {resetStep === "request" && <div className="mt-3 space-y-3"><input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><button type="button" onClick={requestOtp} disabled={resetLoading} className="w-full rounded-xl bg-[#29685B] px-4 py-2.5 text-sm font-bold text-white">{resetLoading ? (isGreek ? "Αποστολή..." : "Sending...") : (isGreek ? "Αποστολή OTP" : "Send OTP")}</button></div>}
                        {resetStep !== "request" && resetStep !== "success" && <div className="mt-3 space-y-3"><input type="text" inputMode="numeric" maxLength={6} value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))} placeholder="OTP" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder={isGreek ? "Νέος κωδικός" : "New password"} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder={isGreek ? "Επιβεβαίωση κωδικού" : "Confirm password"} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><button type="button" onClick={submitReset} disabled={resetLoading} className="w-full rounded-xl bg-[#29685B] px-4 py-2.5 text-sm font-bold text-white">{resetLoading ? (isGreek ? "Επεξεργασία..." : "Processing...") : (isGreek ? "Επιβεβαίωση & Αλλαγή" : "Verify & reset")}</button></div>}
                        {resetStep === "success" && <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"><ShieldCheck className="mr-1 inline h-4 w-4" />{isGreek ? "Ο κωδικός ενημερώθηκε επιτυχώς." : "Password updated successfully."}</div>}
                        <button type="button" onClick={() => setShowReset(false)} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">{isGreek ? "Κλείσιμο" : "Close"}</button>
                    </div>
                </div>
            )}
        </div>
    )
}
