"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Inter } from "next/font/google"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Loader2, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { completeOnboardingStep } from "@/app/onboarding/actions"
import { resendVerificationEmail } from "@/app/auth/actions"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { isSyntheticPhoneEmail } from "@/lib/auth/phone-auth"
import { BillingPeriod, VALID_PLAN_IDS, ValidPlanId, publicPricingContent } from "@/lib/pricing/public-pricing-content"
import { getSignupCheckpointState } from "./actions"

const inter = Inter({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

function resolvePlanDisplayName(planId: string, language: "el" | "en"): string | null {
    for (const audience of Object.values(publicPricingContent)) {
        for (const plan of audience.plans) {
            if (plan.checkoutPlanId === planId || plan.key === planId) {
                return plan.name[language]
            }
        }
    }
    return null
}

function SignupConfirmationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language, setLanguage } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)

    const role = searchParams.get("role") === "agent" ? "agent" : "policyholder"
    const queryEmail = searchParams.get("email")?.trim().toLowerCase() || ""
    const rawPlan = searchParams.get("plan") || ""
    const selectedPlan: ValidPlanId | "" = (VALID_PLAN_IDS as readonly string[]).includes(rawPlan) ? (rawPlan as ValidPlanId) : ""
    const selectedBilling: BillingPeriod | "" = searchParams.get("billing") === "annual" ? "annual" : searchParams.get("billing") === "monthly" ? "monthly" : ""
    const planDisplayName = selectedPlan ? resolvePlanDisplayName(selectedPlan, language) : null

    const [email, setEmail] = useState(queryEmail)
    const [isVerified, setIsVerified] = useState(false)
    const [needsEmailVerification, setNeedsEmailVerification] = useState(Boolean(queryEmail && !isSyntheticPhoneEmail(queryEmail)))
    const [isAuthenticated, setIsAuthenticated] = useState(true)
    const [loadingState, setLoadingState] = useState(true)
    const [isCheckingVerification, setIsCheckingVerification] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [isContinuing, setIsContinuing] = useState(false)
    const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null)
    const trackedViewRef = useRef(false)

    useEffect(() => {
        let isMounted = true

        const loadCheckpointState = async () => {
            try {
                const checkpoint = await getSignupCheckpointState()
                if (!isMounted) return
                setIsAuthenticated(checkpoint.authenticated)
                if (checkpoint.email) {
                    setEmail(checkpoint.email)
                }
                setIsVerified(checkpoint.verified)
                setNeedsEmailVerification(checkpoint.needsEmailVerification)
            } finally {
                if (isMounted) {
                    setLoadingState(false)
                }
            }
        }

        void loadCheckpointState()
        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (trackedViewRef.current || loadingState) return
        trackedViewRef.current = true

        trackLandingEvent("signup_checkpoint_viewed", {
            role,
            locale: language,
            has_email: Boolean(email),
            needs_email_verification: needsEmailVerification,
            verified: isVerified,
            ...(selectedPlan ? { selected_plan: selectedPlan } : {}),
            ...(selectedBilling ? { selected_billing: selectedBilling } : {}),
        })

        if (needsEmailVerification) {
            trackLandingEvent("email_verification_viewed", {
                role,
                locale: language,
                source: "signup_checkpoint",
            })
        }
    }, [email, isVerified, language, loadingState, needsEmailVerification, role])

    const copy = useMemo(() => ({
        heading: t("Ο λογαριασμός σας είναι έτοιμος", "Your wallet account is ready"),
        subtitle: t("Ένα γρήγορο βήμα και συνεχίζετε στο onboarding.", "One quick checkpoint, then continue to onboarding."),
        shellTitle: t("Ρύθμιση πρώτης εμπειρίας", "First-login setup shell"),
        shellDesc: t("Θα χρειαστεί περίπου 2 λεπτά. Θα δεις AI ανάλυση και υπενθυμίσεις.", "This takes about 2 minutes. You will unlock AI insights and reminders."),
        verifyTitle: t("Επαλήθευση email", "Verify your email"),
        verifyDesc: t("Χρησιμοποιήστε τον σύνδεσμο που στείλαμε στο inbox σας.", "Use the link we sent to your inbox."),
        checkVerified: t("Έκανα επαλήθευση, συνέχεια", "I verified, continue"),
        resend: t("Επαναποστολή email", "Resend verification email"),
        startSetup: t("Έναρξη ρύθμισης", "Start setup"),
        skip: t("Παράλειψη προς το παρόν", "Skip for now"),
        verifyPending: t("Δεν έχει ολοκληρωθεί ακόμα η επαλήθευση. Ελέγξτε ξανά το email σας.", "Verification is not complete yet. Please check your email again."),
        verificationSuccess: t("Το email επαληθεύτηκε. Συνεχίζουμε.", "Email verified. Continuing."),
        resendSuccess: t("Στάλθηκε νέο email επαλήθευσης.", "Verification email sent again."),
        resendError: t("Αποτυχία αποστολής email επαλήθευσης.", "Failed to resend verification email."),
        authMissing: t("Η συνεδρία έληξε. Συνδεθείτε ξανά για να συνεχίσετε.", "Your session expired. Sign in again to continue."),
        signin: t("Μετάβαση σε σύνδεση", "Go to sign in"),
        stepLabel: t("Βήμα 2 από 6", "Step 2 of 6"),
        secureSetup: t("Ασφαλές setup", "Secure setup"),
        loading: t("Φόρτωση...", "Loading..."),
        trustedPoints: [
            t("Ασφαλής αποθήκευση εγγράφων σε ένα σημείο", "Secure document storage in one place"),
            t("AI εξήγηση καλύψεων σε απλή γλώσσα", "AI explanation of coverage in plain language"),
            t("Έξυπνες υπενθυμίσεις ανανέωσης", "Smart renewal reminders"),
        ],
        selectedPlanTitle: t("Το πλάνο σας", "Your selected plan"),
        selectedPlanBillingMonthly: t("Μηνιαία χρέωση", "Monthly billing"),
        selectedPlanBillingAnnual: t("Ετήσια χρέωση", "Annual billing"),
        selectedPlanNote: t("Θα ενεργοποιηθεί μετά το onboarding.", "Will be activated after onboarding."),
        backHome: t("← Αρχική", "← Home"),
    }), [language])

    const handleCheckVerification = async () => {
        setNotice(null)
        setIsCheckingVerification(true)
        try {
            trackLandingEvent("email_verification_check_clicked", {
                locale: language,
                source: "signup_checkpoint",
            })

            const checkpoint = await getSignupCheckpointState()
            if (checkpoint.email) {
                setEmail(checkpoint.email)
            }
            setIsAuthenticated(checkpoint.authenticated)
            setIsVerified(checkpoint.verified)
            setNeedsEmailVerification(checkpoint.needsEmailVerification)

            if (!checkpoint.verified) {
                setNotice({ kind: "error", message: copy.verifyPending })
                return
            }

            trackLandingEvent("email_verified", {
                locale: language,
                source: "signup_checkpoint",
            })
            setNotice({ kind: "success", message: copy.verificationSuccess })
            await continueToOnboarding()
        } finally {
            setIsCheckingVerification(false)
        }
    }

    const handleResend = async () => {
        if (!email) return
        setNotice(null)
        setIsResending(true)
        try {
            trackLandingEvent("email_verification_resend_clicked", {
                locale: language,
                source: "signup_checkpoint",
            })

            const result = await resendVerificationEmail(email, language)
            if (!result.success) {
                setNotice({ kind: "error", message: result.error || copy.resendError })
                return
            }

            setNotice({ kind: "success", message: copy.resendSuccess })
        } catch {
            setNotice({ kind: "error", message: copy.resendError })
        } finally {
            setIsResending(false)
        }
    }

    const continueToOnboarding = async () => {
        setNotice(null)
        setIsContinuing(true)
        try {
            trackLandingEvent("onboarding_checkpoint_continue_clicked", {
                locale: language,
                role,
            })

            await completeOnboardingStep(1, {
                onboardingEntryCompletedAt: new Date().toISOString(),
                onboardingEntrySource: "signup_checkpoint",
                ...(selectedPlan ? { selectedPlan } : {}),
                ...(selectedBilling ? { selectedBilling } : {}),
            })

            const onboardingParams = new URLSearchParams()
            if (selectedPlan) onboardingParams.set("plan", selectedPlan)
            if (selectedBilling) onboardingParams.set("billing", selectedBilling)
            const qs = onboardingParams.toString()
            // Each audience has its own onboarding flow — agents must not land
            // in the policyholder flow (it would create a PolicyholderProfile).
            const onboardingPath = role === "agent" ? "/onboarding/agent" : "/onboarding"
            router.push(`${onboardingPath}${qs ? `?${qs}` : ""}`)
        } catch {
            setNotice({
                kind: "error",
                message: t("Αποτυχία μετάβασης στο onboarding. Δοκιμάστε ξανά.", "Could not continue to onboarding. Please try again."),
            })
        } finally {
            setIsContinuing(false)
        }
    }

    const handleSkip = () => {
        trackLandingEvent("onboarding_skipped", {
            locale: language,
            step: 1,
            location: "signup_checkpoint",
        })
        router.push("/home")
    }

    const showVerificationCard = Boolean(email) && needsEmailVerification && !isVerified
    const busy = isContinuing || isCheckingVerification || isResending

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
                    onClick={() => setLanguage(language === "el" ? "en" : "el")}
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-[12px] font-semibold text-[#475569] transition hover:bg-[#F8FAFC] dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                >
                    {language === "el" ? "EN" : "EL"} {/* i18n-hardcoded-ignore — language switcher shows target code */}
                </button>
            </header>

            {/* Card */}
            <div className="flex flex-1 items-center justify-center px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#111111] sm:p-7"
                >
                    {/* Top meta row */}
                    <div className="mb-5 flex items-center justify-between text-xs font-semibold text-[#64748B] dark:text-white/60">
                        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 dark:bg-white/10">{copy.stepLabel}</span>
                        <span className="inline-flex items-center gap-1 text-[#475569] dark:text-white/65">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            {copy.secureSetup}
                        </span>
                    </div>

                    {/* Logo + heading */}
                    <div className="mb-6 text-center">
                        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-[#F8FAFC] px-3 py-2 dark:bg-white/5">
                            <PolicyWalletLogo size="md" language={language} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">{copy.heading}</h1>
                        <p className="mt-1.5 text-sm text-[#64748B] dark:text-white/65">{copy.subtitle}</p>
                    </div>

                    {loadingState ? (
                        <div className="flex items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-[#64748B] dark:border-white/10 dark:bg-white/5 dark:text-white/65">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                            {copy.loading}
                        </div>
                    ) : null}

                    {!loadingState && !isAuthenticated ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                {copy.authMissing}
                            </div>
                            <Link
                                href="/auth/signin"
                                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover dark:text-[#1A2420]"
                            >
                                {copy.signin}
                            </Link>
                        </div>
                    ) : null}

                    {!loadingState && isAuthenticated ? (
                        <div className="space-y-4">
                            {/* Onboarding shell card */}
                            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-white/10 dark:bg-white/5">
                                <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{copy.shellTitle}</p>
                                <p className="mt-1 text-sm text-[#64748B] dark:text-white/65">{copy.shellDesc}</p>
                                <ul className="mt-3 space-y-2 text-sm text-[#475569] dark:text-white/65">
                                    {copy.trustedPoints.map((point) => (
                                        <li key={point} className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Selected plan */}
                            {planDisplayName ? (
                                <div className="rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] p-4 dark:border-primary/30 dark:bg-primary/15">
                                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#065F46] dark:text-mint">
                                        <CreditCard className="h-4 w-4" />
                                        {copy.selectedPlanTitle}
                                    </div>
                                    <p className="mt-1 text-sm font-bold text-[#065F46] dark:text-mint">
                                        {planDisplayName}
                                        {selectedBilling ? ` — ${selectedBilling === "annual" ? copy.selectedPlanBillingAnnual : copy.selectedPlanBillingMonthly}` : ""}
                                    </p>
                                    <p className="mt-1 text-xs text-[#047857] dark:text-mint/80">{copy.selectedPlanNote}</p>
                                </div>
                            ) : null}

                            {/* Email verification card */}
                            {showVerificationCard ? (
                                <div className="rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] p-4 dark:border-primary/30 dark:bg-primary/15">
                                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#065F46] dark:text-mint">
                                        <Mail className="h-4 w-4" />
                                        {copy.verifyTitle}
                                    </div>
                                    <p className="mt-1 text-sm text-[#047857] dark:text-mint/80">{copy.verifyDesc}</p>
                                    <p className="mt-2 break-all rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#065F46] dark:bg-black/40 dark:text-mint">{email}</p>
                                </div>
                            ) : null}

                            {/* Notice */}
                            <AnimatePresence>
                                {notice ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                                            notice.kind === "success"
                                                ? "border-[#D1FAE5] bg-[#F0FDF4] text-[#065F46] dark:border-primary/30 dark:bg-primary/15 dark:text-mint"
                                                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                                        }`}
                                        role="status"
                                    >
                                        {notice.kind === "success" ? (
                                            <CheckCircle2 className="mt-0.5 h-4 w-4" />
                                        ) : (
                                            <AlertCircle className="mt-0.5 h-4 w-4" />
                                        )}
                                        <span>{notice.message}</span>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            {/* Action buttons */}
                            <div className="space-y-2.5">
                                {showVerificationCard ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => void handleCheckVerification()}
                                            disabled={busy}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#1A2420]"
                                        >
                                            {isCheckingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            {copy.checkVerified}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => void handleResend()}
                                            disabled={busy}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                                        >
                                            {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            {copy.resend}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void continueToOnboarding()}
                                        disabled={busy}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#1A2420]"
                                    >
                                        {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                        {copy.startSetup}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={busy}
                                    className="inline-flex w-full items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/15 dark:bg-[#111111] dark:text-white/70 dark:hover:bg-white/10"
                                >
                                    {copy.skip}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </motion.div>
            </div>
        </div>
    )
}

export default function SignUpConfirmationPage() {
    return (
        <Suspense
            fallback={
                <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-black`}>
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
            }
        >
            <SignupConfirmationContent />
        </Suspense>
    )
}
