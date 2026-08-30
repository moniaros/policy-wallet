import { db } from "@/lib/db"
import { policyLabel } from "@/lib/wallet/policy-identity"
import { appFlag } from "./flags"
import { visibleAfterDismissal, type DismissalRecord } from "./dismissal"
import { loadFindingsContext } from "./home-model"
import type { RenderableFinding } from "./finding"
import type { Tier } from "./state"
import { tierThatRuns, type PlanTier } from "./entitlements"
import { QUICK_START_QUESTIONS, quickStartComplete, type QuickStartQuestion } from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"

export interface SeeModel {
    lang: "el" | "en"
    tiers: Record<Tier, RenderableFinding[]>
    /** Findings hidden by a «δεν το θέλω» choice that has not been reopened. */
    dismissedCount: number
    dismissalsOn: boolean
    expiredLabels: string[]
    nextExpiryDays: number | null
    /** Gap detection is not in this plan — the list is expiries and reviews only. */
    gapsNotChecked: boolean
    /** The cheapest plan whose limits run gap detection (plan-defaults), named on screen through planTierName. */
    gapDetectionTier: PlanTier | null
    /** The three profile questions, until answered — they are what makes a finding «yours» (why-you). */
    quickStart: { questions: QuickStartQuestion[] } | null
    policyCount: number
}

/**
 * Dismissal memory (§9): a choice is honoured until the document changes, the
 * profile changes, or the policy expires — all three computed from what the
 * app already knows, never from a client-supplied date.
 */
async function loadDismissals(userId: string, ctx: Awaited<ReturnType<typeof loadFindingsContext>>): Promise<Map<string, DismissalRecord>> {
    if (!(await appFlag("app.findings"))) return new Map()
    const [rows, profile] = await Promise.all([
        db.finding.findMany({ where: { userId, dismissedAt: { not: null } }, select: { hash: true, policyId: true, dismissedAt: true } }),
        db.policyholderProfile.findUnique({ where: { userId }, select: { updatedAt: true } }),
    ])
    const map = new Map<string, DismissalRecord>()
    for (const r of rows) {
        const policy = r.policyId ? ctx.rawById.get(r.policyId) : undefined
        const newestDoc = policy?.documents.reduce<Date | null>((acc, d) => (!acc || d.uploadedAt > acc ? d.uploadedAt : acc), null) ?? null
        map.set(r.hash, { dismissedAt: r.dismissedAt!, documentChangedAt: newestDoc, profileChangedAt: profile?.updatedAt ?? null, expiryAt: policy?.endDate ?? null })
    }
    return map
}

export async function loadSeeModel(userId: string, lang: "el" | "en", now: Date = new Date()): Promise<SeeModel> {
    const [ctx, dismissalsOn, profile] = await Promise.all([loadFindingsContext(userId, lang, now), appFlag("app.findings"), db.policyholderProfile.findUnique({ where: { userId } })])
    const dismissals = await loadDismissals(userId, ctx)
    const visible = visibleAfterDismissal(ctx.findings, dismissals, now)
    const tiers: Record<Tier, RenderableFinding[]> = { now: [], month: [], later: [] }
    for (const f of visible) tiers[f.tier].push(f)
    const live = ctx.composed.filter((p) => p.lifecycle !== "expired")
    const expiredLabels = ctx.composed
        .filter((p) => p.lifecycle === "expired")
        .map((p) => policyLabel(ctx.rawById.get(p.id) ?? {}, ""))
        .filter(Boolean)
    const days = live.map((p) => p.daysUntilExpiry).filter((d): d is number => typeof d === "number" && d >= 0)
    return {
        lang,
        tiers,
        dismissedCount: ctx.findings.length - visible.length,
        dismissalsOn,
        expiredLabels,
        nextExpiryDays: days.length ? Math.min(...days) : null,
        gapsNotChecked: ctx.entitlements.limits.gapAnalysisPerDay === 0,
        gapDetectionTier: tierThatRuns("gap_detection"),
        quickStart: quickStartComplete(toLifeContext(profile, now)) ? null : { questions: QUICK_START_QUESTIONS },
        policyCount: live.length,
    }
}
