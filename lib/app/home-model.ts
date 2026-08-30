/**
 * The home screen's model (§8.1) — every read the screen needs, composed once
 * on the server through lib/app/*. Read-only: nothing here runs the engine,
 * writes a row, or asks a model.
 */
import { db } from "@/lib/db"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { LINES, lineOf } from "./lines"
import { deriveInsuredNames } from "@/lib/wallet/insured-people"
import { getTimeline } from "@/lib/services/timeline/service"
import { composePolicies, composeFindings, composeRenderable, type ComposePolicy, type ComposeGap, type ComposeProfile, type ComposedPolicy } from "./compose"
import { computeVerdict, type Verdict } from "./verdict"
import { capNow, sortByTier } from "./tier"
import { computeMoneyLine, type MoneyLine, type MoneyPolicy } from "./money"
import { personState } from "./household"
import { LIFE_EVENT_CHIPS } from "./lifeEvents"
import { checksNotInPlan, type PlanTier } from "./entitlements"
import type { RenderableFinding } from "./finding"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import type { ProtectionState } from "./state"
import { logger } from "@/lib/logger"

export interface HomeModel {
    lang: "el" | "en"
    tier: PlanTier
    policyCount: number
    verdict: Verdict
    findings: RenderableFinding[]
    now: { shown: RenderableFinding[]; overflow: number }
    money: MoneyLine
    map: Array<{ id: string; label: string; state: ProtectionState | null }>
    household: Array<{ id: string; name: string; state: ProtectionState; policyCount: number }>
    lifeChips: Array<{ id: string; href: string }>
    nextExpiry: { policyId: string; assetLabel: string; days: number } | null
    lastDid: { text: string; at: Date } | null
    notChecked: { gapDetection: boolean; notAnalysed: number; failed: number }
    policies: ComposedPolicy[]
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim()

/**
 * The three «τώρα» slots must not be spent on the same sentence three times.
 * Seeded and real wallets carry duplicate policies for one asset (the same
 * plate on three schedules); each is a finding in its own right on /see, but
 * on the home screen identical rows (same kind, asset and rule) fold into one
 * and the rest count toward «Υπάρχουν και N μικρότερα».
 */
export function foldIdenticalRows(findings: readonly RenderableFinding[]): { shown: RenderableFinding[]; overflow: number } {
    const seen = new Set<string>()
    let folded = 0
    const unique = findings.filter((f) => {
        if (f.tier !== "now") return true
        const key = `${f.kind}:${f.ruleId}:${f.object.assetLabel}`
        if (seen.has(key)) { folded += 1; return false }
        seen.add(key)
        return true
    })
    const capped = capNow(unique)
    return { shown: capped.shown, overflow: capped.overflow + folded }
}

export interface FindingsContext {
    policies: Awaited<ReturnType<typeof loadPolicyRows>>
    /** The same rows by id — premium, summary and dates live here, not on ComposePolicy. */
    policyRows: Map<string, Awaited<ReturnType<typeof loadPolicyRows>>[number]>
    raw: ComposePolicy[]
    rawById: Map<string, ComposePolicy>
    composed: ReturnType<typeof composePolicies>
    findings: RenderableFinding[]
    entitlements: Awaited<ReturnType<typeof resolveUserEntitlements>>
}

async function loadPolicyRows(userId: string) {
    return db.policy.findMany({
        where: { ownerUserId: userId, status: { not: "deleted" } },
        select: {
            id: true, lineOfBusiness: true, insurerName: true, policyNumber: true, status: true, endDate: true, startDate: true,
            premiumAmount: true, premiumCurrency: true, acordData: true, lastAnalyzedAt: true, coverageSummary: true,
            documents: { select: { id: true, documentKind: true, effectiveFrom: true, effectiveTo: true, uploadedAt: true, supersededById: true, fileName: true } },
        },
        orderBy: { endDate: "asc" },
    })
}

/**
 * The one composition every app screen reads from: this person's policies,
 * the engine's open gap rows, the profile facts they entered, their plan —
 * composed into policies-with-lifecycle and gate-passing findings. `/`, `/see`
 * and `/policies` all call this so no screen can disagree with another about
 * what a finding is.
 */
export async function loadFindingsContext(userId: string, lang: "el" | "en", now: Date = new Date()): Promise<FindingsContext> {
    const [policies, gaps, profile, entitlements] = await Promise.all([
        loadPolicyRows(userId),
        db.gapInstance.findMany({
            where: { policy: { ownerUserId: userId, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } }, status: { in: ["open", "detected", "acknowledged"] } },
            select: { id: true, policyId: true, ruleId: true, ruleInputs: true, engineVersion: true, definition: { select: { slug: true, detectionLogic: true, lineOfBusiness: true } } },
        }),
        db.policyholderProfile.findUnique({ where: { userId }, select: { answeredFields: true, ownsHome: true, vehiclesCount: true, dependentsCount: true } }),
        resolveUserEntitlements(userId),
    ])
    const raw: ComposePolicy[] = policies.map((p) => ({ ...p, documents: p.documents }))
    const rawById = new Map(raw.map((p) => [p.id, p]))
    const composed = composePolicies(raw, lang, now)
    const composeProfile: ComposeProfile | null = profile
        ? { answeredFields: Array.isArray(profile.answeredFields) ? (profile.answeredFields as string[]) : [], ownsHome: profile.ownsHome, vehiclesCount: profile.vehiclesCount, dependentsCount: profile.dependentsCount }
        : null
    const all = composeFindings(composed, rawById, gaps as ComposeGap[], composeProfile, lang, (msg, meta) => logger("info", `[app] ${msg}`, meta))
    const findings = sortByTier(composeRenderable(all))
    return { policies, policyRows: new Map(policies.map((p) => [p.id, p])), raw, rawById, composed, findings, entitlements }
}

export async function loadHomeModel(userId: string, lang: "el" | "en", now: Date = new Date()): Promise<HomeModel> {
    const [ctx, people, timeline] = await Promise.all([
        loadFindingsContext(userId, lang, now),
        // The table may not exist in an environment yet (prod DDL owed) — degrade to nobody.
        db.householdPerson.findMany({ where: { userId }, select: { id: true, name: true, isDependant: true, relation: true } }).catch(() => []),
        getTimeline(userId, { limit: 1 }).catch(() => []),
    ])
    const { policies, raw, composed, findings, entitlements } = ctx

    const verdict = computeVerdict(
        composed.map((p) => ({ id: p.id, lifecycle: p.lifecycle, daysUntilExpiry: p.daysUntilExpiry, neverAnalysed: p.neverAnalysed, analysisFailed: p.analysisFailed, unresolvedFields: p.unresolvedFields })),
        findings.map((f) => ({ policyId: f.object.policyId, kind: f.kind, tier: f.tier, daysUntilExpiry: f.daysUntilExpiry ?? null })),
        { gapAnalysisPerDay: entitlements.limits.gapAnalysisPerDay ?? null }
    )

    const moneyPolicies: MoneyPolicy[] = raw.map((p) => ({
        id: p.id, lineOfBusiness: p.lineOfBusiness, status: p.status, insurerName: p.insurerName, policyNumber: p.policyNumber,
        startDate: (p as { startDate?: Date | null }).startDate ?? null, endDate: p.endDate, premiumAmount: (p as { premiumAmount?: unknown }).premiumAmount,
        premiumCurrency: (p as { premiumCurrency?: string | null }).premiumCurrency ?? null, acordData: p.acordData,
        coverages: ((p.acordData as { coverages?: MoneyPolicy["coverages"] } | null)?.coverages) ?? [],
    }))

    const live = composed.filter((p) => verdict.perPolicy[p.id])
    const map = LINES.map((line) => {
        const states = live.filter((p) => lineOf(p.lineOfBusiness) === line.id).map((p) => verdict.perPolicy[p.id])
        const state: ProtectionState | null = states.length === 0 ? null : states.includes("gap") ? "gap" : states.includes("review") ? "review" : "covered"
        return { id: line.id, label: line.label[lang], state }
    })

    const namesByPolicy = new Map(raw.map((p) => [p.id, deriveInsuredNames(p.acordData).map(fold)]))
    const household = people.map((person) => {
        const key = fold(person.name)
        const naming = live.filter((p) => (namesByPolicy.get(p.id) ?? []).includes(key))
        const states = naming.map((p) => verdict.perPolicy[p.id])
        return { id: person.id, name: person.name, state: personState({ id: person.id, relation: person.relation as never, isDependant: person.isDependant, policyStates: states }), policyCount: naming.length }
    })

    const next = live.filter((p) => p.daysUntilExpiry !== null && p.daysUntilExpiry >= 0).sort((a, b) => a.daysUntilExpiry! - b.daysUntilExpiry!)[0]
    const last = timeline[0] as { title?: { el?: string; en?: string }; summary?: { el?: string; en?: string }; at?: Date; occurredAt?: Date } | undefined
    const lastText = last?.title?.[lang] ?? last?.summary?.[lang] ?? null
    const lastAt = last?.at ?? last?.occurredAt ?? null

    return {
        lang,
        tier: entitlements.tier as PlanTier,
        policyCount: composed.length,
        verdict,
        findings,
        now: foldIdenticalRows(findings),
        money: computeMoneyLine(moneyPolicies, new Map(), now),
        map,
        household,
        lifeChips: LIFE_EVENT_CHIPS.map((c) => ({ id: c.id, href: `/life-event/${c.id}` })),
        nextExpiry: next ? { policyId: next.id, assetLabel: next.assetLabel, days: next.daysUntilExpiry! } : null,
        lastDid: lastText && lastAt ? { text: lastText, at: lastAt } : null,
        notChecked: {
            gapDetection: checksNotInPlan(entitlements.tier as PlanTier).includes("gap_detection"),
            notAnalysed: composed.filter((p) => p.lifecycle !== "expired" && p.neverAnalysed).length,
            failed: composed.filter((p) => p.lifecycle !== "expired" && p.analysisFailed).length,
        },
        policies: composed,
    }
}
