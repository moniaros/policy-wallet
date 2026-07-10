"use client"

import Link from "next/link"
import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Inter } from "next/font/google"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { resetPasswordForEmail } from "../actions"

const inter = Inter({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

const forgotPasswordSchema = z.object({
    email: z.string().email("Please provide a valid email address"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
    const { language, setLanguage } = useLanguage()
    const [submitting, setSubmitting] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
    const [serverError, setServerError] = useState<string | null>(null)

    const isGreek = language === "el"
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
        trust: t("Τραπεζικού επιπέδου ασφάλεια", "Bank-grade security"),
        genericError: t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."),
        backHome: t("← Αρχική", "← Home"),
    }

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
        const result = await resetPasswordForEmail(values.email, language)
        setSubmitting(false)

        if (!result.success) {
            setServerError(result.error || copy.genericError)
            return
        }

        setSubmittedEmail(values.email)
    }

    const inputBase =
        "w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px] text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-white/15 dark:bg-black dark:text-white dark:placeholder:text-white/40"

    return (
        <div className={`${inter.className} flex min-h-screen flex-col bg-[#F8FAFC] dark:bg-black`}>
            {/* Header bar */}
            <header className="flex items-center justify-between px-6 py-4">
                <Link
                    href="/"
                    className="text-[13px] font-medium text-[#475569] transition hover:text-primary dark:text-white/60 dark:hover:text-mint"
                >
                    {copy.backHome}
                </Link>
                <button
                    type="button"
                    onClick={() => setLanguage(isGreek ? "en" : "el")}
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[12px] font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                >
                    {isGreek ? "EN" : "EL"}
                </button>
            </header>

            {/* Card */}
            <div className="flex flex-1 items-center justify-center px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-[440px] rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#111111] sm:p-10"
                >
                    {/* Top meta row */}
                    <div className="mb-5 flex items-center justify-between text-xs font-semibold text-[#64748B] dark:text-white/60">
                        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 dark:bg-white/10">
                            {t("Ασφαλής ανάκτηση", "Secure recovery")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#475569] dark:text-white/65">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            {copy.trust}
                        </span>
                    </div>

                    {/* Logo + heading */}
                    <div className="mb-6 text-center">
                        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-[#F8FAFC] px-3 py-2 dark:bg-white/5">
                            <PolicyWalletLogo size="md" language={language} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">{copy.title}</h1>
                        <p className="mt-1.5 text-sm text-[#64748B] dark:text-white/65">{copy.subtitle}</p>
                    </div>

                    {submittedEmail ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-[#E2E8F0] bg-[#F0FDF4] p-4 dark:border-primary/30 dark:bg-primary/15">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{copy.sentTitle}</p>
                                        <p className="mt-1 text-sm text-[#475569] dark:text-white/65">{copy.sentBody}</p>
                                        <p className="mt-1 break-all text-xs font-semibold text-primary">{submittedEmail}</p>
                                        <p className="mt-2 text-xs text-[#64748B] dark:text-white/60">{copy.sentHint}</p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href="/auth/signin"
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
                                        className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
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
                                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-white/65"
                                >
                                    {copy.emailLabel}
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder={copy.emailPlaceholder}
                                        {...register("email")}
                                        className={`${inputBase} pl-9 ${errors.email ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-200" : ""}`}
                                    />
                                </div>
                                {errors.email ? (
                                    <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#1A2420]"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {submitting ? copy.sending : copy.send}
                            </button>

                            <Link
                                href="/auth/signin"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {copy.backToSignIn}
                            </Link>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
