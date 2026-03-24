"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { IBM_Plex_Sans } from "next/font/google"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { PolicyWalletLogo } from "@/components/branding/Logo"
import { completeOnboardingStep } from "@/app/onboarding/actions"
import { resendVerificationEmail } from "@/app/auth/actions"
import { trackLandingEvent } from "@/lib/landing/analytics"
import { isSyntheticPhoneEmail } from "@/lib/auth/phone-auth"
import { getSignupCheckpointState } from "./actions"

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
})

function SignupConfirmationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)

    const role = searchParams.get("role") === "agent" ? "agent" : "policyholder"
    const queryEmail = searchParams.get("email")?.trim().toLowerCase() || ""

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
            })

            router.push("/onboarding")
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
        <div className={`${ibmPlexSans.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#1E3A8A] via-[#dbeafe] to-white px-4 py-10`}>
            <motion.div className="absolute -top-20 right-[-10%] h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <motion.div className="absolute -bottom-20 left-[-8%] h-64 w-64 rounded-full bg-blue-200/45 blur-3xl" animate={{ scale: [1.06, 1, 1.06] }} transition={{ duration: 6, repeat: Infinity }} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-blue-900/10 sm:p-7">
                <div className="mb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{copy.stepLabel}</span>
                    <span className="inline-flex items-center gap-1 text-slate-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {copy.secureSetup}
                    </span>
                </div>

                <div className="mb-6 text-center">
                    <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
                        <PolicyWalletLogo size="md" language={language} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.heading}</h1>
                    <p className="mt-1.5 text-sm text-slate-600">{copy.subtitle}</p>
                </div>

                {loadingState ? (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {copy.loading}
                    </div>
                ) : null}

                {!loadingState && !isAuthenticated ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {copy.authMissing}
                        </div>
                        <Link href="/auth/signin" className="inline-flex w-full items-center justify-center rounded-xl bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
                            {copy.signin}
                        </Link>
                    </div>
                ) : null}

                {!loadingState && isAuthenticated ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">{copy.shellTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">{copy.shellDesc}</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-700">
                                {copy.trustedPoints.map((point) => (
                                    <li key={point} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-slate-600" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {showVerificationCard ? (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900">
                                    <Mail className="h-4 w-4" />
                                    {copy.verifyTitle}
                                </div>
                                <p className="mt-1 text-sm text-blue-800">{copy.verifyDesc}</p>
                                <p className="mt-2 break-all rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-blue-900">{email}</p>
                            </div>
                        ) : null}

                        <AnimatePresence>
                            {notice ? (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.kind === "success" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-rose-200 bg-rose-50 text-rose-700"}`} role="status">
                                    {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
                                    <span>{notice.message}</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <div className="space-y-2.5">
                            {showVerificationCard ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => void handleCheckVerification()}
                                        disabled={busy}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#6D28D9] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isCheckingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        {copy.checkVerified}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => void handleResend()}
                                        disabled={busy}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
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
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#6D28D9] px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                    {copy.startSetup}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={busy}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {copy.skip}
                            </button>
                        </div>
                    </div>
                ) : null}
            </motion.div>
        </div>
    )
}

export default function SignUpConfirmationPage() {
    return (
        <Suspense fallback={<div className={`${ibmPlexSans.className} flex min-h-screen items-center justify-center`}><Loader2 className="h-7 w-7 animate-spin text-blue-700" /></div>}>
            <SignupConfirmationContent />
        </Suspense>
    )
}
