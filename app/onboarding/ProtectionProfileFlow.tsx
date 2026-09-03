"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Banknote, Briefcase, Car, HeartPulse, House, Users } from "lucide-react"
import { PageContainer } from "@/components/ui/PageContainer"
import { ProgressHeader } from "@/components/onboarding/protection-profile/ProgressHeader"
import { QuestionScreen, type QuestionOption } from "@/components/onboarding/protection-profile/QuestionScreen"
import { InfoScreen } from "@/components/onboarding/protection-profile/InfoScreen"
import { ScreenFrame } from "@/components/onboarding/protection-profile/ScreenFrame"
import { SummaryScreen } from "@/components/onboarding/protection-profile/SummaryScreen"
import { UploadScreen } from "@/components/onboarding/protection-profile/UploadScreen"
import { AdvisorScreen } from "@/components/onboarding/protection-profile/AdvisorScreen"
import { domainLabelFor } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { flowReducer, initialFlowState } from "@/lib/onboarding/protection-profile/reducer"
import { progressFor, stepDef } from "@/lib/onboarding/protection-profile/steps"
import * as q from "@/lib/onboarding/protection-profile/questions"
import * as track from "@/lib/onboarding/protection-profile/analytics"
import { UNSURE, type ProtectionStepId } from "@/lib/services/protection-profile/vocabulary"
import type { TranslationKeys } from "@/lib/i18n/translations/el"
import {
    completeProtectionProfile,
    finishProtectionOnboarding,
    markProtectionSummaryViewed,
    recordUploadChoice,
    saveProtectionProfileStep,
    skipProtectionProfile,
    type ProtectionOnboardingViewState,
    type ProtectionProfileCompletion,
} from "./protection-profile-actions"

type PPLabels = TranslationKeys["onboarding"]["protectionProfile"]
type Draft = Record<string, unknown> | undefined

const TAIL: ProtectionStepId[] = ["map", "upload", "advisor"]
const SOMETHING_COMING = "something_coming"

/**
 * The first-stage onboarding: reflect on what matters, discover where to
 * look, see the picture, then compare it with what you already have.
 *
 * Owns the reducer, the persistence calls, the history mirror, analytics and
 * focus. Screens are dumb; the step graph and the copy live elsewhere.
 */
export function ProtectionProfileFlow({ initialState, labels, language }: { initialState: ProtectionOnboardingViewState; labels: PPLabels; language: "el" | "en" }) {
    const router = useRouter()
    const [state, dispatch] = useReducer(flowReducer, undefined, () =>
        flowReducer(initialFlowState(initialState.stepId), {
            type: "restore",
            current: initialState.stepId,
            answers: initialState.answers,
            answeredSteps: initialState.answeredSteps,
            unsureSteps: initialState.unsureSteps,
        })
    )
    const [completion, setCompletion] = useState<ProtectionProfileCompletion | null>(null)
    const [busy, setBusy] = useState(false)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const enteredAt = useRef(state.enteredAt)
    const startedAt = useRef(Date.now())
    const firstRender = useRef(true)
    const completedFor = useRef<string | null>(null)
    const resumed = initialState.status !== "not_started"

    const def = stepDef(state.current)
    const progress = progressFor(state.current)
    const draft = (state.answers as Record<string, Draft>)[state.current]
    enteredAt.current = state.enteredAt

    // ── Analytics, history, focus ───────────────────────────────────────
    useEffect(() => {
        track.trackStarted(language, resumed, initialState.stepId)
         
    }, [])

    useEffect(() => {
        track.trackStepViewed(language, state.current, def.kind)
        try {
            if (firstRender.current) window.history.replaceState({ stepId: state.current }, "", `?step=${state.current}`)
            else if (state.direction === 1) window.history.pushState({ stepId: state.current }, "", `?step=${state.current}`)
        } catch {
            /* history unavailable */
        }
        firstRender.current = false
         
    }, [state.current])

    useEffect(() => {
        const onPop = () => {
            if (TAIL.includes(state.current)) return
            dispatch({ type: "back" })
        }
        window.addEventListener("popstate", onPop)
        return () => window.removeEventListener("popstate", onPop)
    }, [state.current])

    const settle = useCallback(() => {
        headingRef.current?.focus({ preventScroll: true })
        window.scrollTo({ top: 0 })
    }, [])

    // ── Persistence ─────────────────────────────────────────────────────
    const save = useCallback(
        async (step: ProtectionStepId, value: Record<string, unknown>, unsure = false) => {
            dispatch({ type: "answer", step, value, unsure })
            dispatch({ type: "saving" })
            const res = await saveProtectionProfileStep({ step, ...value }).catch(() => ({ ok: false as const, error: "failed" as const }))
            if (!res.ok) {
                dispatch({ type: "failed", errorCode: res.error })
                track.trackStepFailed(language, step, res.error)
                return
            }
            if (unsure) track.trackDontKnow(language, step)
            track.trackAnswer(language, step, value)
            track.trackStepCompleted(language, step, stepDef(step).kind, Date.now() - enteredAt.current, unsure)
            dispatch({ type: "saved", step, answeredSteps: res.answeredSteps, next: res.next })
        },
        [language]
    )

    const setDraft = (value: Record<string, unknown>) => dispatch({ type: "answer", step: state.current, value })

    // ── The map ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (state.current !== "map" || completedFor.current === "map") return
        completedFor.current = "map"
        let cancelled = false
        completeProtectionProfile()
            .then((result) => {
                if (cancelled) return
                setCompletion(result)
                track.trackCompleted(language, {
                    stepsCompleted: state.answeredSteps.length,
                    elapsedMs: Date.now() - startedAt.current,
                    dontKnowCount: state.unsureSteps.length,
                    priorityCount: result.priorities.filter((p) => p.importance === "high" || p.importance === "medium").length,
                    resumed,
                })
                track.trackSummaryViewed(language, {
                    priorityCount: result.priorities.length,
                    applicableRiskCount: result.applicableRiskCount,
                    firstRiskId: result.insight?.riskId ?? null,
                })
                void markProtectionSummaryViewed()
            })
            .catch(() => {
                completedFor.current = null
                dispatch({ type: "failed", errorCode: "complete_failed" })
            })
        return () => {
            cancelled = true
        }
         
    }, [state.current])

    const goto = (step: ProtectionStepId) => dispatch({ type: "goto", step })

    const onSkip = async () => {
        setBusy(true)
        track.trackSkipped(language, state.current)
        const { redirectTo } = await skipProtectionProfile().catch(() => ({ redirectTo: "/dashboard" }))
        router.push(redirectTo)
    }

    const onBack = state.visited.length > 1 && !TAIL.includes(state.current) ? () => window.history.back() : null

    // ── Screens ─────────────────────────────────────────────────────────
    const opt = (step: keyof PPLabels["q"], values: readonly string[]): QuestionOption[] => {
        const options = (labels.q[step] as { options: Record<string, string> }).options
        return values.map((value) => ({ value, label: options[value] ?? value }))
    }
    const single = (value: string | undefined) => value
    const common = {
        whyLabel: labels.whyLabel,
        status: state.status,
        savingLabel: labels.saving,
        retryLabel: labels.retry,
        errorText: labels.saveFailed,
    }
    const unsureFor = (step: ProtectionStepId, discovery: string) => ({
        label: labels.unsure,
        discovery,
        proceedLabel: labels.proceedUnsure,
        onUnsure: () => void save(step, { unsure: true }, true),
    })
    const singleScreen = (step: ProtectionStepId, key: keyof PPLabels["q"], values: readonly string[], field: string, extra?: Partial<React.ComponentProps<typeof QuestionScreen>>) => {
        const chosen = draft?.[field] as string | undefined
        return (
            <QuestionScreen
                ref={headingRef}
                kind="single"
                prompt={(labels.q[key] as { prompt: string }).prompt}
                why={(labels.q[key] as { why: string }).why}
                options={opt(key, values)}
                selected={single(chosen)}
                onSelect={(value) => {
                    setDraft({ [field]: value })
                    window.setTimeout(() => void save(step, { [field]: value }), 180)
                }}
                cta={{ label: labels.next, onClick: () => chosen && void save(step, { [field]: chosen }), visible: chosen !== undefined && state.status !== "saving" }}
                {...common}
                {...extra}
            />
        )
    }
    const multiValues = (field: string): string[] | undefined => (Array.isArray(draft?.[field]) ? (draft![field] as string[]) : draft?.unsure ? undefined : undefined)
    const toggleIn = (field: string, value: string, max?: number, exclusive?: string) => {
        const current = multiValues(field) ?? []
        let next: string[]
        if (current.includes(value)) next = current.filter((v) => v !== value)
        else {
            next = exclusive && value === exclusive ? [value] : [...current.filter((v) => v !== exclusive), value]
            if (max && next.length > max) next = next.slice(next.length - max)
        }
        setDraft({ ...(draft ?? {}), unsure: undefined, [field]: next })
    }

    let screen: React.ReactNode
    switch (state.current) {
        case "intent":
            screen = singleScreen("intent", "intent", q.intentOptions(), "intent")
            break
        case "orientation":
            screen = (
                <InfoScreen
                    ref={headingRef}
                    title={labels.q.orientation.title}
                    body1={labels.q.orientation.body1}
                    body2={labels.q.orientation.body2}
                    chips={[
                        { icon: Users, label: labels.summary.domainLabel.household },
                        { icon: House, label: labels.summary.domainLabel.residence },
                        { icon: Banknote, label: labels.summary.domainLabel.money_income },
                        { icon: Briefcase, label: labels.summary.domainLabel.work },
                        { icon: Car, label: labels.summary.domainLabel.mobility },
                        { icon: HeartPulse, label: labels.summary.domainLabel.health },
                    ]}
                    cta={{ label: labels.q.orientation.cta, onClick: () => void save("orientation", {}) }}
                />
            )
            break
        case "people": {
            const people = multiValues("people")
            const childrenCount = draft?.childrenCount as string | undefined
            const selected = draft?.unsure ? UNSURE : people
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    kicker={labels.kicker}
                    prompt={labels.q.people.prompt}
                    why={labels.q.people.why}
                    options={opt("people", q.peopleOptions())}
                    selected={selected}
                    onSelect={() => undefined}
                    onToggle={(value) => toggleIn("people", value, undefined, "only_me")}
                    subChoice={{
                        under: "children",
                        label: labels.q.people.howMany,
                        options: [
                            { value: "1", label: labels.q.people.counts.one },
                            { value: "2", label: labels.q.people.counts.two },
                            { value: "3", label: labels.q.people.counts.threePlus },
                        ],
                        selected: childrenCount,
                        onSelect: (value) => setDraft({ ...(draft ?? {}), childrenCount: value }),
                    }}
                    unsure={unsureFor("people", labels.q.people.discovery)}
                    cta={{
                        label: labels.q.people.cta,
                        onClick: () => void save("people", { people: people ?? [], childrenCount: people?.includes("children") ? (childrenCount ?? "1") : undefined }),
                        visible: true,
                        disabled: !people || people.length === 0,
                    }}
                    {...common}
                />
            )
            break
        }
        case "home":
            screen = singleScreen("home", "home", q.homeOptions(), "home")
            break
        case "income":
            screen = singleScreen("income", "income", q.incomeOptions(), "income")
            break
        case "obligations": {
            const commitments = multiValues("commitments")
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    prompt={labels.q.obligations.prompt}
                    why={labels.q.obligations.why}
                    options={opt("obligations", q.obligationOptions(state.answers))}
                    selected={draft?.unsure ? UNSURE : commitments}
                    onSelect={() => undefined}
                    onToggle={(value) => toggleIn("commitments", value)}
                    noneLabel={labels.q.obligations.none}
                    onNone={() => setDraft({ commitments: [] })}
                    unsure={unsureFor("obligations", labels.q.obligations.discovery)}
                    cta={{ label: labels.q.obligations.cta, onClick: () => void save("obligations", { commitments: commitments ?? [] }), visible: true, disabled: commitments === undefined }}
                    {...common}
                />
            )
            break
        }
        case "mobility":
            screen = singleScreen("mobility", "mobility", q.mobilityOptions(), "vehicles")
            break
        case "hurt_most": {
            const concerns = multiValues("concerns")
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    prompt={labels.q.hurt_most.prompt}
                    why={labels.q.hurt_most.why}
                    options={opt("hurt_most", q.hurtMostOptions(state.answers))}
                    selected={draft?.unsure ? UNSURE : concerns}
                    onSelect={() => undefined}
                    onToggle={(value) => toggleIn("concerns", value, 2)}
                    unsure={unsureFor("hurt_most", labels.q.hurt_most.discovery)}
                    cta={{ label: labels.q.hurt_most.cta, onClick: () => void save("hurt_most", { concerns: concerns ?? [] }), visible: true, disabled: !concerns || concerns.length === 0 }}
                    {...common}
                />
            )
            break
        }
        case "changes": {
            const changes = multiValues("changes")
            const coming = draft?.somethingComing === true
            const options = [...opt("changes", q.changeOptions(state.answers)), { value: SOMETHING_COMING, label: labels.q.changes.somethingComing }]
            const selected = changes === undefined ? undefined : coming ? [...changes, SOMETHING_COMING] : changes
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    prompt={labels.q.changes.prompt}
                    why={labels.q.changes.why}
                    options={options}
                    selected={selected}
                    onSelect={() => undefined}
                    onToggle={(value) => {
                        if (value === SOMETHING_COMING) setDraft({ ...(draft ?? {}), changes: changes ?? [], somethingComing: !coming })
                        else toggleIn("changes", value)
                    }}
                    noneLabel={labels.q.changes.none}
                    onNone={() => setDraft({ changes: [], somethingComing: false })}
                    cta={{ label: labels.next, onClick: () => void save("changes", { changes: changes ?? [], somethingComing: coming }), visible: true, disabled: changes === undefined }}
                    {...common}
                />
            )
            break
        }
        case "plans": {
            const plans = multiValues("plans")
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    prompt={labels.q.plans.prompt}
                    why={labels.q.plans.why}
                    options={opt("plans", q.planOptions())}
                    selected={plans}
                    onSelect={() => undefined}
                    onToggle={(value) => toggleIn("plans", value)}
                    cta={{ label: labels.next, onClick: () => void save("plans", { plans: plans ?? [] }), visible: true, disabled: !plans || plans.length === 0 }}
                    {...common}
                />
            )
            break
        }
        case "confidence":
            screen = singleScreen("confidence", "confidence", q.confidenceOptions(), "confidence")
            break
        case "uncertainty_reason": {
            const reasons = multiValues("reasons")
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="multi"
                    prompt={labels.q.uncertainty_reason.prompt}
                    why={labels.q.uncertainty_reason.why}
                    options={opt("uncertainty_reason", q.uncertaintyReasonOptions())}
                    selected={reasons}
                    onSelect={() => undefined}
                    onToggle={(value) => toggleIn("reasons", value)}
                    cta={{ label: labels.next, onClick: () => void save("uncertainty_reason", { reasons: reasons ?? [] }), visible: true, disabled: !reasons || reasons.length === 0 }}
                    {...common}
                />
            )
            break
        }
        case "guidance": {
            const chosen = draft?.guidance as string | null | undefined
            screen = (
                <QuestionScreen
                    ref={headingRef}
                    kind="single"
                    prompt={labels.q.guidance.prompt}
                    why={labels.q.guidance.why}
                    options={opt("guidance", q.guidanceOptions())}
                    selected={chosen ?? undefined}
                    onSelect={(value) => {
                        setDraft({ guidance: value })
                        window.setTimeout(() => void save("guidance", { guidance: value }), 180)
                    }}
                    unsure={{ label: labels.q.guidance.later, discovery: labels.q.guidance.why, proceedLabel: labels.q.guidance.cta, onUnsure: () => void save("guidance", { guidance: null }) }}
                    cta={{ label: labels.q.guidance.cta, onClick: () => void save("guidance", { guidance: chosen ?? null }), visible: chosen !== undefined && state.status !== "saving" }}
                    {...common}
                />
            )
            break
        }
        case "map":
            screen = (
                <SummaryScreen
                    ref={headingRef}
                    labels={labels.summary}
                    language={language}
                    completion={completion}
                    busy={busy}
                    onContinue={() => goto("upload")}
                    onLater={async () => {
                        setBusy(true)
                        track.trackSkipped(language, "map")
                        await recordUploadChoice("later").catch(() => undefined)
                        setBusy(false)
                        goto("advisor")
                    }}
                />
            )
            break
        case "upload": {
            const startingFrom = (completion?.priorities ?? [])
                .filter((p) => p.importance === "high" || p.importance === "medium")
                .slice(0, 3)
                .map((p) => domainLabelFor(labels.summary, p.id))
            screen = (
                <UploadScreen
                    ref={headingRef}
                    labels={labels.upload}
                    startingFrom={startingFrom}
                    hasAiConsent={initialState.hasAiConsent}
                    busy={busy}
                    onPhase={(phase, errorCode) => {
                        if (phase === "uploading") track.trackUpload(language, "started")
                        else if (phase === "queued" || phase === "completed") track.trackUpload(language, "completed")
                        else if (phase === "failed") track.trackUpload(language, "failed", errorCode)
                    }}
                    onUploaded={async () => {
                        setBusy(true)
                        await recordUploadChoice("done").catch(() => undefined)
                        setBusy(false)
                        goto("advisor")
                    }}
                    onLater={async () => {
                        setBusy(true)
                        track.trackSkipped(language, "upload")
                        await recordUploadChoice("later").catch(() => undefined)
                        setBusy(false)
                        goto("advisor")
                    }}
                />
            )
            break
        }
        case "advisor":
            screen = (
                <AdvisorScreen
                    ref={headingRef}
                    labels={labels.advisor}
                    busy={busy}
                    onFinish={async () => {
                        setBusy(true)
                        track.trackFinished(language, state.answeredSteps.length, Boolean(completion) && initialState.status !== "not_started")
                        const { redirectTo } = await finishProtectionOnboarding().catch(() => ({ redirectTo: "/dashboard" }))
                        router.push(redirectTo)
                    }}
                />
            )
            break
    }

    return (
        <PageContainer width="reading" className="py-6 lg:py-14">
            {progress ? (
                <ProgressHeader
                    index={progress.index}
                    total={progress.total}
                    stepLabel={labels.stepOf.replace("{n}", String(progress.index)).replace("{m}", String(progress.total))}
                    progressLabel={labels.progressLabel}
                    backLabel={labels.back}
                    onBack={onBack}
                    skipLabel={labels.skipForNow}
                    onSkip={() => void onSkip()}
                />
            ) : null}
            {resumed && firstRender.current && progress ? <p className="mb-4 text-caption text-muted-foreground">{labels.resumed}</p> : null}
            <ScreenFrame stepKey={state.current} direction={state.direction} onSettled={settle}>
                {screen}
            </ScreenFrame>
        </PageContainer>
    )
}
