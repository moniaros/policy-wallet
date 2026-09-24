export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { displayPersonName, policyLabel } from "@/lib/wallet/policy-identity"
import { ENDED_RELATIONSHIP_STATUSES, resolvePolicyAdvisors } from "@/lib/agent-visibility"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { reminderWindow, resolveCheckupBenefit } from "@/lib/wellness/checkup-benefit"
import { loadCatalogueInsurers, matchVerifiedCallCentre } from "@/lib/wallet/verified-insurer-contact"
import { athensDate, nudgeForDate } from "@/lib/wellness/nudges"
import type { CategoryScore } from "@/lib/wellness/scoring"
import { WellnessClient, type BenefitView } from "./WellnessClient"

/**
 * The wellness page (spec v2 §9, prevention brief 2026-09-24). Reads only
 * the person's own rows. Policy facts are what each health policy's reading
 * STATES, worded by how sure the evidence is (lib/wellness/checkup-benefit.ts).
 * No screening schedule is derived from age, sex or answers.
 */
export default async function WellnessPage() {
    const { dbUser } = await getAuthenticatedUser()
    const now = new Date()
    const year = Number(athensDate(now).slice(0, 4))

    const [policies, policyCount, usages, assessments, settings, relationships, shares, entitlements] = await Promise.all([
        db.policy.findMany({
            where: { ownerUserId: dbUser.id, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } },
            select: { id: true, ownerUserId: true, createdByUserId: true, insurerName: true, policyNumber: true, nickname: true, lineOfBusiness: true, status: true, endDate: true, acordData: true },
        }),
        db.policy.count({ where: { ownerUserId: dbUser.id, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } } }),
        db.healthBenefitUsage.findMany({ where: { userId: dbUser.id, year, benefit: "annual_checkup" }, select: { policyKey: true, status: true, intent: true, remindAt: true } }),
        db.healthRiskAssessment.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, answers: true, scores: true, createdAt: true } }),
        db.userNotificationSettings.findUnique({ where: { userId: dbUser.id }, select: { dailyNudgeOptIn: true } }).catch(() => null),
        db.customerRelationship.findMany({
            where: { policyholderUserId: dbUser.id, status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] } },
            orderBy: { createdAt: "asc" },
            select: { id: true, agentUserId: true, agent: { select: { name: true } } },
        }),
        db.healthShare.findMany({ where: { userId: dbUser.id, status: "active" }, select: { id: true, agentUserId: true, createdAt: true, lastViewedAt: true } }).catch(() => []),
        resolveUserEntitlements(dbUser.id),
    ])

    const health = policies.filter((p) => branchFamilyId(p.lineOfBusiness) === "health")
    const catalogue = health.length ? await loadCatalogueInsurers() : []
    const benefits: BenefitView[] = await Promise.all(
        health.map(async (p) => {
            const u = usages.find((row) => row.policyKey === p.id)
            const benefit = resolveCheckupBenefit(p, u ? { status: u.status, intent: u.intent, remindAt: u.remindAt } : null, now)
            const value = (p.acordData as any)?.health?.annualCheckupIncluded
            return {
                policyId: p.id,
                label: p.nickname || policyLabel(p),
                benefit,
                value: typeof value === "boolean" ? value : null,
                // Fallback only: the document's own coordination-centre number wins.
                insurerCallCentre: benefit.contactPhone ? null : matchVerifiedCallCentre(catalogue, p.insurerName),
                usage: { status: u?.status ?? "available", intent: u?.intent ?? null, remindAt: u?.remindAt ? u.remindAt.toISOString().slice(0, 10) : null },
                // An advisor only when one can already see THIS policy, and the plan allows messaging.
                advisorAvailable: entitlements.limits.agentCollaboration === true && (await resolvePolicyAdvisors(p)).length > 0,
            }
        })
    )

    const latest = assessments[0]
    return (
        <WellnessClient
            year={year}
            day={athensDate(now)}
            nudgeId={nudgeForDate(now)}
            nudgePushOn={settings?.dailyNudgeOptIn ?? false}
            hasPolicies={policyCount > 0}
            benefits={benefits}
            window={reminderWindow(now)}
            latestAssessment={latest ? { scores: latest.scores as unknown as CategoryScore[], createdAt: latest.createdAt.toISOString() } : null}
            assessmentCount={assessments.length}
            advisors={relationships.map((r) => ({ relationshipId: r.id, agentUserId: r.agentUserId, name: displayPersonName(r.agent.name) }))}
            shares={shares.map((s) => ({ id: s.id, agentUserId: s.agentUserId, createdAt: s.createdAt.toISOString(), lastViewedAt: s.lastViewedAt?.toISOString() ?? null }))}
        />
    )
}
