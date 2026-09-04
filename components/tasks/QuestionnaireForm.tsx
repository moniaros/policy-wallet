"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { submitQuestionnaireResponse } from "@/app/(protected)/tasks/actions"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { CheckCircle2, ClipboardList, Save } from "lucide-react"

import { Alert } from "@/components/ui/Alert"
import { CardHead } from "@/components/dashboard/home/CardHead"
interface Question {
    id: string
    type: 'text' | 'boolean' | 'number' | 'select'
    label: string
    required?: boolean
    options?: string[]
}

interface QuestionnaireFormProps {
    instanceId: string
    templateName: string
    questions: Question[]
}

export function QuestionnaireForm({ instanceId, templateName, questions }: QuestionnaireFormProps) {
    const { t } = useLanguage()
    const draftKey = `pw-questionnaire-draft-${instanceId}`
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [submitError, setSubmitError] = useState(false)
    const router = useRouter()

    // Restore any autosaved progress so "Save for later" (and an accidental
    // navigation away) no longer discards what the customer already typed.
    useEffect(() => {
        try {
            const saved = localStorage.getItem(draftKey)
            if (saved) setAnswers(JSON.parse(saved))
        } catch {
            // ignore malformed/unavailable storage
        }
    }, [draftKey])

    // Autosave progress on every change.
    useEffect(() => {
        try {
            if (Object.keys(answers).length > 0) {
                localStorage.setItem(draftKey, JSON.stringify(answers))
            }
        } catch {
            // ignore storage failures (private mode, quota)
        }
    }, [answers, draftKey])

    const answeredCount = Object.keys(answers).length
    const totalCount = questions.length
    const progress = Math.round((answeredCount / totalCount) * 100)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setSubmitError(false)
        try {
            await submitQuestionnaireResponse(instanceId, answers)
            try {
                localStorage.removeItem(draftKey)
            } catch {
                // ignore
            }
            setIsSuccess(true)
        } catch (error) {
            console.error(error)
            setSubmitError(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <section className="pw-card pw-pad-roomy flex flex-col items-center text-center animate-in fade-in duration-500">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15" aria-hidden="true">
                    <CheckCircle2 className="h-7 w-7 text-primary dark:text-mint" />
                </span>
                <h2 className="mt-4 text-title font-semibold text-foreground">
                    {t.tasks.responsesSentToAdvisor}
                </h2>
                {/* The protection score rendered here until Aug 2026 («Το σκορ
                    προστασίας σας: 72%») — removed from the product
                    (PW-MOBILE-TRANSFORM-01, H-001). What the customer did is a
                    fact; what it "scores" was a verdict. */}
                <p className="mt-1 text-sm text-muted-foreground">{t.agentUi.responsesSubmitted}</p>
                <Link
                    href="/protection"
                    data-action="reviewCoverage"
                    className="pw-primary-button mt-5"
                >
                    {t.tasks.viewCoverageInsights}
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </Link>
            </section>
        )
    }

    // The single-select answer shapes share one recipe: a sunken tile that
    // takes the primary ring when chosen. aria-pressed is the state the guard
    // reads; the ring is only its picture.
    const choice = (pressed: boolean) =>
        `pw-subcard min-h-11 px-4 py-2.5 text-sm font-semibold transition-colors ${
            pressed ? "ring-2 ring-primary text-foreground" : "text-muted-foreground hover:text-foreground"
        }`

    return (
        <div className="space-y-4">
            {/* Progress — the count bar: answered over total, said as a fact
                under a head that names the questionnaire. */}
            <section className="pw-card pw-pad">
                <CardHead
                    icon={ClipboardList}
                    title={templateName}
                    meta={<span className="tabular-nums">{answeredCount}/{totalCount}</span>}
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-caption text-muted-foreground">{t.tasks.completion}</span>
                    <span className="text-caption font-semibold tabular-nums text-foreground">{progress}%</span>
                </div>
                <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={t.tasks.completion}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                >
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </section>

            <form onSubmit={handleSubmit} className="pw-card pw-pad">
                <ol className="space-y-8">
                    {questions.map((q, idx) => {
                        const inputId = `question-${q.id}`
                        const labelId = `${inputId}-label`
                        const isField = q.type === 'text' || q.type === 'number'
                        return (
                            <li key={q.id} className="group flex items-start gap-3">
                                {/* The question's ordinal carries information here —
                                    «3 of 7» is where the reader is in the form. */}
                                <span className="pw-card-chip text-caption font-semibold tabular-nums transition-colors group-focus-within:text-primary" aria-hidden="true">
                                    {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1 space-y-3">
                                    {/* A <label> names a control; the tile groups below
                                        are named through aria-labelledby instead, so the
                                        association is real in both shapes. */}
                                    {isField ? (
                                        <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
                                            {q.label}
                                            {q.required && <span className="ml-1 text-primary dark:text-mint">*</span>}
                                        </label>
                                    ) : (
                                        <p id={labelId} className="text-sm font-semibold text-foreground">
                                            {q.label}
                                            {q.required && <span className="ml-1 text-primary dark:text-mint">*</span>}
                                        </p>
                                    )}

                                    {q.type === 'boolean' && (
                                        <div className="flex max-w-sm gap-2" role="group" aria-labelledby={labelId}>
                                            {[true, false].map((val) => (
                                                <button
                                                    key={String(val)}
                                                    type="button"
                                                    aria-pressed={answers[q.id] === val}
                                                    onClick={() => setAnswers({ ...answers, [q.id]: val })}
                                                    className={`flex-1 ${choice(answers[q.id] === val)}`}
                                                >
                                                    {val ? t.common.yes : t.common.no}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <input
                                            id={inputId}
                                            type="text"
                                            required={q.required}
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            className="pw-input"
                                            placeholder={t.tasks.typeAnswer}
                                        />
                                    )}

                                    {q.type === 'number' && (
                                        <input
                                            id={inputId}
                                            type="number"
                                            required={q.required}
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                                            className="pw-input max-w-xs"
                                            placeholder="0"
                                        />
                                    )}

                                    {q.type === 'select' && (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3" role="group" aria-labelledby={labelId}>
                                            {q.options?.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    aria-pressed={answers[q.id] === opt}
                                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                                    className={`text-left ${choice(answers[q.id] === opt)}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ol>

                {submitError && (
                    <Alert variant="error" className="mt-6">{t.tasks.submitError}</Alert>
                )}

                {/* Data-handling note. The health/life templates collect GDPR
                    special-category data (conditions, medication, health history);
                    the client must be told who receives it and how it's handled
                    before they submit — consistent with the app's AI-consent and
                    provenance-disclaimer discipline. */}
                <p className="mt-6 text-caption leading-relaxed text-muted-foreground">
                    {t.tasks.questionnairePrivacyNote}{" "}
                    <Link href="/privacy" className="underline hover:text-foreground">
                        {t.tasks.questionnairePrivacyLink}
                    </Link>
                    .
                </p>

                <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-5 md:flex-row">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="pw-soft-button w-full md:w-auto"
                    >
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {t.tasks.saveForLater}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || progress < 50}
                        className="pw-primary-button w-full md:w-auto"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.tasks.submitting}
                            </>
                        ) : (
                            <>
                                {t.tasks.completeSubmission}
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
