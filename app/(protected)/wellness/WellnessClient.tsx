"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { HeartPulse, Check, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDate } from "@/lib/i18n/format"
import { PageContainer } from "@/components/ui/PageContainer"
import { ASSESSMENT_QUESTIONS, type CategoryScore } from "@/lib/wellness/scoring"
import type { CheckupBenefit } from "@/lib/wellness/checkup-benefit"
import type { NudgeId } from "@/lib/wellness/nudges"
import { TONE_CHIP } from "@/lib/wallet/policy-status-view"
import { BenefitReminderCard } from "@/components/wellness/BenefitReminderCard"
import { DailyNudgeCard } from "@/components/wellness/DailyNudgeCard"
import { HealthSharePanel } from "@/components/wellness/HealthSharePanel"
import { deleteHealthAssessments, submitHealthAssessment } from "./actions"

export interface BenefitView {
    policyId: string
    label: string
    benefit: CheckupBenefit
    value: boolean | null
    insurerCallCentre: { insurer: string; phone: string } | null
    usage: { status: string; intent: string | null; remindAt: string | null }
    advisorAvailable: boolean
}

interface Props {
    year: number
    day: string
    nudgeId: NudgeId
    nudgePushOn: boolean
    hasPolicies: boolean
    benefits: BenefitView[]
    window: { min: string; max: string }
    latestAssessment: { scores: CategoryScore[]; createdAt: string } | null
    assessmentCount: number
    advisors: Array<{ relationshipId: string; agentUserId: string; name: string }>
    shares: Array<{ id: string; agentUserId: string; createdAt: string; lastViewedAt: string | null }>
}

// Tones from the shared status pipeline — no colour literal of its own.
const BAND_TONE: Record<CategoryScore["band"], string> = {
    low: TONE_CHIP.positive,
    moderate: TONE_CHIP.warning,
    elevated: TONE_CHIP.critical,
}

export function WellnessClient({ year, day, nudgeId, nudgePushOn, hasPolicies, benefits, window, latestAssessment, assessmentCount, advisors, shares }: Props) {
    const { t, language } = useLanguage()
    const locale = language === "el" ? "el" : "en"
    const copy = t.wellness
    const [pending, startTransition] = useTransition()
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [consent, setConsent] = useState(false)
    const [showForm, setShowForm] = useState(!latestAssessment)

    const submit = () =>
        startTransition(async () => {
            const res = await submitHealthAssessment({ consent, answers })
            if ("error" in res) {
                toast.error(res.error === "CONSENT_REQUIRED" ? copy.consentRequired : copy.incomplete)
                return
            }
            toast.success(copy.saved)
            setShowForm(false)
        })

    return (
        <PageContainer width="reading" className="py-6 lg:py-10 space-y-6">
            <header>
                <h1 className="text-h3 font-semibold tracking-tight text-foreground">{copy.title}</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.intro}</p>
            </header>

            {/* Prevention brief — one small, general habit a day. */}
            <DailyNudgeCard day={day} text={copy.nudges[nudgeId]} copy={copy.nudge} push={{ on: nudgePushOn }} />

            {/* §9.1 / brief P0–P1 — the check-up each health policy states. */}
            <section id="benefit" className="pw-card pw-pad scroll-mt-20" aria-labelledby="checkup-heading">
                <h2 id="checkup-heading" className="text-title font-semibold text-foreground">{copy.benefit.title}</h2>
                {!hasPolicies ? (
                    <div className="mt-2">
                        <p className="text-sm text-muted-foreground">{copy.benefit.noPolicy}</p>
                        <Link href="/wallet/add" className="pw-primary-button mt-3 inline-flex">{copy.benefit.addPolicy}</Link>
                    </div>
                ) : benefits.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.benefit.noHealthPolicy}</p>
                ) : (
                    <div className="mt-3 space-y-3">
                        {benefits.map((b) => (
                            <BenefitReminderCard key={b.policyId} {...b} window={window} year={year} locale={locale} copy={copy.benefit} />
                        ))}
                    </div>
                )}
            </section>

            {/* §9.2 — self-assessment, behind explicit consent */}
            <section className="pw-card pw-pad" aria-labelledby="assessment-heading">
                <div className="flex items-start gap-3">
                    <span className="pw-card-chip" aria-hidden="true"><HeartPulse className="h-4 w-4" strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                        <h2 id="assessment-heading" className="text-title font-semibold text-foreground">{copy.assessmentTitle}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{copy.assessmentIntro}</p>
                    </div>
                </div>

                {latestAssessment && !showForm && (
                    <div className="mt-4">
                        <p className="text-caption text-muted-foreground">{copy.lastTaken.replace("{date}", formatDate(latestAssessment.createdAt, locale))}</p>
                        <ul className="mt-3 space-y-3">
                            {latestAssessment.scores.map((s) => (
                                <li key={s.category} className="pw-subcard p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold text-foreground">{copy.categories[s.category]}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${BAND_TONE[s.band]}`} data-fact="wellness.score" data-fact-subject={s.category} data-fact-value={String(s.score)}>
                                            {s.score} · {copy.bands[s.band]}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-muted" aria-hidden="true">
                                        <div className="h-2 rounded-full bg-primary" style={{ width: `${s.score}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-caption text-muted-foreground">{copy.notDiagnosis}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" className="pw-soft-button" onClick={() => setShowForm(true)}>{copy.retake}</button>
                            <button type="button" className="pw-soft-button text-status-danger" disabled={pending} onClick={() => startTransition(async () => { await deleteHealthAssessments(); toast.success(copy.deleted) })}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {copy.deleteAll.replace("{n}", String(assessmentCount))}
                            </button>
                        </div>
                    </div>
                )}

                {showForm && (
                    <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
                        {ASSESSMENT_QUESTIONS.map((q) => (
                            <fieldset key={q.id} className="min-w-0">
                                <legend className="text-sm font-semibold text-foreground">{copy.questions[q.id]}</legend>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {q.options.map((opt) => (
                                        <label key={opt} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${answers[q.id] === opt ? "border-primary bg-primary-tint text-primary dark:bg-primary/10 dark:text-mint" : "border-border text-foreground"}`}>
                                            <input type="radio" name={q.id} value={opt} className="sr-only" checked={answers[q.id] === opt} onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} />
                                            {(copy.options as Record<string, string>)[`${q.id}_${opt}`] ?? opt}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        <label className="flex items-start gap-2 text-sm text-foreground">
                            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                            <span>{copy.consentLabel}</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={pending || !consent} className="pw-primary-button">
                                <Check className="h-4 w-4" aria-hidden="true" />
                                {copy.submit}
                            </button>
                            {latestAssessment && <button type="button" className="pw-soft-button" onClick={() => setShowForm(false)}>{t.common.cancel}</button>}
                        </div>
                    </form>
                )}
            </section>

            {/* Brief P2 — the person may show ONE advisor their health picture. */}
            <HealthSharePanel advisors={advisors} shares={shares} hasAssessment={latestAssessment !== null} locale={locale} copy={copy.share} />
        </PageContainer>
    )
}
