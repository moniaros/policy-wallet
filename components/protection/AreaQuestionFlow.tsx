"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
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

/**
 * A value typed for ONE factor. It renders, and it is sent, only while that
 * factor's question is the one in view — a draft is never re-homed onto
 * whatever question happens to occupy the same position after the server
 * recomposes the list.
 */
interface BoundDraft {
    factor: AssessmentFactorKey
    value: Draft
}

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
 * The question in view, found by FACTOR in the live list — never by position.
 *
 * The list is the server's, and it recomposes under the flow after every
 * write (the action revalidates the page): factors settle, drop out, appear,
 * move. Three candidates, in order: the factor a draft is bound to (what the
 * person is typing into never changes while the server still asks it), the
 * factor the server named next, and otherwise the first question still open.
 * Null means nothing is open.
 */
function questionInView(
    questions: readonly AreaQuestionView[],
    settled: ReadonlySet<AssessmentFactorKey>,
    intended: AssessmentFactorKey | null,
    draft: BoundDraft | null
): AreaQuestionView | null {
    const open = (q: AreaQuestionView) => !settled.has(q.factor)
    const find = (factor: AssessmentFactorKey | null) =>
        factor === null ? undefined : questions.find((q) => q.factor === factor && open(q))
    return find(draft?.factor ?? null) ?? find(intended) ?? questions.find(open) ?? null
}

/** The next open question after `from` in list order, wrapping — where a skip goes. */
function nextOpenAfter(
    questions: readonly AreaQuestionView[],
    settled: ReadonlySet<AssessmentFactorKey>,
    from: AssessmentFactorKey
): AssessmentFactorKey | null {
    const i = questions.findIndex((q) => q.factor === from)
    const ordered = i === -1 ? questions : [...questions.slice(i + 1), ...questions.slice(0, i)]
    return ordered.find((q) => !settled.has(q.factor))?.factor ?? null
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
 * Identity is the factor id. The flow holds no index: the question in view
 * is looked up by factor in whatever list the server last rendered, a draft
 * is bound to the factor it was typed for, and a submit sends exactly the
 * factor the input was rendered for. When the recomposed list no longer asks
 * the factor a draft belongs to, the draft is discarded — never written under
 * another column — and a one-line notice says so. The counter is read off
 * the live list and never decides what renders.
 *
 * The current question's «Συνέχεια» is the one primary button on the screen.
 */
export function AreaQuestionFlow({ area, questions, unknownFactorCount, copy, onAnswer, headingId }: AreaQuestionFlowProps) {
    const router = useRouter()
    const promptId = useId()
    const inputId = useId()
    /** The factor the flow means to show: the server's `next` after a write, the next open one after a skip. Null: the first open. */
    const [intended, setIntended] = useState<AssessmentFactorKey | null>(null)
    /** Answered or skipped in this session — the server does not know about skips. */
    const [settled, setSettled] = useState<ReadonlySet<AssessmentFactorKey>>(() => new Set())
    const [draft, setDraft] = useState<BoundDraft | null>(null)
    const [healthConsent, setHealthConsent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [remaining, setRemaining] = useState(unknownFactorCount)
    const [answered, setAnswered] = useState(0)
    const [pending, startTransition] = useTransition()
    const started = useRef(false)
    const completed = useRef(false)

    const question = questionInView(questions, settled, intended, draft)
    /** A draft renders only for the factor it was typed for; anything else starts from the question's own prefill. */
    const bound = draft !== null && question !== null && draft.factor === question.factor
    const value: Draft = bound ? draft.value : question ? draftFrom(question) : ""
    const stale = draft !== null && !bound

    // The recomposed list no longer asks the factor the draft was typed for
    // (the guard above already keeps it off the screen): discard it, say so.
    useEffect(() => {
        if (!stale) return
        setDraft(null)
        setNotice(copy.resynced)
    }, [stale, copy.resynced])

    const touched = settled.size > 0
    const done = touched && question === null

    useEffect(() => {
        if (!done || completed.current) return
        completed.current = true
        trackJourneyEvent("risk_area_completed", { area, remaining_unknown: remaining })
        if (answered > 0) router.refresh()
    }, [done, area, remaining, answered, router])

    /** Type into the question in view — the draft carries that factor from here on. */
    function bind(next: Draft) {
        if (!question) return
        setDraft({ factor: question.factor, value: next })
        setError(null)
        setNotice(null)
    }

    function submit() {
        if (!question) return
        // Never send a value under a factor it was not typed for.
        if (draft !== null && draft.factor !== question.factor) {
            setDraft(null)
            setNotice(copy.resynced)
            return
        }
        if (!draftValid(question, value)) {
            setError(copy.invalid)
            return
        }
        if (!started.current) {
            started.current = true
            trackJourneyEvent("action_started", { kind: "answer_questions", area })
        }
        const current = question
        const sent = current.input === "multi" && Array.isArray(value) && value.includes("none") ? ["none"] : value
        startTransition(async () => {
            try {
                const result = await onAnswer({
                    area,
                    factor: current.factor,
                    value: sent,
                    ...(current.specialCategory ? { healthConsent: true as const } : {}),
                })
                if (!result.ok) {
                    setError(result.error === "INVALID_INPUT" ? copy.invalid : copy.failed)
                    return
                }
                trackJourneyEvent("risk_factor_answered", { area, factor: current.factor, special_category: current.specialCategory })
                setAnswered((n) => n + 1)
                setSettled((prev) => new Set(prev).add(current.factor))
                setDraft(null)
                setError(null)
                setNotice(null)
                setRemaining(result.remainingUnknown)
                // The server's choice: the factor it names, from the area it just recomposed.
                setIntended(result.next)
            } catch {
                setError(copy.failed)
            }
        })
    }

    function skip() {
        if (!question) return
        const after = new Set(settled).add(question.factor)
        setSettled(after)
        setIntended(nextOpenAfter(questions, after, question.factor))
        setDraft(null)
        setError(null)
        setNotice(null)
    }

    if (done) {
        return (
            <div className="mt-3" aria-live="polite">
                <p className="text-sm leading-relaxed text-foreground">{answered > 0 ? copy.done : copy.doneUnanswered}</p>
                {remaining > 0 ? (
                    <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{remaining === 1 ? copy.remainingOne : copy.remaining.replace("{n}", String(remaining))}</p>
                ) : null}
            </div>
        )
    }

    if (!question) {
        return <p className="mt-3 text-sm leading-relaxed text-foreground">{copy.none}</p>
    }

    const position = questions.findIndex((q) => q.factor === question.factor) + 1
    const gated = question.specialCategory && !healthConsent
    const optionRow = "pw-subcard flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-60"

    return (
        <div className="mt-3" data-factor={question.factor}>
            <p className="text-caption tabular-nums text-muted-foreground">
                {copy.progress.replace("{n}", String(position)).replace("{m}", String(questions.length))}
            </p>
            {notice ? (
                <p className="mt-2 text-caption leading-relaxed text-muted-foreground" role="status">
                    {notice}
                </p>
            ) : null}

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
                                const chosen = value === option.value
                                return (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            disabled={pending}
                                            aria-pressed={chosen}
                                            onClick={() => bind(option.value)}
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
                                const chosen = value === option.value
                                return (
                                    <li key={String(option.value)}>
                                        <button
                                            type="button"
                                            disabled={pending}
                                            aria-pressed={chosen}
                                            onClick={() => bind(option.value)}
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
                                    const list = Array.isArray(value) ? value : []
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
                                                            bind(e.target.checked ? ["none"] : [])
                                                            return
                                                        }
                                                        const without = list.filter((v) => v !== option.value && v !== "none")
                                                        bind(e.target.checked ? [...without, option.value] : without)
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
                                value={typeof value === "number" ? value : ""}
                                onChange={(e) => bind(e.target.value === "" ? "" : Number(e.target.value))}
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
                                    value={typeof value === "number" ? value : ""}
                                    onChange={(e) => bind(e.target.value === "" ? "" : Number(e.target.value))}
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
                            disabled={pending || !draftValid(question, value)}
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
