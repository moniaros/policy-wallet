"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { inter } from "@/lib/fonts"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import { registerUser } from "../actions"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { buildSyntheticEmailFromPhone, normalizeGreekMobile } from "@/lib/auth/phone-auth"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { getTranslations } from "@/lib/i18n"
import { useLanguage } from "@/contexts/LanguageContext"

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
    terms_required: { el: "Πρέπει να αποδεχτείτε τους όρους και το απόρρητο", en: "You must accept Terms & Privacy" },
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
                        backgroundColor: i % 3 === 0 ? "#29685B" : i % 3 === 1 ? "#A7F3D0" : "#0F172A",
                    }}
                    initial={{ opacity: 0, y: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 0], y: -80 - (i % 4) * 12, x: (i % 2 === 0 ? 1 : -1) * (12 + i), scale: [0.6, 1, 0.6] }}
                    transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                />
            ))}
        </div>
    )
}

function SignUpForm({ fixedRole }: { fixedRole: "policyholder" | "agent" }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language, setLanguage } = useLanguage()
    const uiText = getTranslations(language)
    const t = (el: string, en: string) => (language === "el" ? el : en)

    const source = searchParams.get("source") || "signup_direct"
    const token = searchParams.get("token") || ""
    const selectedPlan = searchParams.get("plan") || ""
    const selectedBilling = searchParams.get("billing") || ""

    const role = fixedRole
    const [agentName, setAgentName] = useState("")
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
        defaultValues: { mobileNumber: "+30 ", email: "", password: "", termsAccepted: false },
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
        trackLandingEvent("page_view_signup", { role, source, locale: language })
    }, [language, role, source])

    const onSubmit = async (values: SignupFormValues) => {
        setServerError(null)
        const sanitizedEmail = values.email.trim().toLowerCase()

        // Agents must provide name + valid email (mobile is required for everyone).
        if (role === "agent" && (!agentName.trim() || !sanitizedEmail)) {
            setServerError(t(
                "Για λογαριασμό ασφαλιστή απαιτούνται όνομα και έγκυρο email.",
                "An agent account requires your name and a valid email."
            ))
            return
        }
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append("mobileNumber", values.mobileNumber)
        formData.append("email", sanitizedEmail)
        formData.append("password", values.password)
        formData.append("confirmPassword", values.password)
        formData.append("name", role === "agent" ? agentName.trim() : "")
        formData.append("role", role)
        formData.append("language", language)
        formData.append("termsAccepted", String(values.termsAccepted))
        formData.append("marketingConsent", "false")
        if (token) formData.append("token", token)
        if (selectedPlan) formData.append("selectedPlan", selectedPlan)
        if (selectedBilling) formData.append("selectedBilling", selectedBilling)

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

            trackLandingEvent("signup_completed", { role, source, locale: language, identifier_type: sanitizedEmail ? "email" : "phone", auth_identifier: emailOrSynthetic })
            trackLandingEvent("signup_complete", { role, source, locale: language, identifier_type: sanitizedEmail ? "email" : "phone", auth_identifier: emailOrSynthetic })

            setSignupSuccess(true)
            setTimeout(() => { router.push(result.redirect || "/onboarding") }, 900)
        } catch {
            setServerError(t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again."))
            setIsSubmitting(false)
        }
    }

    const inputBase = "pw-input text-[#0F172A]"

    const strengthColors = ["bg-rose-400", "bg-amber-400", "bg-primary"]
    const strengthLabel = strength === 0 ? "" : strength === 1 ? t("Αδύναμος", "Weak") : strength === 2 ? t("Μέτριος", "Fair") : t("Ισχυρός", "Strong")

    return (
        <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 dark:bg-black`}>
            <div className="w-full max-w-[420px]">

                {/* Back + language */}
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-1.5 text-body-sm font-medium text-[#5B6A7A] transition-colors hover:text-[#0F172A] dark:text-white/60 dark:hover:text-white">
                        ← {t("Αρχική", "Home")}
                    </Link>
                    <div className="flex items-center gap-2">
                        <LocaleToggle ariaLabel={uiText.userMenu.language} />
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#111111]"
                >
                    {signupSuccess && <ConfettiBurst />}

                    {/* Logo + heading */}
                    <div className="mb-6 text-center">
                        <Link href="/" className="mb-4 inline-block">
                            <PolicyWalletLogo size="md" language={language} />
                        </Link>
                        <h1 className="text-title font-semibold tracking-tight text-[#0F172A] dark:text-white">
                            {t("Δημιουργία λογαριασμού", "Create your account")}
                        </h1>
                        <p className="mt-1 text-body text-[#5B6A7A] dark:text-white/65">
                            {t("Όλα τα ασφαλιστήριά σας σε ένα ασφαλές μέρος.", "All your policies in one secure place.")}
                        </p>
                    </div>

                    {/* Role cross-link: two dedicated forms, one per audience */}
                    <p className="mb-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-slate-950 px-4 py-3 text-center text-caption text-[#5B6A7A] dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                        {role === "policyholder" ? (
                            <>
                                {t("Είστε ασφαλιστικός σύμβουλος;", "Are you an insurance agent?")}{" "}
                                <Link href={`/auth/signup/agent?${searchParams.toString()}`} className="font-semibold text-primary hover:underline">
                                    {t("Εγγραφή ως ασφαλιστής", "Sign up as an agent")}
                                </Link>
                            </>
                        ) : (
                            <>
                                {t("Είστε ασφαλισμένος;", "Are you a policyholder?")}{" "}
                                <Link href={`/auth/signup/policyholder?${searchParams.toString()}`} className="font-semibold text-primary hover:underline">
                                    {t("Εγγραφή ως ασφαλισμένος", "Sign up as a policyholder")}
                                </Link>
                            </>
                        )}
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <AnimatePresence>
                            {serverError && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 p-3 text-body-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <span>{serverError}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {role === "agent" && (
                            <div>
                                <label htmlFor="signup-name" className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-[#5B6A7A] dark:text-white/65">
                                    {t("Ονοματεπώνυμο", "Full name")}
                                </label>
                                <input
                                    id="signup-name"
                                    type="text"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    placeholder={t("π.χ. Μαρία Παπαδοπούλου", "e.g. Maria Papadopoulou")}
                                    className={inputBase}
                                />
                            </div>
                        )}

                        {/* Mobile */}
                        <div>
                            <label htmlFor="signup-mobile" className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-[#5B6A7A] dark:text-white/65">
                                {t("Αριθμός κινητού", "Mobile number")}
                            </label>
                            <div className="relative">
                                <input
                                    id="signup-mobile"
                                    type="tel"
                                    inputMode="tel"
                                    placeholder="+30 69X XXX XXXX"
                                    {...register("mobileNumber")}
                                    onChange={(e) => setValue("mobileNumber", formatPhoneInput(e.target.value), { shouldValidate: true })}
                                    aria-invalid={errors.mobileNumber ? true : undefined}
                                    aria-describedby={errors.mobileNumber ? "signup-mobile-error" : undefined}
                                    className={`${inputBase} ${errors.mobileNumber ? "border-rose-300 dark:border-rose-800/40" : ""}`}
                                />
                                {isMobileValid && <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-primary" />}
                            </div>
                            {errors.mobileNumber && <p id="signup-mobile-error" role="alert" className="mt-1 text-caption text-rose-600">{getZodError(errors.mobileNumber.message, language)}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="signup-email" className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-[#5B6A7A] dark:text-white/65">
                                {role === "agent" ? t("Email", "Email") : t("Email (προαιρετικό)", "Email (optional)")}
                            </label>
                            <div className="relative">
                                <input id="signup-email" type="email" placeholder="name@example.com" {...register("email")} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "signup-email-error" : undefined} className={`${inputBase} ${errors.email ? "border-rose-300 dark:border-rose-800/40" : ""}`} />
                                {isEmailValid && <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-primary" />}
                            </div>
                            <p className="mt-1 text-micro text-[#5B6A7A] dark:text-white/60">
                                {t("Για ανάκτηση λογαριασμού και ειδοποιήσεις.", "For account recovery and alerts.")}
                            </p>
                            {errors.email && <p id="signup-email-error" role="alert" className="mt-1 text-caption text-rose-600">{getZodError(errors.email.message, language)}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="signup-password" className="mb-1.5 block text-caption font-semibold uppercase tracking-wide text-[#5B6A7A] dark:text-white/65">
                                {t("Κωδικός πρόσβασης", "Password")}
                            </label>
                            <div className="relative">
                                <input
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("Δημιουργία κωδικού", "Create password")}
                                    {...register("password")}
                                    aria-invalid={errors.password ? true : undefined}
                                    aria-describedby={errors.password ? "signup-password-error" : undefined}
                                    className={`${inputBase} pr-11 ${errors.password ? "border-rose-300 dark:border-rose-800/40" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-2.5 rounded-md p-1.5 text-[#5B6A7A] dark:text-slate-400 transition hover:bg-[#F1F5F9] dark:hover:bg-white/10"
                                    aria-label={showPassword ? t("Απόκρυψη κωδικού", "Hide password") : t("Εμφάνιση κωδικού", "Show password")}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {/* Strength bar */}
                            <div className="mt-2 flex items-center gap-2" aria-hidden>
                                <div className="flex flex-1 gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${strength > i ? strengthColors[strength - 1] : "bg-[#E2E8F0] dark:bg-white/10"}`} />
                                    ))}
                                </div>
                                {strengthLabel && <span className={`text-micro font-semibold ${strength === 1 ? "text-rose-500" : strength === 2 ? "text-amber-500" : "text-primary"}`}>{strengthLabel}</span>}
                            </div>
                            {errors.password && <p id="signup-password-error" role="alert" className="mt-1 text-caption text-rose-600">{getZodError(errors.password.message, language)}</p>}
                        </div>

                        {/* Terms */}
                        <label htmlFor="signup-terms" className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-slate-950 px-3 py-2.5 text-body-sm text-[#475569] dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                            <input id="signup-terms" type="checkbox" {...register("termsAccepted")} className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] accent-primary" />
                            <span>
                                {t("Αποδέχομαι τους ", "I agree to ")}<Link href="/terms" className="font-semibold text-primary hover:underline">{t("Όρους", "Terms")}</Link>{t(" και το ", " and ")}<Link href="/privacy" className="font-semibold text-primary hover:underline">{t("Απόρρητο", "Privacy")}</Link>
                            </span>
                        </label>
                        {errors.termsAccepted && <p role="alert" className="-mt-2 text-caption text-rose-600">{getZodError(errors.termsAccepted.message, language)}</p>}

                        {/* A "Use FaceID after first signup" hint used to sit here. It
                            promised a capability the product does not have: there is no
                            WebAuthn/passkey login flow, and the sign-in page's fake
                            "Biometric / PIN" unlock was already removed for the same
                            reason (see app/auth/signin/page.tsx). It also showed on every
                            device — FaceID is Apple-only. Promising biometric login the
                            product cannot deliver is a false trust signal at the very
                            first screen; do not reintroduce it until real WebAuthn exists. */}

                        {/* Submit */}
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            type="submit"
                            disabled={isSubmitting || signupSuccess}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 text-body font-bold text-white transition-all hover:bg-primary-hover hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#1A2420]"
                        >
                            {isSubmitting || signupSuccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {signupSuccess ? t("Πορτοφόλι δημιουργήθηκε", "Wallet Created") : t("Δημιουργία Πορτοφολιού", "Create My Wallet")}
                        </motion.button>

                        <p className="text-center text-caption text-[#5B6A7A] dark:text-white/60">
                            {t("Χρειάζονται 90 δευτερόλεπτα. Ακυρώστε οποτεδήποτε.", "Takes 90 seconds. Cancel anytime.")}
                        </p>
                    </form>

                    <p className="mt-5 border-t border-[#E2E8F0] pt-4 text-center text-body-sm text-[#5B6A7A] dark:border-white/10 dark:text-white/65">
                        {t("Έχετε ήδη λογαριασμό;", "Already have an account?")}{" "}
                        <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
                            {t("Σύνδεση", "Log in")}
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

export function SignUpFormPage({ fixedRole }: { fixedRole: "policyholder" | "agent" }) {
    return (
        <Suspense fallback={
            <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-black`}>
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
        }>
            <SignUpForm fixedRole={fixedRole} />
        </Suspense>
    )
}
