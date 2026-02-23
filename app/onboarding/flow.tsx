"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Sparkles, Upload, Wallet } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import { completeOnboardingStep, uploadOnboardingPolicy } from "./actions"

type GoalType = "save_money" | "health_family" | "my_car"

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
    }
}

const TOTAL_STEPS = 3

function mapGoalToLegacy(goal: GoalType): string {
    if (goal === "health_family") return "understand_coverage"
    if (goal === "my_car") return "avoid_missed_renewals"
    return "save_money"
}

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

    const stepLabel = t(`Βήμα ${step} από ${TOTAL_STEPS}`, `Step ${step} of ${TOTAL_STEPS}`)
    const displayName = initialState.name || (isGreek ? "εκεί" : "there")

    useEffect(() => {
        if (step !== 3) return
        setSimulatingAi(true)
        const timer = setTimeout(() => setSimulatingAi(false), 1800)
        return () => clearTimeout(timer)
    }, [step])

    const canContinueStep1 = Boolean(goal)

    const currentGoalDescription = useMemo(() => {
        if (!goal) return null
        if (goal === "save_money") return t("Θα ξεκινήσουμε με ευκαιρίες εξοικονόμησης.", "We will prioritize savings opportunities first.")
        if (goal === "health_family") return t("Θα δώσουμε έμφαση σε υγεία και οικογενειακή κάλυψη.", "We will prioritize health and family coverage first.")
        return t("Θα ξεκινήσουμε από την ασφάλιση αυτοκινήτου σου.", "We will start from your motor coverage first.")
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
            toast.error(t("Δεν αποθηκεύτηκε η επιλογή σου.", "Could not save your choice."))
        } finally {
            setBusy(false)
        }
    }

    const continueFromStep2 = async () => {
        setBusy(true)
        try {
            if (selectedFile) {
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

    const finishOnboarding = async () => {
        setBusy(true)
        try {
            await completeOnboardingStep(3, {
                markCompleted: true,
                redirectTo: "/home",
                onboardingCompletionLocation: "home_dashboard",
                onboardingGoals: goal ? [mapGoalToLegacy(goal)] : initialState.onboardingGoals,
                onboardingUploadedPolicyId: uploadedPolicyId,
            })
        } catch {
            toast.error(t("Δεν ολοκληρώθηκε το onboarding.", "Could not finish onboarding."))
            setBusy(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 px-4 py-10 dark:from-stone-950 dark:via-stone-900 dark:to-teal-950/30">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:p-8">
                    <div className="mb-6">
                        <p className="text-xs font-black uppercase tracking-widest text-stone-500">{stepLabel}</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 dark:text-white">
                            {t(`Καλώς ήρθες, ${displayName}`, `Welcome, ${displayName}`)}
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
                                    {t("Τι έχει μεγαλύτερη σημασία για εσένα;", "What matters most to you?")}
                                </h2>
                                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                    {t("Η επιλογή αυτή προσαρμόζει το dashboard και τα πρώτα AI insights.", "This choice personalizes your dashboard and first AI insights.")}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => setGoal("save_money")}
                                    className={`rounded-2xl border px-4 py-5 text-left transition ${
                                        goal === "save_money"
                                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                                            : "border-stone-200 bg-white hover:border-teal-400 dark:border-stone-700 dark:bg-stone-900"
                                    }`}
                                >
                                    <p className="text-sm font-black text-stone-900 dark:text-white">{t("Εξοικονόμηση", "Save Money")}</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGoal("health_family")}
                                    className={`rounded-2xl border px-4 py-5 text-left transition ${
                                        goal === "health_family"
                                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                                            : "border-stone-200 bg-white hover:border-teal-400 dark:border-stone-700 dark:bg-stone-900"
                                    }`}
                                >
                                    <p className="text-sm font-black text-stone-900 dark:text-white">{t("Υγεία & Οικογένεια", "Health & Family")}</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGoal("my_car")}
                                    className={`rounded-2xl border px-4 py-5 text-left transition ${
                                        goal === "my_car"
                                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                                            : "border-stone-200 bg-white hover:border-teal-400 dark:border-stone-700 dark:bg-stone-900"
                                    }`}
                                >
                                    <p className="text-sm font-black text-stone-900 dark:text-white">{t("Το Αυτοκίνητό μου", "My Car")}</p>
                                </button>
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
                                    {t("Ανέβασε το πρώτο σου συμβόλαιο", "Upload your first policy")}
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
                                    onClick={continueFromStep2}
                                    disabled={busy}
                                    className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900"
                                >
                                    {busy ? t("Επεξεργασία...", "Processing...") : t("Συνέχεια", "Continue")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null)
                                        continueFromStep2()
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
                                    {t("Η πρώτη σου ανάλυση ετοιμάστηκε.", "Your first analysis is ready.")}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-800">
                                {simulatingAi ? (
                                    <div className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-200">
                                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                        {t("Το AI διαβάζει το συμβόλαιό σου...", "AI is reading your policy...")}
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm text-stone-700 dark:text-stone-200">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-violet-600" />
                                            <span>
                                                {uploadedPolicyId
                                                    ? t("Το συμβόλαιο προστέθηκε και είναι έτοιμο για analysis.", "Your policy was added and is ready for analysis.")
                                                    : t("Μπορείς να ξεκινήσεις χωρίς upload και να προσθέσεις συμβόλαια αργότερα.", "You can start now and upload policies later.")}
                                            </span>
                                        </div>
                                        {uploadedFileName && (
                                            <p className="font-semibold text-stone-900 dark:text-white">
                                                {t("Αρχείο:", "File:")} {uploadedFileName}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={finishOnboarding}
                                disabled={busy || simulatingAi}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-500 disabled:opacity-60"
                            >
                                <Wallet className="h-4 w-4" />
                                {busy ? t("Ολοκλήρωση...", "Finishing...") : t("Μετάβαση στην Αρχική", "Go to Home Dashboard")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

