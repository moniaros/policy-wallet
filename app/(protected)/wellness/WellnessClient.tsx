"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { HeartPulse, Phone, Check, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDate } from "@/lib/i18n/format"
import { PageContainer } from "@/components/ui/PageContainer"
import { ASSESSMENT_QUESTIONS, type CategoryScore } from "@/lib/wellness/scoring"
import { preventiveItemsFor } from "@/lib/wellness/preventive"
import { TONE_CHIP } from "@/lib/wallet/policy-status-view"
import { deleteHealthAssessments, setBenefitStatus, submitHealthAssessment } from "./actions"

export interface HealthPolicyView {
    id: string
    insurer: string
    /** What the policy STATES about an annual check-up; null = not recorded. */
    checkupIncluded: boolean | null
    coordinationCentreName: string | null
    coordinationCentrePhone: string | null
    status: "available" | "scheduled" | "completed" | "archived"
    note: string
}

interface Props {
    year: number
    healthPolicies: HealthPolicyView[]
    calendarDone: string[]
    latestAssessment: { answers: Record<string, string>; scores: CategoryScore[]; createdAt: string } | null
    assessmentCount: number
}

// Tones from the shared status pipeline — no colour literal of its own.
const BAND_TONE: Record<CategoryScore["band"], string> = {
    low: TONE_CHIP.positive,
    moderate: TONE_CHIP.warning,
    elevated: TONE_CHIP.critical,
}

export function WellnessClient({ year, healthPolicies, calendarDone, latestAssessment, assessmentCount }: Props) {
    const { t, language } = useLanguage()
    const locale = language === "el" ? "el" : "en"
    const copy = t.wellness
    const [pending, startTransition] = useTransition()
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [consent, setConsent] = useState(false)
    const [showForm, setShowForm] = useState(!latestAssessment)

    const setStatus = (policyId: string | null, benefit: string, status: HealthPolicyView["status"]) =>
        startTransition(async () => {
            const res = await setBenefitStatus({ policyId, benefit, year, status })
            if ("error" in res) toast.error(copy.saveFailed)
            else toast.success(copy.saved)
        })

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

    const calendar = preventiveItemsFor(latestAssessment?.answers.ageBand, latestAssessment?.answers.sex)

    return (
        <PageContainer width="reading" className="py-6 lg:py-10 space-y-6">
            <header>
                <h1 className="text-h3 font-semibold tracking-tight text-foreground">{copy.title}</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.intro}</p>
            </header>

            {/* §9.1 — annual check-up per health policy */}
            <section className="pw-card pw-pad" aria-labelledby="checkup-heading">
                <h2 id="checkup-heading" className="text-title font-semibold text-foreground">{copy.checkupTitle}</h2>
                {healthPolicies.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.noHealthPolicy}</p>
                ) : (
                    <ul className="mt-3 space-y-3">
                        {healthPolicies.map((p) => (
                            <li key={p.id} className="pw-subcard p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground">{p.insurer}</p>
                                        <p className="text-caption text-muted-foreground">
                                            {p.checkupIncluded === true ? copy.checkupStated : p.checkupIncluded === false ? copy.checkupStatedNot : copy.checkupNotRecorded}
                                        </p>
                                    </div>
                                    <label className="text-sm">
                                        <span className="sr-only">{copy.statusLabel}</span>
                                        <select
                                            value={p.status}
                                            disabled={pending}
                                            onChange={(e) => setStatus(p.id, "annual_checkup", e.target.value as HealthPolicyView["status"])}
                                            className="pw-input h-10 w-auto py-0 text-sm"
                                            data-fact="wellness.checkupStatus"
                                            data-fact-subject={p.id}
                                            data-fact-value={p.status}
                                        >
                                            <option value="available">{copy.status.available}</option>
                                            <option value="scheduled">{copy.status.scheduled}</option>
                                            <option value="completed">{copy.status.completed}</option>
                                        </select>
                                    </label>
                                </div>
                                {p.coordinationCentrePhone ? (
                                    <a href={`tel:${p.coordinationCentrePhone.replace(/\s+/g, "")}`} className="pw-soft-button mt-3 inline-flex">
                                        <Phone className="h-4 w-4" aria-hidden="true" />
                                        {copy.bookVia} {p.coordinationCentreName ?? ""} · {p.coordinationCentrePhone}
                                    </a>
                                ) : (
                                    <p className="mt-2 text-caption text-muted-foreground">{copy.noCentrePhone}</p>
                                )}
                            </li>
                        ))}
                    </ul>
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
                                    {s.checks.length > 0 && (
                                        <p className="mt-2 text-caption text-muted-foreground">
                                            {copy.worthRaising}: {s.checks.map((c) => copy.checks[c as keyof typeof copy.checks] ?? c).join(", ")}
                                        </p>
                                    )}
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

            {/* §9.3 — preventive calendar, only once an assessment gives age and sex */}
            <section className="pw-card pw-pad" aria-labelledby="calendar-heading">
                <h2 id="calendar-heading" className="text-title font-semibold text-foreground">{copy.calendarTitle}</h2>
                {calendar.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.calendarNeedsAssessment}</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {calendar.map((item) => {
                            const done = calendarDone.includes(item.id)
                            return (
                                <li key={item.id} className="pw-subcard flex flex-wrap items-center justify-between gap-2 p-3">
                                    <div className="min-w-0">
                                        <p className={`font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{copy.checks[item.id as keyof typeof copy.checks] ?? item.id}</p>
                                        <p className="text-caption text-muted-foreground">{copy.everyYears.replace("{n}", String(item.everyYears))}</p>
                                    </div>
                                    <button type="button" disabled={pending} className="pw-soft-button" onClick={() => setStatus(null, item.id, done ? "available" : "completed")}>
                                        {done ? copy.markUndone : copy.markDone}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
                <p className="mt-3 text-caption text-muted-foreground">{copy.calendarSource}</p>
            </section>
        </PageContainer>
    )
}
