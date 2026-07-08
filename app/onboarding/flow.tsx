"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Sparkles, Upload, Wallet, Users, Check } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import { completeOnboardingStep, uploadOnboardingPolicy, redeemInviteCode, triggerOnboardingAnalysis } from "./actions"
import { AiConsentModal } from "@/components/ui/AiConsentModal"

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
    { key: "organize_policies", el: "Έλεγχος των συμβολαίων μου", en: "Control My Policies" },
    { key: "review_policy", el: "Έλεγχος υπάρχοντος συμβολαίου", en: "Review an Existing Policy" },
    { key: "save_money", el: "Εξοικονόμηση", en: "Save Money" },
    { key: "health_family", el: "Υγεία & Οικογένεια", en: "Health & Family" },
    { key: "my_car", el: "Το Αυτοκίνητό μου", en: "My Car" },
    { key: "investments_reminders", el: "Επενδύσεις & Υπενθυμίσεις", en: "Investments & Reminders" },
]

export default function OnboardingFlow({ initialState }: OnboardingFlowProps) {
    const { language } = useLanguage()
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
    // AI-processing consent: uploading a policy leads straight into AI analysis,
    // so consent is captured before the step-2 upload proceeds.
    const [aiConsent, setAiConsent] = useState(initialState.hasAiConsent)
    const [consentModalOpen, setConsentModalOpen] = useState(false)

    const stepLabel = t(`Βήμα ${step} από ${TOTAL_STEPS}`, `Step ${step} of ${TOTAL_STEPS}`)
    const displayName = initialState.name || ""

    const [analysisResult, setAnalysisResult] = useState<{
        status: string
        healthScore?: number
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
        if (goal === "organize_policies") return t("Θα οργανώσουμε όλα τα συμβόλαιά σας σε ένα ασφαλές πορτοφόλι με υπενθυμίσεις ανανέωσης.", "We will organize all your policies in one secure wallet with renewal reminders.")
        if (goal === "review_policy") return t("Θα ξεκινήσουμε με έλεγχο του υπάρχοντος συμβολαίου σας για κενά και ασάφειες.", "We will start by reviewing your existing policy for gaps and unclear terms.")
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
        if (!inviteCode.trim()) return
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
                }
                setInviteError(errorMessages[err] || t("Σφάλμα.", "Error."))
            }
        } catch {
            setInviteError(t("Σφάλμα σύνδεσης.", "Connection error."))
        } finally {
            setBusy(false)
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
            await completeOnboardingStep(5, {
                markCompleted: true,
                redirectTo: "/home",
                onboardingCompletionLocation: "home_dashboard",
                onboardingGoals: goal ? [mapGoalToLegacy(goal)] : initialState.onboardingGoals,
                onboardingUploadedPolicyId: uploadedPolicyId,
                onboardingConnectedAgent: connectedAgentName,
            })
        } catch {
            toast.error(t("Δεν ολοκληρώθηκε το onboarding.", "Could not finish onboarding."))
            setBusy(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 px-4 py-10 dark:from-stone-950 dark:via-stone-900 dark:to-teal-950/30">
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
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:p-8">
                    <div className="mb-6">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">{stepLabel}</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 dark:text-white">
                            {displayName ? t(`Καλώς ήρθατε, ${displayName}`, `Welcome, ${displayName}`) : t("Καλώς ήρθατε", "Welcome")}
                        </h1>
                        <div className="mt-4 h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800">
                            <div
                                className="h-2 rounded-full bg-teal-600 transition-all duration-500"
                                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                            />
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                                    {t("Τι έχει μεγαλύτερη σημασία για εσάς;", "What matters most to you?")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t("Η επιλογή αυτή προσαρμόζει το dashboard και τα πρώτα AI insights.", "This choice personalizes your dashboard and first AI insights.")}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                {GOALS.map((g) => (
                                    <button
                                        key={g.key}
                                        type="button"
                                        onClick={() => setGoal(g.key)}
                                        className={`rounded-2xl border px-4 py-5 text-left transition ${
                                            goal === g.key
                                                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                                                : "border-stone-200 bg-white hover:border-teal-400 dark:border-stone-700 dark:bg-stone-900"
                                        }`}
                                    >
                                        <p className="text-sm font-black text-stone-900 dark:text-white">{t(g.el, g.en)}</p>
                                    </button>
                                ))}
                            </div>

                            {currentGoalDescription && (
                                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-200">
                                    {currentGoalDescription}
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={!canContinueStep1 || busy}
                                onClick={continueFromStep1}
                                className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                                    {t("Ανεβάστε το πρώτο σας συμβόλαιο", "Upload your first policy")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t("Το έγγραφο κρυπτογραφείται και παραμένει ιδιωτικό.", "Your document is encrypted and stays private.")}
                                </p>
                            </div>

                            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 p-8 text-sm font-semibold text-stone-700 transition hover:border-teal-500 dark:border-stone-700 dark:text-stone-200">
                                <Upload className="h-5 w-5 text-teal-600" />
                                {selectedFile ? selectedFile.name : t("Επιλογή PDF", "Choose PDF")}
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                />
                            </label>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => continueFromStep2()}
                                    disabled={busy}
                                    className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900"
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
                                    className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                                >
                                    {t("Παράλειψη", "Skip")}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                                    {t("AI Σύνοψη", "AI Summary")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t("Η πρώτη σας ανάλυση ετοιμάστηκε.", "Your first analysis is ready.")}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-800">
                                {simulatingAi ? (
                                    <div className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-200">
                                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                        {uploadedPolicyId
                                            ? t("Το AI αναλύει το συμβόλαιό σας...", "AI is analyzing your policy...")
                                            : t("Προετοιμασία...", "Preparing...")}
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm text-stone-700 dark:text-stone-200">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-violet-600" />
                                            <span>
                                                {uploadedPolicyId && analysisResult?.status === "completed"
                                                    ? t("Η ανάλυση AI ολοκληρώθηκε!", "AI analysis completed!")
                                                    : uploadedPolicyId && analysisResult?.status === "queued"
                                                        ? t("Η ανάλυση θα ολοκληρωθεί σε λίγα λεπτά.", "Analysis will complete in a few minutes.")
                                                        : uploadedPolicyId && analysisResult?.status === "failed"
                                                            ? t("Η ανάλυση απέτυχε. Μπορείτε να τη ξεκινήσετε ξανά από το Wallet.", "Analysis failed. You can retry from your Wallet.")
                                                            : uploadedPolicyId
                                                                ? t("Το συμβόλαιο προστέθηκε και αναλύεται.", "Your policy was added and is being analyzed.")
                                                                : t("Μπορείς να ξεκινήσεις χωρίς upload και να προσθέσεις συμβόλαια αργότερα.", "You can start now and upload policies later.")}
                                            </span>
                                        </div>
                                        {analysisResult?.healthScore != null && (
                                            <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 dark:bg-teal-900/20">
                                                <span className="text-xl font-black text-teal-700 dark:text-teal-300">
                                                    {analysisResult.healthScore}%
                                                </span>
                                                <span className="text-xs text-teal-600 dark:text-teal-400">
                                                    {t("Σκορ ανάλυσης", "Analysis score")}
                                                </span>
                                            </div>
                                        )}
                                        {uploadedFileName && (
                                            <p className="font-semibold text-stone-900 dark:text-white">
                                                {t("Αρχείο:", "File:")} {uploadedFileName}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {uploadedPolicyId && !simulatingAi && (
                                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                    {t(
                                        "Αυτή ήταν η δωρεάν δοκιμαστική σας ανάλυση. Οι αναλύσεις AI είναι διαθέσιμες στα πλάνα Plus και Pro.",
                                        "This was your complimentary trial analysis. AI analyses are available on the Plus and Pro plans."
                                    )}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={continueFromStep3}
                                disabled={busy || simulatingAi}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                                    {t("Έξυπνες Υπενθυμίσεις", "Smart Reminders")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t(
                                        "Θα σας ειδοποιούμε πριν από κάθε λήξη ή ανανέωση συμβολαίου — με βάση τις ημερομηνίες των συμβολαίων σας. Δωρεάν, πάντα.",
                                        "We will remind you before every policy expiry or renewal — based on your policies' dates. Free, always."
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-900/40 dark:bg-teal-900/20 dark:text-teal-200">
                                {t(
                                    "Οι υπενθυμίσεις ανανέωσης ενεργοποιούνται αυτόματα για κάθε συμβόλαιο που προσθέτετε.",
                                    "Renewal reminders are enabled automatically for every policy you add."
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={continueFromReminders}
                                disabled={busy}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900"
                            >
                                {busy ? t("Αποθήκευση...", "Saving...") : t("Συνέχεια", "Continue")}
                            </button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                                    {t("Σύνδεση με Σύμβουλο", "Connect with Your Advisor")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t(
                                        "Αν έχετε κωδικό πρόσκλησης από τον ασφαλιστικό σας σύμβουλο, εισάγετέ τον εδώ.",
                                        "If you have an invite code from your insurance advisor, enter it here."
                                    )}
                                </p>
                            </div>

                            {connectedAgentName ? (
                                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-900/40 dark:bg-teal-900/20">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white">
                                            <Check className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-stone-900 dark:text-white">
                                                {t("Συνδεθήκατε!", "Connected!")}
                                            </p>
                                            <p className="text-xs text-stone-600 dark:text-stone-300">
                                                {t(`Σύμβουλος: ${connectedAgentName}`, `Advisor: ${connectedAgentName}`)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={(e) => { setInviteCode(e.target.value); setInviteError(null) }}
                                            placeholder={t("Εισάγετε κωδικό πρόσκλησης...", "Enter invite code...")}
                                            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-white placeholder:text-stone-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRedeemInvite}
                                            disabled={busy || !inviteCode.trim()}
                                            aria-label={t("Σύνδεση", "Connect")}
                                            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60"
                                        >
                                            <Users className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {inviteError && (
                                        <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={finishOnboarding}
                                disabled={busy}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-500 disabled:opacity-60"
                            >
                                <Wallet className="h-4 w-4" />
                                {busy ? t("Ολοκλήρωση...", "Finishing...") : t("Μετάβαση στην Αρχική", "Go to Home Dashboard")}
                            </button>

                            {!connectedAgentName && (
                                <button
                                    type="button"
                                    onClick={finishOnboarding}
                                    disabled={busy}
                                    className="w-full text-center text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition"
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
