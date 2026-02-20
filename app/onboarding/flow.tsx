"use client"

import { useEffect, useMemo, useRef, useState, type ComponentType, type DragEvent, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, BellRing, Car, Check, FileText, Heart, Home, Loader2, Shield, Sparkles, Upload } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"
import { completeOnboardingStep, uploadOnboardingPolicy } from "./actions"

type SegmentType = "individual" | "family_manager" | "small_business"
type FamiliarityType = "beginner" | "intermediate" | "experienced"
type GoalType = "save_money" | "organize_everything" | "avoid_missed_renewals" | "understand_coverage"
type CategoryType = "motor" | "health" | "property" | "life" | "other"

interface OnboardingFlowProps {
    initialState: {
        step: number
        completed: boolean
        name: string
        onboardingSegment: SegmentType | null
        onboardingGoals: string[]
        onboardingFamiliarity: FamiliarityType | null
        onboardingFileReady: boolean | null
        onboardingEntryCompleted: boolean
    }
}

const TOTAL_STEPS = 6

const categoryIcons: Record<CategoryType, ComponentType<{ className?: string }>> = {
    motor: Car,
    health: Heart,
    property: Home,
    life: Shield,
    other: FileText,
}

function stepLabel(step: number, language: "el" | "en") {
    return language === "el" ? `Βήμα ${step} από ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`
}

function getStepId(step: number, fileReady: boolean | null) {
    if (step === 1) return "welcome"
    if (step === 2) return "profile_setup"
    if (step === 3) return "file_readiness"
    if (step === 4 && fileReady === true) return "upload_policy"
    if (step === 4 && fileReady === false) return "sample_analysis"
    if (step === 5) return "reminders_setup"
    if (step === 6) return "completion"
    return "unknown"
}

function getStepVariant(step: number, fileReady: boolean | null) {
    if (step === 4) {
        if (fileReady === true) return "file_ready"
        if (fileReady === false) return "no_file_preview"
        return "undecided"
    }
    return "default"
}

export default function OnboardingFlow({ initialState }: OnboardingFlowProps) {
    const { language } = useLanguage()
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    const startsFromCheckpoint = (initialState.step || 1) <= 1 && initialState.onboardingEntryCompleted
    const initialWizardStep = startsFromCheckpoint
        ? 2
        : Math.min(Math.max(initialState.step || 1, 1), TOTAL_STEPS)
    const [step, setStep] = useState(initialWizardStep)
    const [busy, setBusy] = useState(false)

    const [segment, setSegment] = useState<SegmentType | null>(initialState.onboardingSegment)
    const [goals, setGoals] = useState<GoalType[]>(
        initialState.onboardingGoals.filter((goal): goal is GoalType => (
            goal === "save_money" ||
            goal === "organize_everything" ||
            goal === "avoid_missed_renewals" ||
            goal === "understand_coverage"
        ))
    )
    const [familiarity, setFamiliarity] = useState<FamiliarityType | null>(initialState.onboardingFamiliarity)
    const [firstCategory, setFirstCategory] = useState<CategoryType>("other")
    const [fileReady, setFileReady] = useState<boolean | null>(initialState.onboardingFileReady)
    const [uploadedPolicyId, setUploadedPolicyId] = useState<string | null>(null)
    const [sampleViewed, setSampleViewed] = useState(false)
    const [remindersEnabled, setRemindersEnabled] = useState(true)
    const [reminderChannels, setReminderChannels] = useState<string[]>(["push", "email"])
    const [showReminderChannelError, setShowReminderChannelError] = useState(false)
    const stepStartedAtRef = useRef(Date.now())

    useEffect(() => {
        const source = initialState.step > 1 && !startsFromCheckpoint ? "resume" : startsFromCheckpoint ? "checkpoint" : "new_signup"
        trackJourneyEvent("onboarding_started", {
            source,
            locale: language,
            step: initialWizardStep,
        })
        if (source === "resume") {
            trackJourneyEvent("onboarding_resumed", {
                locale: language,
                step: initialWizardStep,
            })
        }
    }, [initialState.step, initialWizardStep, language, startsFromCheckpoint])

    const currentStepId = getStepId(step, fileReady)
    const currentStepVariant = getStepVariant(step, fileReady)

    useEffect(() => {
        stepStartedAtRef.current = Date.now()
        trackJourneyEvent("onboarding_step_viewed", {
            locale: language,
            step_id: currentStepId,
            step_variant: currentStepVariant,
            skip_used: false,
        })
    }, [currentStepId, currentStepVariant, language])

    const nextBestRedirect = useMemo(() => {
        if (uploadedPolicyId) return "/wallet"
        if (fileReady) return "/wallet/add?method=upload"
        if (goals.includes("avoid_missed_renewals")) return "/notifications"
        return "/wallet"
    }, [uploadedPolicyId, fileReady, goals])

    const getElapsedMs = () => Math.max(0, Date.now() - stepStartedAtRef.current)

    const persistAndGo = async (
        nextStep: number,
        data?: Record<string, unknown>,
        options?: { skipUsed?: boolean }
    ) => {
        setBusy(true)
        try {
            await completeOnboardingStep(nextStep, data)
            trackJourneyEvent("onboarding_step_completed", {
                locale: language,
                step_id: currentStepId,
                step_variant: currentStepVariant,
                elapsed_ms: getElapsedMs(),
                skip_used: Boolean(options?.skipUsed),
            })
            setStep(nextStep)
        } catch (error) {
            trackJourneyEvent("onboarding_step_failed", {
                locale: language,
                step_id: currentStepId,
                step_variant: currentStepVariant,
                elapsed_ms: getElapsedMs(),
                error_code: error instanceof Error ? error.message.slice(0, 80) : "persist_failed",
            })
            toast.error(t("ÎšÎ¬Ï„Î¹ Ï€Î®Î³Îµ ÏƒÏ„ÏÎ±Î²Î¬. Î”Î¿ÎºÎ¯Î¼Î±ÏƒÎµ Î¾Î±Î½Î¬.", "Something went wrong. Please try again."))
        } finally {
            setBusy(false)
        }
    }

    const finishOnboarding = async (redirectTo: string, location: string) => {
        setBusy(true)
        try {
            trackJourneyEvent("onboarding_step_completed", {
                locale: language,
                step_id: currentStepId,
                step_variant: currentStepVariant,
                elapsed_ms: getElapsedMs(),
                skip_used: false,
            })
            trackJourneyEvent("next_best_action_clicked", {
                locale: language,
                step_id: currentStepId,
                step_variant: currentStepVariant,
                target_route: redirectTo,
                location,
            })
            trackJourneyEvent("onboarding_completed", {
                locale: language,
                steps_completed: TOTAL_STEPS,
                first_category_engaged: firstCategory,
                has_file_ready: Boolean(fileReady),
            })
            await completeOnboardingStep(TOTAL_STEPS + 1, {
                markCompleted: true,
                redirectTo,
                onboardingSegment: segment,
                onboardingGoals: goals,
                onboardingFamiliarity: familiarity,
                onboardingFileReady: fileReady,
                onboardingFirstCategory: firstCategory,
                onboardingReminderOptIn: remindersEnabled,
                onboardingReminderChannels: remindersEnabled ? reminderChannels : [],
                onboardingSampleViewed: sampleViewed,
                onboardingUploadedPolicyId: uploadedPolicyId,
                onboardingCompletionLocation: location,
            })
        } catch (error) {
            trackJourneyEvent("onboarding_step_failed", {
                locale: language,
                step_id: currentStepId,
                step_variant: currentStepVariant,
                elapsed_ms: getElapsedMs(),
                error_code: error instanceof Error ? error.message.slice(0, 80) : "onboarding_finish_failed",
            })
            toast.error(t("Î”ÎµÎ½ Î¿Î»Î¿ÎºÎ»Î·ÏÏŽÎ¸Î·ÎºÎµ Ï„Î¿ onboarding. Î”Î¿ÎºÎ¯Î¼Î±ÏƒÎµ Î¾Î±Î½Î¬.", "Could not finish onboarding. Please try again."))
            setBusy(false)
        }
    }

    const handleSkipAll = async (location: string) => {
        trackJourneyEvent("onboarding_skipped", {
            locale: language,
            step,
            location,
        })
        trackJourneyEvent("onboarding_step_completed", {
            locale: language,
            step_id: currentStepId,
            step_variant: currentStepVariant,
            elapsed_ms: getElapsedMs(),
            skip_used: true,
        })
        await finishOnboarding("/wallet", location)
    }

    return (
        <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>{stepLabel(step, language)}</span>
                    <button
                        type="button"
                        onClick={() => handleSkipAll("header_save_exit")}
                        disabled={busy}
                        className="rounded-lg px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        {t("Î‘Ï€Î¿Î¸Î®ÎºÎµÏ…ÏƒÎ· & Î­Î¾Î¿Î´Î¿Ï‚", "Save & exit")}
                    </button>
                </div>

                <div
                    className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                    role="progressbar"
                    aria-label={t("Πρόοδος onboarding", "Onboarding progress")}
                    aria-valuemin={1}
                    aria-valuemax={TOTAL_STEPS}
                    aria-valuenow={step}
                >
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    />
                </div>

                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={`step-${step}-${fileReady === null ? "unset" : fileReady ? "ready" : "preview"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {step === 1 ? (
                            <WelcomeStep
                                name={initialState.name}
                                language={language}
                                busy={busy}
                                onPrimary={() => persistAndGo(2)}
                                onSecondary={() => handleSkipAll("welcome_step")}
                            />
                        ) : null}

                        {step === 2 ? (
                            <ProfileStep
                                language={language}
                                busy={busy}
                                segment={segment}
                                goals={goals}
                                familiarity={familiarity}
                                firstCategory={firstCategory}
                                onSegmentChange={setSegment}
                                onGoalsChange={setGoals}
                                onFamiliarityChange={setFamiliarity}
                                onFirstCategoryChange={setFirstCategory}
                                onPrimary={async () => {
                                    if (segment) {
                                        trackJourneyEvent("segment_selected", { locale: language, user_segment: segment })
                                    }
                                    if (goals.length > 0) {
                                        trackJourneyEvent("goal_selected", { locale: language, selected_goals: goals.join(",") })
                                    }
                                    if (familiarity) {
                                        trackJourneyEvent("familiarity_selected", { locale: language, insurance_familiarity: familiarity })
                                    }
                                    await persistAndGo(3, {
                                        onboardingSegment: segment,
                                        onboardingGoals: goals,
                                        onboardingFamiliarity: familiarity,
                                        onboardingFirstCategory: firstCategory,
                                        onboardingProfileStepCompletedAt: new Date().toISOString(),
                                    })
                                }}
                                onSecondary={async () => {
                                    trackJourneyEvent("onboarding_skipped", {
                                        locale: language,
                                        step: 2,
                                        location: "profile_step",
                                    })
                                    await persistAndGo(3, {
                                        onboardingProfileSkipped: true,
                                    }, { skipUsed: true })
                                }}
                            />
                        ) : null}

                        {step === 3 ? (
                            <PathStep
                                language={language}
                                busy={busy}
                                fileReady={fileReady}
                                onFileReadyChange={setFileReady}
                                onPrimary={async () => {
                                    if (fileReady === null) {
                                        toast.error(t("Î•Ï€Î¯Î»ÎµÎ¾Îµ Î¼Î¯Î± ÎµÏ€Î¹Î»Î¿Î³Î® Î³Î¹Î± Î½Î± ÏƒÏ…Î½ÎµÏ‡Î¯ÏƒÎµÎ¹Ï‚.", "Pick one option to continue."))
                                        return
                                    }
                                    trackJourneyEvent("file_ready_selected", {
                                        locale: language,
                                        has_file_ready: fileReady,
                                        source: "onboarding_path_step",
                                    })
                                    await persistAndGo(4, {
                                        onboardingFileReady: fileReady,
                                        onboardingPathChosenAt: new Date().toISOString(),
                                    })
                                }}
                                onSecondary={() => handleSkipAll("path_step")}
                            />
                        ) : null}

                        {step === 4 && fileReady ? (
                            <UploadValueStep
                                language={language}
                                busy={busy}
                                onUploaded={async (policyId) => {
                                    setUploadedPolicyId(policyId)
                                    trackJourneyEvent("first_policy_uploaded", {
                                        policy_id: policyId,
                                        source: "onboarding_upload_step",
                                    })
                                    await persistAndGo(5, {
                                        onboardingUploadedPolicyId: policyId,
                                        onboardingUploadCompletedAt: new Date().toISOString(),
                                    })
                                }}
                                onContinueWithoutUpload={() => persistAndGo(5, { onboardingUploadSkipped: true }, { skipUsed: true })}
                                onSwitchToPreview={async () => {
                                    setFileReady(false)
                                    trackJourneyEvent("file_ready_selected", {
                                        locale: language,
                                        has_file_ready: false,
                                        source: "upload_step_switch",
                                    })
                                    await completeOnboardingStep(4, { onboardingFileReady: false })
                                }}
                            />
                        ) : null}

                        {step === 4 && fileReady === false ? (
                            <SampleValueStep
                                language={language}
                                busy={busy}
                                viewed={sampleViewed}
                                firstCategory={firstCategory}
                                onRunSample={() => {
                                    setSampleViewed(true)
                                    trackJourneyEvent("sample_analysis_viewed", {
                                        locale: language,
                                        first_category_engaged: firstCategory,
                                    })
                                }}
                                onContinue={() => persistAndGo(5, { onboardingSampleViewed: sampleViewed })}
                                onSwitchToUpload={async () => {
                                    setFileReady(true)
                                    trackJourneyEvent("file_ready_selected", {
                                        locale: language,
                                        has_file_ready: true,
                                        source: "sample_step_switch",
                                    })
                                    await completeOnboardingStep(4, { onboardingFileReady: true })
                                }}
                            />
                        ) : null}

                        {step === 5 ? (
                            <RemindersStep
                                language={language}
                                busy={busy}
                                remindersEnabled={remindersEnabled}
                                channels={reminderChannels}
                                showChannelError={showReminderChannelError}
                                onRemindersEnabledChange={(enabled) => {
                                    setRemindersEnabled(enabled)
                                    setShowReminderChannelError(false)
                                    if (enabled && reminderChannels.length === 0) {
                                        setReminderChannels(["push"])
                                    }
                                }}
                                onChannelsChange={(channels) => {
                                    setReminderChannels(channels)
                                    if (channels.length > 0) {
                                        setShowReminderChannelError(false)
                                    }
                                }}
                                onPrimary={async () => {
                                    if (remindersEnabled && reminderChannels.length === 0) {
                                        setShowReminderChannelError(true)
                                        toast.error(t("Επίλεξε τουλάχιστον ένα κανάλι υπενθύμισης.", "Select at least one reminder channel."))
                                        return
                                    }
                                    setShowReminderChannelError(false)
                                    trackJourneyEvent("reminders_opt_in", {
                                        locale: language,
                                        enabled: remindersEnabled,
                                        channels: remindersEnabled ? reminderChannels.join(",") : "",
                                    })
                                    await persistAndGo(6, {
                                        onboardingReminderOptIn: remindersEnabled,
                                        onboardingReminderChannels: remindersEnabled ? reminderChannels : [],
                                    })
                                }}
                                onSecondary={async () => {
                                    trackJourneyEvent("reminders_opt_in", {
                                        locale: language,
                                        enabled: false,
                                        channels: "",
                                    })
                                    setShowReminderChannelError(false)
                                    setRemindersEnabled(false)
                                    setReminderChannels([])
                                    await persistAndGo(6, {
                                        onboardingReminderOptIn: false,
                                        onboardingReminderChannels: [],
                                        onboardingReminderSkipped: true,
                                    }, { skipUsed: true })
                                }}
                            />
                        ) : null}

                        {step === 6 ? (
                            <CompletionStep
                                language={language}
                                busy={busy}
                                hasUploadedPolicy={Boolean(uploadedPolicyId)}
                                nextBestRedirect={nextBestRedirect}
                                onPrimary={() => finishOnboarding(nextBestRedirect, "completion_primary")}
                                onSecondary={() => finishOnboarding("/wallet", "completion_secondary")}
                            />
                        ) : null}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

function CardShell({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            {children}
        </div>
    )
}

function WelcomeStep({
    name,
    language,
    busy,
    onPrimary,
    onSecondary,
}: {
    name: string
    language: "el" | "en"
    busy: boolean
    onPrimary: () => void
    onSecondary: () => void
}) {
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    return (
        <CardShell>
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t(`ÎšÎ±Î»ÏŽÏ‚ Î®ÏÎ¸ÎµÏ‚, ${name}`, `Welcome, ${name}`)}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {t("Î˜Î± Ï€ÏÎ¿ÏƒÎ±ÏÎ¼ÏŒÏƒÎ¿Ï…Î¼Îµ Ï„Î¿ wallet ÏƒÎ¿Ï… ÏƒÎµ 2 Î»ÎµÏ€Ï„Î¬. Î§Ï‰ÏÎ¯Ï‚ ÎºÎ¬ÏÏ„Î±, Ï‡Ï‰ÏÎ¯Ï‚ Î´ÎµÏƒÎ¼ÎµÏÏƒÎµÎ¹Ï‚.", "We will tailor your wallet in about 2 minutes. No card, no commitment.")}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{t("Î”ÎµÏ‚ AI ÏƒÏÎ½Î¿ÏˆÎ· ÏƒÏ…Î¼Î²Î¿Î»Î±Î¯Î¿Ï… ÏƒÎµ Î±Ï€Î»Î® Î³Î»ÏŽÏƒÏƒÎ±.", "See AI policy summaries in plain language.")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{t("ÎŸÏÎ³Î¬Î½Ï‰ÏƒÎµ Î­Î³Î³ÏÎ±Ï†Î± ÏƒÎµ Î­Î½Î± Î±ÏƒÏ†Î±Î»Î­Ï‚ ÏƒÎ·Î¼ÎµÎ¯Î¿.", "Organize documents in one secure place.")}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{t("Î•Î½ÎµÏÎ³Î¿Ï€Î¿Î¯Î·ÏƒÎµ Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÎ¹Ï‚ Î±Î½Î±Î½Î­Ï‰ÏƒÎ·Ï‚.", "Turn on renewal reminders.")}</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onPrimary} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {t("ÎžÎµÎºÎ¯Î½Î± setup", "Start setup")}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={onSecondary} disabled={busy} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î Î±ÏÎ¬Î»ÎµÎ¹ÏˆÎ· Î³Î¹Î± Ï„ÏŽÏÎ±", "Skip for now")}
                </button>
            </div>
        </CardShell>
    )
}

function ProfileStep(props: {
    language: "el" | "en"
    busy: boolean
    segment: SegmentType | null
    goals: GoalType[]
    familiarity: FamiliarityType | null
    firstCategory: CategoryType
    onSegmentChange: (value: SegmentType) => void
    onGoalsChange: (value: GoalType[]) => void
    onFamiliarityChange: (value: FamiliarityType) => void
    onFirstCategoryChange: (value: CategoryType) => void
    onPrimary: () => void
    onSecondary: () => void
}) {
    const isGreek = props.language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    const goalOptions: Array<{ id: GoalType; label: string }> = [
        { id: "save_money", label: t("ÎÎ± Î¼ÎµÎ¹ÏŽÏƒÏ‰ ÎºÏŒÏƒÏ„Î¿Ï‚", "Save money") },
        { id: "organize_everything", label: t("ÎÎ± Î¿ÏÎ³Î±Î½ÏŽÏƒÏ‰ Ï„Î± Ï€Î¬Î½Ï„Î±", "Organize everything") },
        { id: "avoid_missed_renewals", label: t("ÎÎ± Î¼Î·Î½ Ï‡Î¬Î½Ï‰ Î±Î½Î±Î½ÎµÏŽÏƒÎµÎ¹Ï‚", "Avoid missed renewals") },
        { id: "understand_coverage", label: t("ÎÎ± ÎºÎ±Ï„Î±Î»Î±Î²Î±Î¯Î½Ï‰ ÎºÎ±Î»ÏÏˆÎµÎ¹Ï‚", "Understand coverage") },
    ]

    const toggleGoal = (goal: GoalType) => {
        if (props.goals.includes(goal)) {
            props.onGoalsChange(props.goals.filter((item) => item !== goal))
            return
        }
        props.onGoalsChange([...props.goals, goal])
    }

    return (
        <CardShell>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Î ÏÎ¿ÏƒÎ±ÏÎ¼Î¿Î³Î® ÎµÎ¼Ï€ÎµÎ¹ÏÎ¯Î±Ï‚", "Personalize your experience")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Î ÏÎ¿Î±Î¹ÏÎµÏ„Î¹ÎºÏŒ. ÎœÎµ Î±Ï…Ï„ÏŒ Î¸Î± ÏƒÎ¿Ï… Î´ÎµÎ¯Î¾Î¿Ï…Î¼Îµ Ï€Î¹Î¿ Ï‡ÏÎ®ÏƒÎ¹Î¼Î± Ï€ÏÏŽÏ„Î± Î²Î®Î¼Î±Ï„Î±.", "Optional. This helps us show the most relevant first actions.")}</p>

            <div className="mt-6 space-y-5">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Î ÏÎ¿Ï†Î¯Î»", "Profile")}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                            { id: "individual" as const, label: t("Î™Î´Î¹ÏŽÏ„Î·Ï‚", "Individual") },
                            { id: "family_manager" as const, label: t("ÎŸÎ¹ÎºÎ¿Î³Î­Î½ÎµÎ¹Î±", "Family manager") },
                            { id: "small_business" as const, label: t("ÎœÎ¹ÎºÏÎ® ÎµÏ€Î¹Ï‡ÎµÎ¯ÏÎ·ÏƒÎ·", "Small business") },
                        ].map((item) => (
                            <button key={item.id} type="button" onClick={() => props.onSegmentChange(item.id)} className={`rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.segment === item.id ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Î£Ï„ÏŒÏ‡Î¿Î¹", "Goals")}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {goalOptions.map((goal) => (
                            <button key={goal.id} type="button" onClick={() => toggleGoal(goal.id)} className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.goals.includes(goal.id) ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                                {goal.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Î•Î¼Ï€ÎµÎ¹ÏÎ¯Î± Î¼Îµ Î±ÏƒÏ†Î¬Î»Î¹ÏƒÎ·", "Insurance familiarity")}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                            { id: "beginner" as const, label: t("ÎÎ­Î¿Ï‚/Î±", "Beginner") },
                            { id: "intermediate" as const, label: t("ÎœÎ­Ï„ÏÎ¹Î±", "Intermediate") },
                            { id: "experienced" as const, label: t("ÎˆÎ¼Ï€ÎµÎ¹ÏÎ¿Ï‚/Î·", "Experienced") },
                        ].map((item) => (
                            <button key={item.id} type="button" onClick={() => props.onFamiliarityChange(item.id)} className={`rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.familiarity === item.id ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("Î ÏÏŽÏ„Î· ÎºÎ±Ï„Î·Î³Î¿ÏÎ¯Î±", "First category")}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {(Object.keys(categoryIcons) as CategoryType[]).map((category) => {
                            const Icon = categoryIcons[category]
                            const label = category === "motor"
                                ? t("Î‘Ï…Ï„Î¿ÎºÎ¯Î½Î·Ï„Î¿", "Motor")
                                : category === "health"
                                    ? t("Î¥Î³ÎµÎ¯Î±", "Health")
                                    : category === "property"
                                        ? t("ÎšÎ±Ï„Î¿Î¹ÎºÎ¯Î±", "Property")
                                        : category === "life"
                                            ? t("Î–Ï‰Î®", "Life")
                                            : t("Î†Î»Î»Î¿", "Other")
                            return (
                                <button key={category} type="button" onClick={() => props.onFirstCategoryChange(category)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.firstCategory === category ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={props.onPrimary} disabled={props.busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {t("Î£Ï…Î½Î­Ï‡ÎµÎ¹Î±", "Continue")}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={props.onSecondary} disabled={props.busy} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î Î±ÏÎ¬Î»ÎµÎ¹ÏˆÎ· Î³Î¹Î± Ï„ÏŽÏÎ±", "Skip for now")}
                </button>
            </div>
        </CardShell>
    )
}

function PathStep(props: {
    language: "el" | "en"
    busy: boolean
    fileReady: boolean | null
    onFileReadyChange: (value: boolean) => void
    onPrimary: () => void
    onSecondary: () => void
}) {
    const isGreek = props.language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    return (
        <CardShell>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("ÎˆÏ‡ÎµÎ¹Ï‚ ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î¿ Î­Ï„Î¿Î¹Î¼Î¿;", "Do you have a policy file ready?")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Î•Ï€Î¯Î»ÎµÎ¾Îµ Ï„Î·Î½ Ï€Î¹Î¿ Î³ÏÎ®Î³Î¿ÏÎ· Î´Î¹Î±Î´ÏÎ¿Î¼Î® Î³Î¹Î± Ï„Î¿ Ï€ÏÏŽÏ„Î¿ Î±Ï€Î¿Ï„Î­Î»ÎµÏƒÎ¼Î±.", "Choose the fastest path to your first result.")}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => props.onFileReadyChange(true)} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.fileReady === true ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("ÎÎ±Î¹, Î±Î½ÎµÎ²Î¬Î¶Ï‰ Ï„ÏŽÏÎ±", "Yes, upload now")}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("Î Î¬ÏÎµ Ï€ÏÎ±Î³Î¼Î±Ï„Î¹ÎºÎ® AI Î±Î½Î¬Î»Ï…ÏƒÎ· Î±Ï€ÏŒ Ï„Î¿ Î­Î³Î³ÏÎ±Ï†ÏŒ ÏƒÎ¿Ï….", "Get real AI insights from your document.")}</p>
                </button>
                <button type="button" onClick={() => props.onFileReadyChange(false)} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.fileReady === false ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("ÎŒÏ‡Î¹ Î±ÎºÏŒÎ¼Î±", "Not right now")}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("Î”ÎµÏ‚ sample AI Î±Î½Î¬Î»Ï…ÏƒÎ· ÎºÎ±Î¹ Î¾ÎµÎºÎ¯Î½Î± Ï‡Ï‰ÏÎ¯Ï‚ Î±ÏÏ‡ÎµÎ¯Î¿.", "See a sample AI analysis and start without a file.")}</p>
                </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={props.onPrimary} disabled={props.busy || props.fileReady === null} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {t("Î£Ï…Î½Î­Ï‡ÎµÎ¹Î±", "Continue")}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={props.onSecondary} disabled={props.busy} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î Î±ÏÎ¬Î»ÎµÎ¹ÏˆÎ· onboarding", "Skip onboarding")}
                </button>
            </div>
        </CardShell>
    )
}

function UploadValueStep({
    language,
    busy,
    onUploaded,
    onContinueWithoutUpload,
    onSwitchToPreview,
}: {
    language: "el" | "en"
    busy: boolean
    onUploaded: (policyId: string) => Promise<void>
    onContinueWithoutUpload: () => void
    onSwitchToPreview: () => Promise<void>
}) {
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    const handleFile = async (file: File) => {
        setUploading(true)
        const fileType = (file.name.split(".").pop() || file.type || "unknown").toLowerCase()
        const fileSizeKb = Math.max(1, Math.round(file.size / 1024))
        trackJourneyEvent("policy_upload_started", {
            locale: language,
            step_id: "upload_policy",
            file_type: fileType,
            file_size_kb: fileSizeKb,
            source: "onboarding_upload_step",
        })

        const formData = new FormData()
        formData.append("file", file)

        try {
            const result = await uploadOnboardingPolicy(formData)
            if (!result.success || !result.policyId) {
                trackJourneyEvent("policy_upload_failed", {
                    locale: language,
                    step_id: "upload_policy",
                    file_type: fileType,
                    source: "onboarding_upload_step",
                    error_code: "upload_failed_no_policy_id",
                })
                toast.error(result.error || t("Î— Î¼ÎµÏ„Î±Ï†ÏŒÏÏ„Ï‰ÏƒÎ· Î±Ï€Î­Ï„Ï…Ï‡Îµ.", "Upload failed."))
                setUploading(false)
                return
            }
            trackJourneyEvent("policy_upload_completed", {
                locale: language,
                step_id: "upload_policy",
                policy_id: result.policyId,
                source: "onboarding_upload_step",
            })
            await onUploaded(result.policyId)
        } catch (error) {
            trackJourneyEvent("policy_upload_failed", {
                locale: language,
                step_id: "upload_policy",
                file_type: fileType,
                source: "onboarding_upload_step",
                error_code: error instanceof Error ? error.message.slice(0, 80) : "upload_failed_exception",
            })
            toast.error(t("Î— Î¼ÎµÏ„Î±Ï†ÏŒÏÏ„Ï‰ÏƒÎ· Î±Ï€Î­Ï„Ï…Ï‡Îµ. Î”Î¿ÎºÎ¯Î¼Î±ÏƒÎµ Î¾Î±Î½Î¬.", "Upload failed. Please try again."))
            setUploading(false)
        }
    }

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragActive(false)
        const file = event.dataTransfer.files?.[0]
        if (file) {
            void handleFile(file)
        }
    }

    return (
        <CardShell>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Î‘Î½Î­Î²Î±ÏƒÎµ Ï„Î¿ Ï€ÏÏŽÏ„Î¿ ÏƒÎ¿Ï… ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î¿", "Upload your first policy")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("ÎœÏŒÎ»Î¹Ï‚ Î±Î½Î­Î²ÎµÎ¹ Ï„Î¿ Î±ÏÏ‡ÎµÎ¯Î¿, Î¾ÎµÎºÎ¹Î½Î¬ Î· AI Î±Î½Î¬Î»Ï…ÏƒÎ·.", "AI analysis starts right after upload.")}</p>

            <div
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
                onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
                onDrop={onDrop}
                className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${dragActive ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Î‘Î½Î¬Î»Ï…ÏƒÎ· ÎµÎ³Î³ÏÎ¬Ï†Î¿Ï…...", "Analyzing document...")}</p>
                    </div>
                ) : (
                    <>
                        <Upload className="mx-auto h-8 w-8 text-slate-500" />
                        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t("Î£ÏÏÎµ Î±ÏÏ‡ÎµÎ¯Î¿ Î® ÎµÏ€Î¯Î»ÎµÎ¾Îµ Î±Ï€ÏŒ Ï„Î· ÏƒÏ…ÏƒÎºÎµÏ…Î® ÏƒÎ¿Ï…", "Drag a file or choose from your device")}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("PDF, JPG, PNG Î­Ï‰Ï‚ 15MB", "PDF, JPG, PNG up to 15MB")}</p>
                        <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                            {t("Î•Ï€Î¹Î»Î¿Î³Î® Î±ÏÏ‡ÎµÎ¯Î¿Ï…", "Choose file")}
                            <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) {
                                    void handleFile(file)
                                }
                            }} />
                        </label>
                    </>
                )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onContinueWithoutUpload} disabled={busy || uploading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {t("Î£Ï…Î½Î­Ï‡ÎµÎ¹Î± Ï‡Ï‰ÏÎ¯Ï‚ upload", "Continue without upload")}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void onSwitchToPreview()} disabled={busy || uploading} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î”ÎµÎ½ Î­Ï‡Ï‰ Î±ÏÏ‡ÎµÎ¯Î¿ Ï„ÏŽÏÎ±", "I do not have a file now")}
                </button>
            </div>
        </CardShell>
    )
}

function SampleValueStep({
    language,
    busy,
    viewed,
    firstCategory,
    onRunSample,
    onContinue,
    onSwitchToUpload,
}: {
    language: "el" | "en"
    busy: boolean
    viewed: boolean
    firstCategory: CategoryType
    onRunSample: () => void
    onContinue: () => void
    onSwitchToUpload: () => Promise<void>
}) {
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)
    const [loadingPreview, setLoadingPreview] = useState(false)

    const runPreview = async () => {
        setLoadingPreview(true)
        trackJourneyEvent("sample_analysis_started", {
            locale: language,
            step_id: "sample_analysis",
            first_category_engaged: firstCategory,
        })
        await new Promise((resolve) => setTimeout(resolve, 1200))
        onRunSample()
        setLoadingPreview(false)
    }

    return (
        <CardShell>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Î“ÏÎ®Î³Î¿ÏÎ¿ AI preview", "Quick AI preview")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Î Î¬ÏÎµ Ï„Î¿ Ï€ÏÏŽÏ„Î¿ value Ï‡Ï‰ÏÎ¯Ï‚ Î½Î± Î±Î½ÎµÎ²Î¬ÏƒÎµÎ¹Ï‚ Î±ÏÏ‡ÎµÎ¯Î¿ Ï„ÏŽÏÎ±.", "Get first value without uploading a file right now.")}</p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                {viewed ? (
                    <>
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t("Sample insight Î­Ï„Î¿Î¹Î¼Î¿", "Sample insight ready")}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{t("Î Î¹Î¸Î±Î½ÏŒ ÎºÎµÎ½ÏŒ ÎºÎ¬Î»Ï…ÏˆÎ·Ï‚ ÎµÎ½Ï„Î¿Ï€Î¯ÏƒÏ„Î·ÎºÎµ", "Potential coverage gap detected")}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {firstCategory === "health"
                                ? t("Î— Î±Î½Î¬Î»Ï…ÏƒÎ· Ï€ÏÎ¿Ï„ÎµÎ¯Î½ÎµÎ¹ Î½Î± ÎµÎ»Î­Î³Î¾ÎµÎ¹Ï‚ ÏŒÏÎ¹Î± Î½Î¿ÏƒÎ¿ÎºÎ¿Î¼ÎµÎ¹Î±ÎºÎ®Ï‚ ÎºÎ¬Î»Ï…ÏˆÎ·Ï‚.", "The analysis suggests reviewing hospitalization limits.")
                                : firstCategory === "motor"
                                    ? t("Î— Î±Î½Î¬Î»Ï…ÏƒÎ· Ï€ÏÎ¿Ï„ÎµÎ¯Î½ÎµÎ¹ Î­Î»ÎµÎ³Ï‡Î¿ Î³Î¹Î± Î´Î¹Ï€Î»Î­Ï‚ Î¿Î´Î¹ÎºÎ­Ï‚ ÎºÎ±Î»ÏÏˆÎµÎ¹Ï‚.", "The analysis suggests checking for duplicate roadside cover.")
                                    : t("Î— Î±Î½Î¬Î»Ï…ÏƒÎ· Ï€ÏÎ¿Ï„ÎµÎ¯Î½ÎµÎ¹ Î­Î»ÎµÎ³Ï‡Î¿ ÎµÎ¾Î±Î¹ÏÎ­ÏƒÎµÏ‰Î½ ÎºÎ±Î¹ Î¿ÏÎ¯Ï‰Î½ ÎºÎ¬Î»Ï…ÏˆÎ·Ï‚.", "The analysis suggests reviewing exclusions and coverage limits.")}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("Î”ÎµÏ‚ Ï€ÏŽÏ‚ Î¸Î± Î¼Î¿Î¹Î¬Î¶ÎµÎ¹ Î· Î±Î½Î¬Î»Ï…ÏƒÎ·", "See what analysis looks like")}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("Î˜Î± ÎµÎ¼Ï†Î±Î½Î¯ÏƒÎ¿Ï…Î¼Îµ Î­Î½Î± Ï€Î±ÏÎ¬Î´ÎµÎ¹Î³Î¼Î± ÏƒÏÎ½Î¿ÏˆÎ·Ï‚ Î¼Îµ Ï€ÏÎ¿Ï„ÎµÎ¹Î½ÏŒÎ¼ÎµÎ½Î· ÎµÎ½Î­ÏÎ³ÎµÎ¹Î±.", "We will show a sample summary with a recommended action.")}</p>
                    </>
                )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => void runPreview()} disabled={busy || loadingPreview || viewed} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {viewed ? t("Î¤Î¿ sample Î­Ï‡ÎµÎ¹ ÎµÎºÏ„ÎµÎ»ÎµÏƒÏ„ÎµÎ¯", "Sample already run") : t("Î•ÎºÏ„Î­Î»ÎµÏƒÎ· sample Î±Î½Î¬Î»Ï…ÏƒÎ·Ï‚", "Run sample analysis")}
                </button>
                <button type="button" onClick={onContinue} disabled={busy || loadingPreview} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î£Ï…Î½Î­Ï‡ÎµÎ¹Î±", "Continue")}
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
            <button type="button" onClick={() => void onSwitchToUpload()} disabled={busy || loadingPreview} className="mt-3 text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300">
                {t("ÎˆÏ‡Ï‰ Î±ÏÏ‡ÎµÎ¯Î¿, Î¸Î­Î»Ï‰ upload Ï„ÏŽÏÎ±", "I have a file, upload now")}
            </button>
        </CardShell>
    )
}

function RemindersStep(props: {
    language: "el" | "en"
    busy: boolean
    remindersEnabled: boolean
    channels: string[]
    showChannelError: boolean
    onRemindersEnabledChange: (enabled: boolean) => void
    onChannelsChange: (channels: string[]) => void
    onPrimary: () => void
    onSecondary: () => void
}) {
    const isGreek = props.language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)

    const toggleChannel = (channel: string) => {
        if (props.channels.includes(channel)) {
            props.onChannelsChange(props.channels.filter((item) => item !== channel))
            return
        }
        props.onChannelsChange([...props.channels, channel])
    }

    return (
        <CardShell>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <BellRing className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Î¥Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÎ¹Ï‚ Î±Î½Î±Î½Î­Ï‰ÏƒÎ·Ï‚", "Renewal reminders")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Î•Î½ÎµÏÎ³Î¿Ï€Î¿Î¯Î·ÏƒÎµ Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÎ¹Ï‚ Î³Î¹Î± Î½Î± Î¼Î·Î½ Ï‡Î¬Î½ÎµÎ¹Ï‚ Ï€ÏÎ¿Î¸ÎµÏƒÎ¼Î¯ÎµÏ‚.", "Enable reminders so you do not miss important dates.")}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("Μπορείς να αλλάξεις αυτές τις ρυθμίσεις αργότερα από το Κέντρο Ειδοποιήσεων.", "You can change these preferences later from Notification center.")}</p>

            <label className="mt-5 flex items-center justify-between rounded-xl border border-slate-300 p-3 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Î•Î½ÎµÏÎ³Î¿Ï€Î¿Î¯Î·ÏƒÎ· Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÏ‰Î½", "Enable reminders")}</span>
                <input type="checkbox" checked={props.remindersEnabled} onChange={(event) => props.onRemindersEnabledChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700" />
            </label>

            <div className={`mt-4 grid grid-cols-2 gap-2 ${props.remindersEnabled ? "" : "opacity-50"}`}>
                {["push", "email"].map((channel) => (
                    <button
                        key={channel}
                        type="button"
                        disabled={!props.remindersEnabled}
                        aria-pressed={props.channels.includes(channel)}
                        onClick={() => toggleChannel(channel)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${props.channels.includes(channel) ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}
                    >
                        {channel === "push" ? t("Push ÎµÎ¹Î´Î¿Ï€Î¿Î¹Î®ÏƒÎµÎ¹Ï‚", "Push notifications") : t("Email Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÎ¹Ï‚", "Email reminders")}
                    </button>
                ))}
            </div>
            {props.showChannelError && props.remindersEnabled ? (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                    {t("Επίλεξε τουλάχιστον ένα κανάλι πριν συνεχίσεις.", "Select at least one channel before continuing.")}
                </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={props.onPrimary} disabled={props.busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {t("Î£Ï…Î½Î­Ï‡ÎµÎ¹Î±", "Continue")}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={props.onSecondary} disabled={props.busy} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("Î‘ÏÎ³ÏŒÏ„ÎµÏÎ±", "Later")}
                </button>
            </div>
        </CardShell>
    )
}

function CompletionStep({
    language,
    busy,
    hasUploadedPolicy,
    nextBestRedirect,
    onPrimary,
    onSecondary,
}: {
    language: "el" | "en"
    busy: boolean
    hasUploadedPolicy: boolean
    nextBestRedirect: string
    onPrimary: () => void
    onSecondary: () => void
}) {
    const isGreek = language === "el"
    const t = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)
    const primaryLabel = hasUploadedPolicy
        ? t("Î Î®Î³Î±Î¹Î½Îµ ÏƒÏ„Î¿ Wallet", "Go to wallet")
        : nextBestRedirect.includes("/wallet/add")
            ? t("Î‘Î½Î­Î²Î±ÏƒÎµ Ï€ÏÏŽÏ„Î¿ ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î¿", "Upload first policy")
            : t("Î£Ï…Î½Î­Ï‡Î¹ÏƒÎµ ÏƒÏ„Î¿ Wallet", "Continue to wallet")

    return (
        <CardShell>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <Check className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("Î¤Î¿ wallet ÏƒÎ¿Ï… ÎµÎ¯Î½Î±Î¹ Î­Ï„Î¿Î¹Î¼Î¿", "Your wallet is ready")}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("ÎˆÏ‡ÎµÎ¹Ï‚ Ï€Î¬Î½Ï„Î± ÎµÏ€ÏŒÎ¼ÎµÎ½Î¿ Î²Î®Î¼Î±: upload, AI Î±Î½Î¬Î»Ï…ÏƒÎ· Î® ÏÏ…Î¸Î¼Î¯ÏƒÎµÎ¹Ï‚ Ï…Ï€ÎµÎ½Î¸Ï…Î¼Î¯ÏƒÎµÏ‰Î½.", "You always have a next step: upload, AI analysis, or reminder settings.")}</p>

            <div className="mt-5 space-y-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                    {t("1. Î ÏÏŒÏƒÎ¸ÎµÏƒÎµ ÏƒÏ…Î¼Î²ÏŒÎ»Î±Î¹Î¿ Î® Î´ÎµÏ‚ Ï„Î¹Ï‚ Ï…Ï€Î¬ÏÏ‡Î¿Ï…ÏƒÎµÏ‚ Î±Î½Î±Î»ÏÏƒÎµÎ¹Ï‚.", "1. Add a policy or review your existing analyses.")}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                    {t("2. ÎˆÎ»ÎµÎ³Î¾Îµ usage AI ÎºÎ±Î¹ credits ÏŒÏ„Î±Î½ Ï‡ÏÎµÎ¹Î±ÏƒÏ„ÎµÎ¯.", "2. Check AI usage and credits when needed.")}
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onPrimary} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={onSecondary} disabled={busy} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("ÎœÎµÏ„Î¬Î²Î±ÏƒÎ· ÏƒÏ„Î·Î½ Î±ÏÏ‡Î¹ÎºÎ® Ï„Î¿Ï… wallet", "Go to wallet home")}
                </button>
            </div>
        </CardShell>
    )
}

