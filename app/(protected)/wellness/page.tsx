export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { NON_LIVE_POLICY_STATUSES, resolvePolicyLifecycle } from "@/lib/policy-status"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { extractedField } from "@/lib/wallet/unreadable-value"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import type { CategoryScore } from "@/lib/wellness/scoring"
import { WellnessClient, type HealthPolicyView } from "./WellnessClient"

/**
 * Spec v2 §9 — the wellness page. Reads only the person's own rows; the
 * policy facts come from each health policy's extraction and are shown as
 * what the policy STATES, never as a promise of cover.
 */
export default async function WellnessPage() {
    const { dbUser } = await getAuthenticatedUser()
    const now = new Date()
    const year = now.getFullYear()

    const [policies, usages, assessments] = await Promise.all([
        db.policy.findMany({
            where: { ownerUserId: dbUser.id, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } },
            select: { id: true, insurerName: true, lineOfBusiness: true, endDate: true, coverageEndDate: true, acordData: true },
        }),
        db.healthBenefitUsage.findMany({ where: { userId: dbUser.id, year }, select: { policyKey: true, benefit: true, status: true, note: true } }),
        db.healthRiskAssessment.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, answers: true, scores: true, createdAt: true } }),
    ])

    const healthPolicies: HealthPolicyView[] = policies
        .filter((p) => branchFamilyId(p.lineOfBusiness) === "health")
        .filter((p) => { const l = resolvePolicyLifecycle(p as any, now); return l.daysUntilExpiry === null || l.daysUntilExpiry >= 0 })
        .map((p) => {
            const health = (p.acordData as any)?.health ?? {}
            const usage = usages.find((u) => u.policyKey === p.id && u.benefit === "annual_checkup")
            return {
                id: p.id,
                insurer: displayInsurerName(resolveInsurerDisplay(p.insurerName).displayName),
                checkupIncluded: typeof health.annualCheckupIncluded === "boolean" ? health.annualCheckupIncluded : null,
                coordinationCentreName: extractedField(health.coordinationCentre?.name ?? health.coordinationCentreName).value,
                coordinationCentrePhone: extractedField(health.coordinationCentre?.phone).value,
                status: (usage?.status as HealthPolicyView["status"]) ?? "available",
                note: usage?.note ?? "",
            }
        })

    const latest = assessments[0]
    return (
        <WellnessClient
            year={year}
            healthPolicies={healthPolicies}
            calendarDone={usages.filter((u) => u.policyKey === "" && u.status === "completed").map((u) => u.benefit)}
            latestAssessment={latest ? { answers: latest.answers as Record<string, string>, scores: latest.scores as unknown as CategoryScore[], createdAt: latest.createdAt.toISOString() } : null}
            assessmentCount={assessments.length}
        />
    )
}
