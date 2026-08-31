"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { authHref } from "@/lib/seo/locale-links"
import { resetPasswordWithToken } from "../actions"

// Lang-aware so the Zod messages the form renders (errors.*.message) are
// localised — they were hardcoded English, so a Greek user resetting their
// password saw "Use at least 8 characters" / "Passwords do not match" in
// English. lint:i18n-changed doesn't inspect Zod message args.
function buildResetSchema(msgs: { minChars: string; mismatch: string }) {
    return z.object({
        password: z.string().min(8, msgs.minChars),
        confirmPassword: z.string().min(8, msgs.minChars),
    }).refine((data) => data.password === data.confirmPassword, {
        message: msgs.mismatch,
        path: ["confirmPassword"],
    })
}

type ResetValues = { password: string; confirmPassword: string }

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
    // Internal auth links must carry the pinned language; a bare href
    // dropped an English visitor onto the Greek sign-in page.
    const authLocale: "el" | "en" = language === "el" ? "el" : "en"
    const isGreek = language === "el"
    const lang = isGreek ? "el" : "en"
    // Same shape as SignupForm's helper. The two password toggles below
    // announced "Show password" / "Hide password" in English to Greek
    // screen-reader users, while the identical control one page away
    // (SignupForm.tsx) was localised — nothing caught it because
    // no-hardcoded-aria-label's universe was components/ and never app/.
    const t = (el: string, en: string) => (isGreek ? el : en)

    const token = searchParams.get("token")?.trim() || ""
    const email = searchParams.get("email")?.trim().toLowerCase() || ""

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const copy = {
        title: COPY.setNewPassword[lang],
        subtitle: isGreek
            ? "Ολοκλήρωσε την επαναφορά με έναν νέο ασφαλή κωδικό."
            : "Complete your recovery by setting a secure new password.",
        invalidLink: isGreek
            ? "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος."
            : "This reset link is invalid.",
        password: COPY.newPasswordLabel[lang],
        confirm: COPY.confirmPasswordLabel[lang],
        submit: COPY.saveNewPassword[lang],
        submitting: COPY.saving[lang],
        successTitle: COPY.passwordUpdated[lang],
        successBody: isGreek
            ? "Η επαναφορά ολοκληρώθηκε. Μπορείς να συνδεθείς με τον νέο κωδικό."
            : "Your password was reset. You can now sign in with the new password.",
        backToSignIn: COPY.goToSignIn[lang],
    }

    const resetSchema = useMemo(
        () => buildResetSchema({
            minChars: COPY.passwordMinChars[lang],
            mismatch: COPY.passwordsDoNotMatch[lang],
        }),
        [lang],
    )

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
            language,
        })

        setSubmitting(false)
        if (!result.success) {
            setServerError(result.error || (COPY.updateFailed[lang]))
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push("/auth/signin")
        }, 1200)
    }

    return (
        <AuthShell>
            <div className="mb-g-5 flex items-center justify-between text-xs font-semibold text-fg-secondary">
                <span className="rounded-g-pill bg-surface-sunken px-g-3 py-g-1">{COPY.secureReset[lang]}</span>
                <span className="inline-flex items-center gap-1">
                    <ShieldCheck aria-hidden className="size-3.5 text-fg-brand" />
                    {COPY.encryptedFlow[lang]}
                </span>
            </div>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.title}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.subtitle}</p>

            <div className="mt-g-6">
                {!canSubmit ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{copy.invalidLink}</div>
                        <Link href="/auth/forgot-password" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10">
                            <ArrowLeft className="h-4 w-4" />
                            {COPY.requestNewLink[lang]}
                        </Link>
                    </div>
                ) : success ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F0FDF4] p-4 dark:border-primary/30 dark:bg-primary/15">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.successTitle}</p>
                                    <p className="mt-1 text-sm text-slate-800 dark:text-white/65">{copy.successBody}</p>
                                </div>
                            </div>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <AnimatePresence>
                            {serverError ? (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                                    <AlertCircle className="mt-0.5 h-4 w-4" />
                                    <span>{serverError}</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <div>
                            <label className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.password}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    {...register("password")}
                                    className={`w-full rounded-xl border bg-white py-3.5 pl-9 pr-11 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-black dark:text-white ${errors.password ? "border-rose-300 dark:border-rose-800/40" : "border-slate-300 dark:border-white/15"}`}
                                />
                                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10" aria-label={showPassword ? t("Απόκρυψη κωδικού", "Hide password") : t("Εμφάνιση κωδικού", "Show password")}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
                                {[0, 1, 2].map((index) => (
                                    <span key={index} className={`h-1.5 rounded-full ${strength > index ? (strength === 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : "bg-primary") : "bg-slate-200 dark:bg-white/10"}`} />
                                ))}
                            </div>
                            {errors.password ? <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p> : null}
                        </div>

                        <div>
                            <label className="mb-g-2 block text-sm font-semibold text-fg-primary">{copy.confirm}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    {...register("confirmPassword")}
                                    className={`w-full rounded-xl border bg-white py-3.5 pl-9 pr-11 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-black dark:text-white ${errors.confirmPassword ? "border-rose-300 dark:border-rose-800/40" : "border-slate-300 dark:border-white/15"}`}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10" aria-label={showConfirmPassword ? t("Απόκρυψη κωδικού", "Hide password") : t("Εμφάνιση κωδικού", "Show password")}>
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword ? <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p> : null}
                        </div>

                        <button type="submit" disabled={submitting} className="pw-primary-button w-full">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {submitting ? copy.submitting : copy.submit}
                        </button>

                        <Link href={authHref("/auth/signin", authLocale)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10">
                            <ArrowLeft className="h-4 w-4" />
                            {copy.backToSignIn}
                        </Link>
                    </form>
                )}
            </div>
        </AuthShell>
    )
}

/** Page copy in the `{el, en}[locale]` shape used across the auth pages. */
const COPY = {
    setNewPassword: { el: "Νέος κωδικός", en: "Set a new password" },
    newPasswordLabel: { el: "Νέος κωδικός", en: "New password" },
    confirmPasswordLabel: { el: "Επιβεβαίωση κωδικού", en: "Confirm password" },
    saveNewPassword: { el: "Αποθήκευση νέου κωδικού", en: "Save new password" },
    saving: { el: "Αποθήκευση...", en: "Saving..." },
    passwordUpdated: { el: "Ο κωδικός ενημερώθηκε", en: "Password updated" },
    goToSignIn: { el: "Μετάβαση στη σύνδεση", en: "Go to sign in" },
    updateFailed: { el: "Η ενημέρωση απέτυχε.", en: "Could not update password." },
    secureReset: { el: "Επαναφορά ασφαλείας", en: "Secure reset" },
    encryptedFlow: { el: "Κρυπτογραφημένη ροή", en: "Encrypted flow" },
    requestNewLink: { el: "Ζήτα νέο σύνδεσμο", en: "Request a new link" },
    passwordMinChars: { el: "Χρησιμοποίησε τουλάχιστον 8 χαρακτήρες", en: "Use at least 8 characters" },
    passwordsDoNotMatch: { el: "Οι κωδικοί δεν ταιριάζουν", en: "Passwords do not match" },
} as const

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-surface-base"><Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
