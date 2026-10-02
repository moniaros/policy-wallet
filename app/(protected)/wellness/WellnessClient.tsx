"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { HeartPulse, Check, Trash2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDate } from "@/lib/i18n/format"
import { PageContainer } from "@/components/ui/PageContainer"
import { type CategoryScore } from "@/lib/wellness/scoring"
import type { CheckupBenefit } from "@/lib/wellness/checkup-benefit"
import type { NudgeId } from "@/lib/wellness/nudges"
import { TONE_CHIP } from "@/lib/wallet/policy-status-view"
import { BenefitReminderCard } from "@/components/wellness/BenefitReminderCard"
import { DailyNudgeCard } from "@/components/wellness/DailyNudgeCard"
import { HealthSharePanel } from "@/components/wellness/HealthSharePanel"
import { deleteHealthAssessments } from "./actions"

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

export function WellnessClient({ year, day, nudgeId, nudgePushOn, hasPolicies, benefits, window, assessmentCount, advisors, shares }: Props) {
    const { t, language } = useLanguage()
    const locale = language === "el" ? "el" : "en"
    const [pending, startTransition] = useTransition()
    const copy = t.wellness
    return <PageContainer width="reading" className="py-6 lg:py-10 space-y-6">
        <header><h1 className="text-h3 font-semibold tracking-tight">{t.prevention.title}</h1><p className="mt-2 text-sm text-muted-foreground">{t.prevention.fallback}</p></header>
        <section id="benefit" className="pw-card pw-pad scroll-mt-20" aria-labelledby="checkup-heading">
            <h2 id="checkup-heading" className="text-title font-semibold">{copy.benefit.title}</h2>
            {!hasPolicies ? <div className="mt-3"><p className="text-sm text-muted-foreground">{t.prevention.noPolicies}</p><Link href="/wallet/add" className="pw-primary-button mt-3 inline-flex">{t.prevention.add}</Link></div> : benefits.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t.prevention.none}</p> : <div className="mt-3 space-y-3">{benefits.map(b => <BenefitReminderCard key={b.policyId} {...b} window={window} year={year} locale={locale} copy={copy.benefit} />)}</div>}
        </section>
        <DailyNudgeCard day={day} text={copy.nudges[nudgeId]} copy={copy.nudge} push={{ on: nudgePushOn }} />
        <section className="pw-card pw-pad"><p className="text-sm text-muted-foreground">{t.prevention.retired}</p><Link href="/account/privacy" className="pw-soft-button mt-3 inline-flex">{t.prevention.export}</Link>{assessmentCount > 0 && <button type="button" className="pw-soft-button mt-3" disabled={pending} onClick={() => { if (globalThis.confirm(t.policyholderExperience.deleteAssessmentsConfirm)) startTransition(async () => { await deleteHealthAssessments(); toast.success(copy.deleted) }) }}>{copy.deleteAll.replace("{n}", String(assessmentCount))}</button>}</section>
        <HealthSharePanel advisors={advisors} shares={shares} hasAssessment={false} locale={locale} copy={copy.share} />
    </PageContainer>
}
