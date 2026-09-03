"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Loader2, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AuthShell } from "@/components/auth/AuthShell"
import { AUTH_NOTICE_COVERED_CLASS, AUTH_NOTICE_GAP_CLASS, AUTH_PRIMARY_LINK_CLASS } from "@/components/auth/FormField"
import { Button } from "@/src/design-system"
import { authHref } from "@/lib/seo/locale-links"
import { completeOnboardingStep } from "@/app/onboarding/actions"
import { resendVerificationEmail } from "@/app/auth/actions"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { isSyntheticPhoneEmail } from "@/lib/auth/phone-auth"
import { BillingPeriod, VALID_PLAN_IDS, ValidPlanId, publicPricingContent } from "@/lib/pricing/public-pricing-content"
import { getSignupCheckpointState } from "./actions"

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
    // Internal auth links must carry the pinned language; a bare href
    // dropped an English visitor onto the Greek sign-in page.
    const authLocale: "el" | "en" = language === "el" ? "el" : "en"
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
        router.push("/dashboard")
    }

    const showVerificationCard = Boolean(email) && needsEmailVerification && !isVerified
    const busy = isContinuing || isCheckingVerification || isResending

    return (
        <AuthShell>
            <div className="mb-g-5 flex items-center justify-between text-g-caption font-semibold text-fg-secondary">
                <span className="rounded-g-pill bg-surface-sunken px-g-3 py-g-1">{copy.stepLabel}</span>
                <span className="inline-flex items-center gap-g-1">
                    <ShieldCheck aria-hidden className="size-3.5 text-fg-brand" />
                    {copy.secureSetup}
                </span>
            </div>
            <h1 className="text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">{copy.heading}</h1>
            <p className="mt-g-3 text-g-body text-fg-secondary">{copy.subtitle}</p>

            <div className="mt-g-6">
                    {loadingState ? (
                        <div className="flex items-center justify-center rounded-g-lg bg-surface-sunken p-g-6 text-g-body-sm text-fg-secondary">
                            <Loader2 aria-hidden className="mr-g-2 size-4 animate-spin text-fg-brand" />
                            {copy.loading}
                        </div>
                    ) : null}

                    {!loadingState && !isAuthenticated ? (
                        <div className="flex flex-col gap-g-4">
                            <div role="alert" className={AUTH_NOTICE_GAP_CLASS}>
                                <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                                {copy.authMissing}
                            </div>
                            <Link
                                href={authHref("/auth/signin", authLocale)}
                                className={AUTH_PRIMARY_LINK_CLASS}
                            >
                                {copy.signin}
                            </Link>
                        </div>
                    ) : null}

                    {!loadingState && isAuthenticated ? (
                        <div className="flex flex-col gap-g-4">
                            {/* Onboarding shell card */}
                            <div className="rounded-g-lg bg-surface-sunken p-g-4">
                                <p className="text-g-body-sm font-semibold text-fg-primary">{copy.shellTitle}</p>
                                <p className="mt-g-1 text-g-body-sm text-fg-secondary">{copy.shellDesc}</p>
                                <ul className="mt-g-3 flex flex-col gap-g-2 text-g-body-sm text-fg-primary">
                                    {copy.trustedPoints.map((point) => (
                                        <li key={point} className="flex items-center gap-g-2">
                                            <CheckCircle2 aria-hidden className="size-4 flex-shrink-0 text-state-covered" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Selected plan */}
                            {planDisplayName ? (
                                <div className="rounded-g-lg bg-state-covered-fill p-g-4">
                                    <div className="inline-flex items-center gap-g-2 text-g-body-sm font-semibold text-state-covered">
                                        <CreditCard aria-hidden className="size-4" />
                                        {copy.selectedPlanTitle}
                                    </div>
                                    <p className="mt-g-1 text-g-body-sm font-semibold text-fg-primary">
                                        {planDisplayName}
                                        {selectedBilling ? ` — ${selectedBilling === "annual" ? copy.selectedPlanBillingAnnual : copy.selectedPlanBillingMonthly}` : ""}
                                    </p>
                                    <p className="mt-g-1 text-g-caption text-fg-secondary">{copy.selectedPlanNote}</p>
                                </div>
                            ) : null}

                            {/* Email verification card */}
                            {showVerificationCard ? (
                                <div className="rounded-g-lg bg-state-covered-fill p-g-4">
                                    <div className="inline-flex items-center gap-g-2 text-g-body-sm font-semibold text-state-covered">
                                        <Mail aria-hidden className="size-4" />
                                        {copy.verifyTitle}
                                    </div>
                                    <p className="mt-g-1 text-g-body-sm text-fg-secondary">{copy.verifyDesc}</p>
                                    <p className="mt-g-2 break-all rounded-g-md bg-surface-raised px-g-3 py-g-2 text-g-caption font-semibold text-fg-primary">{email}</p>
                                </div>
                            ) : null}

                            {/* Notice */}
                            <AnimatePresence>
                                {notice ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={notice.kind === "success" ? AUTH_NOTICE_COVERED_CLASS : AUTH_NOTICE_GAP_CLASS}
                                        role="status"
                                    >
                                        {notice.kind === "success" ? (
                                            <CheckCircle2 aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0" />
                                        )}
                                        <span>{notice.message}</span>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-g-3">
                                {showVerificationCard ? (
                                    <>
                                        <Button
                                            type="button"
                                            size="lg"
                                            onClick={() => void handleCheckVerification()}
                                            disabled={busy}
                                            loading={isCheckingVerification}
                                            className="w-full"
                                        >
                                            {!isCheckingVerification && <Sparkles aria-hidden className="size-4" />}
                                            {copy.checkVerified}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => void handleResend()}
                                            disabled={busy}
                                            loading={isResending}
                                            className="w-full"
                                        >
                                            {!isResending && <RefreshCw aria-hidden className="size-4" />}
                                            {copy.resend}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={() => void continueToOnboarding()}
                                        disabled={busy}
                                        loading={isContinuing}
                                        className="w-full"
                                    >
                                        {!isContinuing && <ArrowRight aria-hidden className="size-4" />}
                                        {copy.startSetup}
                                    </Button>
                                )}

                                <Button type="button" variant="ghost" onClick={handleSkip} disabled={busy} className="w-full">
                                    {copy.skip}
                                </Button>
                            </div>
                        </div>
                    ) : null}
            </div>
        </AuthShell>
    )
}

export default function SignUpConfirmationPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-dvh items-center justify-center bg-surface-base">
                    <Loader2 aria-hidden className="size-7 animate-spin text-fg-brand" />
                </div>
            }
        >
            <SignupConfirmationContent />
        </Suspense>
    )
}
