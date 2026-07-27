"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Upload, Wallet, Users, Check } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import { completeOnboardingStep, uploadOnboardingPolicy, redeemInviteCode, triggerOnboardingAnalysis } from "./actions"
import { inviteAdvisorByEmail } from "@/app/(protected)/agent/relationship-actions"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { PremiumInsightCards } from "@/components/monetization/PremiumInsightCards"
import { acceptAttribute } from "@/lib/security/file-upload"

type GoalType = "save_money" | "health_family" | "my_car" | "organize_policies" | "review_policy" | "investments_reminders"

interface OnboardingFlowProps {
    initialState: {
        step: number
        completed: boolean
        name: string
        onboardingSegment: "individual" | "family_manager" | "small_business" | null
        onboardingGoals: string[]
        onboardingFamiliarity: "beginner" | "intermediate" | "experienced" | null
        onboardingFileReady: boolean | null
        onboardingEntryCompleted: boolean
        hasAiConsent: boolean
    }
}

const TOTAL_STEPS = 5

function mapGoalToLegacy(goal: GoalType): string {
    if (goal === "health_family") return "understand_coverage"
    if (goal === "my_car") return "avoid_missed_renewals"
    if (goal === "save_money") return "save_money"
    // Newer goals are stored under their own keys.
    return goal
}

const GOALS: { key: GoalType; el: string; en: string }[] = [
    { key: "organize_policies", el: "Έλεγχος των ασφαλιστηρίων μου", en: "Control My Policies" },
    { key: "review_policy", el: "Έλεγχος υπάρχοντος ασφαλιστηρίου", en: "Review an Existing Policy" },
    { key: "save_money", el: "Εξοικονόμηση", en: "Save Money" },
    { key: "health_family", el: "Υγεία & Οικογένεια", en: "Health & Family" },
    { key: "my_car", el: "Το αυτοκίνητό μου", en: "My Car" },
    { key: "investments_reminders", el: "Επενδύσεις & Υπενθυμίσεις", en: "Investments & Reminders" },
]

export default function OnboardingFlow({ initialState }: OnboardingFlowProps) {
    const { language } = useLanguage()
    const router = useRouter()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    const initialStep = Math.min(Math.max(initialState.step || 1, 1), TOTAL_STEPS)
    const [step, setStep] = useState(initialStep)
    const [busy, setBusy] = useState(false)
    const [goal, setGoal] = useState<GoalType | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadedPolicyId, setUploadedPolicyId] = useState<string | null>(null)
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
    const [simulatingAi, setSimulatingAi] = useState(true)
    const [inviteCode, setInviteCode] = useState("")
    const [connectedAgentName, setConnectedAgentName] = useState<string | null>(null)
    const [inviteError, setInviteError] = useState<string | null>(null)
    // Primary advisor-connect path: invite by email (code entry is secondary).
    const [advisorEmail, setAdvisorEmail] = useState("")
    const [advisorEmailError, setAdvisorEmailError] = useState<string | null>(null)
    const [inviteSent, setInviteSent] = useState<{ link?: string } | null>(null)
    const [sendingInvite, setSendingInvite] = useState(false)
    const [showCodeEntry, setShowCodeEntry] = useState(false)
    // AI-processing consent: uploading a policy leads straight into AI analysis,
    // so consent is captured before the step-2 upload proceeds.
    const [aiConsent, setAiConsent] = useState(initialState.hasAiConsent)
    const [consentModalOpen, setConsentModalOpen] = useState(false)

    const stepLabel = t(`Βήμα ${step} από ${TOTAL_STEPS}`, `Step ${step} of ${TOTAL_STEPS}`)
    const displayName = initialState.name || ""

    const [analysisResult, setAnalysisResult] = useState<{
        status: string
        healthScore?: number | null
        healthScoreIsProvisional?: boolean
        gapCount?: number
    } | null>(null)

    useEffect(() => {
        if (step !== 3) return
        setSimulatingAi(true)
        setAnalysisResult(null)

        if (uploadedPolicyId) {
            // Real AI analysis for uploaded policies
            triggerOnboardingAnalysis(uploadedPolicyId)
                .then((result) => {
                    setAnalysisResult(result)
                    setSimulatingAi(false)
                })
                .catch(() => {
                    // Graceful fallback — don't block onboarding
                    setAnalysisResult({ status: "queued" })
                    setSimulatingAi(false)
                })
        } else {
            // No upload — quick transition
            const timer = setTimeout(() => setSimulatingAi(false), 1200)
            return () => clearTimeout(timer)
        }
    }, [step, uploadedPolicyId])

    const canContinueStep1 = Boolean(goal)

    const currentGoalDescription = useMemo(() => {
        if (!goal) return null
        if (goal === "save_money") return t("Θα ξεκινήσουμε με ευκαιρίες εξοικονόμησης.", "We will prioritize savings opportunities first.")
        if (goal === "health_family") return t("Θα δώσουμε έμφαση σε υγεία και οικογενειακή κάλυψη.", "We will prioritize health and family coverage first.")
        if (goal === "my_car") return t("Θα ξεκινήσουμε από την ασφάλιση αυτοκινήτου σας.", "We will start from your motor coverage first.")
        if (goal === "organize_policies") return t("Θα οργανώσουμε όλα τα ασφαλιστήριά σας σε ένα ασφαλές πορτοφόλι με υπενθυμίσεις ανανέωσης.", "We will organize all your policies in one secure wallet with renewal reminders.")
        if (goal === "review_policy") return t("Θα ξεκινήσουμε με έλεγχο του υπάρχοντος ασφαλιστηρίου σας για κενά και ασάφειες.", "We will start by reviewing your existing policy for gaps and unclear terms.")
        return t("Θα παρακολουθούμε επενδυτικά προϊόντα ασφάλισης και θα ρυθμίσουμε έξυπνες υπενθυμίσεις.", "We will track investment-linked policies and set up smart reminders.")
    }, [goal, isGreek])

    const continueFromStep1 = async () => {
        if (!goal) return
        setBusy(true)
        try {
            await completeOnboardingStep(1, {
                onboardingGoals: [mapGoalToLegacy(goal)],
                onboardingEntryCompletedAt: new Date().toISOString(),
            })
            setStep(2)
        } catch {
            toast.error(t("Δεν αποθηκεύτηκε η επιλογή σας.", "Could not save your choice."))
        } finally {
            setBusy(false)
        }
    }

    const continueFromStep2 = async (skipUpload: boolean = false, consentJustGranted: boolean = false) => {
        if (!skipUpload && selectedFile && !aiConsent && !consentJustGranted) {
            setConsentModalOpen(true)
            return
        }
        setBusy(true)
        try {
            if (!skipUpload && selectedFile) {
                const formData = new FormData()
                formData.append("file", selectedFile)
                const result = await uploadOnboardingPolicy(formData)
                if (!result.success || !result.policyId) {
                    toast.error(result.error || t("Αποτυχία στο upload.", "Upload failed."))
                    return
                }

                setUploadedPolicyId(result.policyId)
                setUploadedFileName(selectedFile.name)

                await completeOnboardingStep(2, {
                    onboardingFileReady: true,
                    onboardingUploadCompletedAt: new Date().toISOString(),
                    onboardingUploadedPolicyId: result.policyId,
                })
            } else {
                await completeOnboardingStep(2, {
                    onboardingFileReady: false,
                    onboardingUploadSkipped: true,
                })
            }
            setStep(3)
        } catch {
            toast.error(t("Δεν ολοκληρώθηκε το βήμα upload.", "Could not complete upload step."))
        } finally {
            setBusy(false)
        }
    }

    const continueFromStep3 = async () => {
        setBusy(true)
        try {
            await completeOnboardingStep(3, {})
            setStep(4)
        } catch {
            toast.error(t("Σφάλμα.", "Error."))
        } finally {
            setBusy(false)
        }
    }

    const handleRedeemInvite = async () => {
        // `busy` guard matters for the Enter-key path: the button is disabled
        // while in flight, but the input's onKeyDown calls this directly, so a
        // repeated Enter would redeem the same code twice.
        if (!inviteCode.trim() || busy) return
        setBusy(true)
        setInviteError(null)
        try {
            const result = await redeemInviteCode(inviteCode.trim())
            if (result.success) {
                setConnectedAgentName(result.agentName || null)
            } else {
                const err = 'error' in result ? String(result.error) : ""
                const errorMessages: Record<string, string> = {
                    invalid: t("Μη έγκυρος κωδικός πρόσκλησης.", "Invalid invite code."),
                    already_used: t("Ο κωδικός έχει ήδη χρησιμοποιηθεί.", "This code has already been used."),
                    expired: t("Ο κωδικός έχει λήξει.", "This code has expired."),
                    wrong_account: t("Η πρόσκληση στάλθηκε σε διαφορετική διεύθυνση email.", "This invite was sent to a different email address."),
                }
                setInviteError(errorMessages[err] || t("Σφάλμα.", "Error."))
            }
        } catch {
            setInviteError(t("Σφάλμα σύνδεσης.", "Connection error."))
        } finally {
            setBusy(false)
        }
    }

    const handleInviteAdvisor = async () => {
        if (!advisorEmail.trim() || sendingInvite) return
        setSendingInvite(true)
        setAdvisorEmailError(null)
        try {
            const result = await inviteAdvisorByEmail(advisorEmail.trim())
            if (result.success) {
                if (result.alreadyConnected) {
                    setConnectedAgentName(advisorEmail.trim())
                } else {
                    setInviteSent({ link: result.inviteLink })
                }
            } else {
                const map: Record<string, string> = {
                    invalid_email: t("Μη έγκυρο email.", "Invalid email address."),
                    self: t("Δεν μπορείτε να προσκαλέσετε τον εαυτό σας.", "You can't invite yourself."),
                    rate_limited: t("Πολλές προσκλήσεις. Δοκιμάστε ξανά αργότερα.", "Too many invites. Try again later."),
                    unauthorized: t("Σφάλμα. Δοκιμάστε ξανά.", "Something went wrong. Please try again."),
                }
                setAdvisorEmailError(map[result.error] || t("Σφάλμα.", "Error."))
            }
        } catch {
            setAdvisorEmailError(t("Σφάλμα σύνδεσης.", "Connection error."))
        } finally {
            setSendingInvite(false)
        }
    }

    const continueFromReminders = async () => {
        setBusy(true)
        try {
            await completeOnboardingStep(4, { onboardingRemindersEnabled: true })
            setStep(5)
        } catch {
            toast.error(t("Σφάλμα.", "Error."))
        } finally {
            setBusy(false)
        }
    }

    const finishOnboarding = async () => {
        setBusy(true)
        try {
            const result = await completeOnboardingStep(5, {
                markCompleted: true,
                redirectTo: "/home",
                onboardingCompletionLocation: "home_dashboard",
                onboardingGoals: goal ? [mapGoalToLegacy(goal)] : initialState.onboardingGoals,
                onboardingUploadedPolicyId: uploadedPolicyId,
                onboardingConnectedAgent: connectedAgentName,
            })
            // completeOnboardingStep returns the destination (it no longer
            // redirects server-side — that threw NEXT_REDIRECT which this catch
            // swallowed). Navigate client-side.
            router.push(result?.redirectTo ?? "/home")
        } catch {
            toast.error(t("Δεν ολοκληρώθηκε το onboarding.", "Could not finish onboarding."))
            setBusy(false)
        }
    }

    // Step-3 subtitle tracked the actual analysis state. It used to say "Your
    // first analysis is ready" unconditionally — but on the queued path (QStash
    // is the active prod route) the body says "will complete in a few minutes",
    // so the header contradicted it. Only claim "ready" when it actually is.
    const step3Subtitle = simulatingAi
        ? t("Ετοιμάζουμε την ανάλυσή σας...", "Preparing your analysis…")
        : (!uploadedPolicyId || analysisResult?.status === "completed")
            ? t("Η πρώτη σας ανάλυση ετοιμάστηκε.", "Your first analysis is ready.")
            : t("Δείτε την τρέχουσα κατάσταση παρακάτω.", "Here's the current status below.")

    return (
        <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
            <AiConsentModal
                isOpen={consentModalOpen}
                onClose={() => setConsentModalOpen(false)}
                onConsented={() => {
                    setAiConsent(true)
                    setConsentModalOpen(false)
                    continueFromStep2(false, true)
                }}
                source="onboarding_upload"
            />
            <div className="mx-auto max-w-3xl">
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
                    <div className="mb-6">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{stepLabel}</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
                            {displayName ? t(`Καλώς ήρθατε, ${displayName}`, `Welcome, ${displayName}`) : t("Καλώς ήρθατε", "Welcome")}
                        </h1>
                        <div className="mt-4 h-2 w-full rounded-full bg-[#F1F5F9]">
                            <div
                                className="h-2 rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                            />
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900">
                                    {t("Τι έχει μεγαλύτερη σημασία για εσάς;", "What matters most to you?")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                                    {t("Η επιλογή αυτή προσαρμόζει το dashboard και τα πρώτα AI insights.", "This choice personalizes your dashboard and first AI insights.")}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                {GOALS.map((g) => (
                                    <button
                                        key={g.key}
                                        type="button"
                                        aria-pressed={goal === g.key}
                                        onClick={() => setGoal(g.key)}
                                        className={`rounded-2xl border px-4 py-5 text-left transition ${
                                            goal === g.key
                                                ? "border-primary bg-primary-tint"
                                                : "border-[#E2E8F0] bg-white hover:border-primary"
                                        }`}
                                    >
                                        <p className="text-sm font-black text-stone-900">{t(g.el, g.en)}</p>
                                    </button>
                                ))}
                            </div>

                            {currentGoalDescription && (
                                <div className="rounded-2xl border border-primary/20 bg-primary-tint p-4 text-sm text-primary">
                                    {currentGoalDescription}
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={!canContinueStep1 || busy}
                                onClick={continueFromStep1}
                                className="pw-primary-button w-full"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900">
                                    {t("Ανεβάστε το πρώτο σας ασφαλιστήριο", "Upload your first policy")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                                    {t("Το έγγραφο κρυπτογραφείται και παραμένει ιδιωτικό.", "Your document is encrypted and stays private.")}
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-700 transition hover:border-primary">
                                <Upload className="h-5 w-5 text-primary" />
                                {selectedFile ? selectedFile.name : t("Επιλογή PDF", "Choose PDF")}
                                <input
                                    type="file"
                                    accept={acceptAttribute("policy")}
                                    className="hidden"
                                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                />
                            </label>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => continueFromStep2()}
                                    disabled={busy}
                                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white transition hover:bg-primary-hover disabled:opacity-60"
                                >
                                    {busy ? t("Επεξεργασία...", "Processing...") : t("Συνέχεια", "Continue")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null)
                                        continueFromStep2(true)
                                    }}
                                    disabled={busy}
                                    className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                                >
                                    {t("Παράλειψη", "Skip")}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900">
                                    {t("AI Σύνοψη", "AI Summary")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                                    {step3Subtitle}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                                {simulatingAi ? (
                                    <div className="flex items-center gap-3 text-sm text-stone-700">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        {uploadedPolicyId
                                            ? t("Το AI αναλύει το ασφαλιστήριό σας...", "AI is analyzing your policy...")
                                            : t("Προετοιμασία...", "Preparing...")}
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm text-stone-700">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-[#4F46E5]" />
                                            <span>
                                                {uploadedPolicyId && analysisResult?.status === "completed"
                                                    ? t("Η ανάλυση AI ολοκληρώθηκε!", "AI analysis completed!")
                                                    : uploadedPolicyId && analysisResult?.status === "queued"
                                                        ? t("Η ανάλυση θα ολοκληρωθεί σε λίγα λεπτά.", "Analysis will complete in a few minutes.")
                                                        : uploadedPolicyId && analysisResult?.status === "failed"
                                                            ? t("Η ανάλυση απέτυχε. Μπορείτε να τη ξεκινήσετε ξανά από το Wallet.", "Analysis failed. You can retry from your Wallet.")
                                                            : uploadedPolicyId
                                                                ? t("Το ασφαλιστήριο προστέθηκε και αναλύεται.", "Your policy was added and is being analyzed.")
                                                                : t("Μπορείς να ξεκινήσεις χωρίς upload και να προσθέσεις ασφαλιστήρια αργότερα.", "You can start now and upload policies later.")}
                                            </span>
                                        </div>
                                        {analysisResult?.healthScore != null && (
                                            <div className="flex flex-col gap-0.5 rounded-xl bg-primary-soft px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-black text-primary">
                                                        {analysisResult.healthScore}%
                                                    </span>
                                                    {/* Was «Σκορ ανάλυσης» / "Analysis score" — a fourth name for
                                                        this metric, and one that reads as a grade for the analysis
                                                        rather than for the cover. It is the same protection score
                                                        the dashboard shows, in its provisional form. */}
                                                    <span className="text-xs text-primary">
                                                        {t("Βαθμολογία προστασίας", "Protection score")}
                                                    </span>
                                                </div>
                                                {analysisResult.healthScoreIsProvisional && (
                                                    <span className="text-micro text-primary/80">
                                                        {t("Προσωρινή εκτίμηση — οριστικοποιείται μετά την πλήρη ανάλυση", "Provisional estimate — finalised after full analysis")}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {uploadedFileName && (
                                            <p className="font-semibold text-stone-900">
                                                {t("Αρχείο:", "File:")} {uploadedFileName}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {uploadedPolicyId && !simulatingAi && (
                                <PremiumInsightCards
                                    triggerSource="onboarding_post_parse"
                                    returnTo={`/wallet/${uploadedPolicyId}`}
                                />
                            )}

                            <button
                                type="button"
                                onClick={continueFromStep3}
                                disabled={busy || simulatingAi}
                                className="pw-primary-button w-full"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900">
                                    {t("Έξυπνες Υπενθυμίσεις", "Smart Reminders")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                                    {t(
                                        "Θα σας ειδοποιούμε πριν από κάθε λήξη ή ανανέωση ασφαλιστηρίου — με βάση τις ημερομηνίες των ασφαλιστηρίων σας. Δωρεάν, πάντα.",
                                        "We will remind you before every policy expiry or renewal — based on your policies' dates. Free, always."
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-primary/20 bg-primary-tint p-4 text-sm text-primary">
                                {t(
                                    "Οι υπενθυμίσεις ανανέωσης ενεργοποιούνται αυτόματα για κάθε ασφαλιστήριο που προσθέτετε.",
                                    "Renewal reminders are enabled automatically for every policy you add."
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={continueFromReminders}
                                disabled={busy}
                                className="pw-primary-button w-full"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900">
                                    {t("Σύνδεση με Σύμβουλο", "Connect with Your Advisor")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                                    {t(
                                        "Προσκαλέστε τον ασφαλιστικό σας σύμβουλο με το email του — θα συνδεθείτε αυτόματα μόλις αποδεχτεί.",
                                        "Invite your insurance advisor by their email — you'll be connected automatically once they accept."
                                    )}
                                </p>
                            </div>

                            {connectedAgentName ? (
                                <div className="rounded-2xl border border-primary/20 bg-primary-tint p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                                            <Check className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-stone-900">
                                                {t("Συνδεθήκατε!", "Connected!")}
                                            </p>
                                            <p className="text-xs text-stone-600 dark:text-stone-400">
                                                {t(`Σύμβουλος: ${connectedAgentName}`, `Advisor: ${connectedAgentName}`)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : inviteSent ? (
                                <div className="rounded-2xl border border-primary/20 bg-primary-tint p-5">
                                    <p className="text-sm font-black text-stone-900">
                                        {t("Η πρόσκληση στάλθηκε", "Invitation sent")}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                                        {t(
                                            "Θα συνδεθείτε αυτόματα μόλις ο σύμβουλός σας αποδεχτεί την πρόσκληση.",
                                            "You'll be connected automatically once your advisor accepts the invitation."
                                        )}
                                    </p>
                                    {inviteSent.link && (
                                        <div className="mt-3">
                                            <p className="text-xs text-stone-600 dark:text-stone-400">
                                                {t(
                                                    "Δεν στάλθηκε το email. Αντιγράψτε τον σύνδεσμο και στείλτε τον στον σύμβουλό σας:",
                                                    "Couldn't send the email. Copy this link and send it to your advisor:"
                                                )}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(inviteSent.link!)
                                                    toast.success(t("Ο σύνδεσμος αντιγράφηκε", "Link copied"))
                                                }}
                                                className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                                            >
                                                {t("Αντιγραφή συνδέσμου", "Copy link")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Primary — invite the advisor by email */}
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={advisorEmail}
                                            onChange={(e) => { setAdvisorEmail(e.target.value); setAdvisorEmailError(null) }}
                                            onKeyDown={(e) => e.key === "Enter" && handleInviteAdvisor()}
                                            placeholder={t("Το email του συμβούλου σας", "Your advisor's email")}
                                            className="pw-input flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleInviteAdvisor}
                                            disabled={sendingInvite || !advisorEmail.trim()}
                                            className="pw-primary-button"
                                        >
                                            {sendingInvite ? t("Αποστολή…", "Sending…") : t("Αποστολή", "Send")}
                                        </button>
                                    </div>
                                    {advisorEmailError && (
                                        <p className="text-xs text-red-700">{advisorEmailError}</p>
                                    )}

                                    {/* Secondary — invite code */}
                                    <button
                                        type="button"
                                        onClick={() => setShowCodeEntry((v) => !v)}
                                        className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                                    >
                                        {t("Έχετε κωδικό πρόσκλησης;", "Have an invite code instead?")}
                                    </button>
                                    {showCodeEntry && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={inviteCode}
                                                    onChange={(e) => { setInviteCode(e.target.value); setInviteError(null) }}
                                                    onKeyDown={(e) => e.key === "Enter" && handleRedeemInvite()}
                                                    placeholder={t("Εισάγετε κωδικό πρόσκλησης...", "Enter invite code...")}
                                                    className="pw-input flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRedeemInvite}
                                                    disabled={busy || !inviteCode.trim()}
                                                    aria-label={t("Σύνδεση", "Connect")}
                                                    className="pw-secondary-button border-stone-300 text-stone-700"
                                                >
                                                    <Users className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {inviteError && (
                                                <p className="text-xs text-red-700">{inviteError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={finishOnboarding}
                                disabled={busy}
                                className="pw-primary-button w-full"
                            >
                                <Wallet className="h-4 w-4" />
                                {busy ? t("Ολοκλήρωση...", "Finishing...") : t("Μετάβαση στην Αρχική", "Go to Home Dashboard")}
                            </button>

                            {!connectedAgentName && (
                                <button
                                    type="button"
                                    onClick={finishOnboarding}
                                    disabled={busy}
                                    className="w-full text-center text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 transition"
                                >
                                    {t("Παράλειψη", "Skip for now")}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
