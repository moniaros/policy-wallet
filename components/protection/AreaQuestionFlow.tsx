"use client"

import { useId, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { AttentionAreaId } from "@/lib/protection/domains"
import type { AssessmentFactorKey } from "@/lib/protection/factor-questions"
import { cn } from "@/lib/utils"
import type { AreaQuestionView, questionFlowCopy } from "@/components/protection/area-detail-model"

/** The action's contract, as the flow sees it — the page injects the real server action. */
export interface AnswerInput {
    area: AttentionAreaId
    factor: AssessmentFactorKey
    value: unknown
    healthConsent?: true
}

export type AnswerResult =
    | { ok: true; next: AssessmentFactorKey | null; remainingUnknown: number; skipped: Array<{ column: string; reason: string }> }
    | { ok: false; error: string }

export type QuestionFlowCopy = ReturnType<typeof questionFlowCopy>

interface AreaQuestionFlowProps {
    area: AttentionAreaId
    questions: AreaQuestionView[]
    /** Factors the area lacks in total — the completed event's fallback when nothing was written. */
    unknownFactorCount: number
    copy: QuestionFlowCopy
    onAnswer: (input: AnswerInput) => Promise<AnswerResult>
    headingId?: string
}

type Draft = string | number | boolean | string[] | ""

function draftFrom(q: AreaQuestionView): Draft {
    if (q.prefill === null) return q.input === "multi" ? [] : ""
    return q.prefill
}

function draftValid(q: AreaQuestionView, draft: Draft): boolean {
    switch (q.input) {
        case "single":
            return typeof draft === "string" && draft.length > 0
        case "boolean":
            return typeof draft === "boolean"
        case "multi":
            return Array.isArray(draft) && draft.length > 0
        case "number":
            return typeof draft === "number" && Number.isInteger(draft) && draft >= 0
        case "currency":
            return typeof draft === "number" && Number.isFinite(draft) && draft >= 0
    }
}

/**
 * «Βοηθήστε μας να καταλάβουμε» — the area's questions, ONE at a time.
 *
 * The list comes from the composition (requires first, then supports, never a
 * factor already known); the server names the next question after every
 * write, so a factor settled meanwhile is never asked. Options are 44px rows
 * with `aria-pressed`, numbers and amounts are labelled inputs, a multi is
 * real checkboxes. The health factor sits behind an explicit opt-in — the
 * question does not render, and nothing is sent, until the person taps
 * through the Art. 9 notice; declining is a skip with no consequence.
 *
 * The current question's «Συνέχεια» is the one primary button on the screen.
 */
export function AreaQuestionFlow({ area, questions, unknownFactorCount, copy, onAnswer, headingId }: AreaQuestionFlowProps) {
    const router = useRouter()
    const promptId = useId()
    const inputId = useId()
    const [index, setIndex] = useState(0)
    const [settled, setSettled] = useState<Set<AssessmentFactorKey>>(() => new Set())
    const [draft, setDraft] = useState<Draft>(() => (questions[0] ? draftFrom(questions[0]) : ""))
    const [healthConsent, setHealthConsent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const [remaining, setRemaining] = useState(unknownFactorCount)
    const [pending, startTransition] = useTransition()
    const started = useRef(false)
    const wrote = useRef(false)

    const question = questions[index]

    function goTo(next: number) {
        setIndex(next)
        setDraft(draftFrom(questions[next]))
        setError(null)
    }

    /** The next question still open — the server's choice when it is one of ours, else the next in line. */
    function advance(after: Set<AssessmentFactorKey>, preferred: AssessmentFactorKey | null, remainingUnknown: number) {
        const open = (i: number) => i < questions.length && !after.has(questions[i].factor)
        let next = preferred === null ? -1 : questions.findIndex((q) => q.factor === preferred && !after.has(q.factor))
        if (next === -1) {
            next = index + 1
            while (next < questions.length && !open(next)) next += 1
            if (next >= questions.length) next = questions.findIndex((_, i) => open(i))
        }
        if (next === -1) {
            setDone(true)
            setRemaining(remainingUnknown)
            trackJourneyEvent("risk_area_completed", { area, remaining_unknown: remainingUnknown })
            if (wrote.current) router.refresh()
            return
        }
        goTo(next)
    }

    function submit() {
        if (!question || !draftValid(question, draft)) {
            setError(copy.invalid)
            return
        }
        if (!started.current) {
            started.current = true
            trackJourneyEvent("action_started", { kind: "answer_questions", area })
        }
        const current = question
        const value = current.input === "multi" && Array.isArray(draft) && draft.includes("none") ? ["none"] : draft
        startTransition(async () => {
            try {
                const result = await onAnswer({
                    area,
                    factor: current.factor,
                    value,
                    ...(current.specialCategory ? { healthConsent: true as const } : {}),
                })
                if (!result.ok) {
                    setError(result.error === "INVALID_INPUT" ? copy.invalid : copy.failed)
                    return
                }
                wrote.current = true
                trackJourneyEvent("risk_factor_answered", { area, factor: current.factor, special_category: current.specialCategory })
                const after = new Set(settled)
                after.add(current.factor)
                setSettled(after)
                advance(after, result.next, result.remainingUnknown)
            } catch {
                setError(copy.failed)
            }
        })
    }

    function skip() {
        if (!question) return
        const after = new Set(settled)
        after.add(question.factor)
        setSettled(after)
        advance(after, null, remaining)
    }

    if (questions.length === 0) {
        return <p className="mt-3 text-sm leading-relaxed text-foreground">{copy.none}</p>
    }

    if (done || !question) {
        return (
            <div className="mt-3" aria-live="polite">
                <p className="text-sm leading-relaxed text-foreground">{copy.done}</p>
                {remaining > 0 ? (
                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.remaining.replace("{n}", String(remaining))}</p>
                ) : null}
            </div>
        )
    }

    const gated = question.specialCategory && !healthConsent
    const optionRow = "pw-subcard flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-60"

    return (
        <div className="mt-3" data-factor={question.factor}>
            <p className="text-caption tabular-nums text-muted-foreground">
                {copy.progress.replace("{n}", String(index + 1)).replace("{m}", String(questions.length))}
            </p>

            {gated ? (
                <div className="pw-subcard mt-2 p-3.5" role="group" aria-labelledby={`${promptId}-gate`}>
                    <p id={`${promptId}-gate`} className="text-sm font-semibold text-foreground">{copy.healthGate.title}</p>
                    <p className="mt-1 text-caption leading-relaxed text-foreground/80">{copy.healthGate.body}</p>
                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.healthGate.optional}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button type="button" className="pw-soft-button bg-background shadow-sm" onClick={() => setHealthConsent(true)}>
                            {copy.healthGate.accept}
                        </button>
                        <button type="button" className="pw-soft-button bg-background shadow-sm" onClick={skip}>
                            {copy.healthGate.decline}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <h3 id={promptId} className="mt-1 text-title font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
                        {question.prompt}
                    </h3>
                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                        <span className="sr-only">{copy.whyLabel}: </span>
                        {question.why}
                    </p>
                    {question.prefill !== null ? (
                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{copy.prefilled}</p>
                    ) : null}

                    {question.input === "single" && question.options ? (
                        <ul className="mt-3 space-y-2" role="group" aria-labelledby={promptId}>
                            {question.options.map((option) => {
                                const chosen = draft === option.value
                                return (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            disabled={pending}
                                            aria-pressed={chosen}
                                            onClick={() => setDraft(option.value)}
                                            className={optionRow}
                                        >
                                            <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                                            {chosen ? <Check className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" aria-hidden="true" /> : null}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : null}

                    {question.input === "boolean" ? (
                        <ul className="mt-3 space-y-2" role="group" aria-labelledby={promptId}>
                            {[
                                { value: true, label: copy.yes },
                                { value: false, label: copy.no },
                            ].map((option) => {
                                const chosen = draft === option.value
                                return (
                                    <li key={String(option.value)}>
                                        <button
                                            type="button"
                                            disabled={pending}
                                            aria-pressed={chosen}
                                            onClick={() => setDraft(option.value)}
                                            className={optionRow}
                                        >
                                            <span>{option.label}</span>
                                            {chosen ? <Check className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" aria-hidden="true" /> : null}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : null}

                    {question.input === "multi" && question.options ? (
                        <fieldset className="mt-3">
                            <legend className="text-caption text-muted-foreground">{copy.multiHint}</legend>
                            <ul className="mt-2 space-y-2">
                                {question.options.map((option) => {
                                    const list = Array.isArray(draft) ? draft : []
                                    const checked = list.includes(option.value)
                                    return (
                                        <li key={option.value}>
                                            <label className="pw-subcard flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-foreground">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 flex-shrink-0 accent-primary"
                                                    disabled={pending}
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        // «none» is exclusive: it clears the rest, and any other choice clears it.
                                                        if (option.value === "none") {
                                                            setDraft(e.target.checked ? ["none"] : [])
                                                            return
                                                        }
                                                        const without = list.filter((v) => v !== option.value && v !== "none")
                                                        setDraft(e.target.checked ? [...without, option.value] : without)
                                                    }}
                                                />
                                                <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
                                            </label>
                                        </li>
                                    )
                                })}
                            </ul>
                        </fieldset>
                    ) : null}

                    {question.input === "number" ? (
                        <div className="mt-3">
                            <label htmlFor={inputId} className="block text-caption font-semibold text-muted-foreground">
                                {question.factor === "age" ? copy.yearLabel : copy.numberLabel}
                            </label>
                            <input
                                id={inputId}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                disabled={pending}
                                value={typeof draft === "number" ? draft : ""}
                                onChange={(e) => setDraft(e.target.value === "" ? "" : Number(e.target.value))}
                                className="pw-input mt-1 w-full"
                            />
                        </div>
                    ) : null}

                    {question.input === "currency" ? (
                        <div className="mt-3">
                            <label htmlFor={inputId} className="block text-caption font-semibold text-muted-foreground">
                                {copy.currencyLabel}
                            </label>
                            <div className="relative mt-1">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">
                                    €
                                </span>
                                <input
                                    id={inputId}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={100}
                                    disabled={pending}
                                    value={typeof draft === "number" ? draft : ""}
                                    onChange={(e) => setDraft(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="pw-input w-full pl-8"
                                />
                            </div>
                            <p className="mt-1 text-caption text-muted-foreground">{copy.currencyHint}</p>
                        </div>
                    ) : null}

                    {error ? (
                        <p className="mt-3 text-caption text-status-danger" role="alert">
                            {error}
                        </p>
                    ) : null}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            className={cn("pw-primary-button min-h-11 w-full sm:w-auto")}
                            disabled={pending || !draftValid(question, draft)}
                            onClick={submit}
                            aria-describedby={headingId}
                        >
                            {pending ? copy.saving : copy.continue}
                        </button>
                        <button type="button" className="pw-soft-button bg-background shadow-sm sm:w-auto" disabled={pending} onClick={skip}>
                            {copy.skip}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
