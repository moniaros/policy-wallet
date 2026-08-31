"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { AUTH_INPUT_CLASS } from "@/components/auth/FormField"
import { authHref } from "@/lib/seo/locale-links"
import { resetPasswordForEmail } from "../actions"

// Lang-aware: the Zod message the form renders (errors.email.message) was
// hardcoded English, so a Greek user with an invalid email saw "Please provide a
// valid email address" in English. lint:i18n-changed doesn't inspect Zod args.
const INVALID_EMAIL_MSG = {
    el: "Δώστε ένα έγκυρο email",
    en: "Please provide a valid email address",
} as const

function buildForgotSchema(invalidEmail: string) {
    return z.object({
        email: z.string().email(invalidEmail),
    })
}

type ForgotPasswordValues = { email: string }

export default function ForgotPasswordPage() {
    const { language } = useLanguage()
    const [submitting, setSubmitting] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
    const [serverError, setServerError] = useState<string | null>(null)

    const isGreek = language === "el"

    const otherLocale = isGreek ? "en" : "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    const copy = {
        title: t("Επαναφορά κωδικού", "Reset your password"),
        subtitle: t(
            "Εισάγετε το email σας και θα σας στείλουμε ασφαλή σύνδεσμο επαναφοράς.",
            "Enter your email and we will send a secure reset link."
        ),
        emailLabel: t("Email λογαριασμού", "Account email"),
        emailPlaceholder: "name@example.com",
        send: t("Αποστολή συνδέσμου", "Send reset link"),
        sending: t("Αποστολή...", "Sending..."),
        sentTitle: t("Ελέγξτε το inbox σας", "Check your inbox"),
        sentBody: t(
            "Αν υπάρχει λογαριασμός για αυτό το email, στάλθηκε σύνδεσμος επαναφοράς.",
            "If an account exists for this email, we have sent a reset link."
        ),
        sentHint: t("Ο σύνδεσμος ισχύει για 30 λεπτά.", "The reset link is valid for 30 minutes."),
        backToSignIn: t("Επιστροφή στη σύνδεση", "Back to sign in"),
        // "Bank-grade security" is a tier claim with nothing behind it — no
        // attestation, no audit, no standard named. The rest of the site states
        // checkable facts (AES-256, TLS, EU servers); this now does too.
        trust: t("Κρυπτογράφηση AES-256", "AES-256 encryption"),
        genericError: t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."),
        // No arrow in the string: the JSX below supplies it, exactly as
        // signin and signup do. With it baked in here too the link rendered
        // "← ← Αρχική", and that doubled arrow was its accessible name.
        backHome: t("Αρχική", "Home"),
    }

    const lang: "el" | "en" = isGreek ? "el" : "en"
    const forgotPasswordSchema = useMemo(
        () => buildForgotSchema(INVALID_EMAIL_MSG[lang]),
        [lang],
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
        mode: "onChange",
    })

    const onSubmit = async (values: ForgotPasswordValues) => {
        setServerError(null)
        setSubmitting(true)
        // The await REJECTS when the server-action transport fails (offline,
        // function error) — without the try/finally that rejection skipped
        // setSubmitting(false) and locked the page at "Αποστολή..." forever,
        // on exactly the page a locked-out user is standing on.
        try {
            const result = await resetPasswordForEmail(values.email, language)
            if (!result.success) {
                setServerError(result.error || copy.genericError)
                return
            }
            setSubmittedEmail(values.email)
        } catch {
            setServerError(copy.genericError)
        } finally {
            setSubmitting(false)
        }
    }

    const inputBase = AUTH_INPUT_CLASS

    return (
        <AuthShell>
            {/* Top meta row — the recovery reassurance, kept from the card. */}
            <div className="mb-g-5 flex items-center justify-between text-xs font-semibold text-fg-secondary">
                <span className="rounded-g-pill bg-surface-sunken px-g-3 py-g-1">
                    {t("Ασφαλής ανάκτηση", "Secure recovery")}
                </span>
                <span className="inline-flex items-center gap-1">
                    <ShieldCheck aria-hidden className="size-3.5 text-fg-brand" />
                    {copy.trust}
                </span>
            </div>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.title}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.subtitle}</p>

            <div className="mt-g-6">
                    {submittedEmail ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-[#E2E8F0] bg-[#F0FDF4] p-4 dark:border-primary/30 dark:bg-primary/15">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{copy.sentTitle}</p>
                                        <p className="mt-1 text-sm text-[#475569] dark:text-white/65">{copy.sentBody}</p>
                                        <p className="mt-1 break-all text-xs font-semibold text-primary">{submittedEmail}</p>
                                        <p className="mt-2 text-xs text-[#5B6A7A] dark:text-white/60">{copy.sentHint}</p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={authHref("/auth/signin", lang)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {copy.backToSignIn}
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <AnimatePresence>
                                {serverError ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                                        role="alert"
                                    >
                                        <AlertCircle className="mt-0.5 h-4 w-4" />
                                        <span>{serverError}</span>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            <div>
                                <label
                                    htmlFor="forgot-email"
                                    className="mb-g-2 block text-sm font-semibold text-fg-primary"
                                >
                                    {copy.emailLabel}
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-4 top-4 size-4 text-fg-secondary" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder={copy.emailPlaceholder}
                                        aria-invalid={errors.email ? true : undefined}
                                        aria-describedby={errors.email ? "forgot-email-error" : undefined}
                                        {...register("email")}
                                        className={`${inputBase} pl-11 ${errors.email ? "border-rose-300 dark:border-rose-800/40 focus-visible:border-rose-400 focus-visible:ring-rose-200" : ""}`}
                                    />
                                </div>
                                {errors.email ? (
                                    <p id="forgot-email-error" role="alert" className="mt-1 text-xs text-rose-600">
                                        {errors.email.message}
                                    </p>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="pw-primary-button pw-btn-lg w-full"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {submitting ? copy.sending : copy.send}
                            </button>

                            <Link
                                href={authHref("/auth/signin", lang)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {copy.backToSignIn}
                            </Link>
                        </form>
                    )}
            </div>
        </AuthShell>
    )
}
