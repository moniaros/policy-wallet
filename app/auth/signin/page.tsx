"use client"

import { useId, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Phone, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { TrustPanel } from "@/components/auth/TrustPanel"
import { SocialAuthRow } from "@/components/auth/SocialAuthRow"
import { AuthDivider } from "@/components/auth/AuthDivider"
import { AUTH_INPUT_CLASS } from "@/components/auth/FormField"
import { liveProvidersFor } from "@/lib/auth/social-providers"
import { resolveAuthEmailIdentifier } from "@/lib/auth/phone-auth"
import { getPostLoginRedirectByRole } from "@/lib/auth/role-routing"
import { useDialog } from "@/hooks/useDialog"
import { authHref, localizeHref } from "@/lib/seo/locale-links"

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
    const copy = t.auth.signInPage
    const pwdRef = useRef<HTMLInputElement | null>(null)
    const identifierRef = useRef<HTMLInputElement | null>(null)
    // Same reason as signup: internal links must carry the pinned language.
    const locale: "el" | "en" = language === "el" ? "el" : "en"

    const [tab, setTab] = useState<Tab>("email")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ identifier: boolean; password: boolean }>({
        identifier: false,
        password: false,
    })
    const [showResend, setShowResend] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendMessage, setResendMessage] = useState<string | null>(null)

    const [showReset, setShowReset] = useState(false)
    // The password-reset overlay was a bare div: no trap, no Escape.
    const resetDialogRef = useDialog<HTMLDivElement>(() => setShowReset(false), showReset)
    const resetTitleId = useId()
    const [resetStep, setResetStep] = useState<ResetStep>("request")
    const [resetEmail, setResetEmail] = useState("")
    const [resetOtp, setResetOtp] = useState("")
    const [resetPassword, setResetPassword] = useState("")
    const [resetConfirmPassword, setResetConfirmPassword] = useState("")
    const [resetError, setResetError] = useState<string | null>(null)
    const [resetNotice, setResetNotice] = useState<string | null>(null)
    const [resetLoading, setResetLoading] = useState(false)

    /**
     * Remember-this-device: a successful sign-in stores the identifier (see
     * `pw_quick_identifier` below), so prefill it and put the cursor in the
     * password field. This is the honest half of what used to be a fake
     * "Biometric / PIN" unlock — that block never authenticated anything, it just
     * called this same prefill.
     */
    useEffect(() => {
        if (typeof window === "undefined") return
        const saved = window.localStorage.getItem("pw_quick_identifier")
        if (!saved) return
        if (isPhoneLike(saved)) {
            setTab("phone")
            setPhone(saved)
        } else {
            setTab("email")
            setEmail(saved)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setShowResend(false)
        setResendMessage(null)
        setLoading(true)

        const identifier = tab === "email" ? email.trim() : phone.trim()
        if (!identifier || !password) {
            // The banner alone said "fill in all the fields" without saying
            // WHICH — submitting with only the password missing produced the
            // same sentence as submitting empty, and no control was marked
            // invalid. Both sibling forms already name the failing field, so
            // sign-in was the odd one out (WCAG 3.3.1).
            const invalid = { identifier: !identifier, password: !password }
            setFieldErrors(invalid)
            setError(copy.fillAllFields)
            setLoading(false)
            ;(invalid.identifier ? identifierRef.current : pwdRef.current)?.focus()
            return
        }
        setFieldErrors({ identifier: false, password: false })
        const supabase = createClient()

        try {
            const resolved = resolveAuthEmailIdentifier(identifier)
            const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: resolved.email, password })
            if (signInError) {
                // Never surface signInError.message raw: it is English on a
                // Greek-default product, and on a network failure
                // (AuthRetryableFetchError comes back through this same
                // return) it contains the Supabase project hostname —
                // infrastructure detail a visitor should never see. Map the
                // stable error code to localized copy and fall back generic.
                if (signInError.message.toLowerCase().includes("confirm")) {
                    setError(copy.accountNotVerified)
                    setShowResend(true)
                } else if (signInError.code === "invalid_credentials") {
                    setError(copy.invalidCredentials)
                } else if (signInError.code === "over_request_rate_limit") {
                    setError(copy.tooManyRequests)
                } else {
                    setError(copy.signInFailed)
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
            setError(copy.signInFailed)
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
            setResendMessage(result.success ? (copy.verificationEmailSent) : (result.error || "Error"))
        } finally {
            setResending(false)
        }
    }

    // The API's `message` is Greek in every branch — rendering it verbatim put
    // Greek rejections inside the English dialog (and the old English literals
    // "OTP error"/"OTP sent" would leak the other way). `code` is the contract;
    // copy stays bilingual on this side.
    const otpCopyForCode = (code: string | undefined, fallback: string) => {
        switch (code) {
            case "otp_sent": return copy.otpSentIfExists
            case "otp_invalid": return copy.otpInvalid
            case "otp_expired": return copy.otpExpired
            case "invalid_request": return copy.otpRequestFailed
            case "otp_send_failed": return copy.otpRequestFailed
            case "service_unavailable": return copy.resetUnavailable
            case "password_updated": return copy.passwordUpdated
            case "account_not_found": return copy.resetFailed
            case "update_failed": return copy.resetFailed
            default: return fallback
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
            if (!response.ok || !payload.success) { setResetError(otpCopyForCode(payload.code, copy.otpRequestFailed)); return }
            setResetNotice(otpCopyForCode(payload.code, copy.otpSentIfExists))
            setResetStep("verify")
        } catch { setResetError(copy.otpRequestFailed) } finally { setResetLoading(false) }
    }

    const submitReset = async () => {
        setResetError(null); setResetNotice(null)
        if (resetPassword.length < 8) { setResetError(copy.passwordMinLength); return }
        if (resetPassword !== resetConfirmPassword) { setResetError(copy.passwordsDoNotMatch); return }
        setResetLoading(true)
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_with_otp", email: resetEmail.trim(), otp: resetOtp.trim(), password: resetPassword }),
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) { setResetError(otpCopyForCode(payload.code, copy.resetFailed)); return }
            setResetNotice(otpCopyForCode(payload.code, copy.passwordUpdated)); setResetStep("success")
        } catch { setResetError(copy.resetFailed) } finally { setResetLoading(false) }
    }

    const inputBase = AUTH_INPUT_CLASS
    const hasSocial = liveProvidersFor("policyholder").length > 0

    return (
        <AuthShell panel={<TrustPanel variant="policyholder" />}>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{t.auth.welcomeBack}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.signInToContinue}</p>

            {/* The same buttons as signup — «Συνέχεια με …» serves both, which
                is the point (brief §2.3). No terms line here: signing in is
                not accepting anything new. */}
            {hasSocial && (
                <div className="mt-g-6">
                    <SocialAuthRow role="policyholder" locale={locale} next="/" />
                    <AuthDivider label={locale === "el" ? "ή" : "or"} />
                </div>
            )}

                <div className={hasSocial ? "" : "mt-g-6"}>

                    {/* Error */}
                    {error && (
                        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 px-3 py-2.5 text-body-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {showResend && (
                        <button
                            type="button"
                            onClick={resendVerification}
                            disabled={resending}
                            className="pw-secondary-button mb-4 w-full"
                        >
                            {resending ? (copy.sending) : (copy.resendVerification)}
                        </button>
                    )}
                    {resendMessage && <p role="status" className="mb-4 text-body-sm text-[#475569] dark:text-white/65">{resendMessage}</p>}

                    <form noValidate onSubmit={handleSubmit} className="space-y-4">
                        {/* Email / Phone toggle */}
                        <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 dark:border-white/10 dark:bg-white/5">
                            <button type="button" onClick={() => setTab("email")} className={`flex-1 rounded-lg py-2 text-body-sm font-semibold transition-all ${tab === "email" ? "bg-white text-[#0F172A] shadow-sm dark:bg-white/10 dark:text-white" : "text-[#5B6A7A] hover:text-[#0F172A] dark:text-white/60 dark:hover:text-white"}`}>
                                Email
                            </button>
                            <button type="button" onClick={() => setTab("phone")} className={`flex-1 rounded-lg py-2 text-body-sm font-semibold transition-all ${tab === "phone" ? "bg-white text-[#0F172A] shadow-sm dark:bg-white/10 dark:text-white" : "text-[#5B6A7A] hover:text-[#0F172A] dark:text-white/60 dark:hover:text-white"}`}>
                                {copy.phoneTab}
                            </button>
                        </div>

                        {/* Identifier field */}
                        {/* id + htmlFor, like the password field below. Without
                            them these two inputs had no programmatic label at
                            all: their accessible name fell back to the
                            placeholder ("name@example.com"), so a voice-control
                            user asking for "Email" matched nothing and the
                            visible label was not clickable (WCAG 1.3.1, 2.5.3). */}
                        {tab === "email" ? (
                            <div>
                                <label htmlFor="signin-email" className="mb-g-2 block text-sm font-semibold text-fg-primary">Email</label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-4 size-4 text-fg-secondary" />
                                    <input id="signin-email" ref={identifierRef} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={fieldErrors.identifier || undefined} aria-describedby={fieldErrors.identifier ? "signin-identifier-error" : undefined} className={`${inputBase} pl-11`} placeholder="name@example.com" />
                                </div>
                                {fieldErrors.identifier && <p id="signin-identifier-error" role="alert" className="mt-1.5 text-caption text-rose-600">{copy.fieldRequired}</p>}
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="signin-phone" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.phonePlaceholder}</label>
                                <div className="relative">
                                    <Phone className="pointer-events-none absolute left-4 top-4 size-4 text-fg-secondary" />
                                    <input id="signin-phone" ref={identifierRef} type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={fieldErrors.identifier || undefined} aria-describedby={fieldErrors.identifier ? "signin-identifier-error" : undefined} className={`${inputBase} pl-11`} placeholder="+30 69X XXX XXXX" />
                                </div>
                                {fieldErrors.identifier && <p id="signin-identifier-error" role="alert" className="mt-1.5 text-caption text-rose-600">{copy.fieldRequired}</p>}
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label htmlFor="signin-password" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.passwordLabel}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-4 size-4 text-fg-secondary" />
                                <input id="signin-password" ref={pwdRef} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={fieldErrors.password || undefined} aria-describedby={fieldErrors.password ? "signin-password-error" : undefined} placeholder="••••••••" className={`${inputBase} pl-11`} />
                            </div>
                            {fieldErrors.password && <p id="signin-password-error" role="alert" className="mt-1.5 text-caption text-rose-600">{copy.fieldRequired}</p>}
                        </div>

                        {/* Forgot password */}
                        <div className="flex justify-end">
                            <button type="button" onClick={() => { setShowReset(true); setResetStep("request"); setResetEmail(email) }} className="text-caption font-semibold text-primary hover:underline">
                                {copy.forgotPassword}
                            </button>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="pw-primary-button pw-btn-lg w-full">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            {loading ? (copy.signingIn) : t.auth.signIn}
                        </button>
                    </form>

                    {/* A "Biometric / PIN" quick-unlock block used to sit here. It was
                        NOT biometric authentication: the "Biometric" button only
                        pre-filled the saved email/phone into the form, and the whole
                        block was gated on localStorage keys (`biometric_registered`,
                        `pw_quick_pin_hash`) that NOTHING in the codebase ever writes —
                        so it was unreachable dead UI that, if ever reached, would have
                        imitated an auth factor the product does not implement. On a
                        sign-in page for an insurance product that is a trust claim we
                        cannot back, so it is removed rather than restyled. Reintroduce
                        only with real WebAuthn. */}

                    {/* Trust badge */}
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-white/10 dark:bg-white/5">
                        <Lock className="h-4 w-4 flex-shrink-0 text-primary" />
                        <div className="min-w-0">
                            <p className="text-caption font-semibold text-[#0F172A] dark:text-white">{copy.encryptionTitle}</p>
                            <p className="text-micro text-[#5B6A7A] dark:text-white/60">{copy.encryptionSubtitle}</p>
                        </div>
                        <span className="flex-shrink-0 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-kicker font-bold text-primary dark:border-primary/30 dark:bg-primary/15">GDPR</span>
                    </div>

                    {/* Sign up link */}
                    <p className="mt-5 text-center text-body-sm text-[#5B6A7A] dark:text-white/65">
                        {copy.noAccountYet}{" "}
                        <Link href={authHref("/auth/signup", locale)} className="font-semibold text-primary hover:underline">
                            {copy.createAccount}
                        </Link>
                    </p>
                </div>

            {/* Reset password modal */}
            {showReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
                    <div ref={resetDialogRef} role="dialog" aria-modal="true" aria-labelledby={resetTitleId} tabIndex={-1} className="w-full max-w-[400px] rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#111111]">
                        <h2 id={resetTitleId} className="mb-1 text-lead font-semibold text-[#0F172A] dark:text-white">
                            {copy.resetTitle}
                        </h2>
                        <p className="mb-4 text-body-sm text-[#5B6A7A] dark:text-white/65">
                            {resetStep === "request"
                                ? (copy.resetStepRequest)
                                : (copy.resetStepVerify)}
                        </p>

                        {resetError && <p role="alert" className="mb-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-body-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{resetError}</p>}
                        {resetNotice && <p role="status" className="mb-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-body-sm text-[#065F46] dark:border-primary/30 dark:bg-primary/15 dark:text-mint">{resetNotice}</p>}

                        {/* Every field in this dialog was placeholder-only: no
                            <label>, no aria-label, so each one's accessible
                            name was its own hint text, which disappears the
                            moment you type. Visible labels, like the form
                            behind the dialog. */}
                        {resetStep === "request" && (
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="reset-email" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.resetEmailLabel}</label>
                                    <input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="name@example.com" className={inputBase} />
                                </div>
                                <button type="button" onClick={requestOtp} disabled={resetLoading} className="pw-primary-button w-full">
                                    {resetLoading ? (copy.sending) : (copy.sendOtp)}
                                </button>
                            </div>
                        )}

                        {resetStep === "verify" && (
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="reset-otp" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.otpLabel}</label>
                                    <input id="reset-otp" type="text" inputMode="numeric" maxLength={6} value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))} placeholder="OTP" className={inputBase} />
                                </div>
                                <div>
                                    <label htmlFor="reset-new-password" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.newPassword}</label>
                                    <input id="reset-new-password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder={copy.newPassword} className={inputBase} />
                                </div>
                                <div>
                                    <label htmlFor="reset-confirm-password" className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.confirmPassword}</label>
                                    <input id="reset-confirm-password" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder={copy.confirmPassword} className={inputBase} />
                                </div>
                                <button type="button" onClick={submitReset} disabled={resetLoading} className="pw-primary-button w-full">
                                    {resetLoading ? (copy.processing) : (copy.verifyAndReset)}
                                </button>
                            </div>
                        )}

                        {resetStep === "success" && (
                            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-body-sm text-[#065F46] dark:border-primary/30 dark:bg-primary/15 dark:text-mint">
                                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                                {copy.passwordUpdated}
                            </div>
                        )}

                        <button type="button" onClick={() => setShowReset(false)} className="mt-3 w-full rounded-full border border-[#E2E8F0] bg-white px-4 py-2.5 text-body font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10">
                            {copy.closeLabel}
                        </button>
                    </div>
                </div>
            )}
        </AuthShell>
    )
}
