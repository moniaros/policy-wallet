"use client"

/**
 * Three questions, one true thing — the first thirty seconds.
 *
 * One question per screen, not a form. A form says "fill this in and we will
 * get back to you"; a question says someone is listening. The distinction is the
 * whole point of putting this in front of the twenty-two-field wizard rather
 * than adding to it.
 *
 * The payoff is a real finding from the real engine. It deliberately does NOT
 * claim the customer is uncovered — at this point their wallet is empty because
 * we have not looked, not because they are uninsured, and an opening accusation
 * is the fastest way to lose someone.
 */

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

export interface QuickStartQuestionView {
    id: string
    prompt: Bilingual
    options: Array<{ value: string; label: Bilingual }>
}

export interface FirstInsightView {
    riskId: string
    headline: Bilingual
    detail: Bilingual
    because: Bilingual
    alsoFound: number
}

interface QuickStartProps {
    questions: QuickStartQuestionView[]
    language: "en" | "el"
    onSubmit: (answers: Record<string, string>) => Promise<{ insight: FirstInsightView | null }>
}

export function QuickStart({ questions, language, onSubmit }: QuickStartProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const router = useRouter()
    const [step, setStep] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [insight, setInsight] = useState<FirstInsightView | null>(null)
    const [done, setDone] = useState(false)
    const [failed, setFailed] = useState(false)
    const [pending, startTransition] = useTransition()

    function choose(questionId: string, value: string) {
        const next = { ...answers, [questionId]: value }
        setAnswers(next)

        if (step < questions.length - 1) {
            setStep(step + 1)
            return
        }
        startTransition(async () => {
            try {
                const result = await onSubmit(next)
                setInsight(result.insight)
                setDone(true)
                // The rest of the page is server-rendered from the profile we
                // just wrote, so it has to be told to catch up.
                router.refresh()
            } catch {
                setFailed(true)
            }
        })
    }

    if (done) {
        return (
            <div className="pw-card pw-pad">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-status-success" aria-hidden="true" />
                    <p className="text-caption font-semibold text-muted-foreground">{t("Από όσα μας είπατε", "From what you told us")}</p>
                </div>

                {insight ? (
                    <>
                        <h2 className="mt-2 text-title font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
                            {insight.headline[lang] || insight.headline.en}
                        </h2>
                        <p className="mt-1.5 text-caption leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                            {insight.detail[lang] || insight.detail.en}
                        </p>
                        <p className="mt-2 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            {insight.because[lang] || insight.because.en}
                        </p>

                        {/* Said plainly, because the alternative is letting them
                            infer we have checked their cover when we have not. */}
                        <p className="mt-3 border-t border-border pt-2.5 text-caption text-muted-foreground">
                            {insight.alsoFound > 0
                                ? t(
                                      `Βρήκαμε ακόμη ${insight.alsoFound} κινδύνους που σας αφορούν. Δεν έχουμε δει ακόμη τι καλύπτουν τα ασφαλιστήριά σας.`,
                                      `We found ${insight.alsoFound} more risks that apply to you. We have not yet seen what your policies cover.`,
                                  )
                                : t(
                                      "Δεν έχουμε δει ακόμη τι καλύπτουν τα ασφαλιστήριά σας.",
                                      "We have not yet seen what your policies cover.",
                                  )}
                        </p>
                    </>
                ) : (
                    <p className="mt-2 text-caption leading-relaxed text-foreground/80">
                        {t(
                            "Από όσα μας είπατε, δεν προκύπτει κάτι που να χρειάζεται προσοχή τώρα. Αυτό είναι καλό νέο.",
                            "From what you told us, nothing here needs your attention yet. That is good news.",
                        )}
                    </p>
                )}

                <Link
                    href="/protection#risk-profile-wizard"
                    className="mt-3 inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                >
                    {t("Πείτε μας περισσότερα", "Tell us more")}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
            </div>
        )
    }

    const question = questions[step]

    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold text-muted-foreground">{t("Ας ξεκινήσουμε", "Let us start")}</p>
                <p className="text-caption tabular-nums text-muted-foreground">
                    {step + 1}/{questions.length}
                </p>
            </div>

            {/* Progress, described once rather than per-segment. */}
            <div
                className="mt-2 flex gap-1"
                role="progressbar"
                aria-valuenow={step + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
                aria-label={t("Πρόοδος", "Progress")}
            >
                {questions.map((q, i) => (
                    <span
                        key={q.id}
                        className={`h-1 flex-1 rounded-full ${
                            i <= step ? "bg-primary dark:bg-mint" : "bg-muted"
                        }`}
                    />
                ))}
            </div>

            <h2 className="mt-3 text-title font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
                {question.prompt[lang] || question.prompt.en}
            </h2>

            {/* One column at every width: these are sentences, not chips, and two
                columns at 320px leaves ~136px for «Έχω δικό μου σπίτι». */}
            <ul className="mt-3 space-y-2">
                {question.options.map((option) => {
                    const chosen = answers[question.id] === option.value
                    return (
                        <li key={option.value}>
                            <button
                                type="button"
                                disabled={pending}
                                onClick={() => choose(question.id, option.value)}
                                className="pw-subcard flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors disabled:opacity-60"
                            >
                                <span className="min-w-0 [overflow-wrap:anywhere]">
                                    {option.label[lang] || option.label.en}
                                </span>
                                {chosen && (
                                    <Check className="h-4 w-4 flex-shrink-0 text-status-success" aria-hidden="true" />
                                )}
                            </button>
                        </li>
                    )
                })}
            </ul>

            {failed && (
                <p className="mt-3 text-caption text-status-danger">
                    {t("Κάτι πήγε στραβά. Δοκιμάστε ξανά.", "Something went wrong. Please try again.")}
                </p>
            )}
        </div>
    )
}
