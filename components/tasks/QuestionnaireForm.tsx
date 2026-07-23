"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { submitQuestionnaireResponse } from "@/app/(protected)/tasks/actions"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { CheckCircle2, Save, AlertCircle } from "lucide-react"

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
    const [protectionScore, setProtectionScore] = useState<number | null>(null)
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
            const result = await submitQuestionnaireResponse(instanceId, answers)
            try {
                localStorage.removeItem(draftKey)
            } catch {
                // ignore
            }
            setProtectionScore(result?.protectionScore ?? null)
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
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft dark:bg-primary/15">
                    <CheckCircle2 className="h-10 w-10 text-primary dark:text-mint" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">
                    {t.tasks.responsesSentToAdvisor}
                </h2>
                {protectionScore !== null ? (
                    <p className="mb-1 text-muted-foreground">
                        {t.tasks.yourProtectionScore}:{" "}
                        <span className="font-bold text-foreground">{protectionScore}%</span>
                    </p>
                ) : (
                    <p className="mb-1 text-muted-foreground">{t.agentUi.responsesSubmitted}</p>
                )}
                <p className="mb-8 max-w-sm text-sm text-muted-foreground">{t.tasks.improveScoreHint}</p>
                <Link
                    href="/coverage-insights"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-white dark:text-[#1A2420] transition-transform hover:-translate-y-0.5"
                >
                    {t.tasks.viewCoverageInsights}
                    <CheckCircle2 className="h-4 w-4" />
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Progress header */}
            <div className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-background dark:bg-neutral-900 p-5">
                <div className="flex-1">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">{t.tasks.completion}</span>
                        <span className="text-xs font-bold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-micro font-semibold uppercase tracking-wide text-muted-foreground">{t.tasks.questions}</span>
                    <span className="text-lg font-bold text-foreground">{answeredCount}/{totalCount}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-background dark:bg-neutral-900 p-6 md:p-8">
                <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-foreground">
                    {templateName}
                    <span className="h-2 w-2 rounded-full bg-primary dark:bg-mint" />
                </h2>

                <div className="space-y-10">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="group space-y-4">
                            <div className="flex items-start gap-4">
                                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-semibold text-muted-foreground transition-colors group-focus-within:border-primary group-focus-within:text-primary dark:group-focus-within:text-mint">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 space-y-4">
                                    <label className="block text-base font-semibold text-foreground">
                                        {q.label}
                                        {q.required && <span className="ml-1 text-primary dark:text-mint">*</span>}
                                    </label>

                                    {q.type === 'boolean' && (
                                        <div className="flex max-w-sm gap-3">
                                            {[true, false].map((val) => (
                                                <button
                                                    key={String(val)}
                                                    type="button"
                                                    onClick={() => setAnswers({ ...answers, [q.id]: val })}
                                                    className={`flex-1 rounded-xl border py-3.5 text-sm font-semibold transition-colors ${
                                                        answers[q.id] === val
                                                            ? 'border-primary bg-primary text-white dark:text-[#1A2420]'
                                                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                                    }`}
                                                >
                                                    {val ? t.common.yes : t.common.no}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <input
                                            type="text"
                                            required={q.required}
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus:bg-background placeholder:text-muted-foreground/60"
                                            placeholder={t.tasks.typeAnswer}
                                        />
                                    )}

                                    {q.type === 'number' && (
                                        <input
                                            type="number"
                                            required={q.required}
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                                            className="w-full max-w-xs rounded-xl border border-border bg-muted px-4 py-3 text-foreground outline-none transition-colors focus:border-primary focus:bg-background placeholder:text-muted-foreground/60"
                                            placeholder="0"
                                        />
                                    )}

                                    {q.type === 'select' && (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                                            {q.options?.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                                                        answers[q.id] === opt
                                                            ? 'border-primary bg-primary text-white dark:text-[#1A2420]'
                                                            : 'border-border bg-muted text-muted-foreground hover:border-primary/40'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {submitError && (
                    <div className="mt-8 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {t.tasks.submitError}
                    </div>
                )}

                <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <Save className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                        {t.tasks.saveForLater}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || progress < 50}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:text-[#1A2420] md:w-auto"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.tasks.submitting}
                            </>
                        ) : (
                            <>
                                {t.tasks.completeSubmission}
                                <CheckCircle2 className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
