"use client"

import Link from "next/link"
import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { IBM_Plex_Sans } from "next/font/google"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { resetPasswordForEmail } from "../actions"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

const forgotPasswordSchema = z.object({
    email: z.string().email("Please provide a valid email address"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
    const { language } = useLanguage()
    const [submitting, setSubmitting] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
    const [serverError, setServerError] = useState<string | null>(null)

    const isGreek = language === "el"
    const copy = {
        title: isGreek ? "Επαναφορά κωδικού" : "Reset your password",
        subtitle: isGreek
            ? "Στείλε το email σου και θα σου στείλουμε ασφαλή σύνδεσμο επαναφοράς."
            : "Enter your email and we will send a secure reset link.",
        emailLabel: isGreek ? "Email λογαριασμού" : "Account email",
        emailPlaceholder: "name@example.com",
        send: isGreek ? "Αποστολή συνδέσμου" : "Send reset link",
        sending: isGreek ? "Αποστολή..." : "Sending...",
        sentTitle: isGreek ? "Έλεγξε το inbox σου" : "Check your inbox",
        sentBody: isGreek
            ? "Αν υπάρχει λογαριασμός για αυτό το email, στάλθηκε σύνδεσμος επαναφοράς."
            : "If an account exists for this email, we have sent a reset link.",
        sentHint: isGreek ? "Ο σύνδεσμος ισχύει για 30 λεπτά." : "The reset link is valid for 30 minutes.",
        backToSignIn: isGreek ? "Επιστροφή στη σύνδεση" : "Back to sign in",
        trust: isGreek ? "Τραπεζικού επιπέδου ασφάλεια" : "Bank-grade security",
        genericError: isGreek ? "Κάτι πήγε στραβά. Δοκίμασε ξανά." : "Something went wrong. Please try again.",
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

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#1E3A8A] via-[#dbeafe] to-white px-4 py-10`}>
            <motion.div className="absolute -top-16 right-[-12%] h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <motion.div className="absolute -bottom-24 left-[-10%] h-64 w-64 rounded-full bg-blue-200/45 blur-3xl" animate={{ scale: [1.05, 1, 1.05] }} transition={{ duration: 6, repeat: Infinity }} />

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-blue-900/10 sm:p-7">
                <div className="mb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{isGreek ? "Ασφαλής ανάκτηση" : "Secure recovery"}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {copy.trust}
                    </span>
                </div>

                <div className="mb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
                        <PolicyWalletLogo size="md" language={language} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
                    <p className="mt-1.5 text-sm text-slate-600">{copy.subtitle}</p>
                </div>

                {submittedEmail ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                                <div>
                                    <p className="text-sm font-semibold text-emerald-900">{copy.sentTitle}</p>
                                    <p className="mt-1 text-sm text-emerald-800">{copy.sentBody}</p>
                                    <p className="mt-1 break-all text-xs font-semibold text-emerald-900">{submittedEmail}</p>
                                    <p className="mt-2 text-xs text-emerald-800">{copy.sentHint}</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/auth/signin" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <ArrowLeft className="h-4 w-4" />
                            {copy.backToSignIn}
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <AnimatePresence>
                            {serverError ? (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                                    <AlertCircle className="mt-0.5 h-4 w-4" />
                                    <span>{serverError}</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.emailLabel}</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    autoComplete="email"
                                    placeholder={copy.emailPlaceholder}
                                    {...register("email")}
                                    className={`w-full rounded-xl border bg-white py-3.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${errors.email ? "border-rose-300" : "border-slate-300"}`}
                                />
                            </div>
                            {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p> : null}
                        </div>

                        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#6D28D9] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? copy.sending : copy.send}
                        </button>

                        <Link href="/auth/signin" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <ArrowLeft className="h-4 w-4" />
                            {copy.backToSignIn}
                        </Link>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
