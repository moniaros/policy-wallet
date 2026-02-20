"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { useLanguage } from "@/contexts/LanguageContext"
import { resetPasswordWithToken } from "../actions"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

const resetSchema = z.object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Use at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

type ResetValues = z.infer<typeof resetSchema>

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
    let score = 0
    if (password.length >= 8) score += 1
    if (/\d/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score as 0 | 1 | 2 | 3
}

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language } = useLanguage()
    const isGreek = language === "el"

    const token = searchParams.get("token")?.trim() || ""
    const email = searchParams.get("email")?.trim().toLowerCase() || ""

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const copy = {
        title: isGreek ? "Νέος κωδικός" : "Set a new password",
        subtitle: isGreek
            ? "Ολοκλήρωσε την επαναφορά με έναν νέο ασφαλή κωδικό."
            : "Complete your recovery by setting a secure new password.",
        invalidLink: isGreek
            ? "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος."
            : "This reset link is invalid.",
        password: isGreek ? "Νέος κωδικός" : "New password",
        confirm: isGreek ? "Επιβεβαίωση κωδικού" : "Confirm password",
        submit: isGreek ? "Αποθήκευση νέου κωδικού" : "Save new password",
        submitting: isGreek ? "Αποθήκευση..." : "Saving...",
        successTitle: isGreek ? "Ο κωδικός ενημερώθηκε" : "Password updated",
        successBody: isGreek
            ? "Η επαναφορά ολοκληρώθηκε. Μπορείς να συνδεθείς με τον νέο κωδικό."
            : "Your password was reset. You can now sign in with the new password.",
        backToSignIn: isGreek ? "Μετάβαση στη σύνδεση" : "Go to sign in",
    }

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<ResetValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: { password: "", confirmPassword: "" },
        mode: "onChange",
    })

    const passwordValue = useWatch({ control, name: "password" }) || ""
    const strength = passwordStrength(passwordValue)

    const canSubmit = useMemo(() => Boolean(token && email), [email, token])

    const onSubmit = async (values: ResetValues) => {
        if (!canSubmit) return
        setSubmitting(true)
        setServerError(null)

        const result = await resetPasswordWithToken({
            email,
            token,
            password: values.password,
        })

        setSubmitting(false)
        if (!result.success) {
            setServerError(result.error || (isGreek ? "Η ενημέρωση απέτυχε." : "Could not update password."))
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push("/auth/signin")
        }, 1200)
    }

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#1E3A8A] via-[#dbeafe] to-white px-4 py-10`}>
            <motion.div className="absolute -top-16 right-[-12%] h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <motion.div className="absolute -bottom-24 left-[-10%] h-64 w-64 rounded-full bg-blue-200/45 blur-3xl" animate={{ scale: [1.05, 1, 1.05] }} transition={{ duration: 6, repeat: Infinity }} />

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-blue-900/10 sm:p-7">
                <div className="mb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{isGreek ? "Επαναφορά ασφαλείας" : "Secure reset"}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {isGreek ? "Κρυπτογραφημένη ροή" : "Encrypted flow"}
                    </span>
                </div>

                <div className="mb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
                        <PolicyWalletLogo size="md" language={language} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
                    <p className="mt-1.5 text-sm text-slate-600">{copy.subtitle}</p>
                </div>

                {!canSubmit ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{copy.invalidLink}</div>
                        <Link href="/auth/forgot-password" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <ArrowLeft className="h-4 w-4" />
                            {isGreek ? "Ζήτα νέο σύνδεσμο" : "Request a new link"}
                        </Link>
                    </div>
                ) : success ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                                <div>
                                    <p className="text-sm font-semibold text-emerald-900">{copy.successTitle}</p>
                                    <p className="mt-1 text-sm text-emerald-800">{copy.successBody}</p>
                                </div>
                            </div>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-700" />
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
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.password}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    {...register("password")}
                                    className={`w-full rounded-xl border bg-white py-3.5 pl-9 pr-11 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${errors.password ? "border-rose-300" : "border-slate-300"}`}
                                />
                                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
                                {[0, 1, 2].map((index) => (
                                    <span key={index} className={`h-1.5 rounded-full ${strength > index ? (strength === 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-200"}`} />
                                ))}
                            </div>
                            {errors.password ? <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p> : null}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.confirm}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    {...register("confirmPassword")}
                                    className={`w-full rounded-xl border bg-white py-3.5 pl-9 pr-11 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${errors.confirmPassword ? "border-rose-300" : "border-slate-300"}`}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword ? <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p> : null}
                        </div>

                        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#6D28D9] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? copy.submitting : copy.submit}
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className={`${ibmPlexSans.className} flex min-h-screen items-center justify-center`}><Loader2 className="h-7 w-7 animate-spin text-blue-700" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
