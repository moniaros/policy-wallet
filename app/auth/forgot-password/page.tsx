"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { AUTH_INPUT_CLASS, AUTH_NOTICE_GAP_CLASS, AUTH_SECONDARY_LINK_CLASS } from "@/components/auth/FormField"
import { FormError } from "@/components/auth/FormError"
import { Button } from "@/src/design-system"
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
        sentTitle: t("Ελέγξτε τα εισερχόμενα", "Check your inbox"),
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
            <div className="mb-g-5 flex items-center justify-between text-g-caption font-semibold text-fg-secondary">
                <span className="rounded-g-pill bg-surface-sunken px-g-3 py-g-1">
                    {t("Ασφαλής ανάκτηση", "Secure recovery")}
                </span>
                <span className="inline-flex items-center gap-g-1">
                    <ShieldCheck aria-hidden className="size-3.5 text-fg-brand" />
                    {copy.trust}
                </span>
            </div>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.title}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.subtitle}</p>

            <div className="mt-g-6">
                    {submittedEmail ? (
                        <div className="flex flex-col gap-g-4">
                            <div role="status" className="rounded-g-lg bg-state-covered-fill p-g-4">
                                <div className="flex items-start gap-g-2">
                                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-state-covered" />
                                    <div className="min-w-0">
                                        <p className="text-g-body-sm font-semibold text-fg-primary">{copy.sentTitle}</p>
                                        <p className="mt-g-1 text-g-body-sm text-fg-secondary">{copy.sentBody}</p>
                                        <p className="mt-g-1 break-all text-g-caption font-semibold text-fg-brand">{submittedEmail}</p>
                                        <p className="mt-g-2 text-g-caption text-fg-secondary">{copy.sentHint}</p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={authHref("/auth/signin", lang)}
                                className={AUTH_SECONDARY_LINK_CLASS}
                            >
                                <ArrowLeft aria-hidden className="size-4" />
                                {copy.backToSignIn}
                            </Link>
                        </div>
                    ) : (
                        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-g-4">
                            <AnimatePresence>
                                {serverError ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={AUTH_NOTICE_GAP_CLASS}
                                        role="alert"
                                    >
                                        <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
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
                                        className={`${inputBase} pl-11`}
                                    />
                                </div>
                                <FormError id="forgot-email-error">{errors.email?.message ?? null}</FormError>
                            </div>

                            <Button type="submit" size="lg" loading={submitting} className="w-full">
                                {submitting ? copy.sending : copy.send}
                            </Button>

                            <Link
                                href={authHref("/auth/signin", lang)}
                                className={AUTH_SECONDARY_LINK_CLASS}
                            >
                                <ArrowLeft aria-hidden className="size-4" />
                                {copy.backToSignIn}
                            </Link>
                        </form>
                    )}
            </div>
        </AuthShell>
    )
}
