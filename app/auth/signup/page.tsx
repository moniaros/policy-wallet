"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { registerUser } from "../actions"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { buildSyntheticEmailFromPhone, normalizeGreekMobile } from "@/lib/auth/phone-auth"
import { useLanguage } from "@/contexts/LanguageContext"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

const signupSchema = z.object({
    mobileNumber: z.string().min(1, "mobile_required").refine((value) => Boolean(normalizeGreekMobile(value)), "mobile_invalid"),
    email: z.string().trim().toLowerCase().refine((value) => !value || z.email().safeParse(value).success, "email_invalid"),
    password: z.string().min(8, "password_short"),
    termsAccepted: z.boolean().refine((value) => value, "terms_required"),
})

type SignupFormValues = z.infer<typeof signupSchema>

const zodErrors: Record<string, { el: string; en: string }> = {
    mobile_required: { el: "Ο αριθμός κινητού είναι υποχρεωτικός", en: "Mobile number is required" },
    mobile_invalid: { el: "Εισάγετε ένα έγκυρο ελληνικό κινητό", en: "Enter a valid Greek mobile" },
    email_invalid: { el: "Μη έγκυρο email", en: "Invalid email" },
    password_short: { el: "Χρησιμοποιήστε τουλάχιστον 8 χαρακτήρες", en: "Use at least 8 characters" },
    terms_required: { el: "Πρέπει να αποδεχτείτε τους Όρους και το Απόρρητο", en: "You must accept Terms & Privacy" },
}

function getZodError(message: string | undefined, language: "el" | "en"): string {
    if (!message) return ""
    const entry = zodErrors[message]
    return entry ? entry[language] : message
}

function formatPhoneInput(value: string): string {
    const digitsOnly = value.replace(/\D/g, "")
    let local = digitsOnly

    if (local.startsWith("30")) local = local.slice(2)
    if (local.startsWith("0")) local = local.slice(1)

    local = local.slice(0, 10)
    const p1 = local.slice(0, 3)
    const p2 = local.slice(3, 6)
    const p3 = local.slice(6, 10)

    let formatted = "+30"
    if (p1) formatted += ` ${p1}`
    if (p2) formatted += ` ${p2}`
    if (p3) formatted += ` ${p3}`
    return formatted
}

function passwordStrength(password: string): 0 | 1 | 2 | 3 {
    let score = 0
    if (password.length >= 8) score += 1
    if (/\d/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score as 0 | 1 | 2 | 3
}

function ConfettiBurst() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
                <motion.span
                    key={i}
                    className="absolute h-2 w-2 rounded-full"
                    style={{
                        left: `${15 + i * 6}%`,
                        top: "55%",
                        backgroundColor: i % 3 === 0 ? "#1FDC86" : i % 3 === 1 ? "#29685B" : "#06B6D4",
                    }}
                    initial={{ opacity: 0, y: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 0], y: -80 - (i % 4) * 12, x: (i % 2 === 0 ? 1 : -1) * (12 + i), scale: [0.6, 1, 0.6] }}
                    transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                />
            ))}
        </div>
    )
}

function SignUpForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language, setLanguage } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)

    const role = searchParams.get("role") === "agent" ? "agent" : "policyholder"
    const source = searchParams.get("source") || "signup_direct"
    const token = searchParams.get("token") || ""

    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [signupSuccess, setSignupSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            mobileNumber: "+30 ",
            email: "",
            password: "",
            termsAccepted: false,
        },
        mode: "onChange",
    })

    const mobileValue = useWatch({ control, name: "mobileNumber" }) || ""
    const emailValue = useWatch({ control, name: "email" }) || ""
    const passwordValue = useWatch({ control, name: "password" }) || ""

    const strength = passwordStrength(passwordValue)
    const normalizedPhone = normalizeGreekMobile(mobileValue)
    const emailOrSynthetic = useMemo(() => {
        if (emailValue) return emailValue.trim().toLowerCase()
        if (!normalizedPhone) return ""
        return buildSyntheticEmailFromPhone(normalizedPhone)
    }, [emailValue, normalizedPhone])

    const isMobileValid = Boolean(normalizedPhone)
    const isEmailValid = Boolean(emailValue && !errors.email)
    const isPasswordValid = !errors.password && passwordValue.length > 0

    useEffect(() => {
        trackLandingEvent("page_view_signup", {
            role,
            source,
            locale: language,
        })
    }, [language, role, source])

    const onSubmit = async (values: SignupFormValues) => {
        setServerError(null)
        setIsSubmitting(true)
        const sanitizedEmail = values.email.trim().toLowerCase()

        const formData = new FormData()
        formData.append("mobileNumber", values.mobileNumber)
        formData.append("email", sanitizedEmail)
        formData.append("password", values.password)
        formData.append("confirmPassword", values.password)
        formData.append("name", role === "agent" ? "Agent User" : "")
        formData.append("role", role)
        formData.append("language", language)
        formData.append("termsAccepted", String(values.termsAccepted))
        formData.append("marketingConsent", "false")
        if (token) formData.append("token", token)

        if (role === "agent") {
            formData.append("licenseNumber", "pending")
            formData.append("agencyName", "pending")
        }

        try {
            trackLandingEvent("signup_started", { role, source, locale: language, identifier_type: sanitizedEmail ? "email" : "phone" })
            trackLandingEvent("signup_start", { role, source, locale: language, identifier_type: sanitizedEmail ? "email" : "phone" })
            const result = await registerUser(formData)

            if (!result.success) {
                const err = typeof result.error === "string"
                    ? result.error
                    : Object.values((result.error || {}) as Record<string, string[]>).flat().join(", ") || t("Η εγγραφή απέτυχε", "Signup failed")
                setServerError(err)
                setIsSubmitting(false)
                return
            }

            trackLandingEvent("signup_completed", {
                role,
                source,
                locale: language,
                identifier_type: sanitizedEmail ? "email" : "phone",
                auth_identifier: emailOrSynthetic,
            })
            trackLandingEvent("signup_complete", {
                role,
                source,
                locale: language,
                identifier_type: sanitizedEmail ? "email" : "phone",
                auth_identifier: emailOrSynthetic,
            })

            setSignupSuccess(true)
            setTimeout(() => {
                router.push(result.redirect || "/onboarding")
            }, 900)
        } catch {
            setServerError(t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."))
            setIsSubmitting(false)
        }
    }

    const inputBase = "w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-[#29685B]/40"

    return (
        <div className={`${ibmPlexSans.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F9FAFB] px-4 py-10 dark:bg-[#000000]`}>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative z-10 w-full max-w-[440px] rounded-2xl border border-gray-200 bg-[#FFFFFF] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-[#111111] sm:p-10">
                {signupSuccess ? <ConfettiBurst /> : null}

                <div className="mb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
                        <PolicyWalletLogo size="md" language={language} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t("Το Ασφαλιστικό σας Πορτοφόλι", "Your Insurance Wallet")}
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                        {t("Όλα τα συμβόλαιά σας. Σε ένα ασφαλές μέρος.", "All your policies. One secure place.")}
                    </p>
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <AnimatePresence>
                        {serverError ? (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                                <AlertCircle className="mt-0.5 h-4 w-4" />
                                <span>{serverError}</span>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t("Αριθμός κινητού", "Mobile number")}
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="+30 69X XXX XXXX"
                                {...register("mobileNumber")}
                                onChange={(event) => setValue("mobileNumber", formatPhoneInput(event.target.value), { shouldValidate: true })}
                                className={`${inputBase} ${errors.mobileNumber ? "border-rose-300" : "border-slate-300"}`}
                            />
                            {isMobileValid ? <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" /> : null}
                        </div>
                        {errors.mobileNumber ? <p className="mt-1 text-xs text-rose-600">{getZodError(errors.mobileNumber.message, language)}</p> : null}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t("Email (προαιρετικό)", "Email (optional)")}
                        </label>
                        <div className="relative">
                            <input type="email" placeholder="name@example.com" {...register("email")} className={`${inputBase} ${errors.email ? "border-rose-300" : "border-slate-300"}`} />
                            {isEmailValid ? <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" /> : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {t("Προαιρετικό, χρησιμοποιείται για ανάκτηση λογαριασμού και ειδοποιήσεις.", "Optional, used for account recovery and alerts.")}
                        </p>
                        {errors.email ? <p className="mt-1 text-xs text-rose-600">{getZodError(errors.email.message, language)}</p> : null}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t("Κωδικός πρόσβασης", "Password")}
                        </label>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} placeholder={t("Δημιουργία κωδικού", "Create password")} {...register("password")} className={`${inputBase} pr-11 ${errors.password ? "border-rose-300" : "border-slate-300"}`} />
                            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label={showPassword ? t("Απόκρυψη κωδικού", "Hide password") : t("Εμφάνιση κωδικού", "Show password")}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
                            {[0, 1, 2].map((index) => (
                                <span
                                    key={index}
                                    className={`h-1.5 rounded-full ${strength > index ? (strength === 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : "bg-slate-500") : "bg-slate-200"}`}
                                />
                            ))}
                        </div>
                        {isPasswordValid ? <p className="mt-1 text-xs text-slate-600">{t("Αρκετά ισχυρός", "Strong enough")}</p> : null}
                        {errors.password ? <p className="mt-1 text-xs text-rose-600">{getZodError(errors.password.message, language)}</p> : null}
                    </motion.div>

                    <motion.label initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        <input type="checkbox" {...register("termsAccepted")} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#29685B] focus:ring-[#29685B]" />
                        <span>
                            {t("Αποδέχομαι τους ", "I agree to ")}<Link href="/terms" className="font-semibold text-[#29685B] hover:underline">{t("Όρους", "Terms")}</Link>{t(" και το ", " and ")}<Link href="/privacy" className="font-semibold text-[#29685B] hover:underline">{t("Απόρρητο", "Privacy")}</Link>
                        </span>
                    </motion.label>
                    {errors.termsAccepted ? <p className="-mt-2 text-xs text-rose-600">{getZodError(errors.termsAccepted.message, language)}</p> : null}

                    <AnimatePresence>
                        {isMobileValid && strength >= 2 ? (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 rounded-full border border-[#89D9B2] bg-[#89D9B2]/10 px-3 py-1 text-xs font-medium text-[#1C4E44]">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {t("Χρήση FaceID μετά την πρώτη εγγραφή", "Use FaceID after first signup")}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} type="submit" disabled={isSubmitting || signupSuccess} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-[#1FDC86] px-4 py-4 text-[16px] font-bold text-slate-900 transition-all hover:-translate-y-[2px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86] flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#1FDC86] dark:text-slate-900">
                        {isSubmitting || signupSuccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {signupSuccess ? t("Πορτοφόλι δημιουργήθηκε", "Wallet Created") : t("Δημιουργία Πορτοφολιού", "Create My Wallet")}
                    </motion.button>

                    <p className="text-center text-xs text-slate-500">
                        {t("Χρειάζονται 90 δευτερόλεπτα. Ακυρώστε οποτεδήποτε.", "Takes 90 seconds. Cancel anytime.")}
                    </p>
                </form>

                <div className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
                    {t("Έχετε ήδη λογαριασμό;", "Already have account?")} <Link href="/auth/signin" className="font-semibold text-[#1FDC86] hover:underline">{t("Σύνδεση", "Login")}</Link>
                </div>

            </motion.div>
        </div>
    )
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div className={`${ibmPlexSans.className} flex min-h-screen items-center justify-center`}><Loader2 className="h-7 w-7 animate-spin text-[#1FDC86]" /></div>}>
            <SignUpForm />
        </Suspense>
    )
}
