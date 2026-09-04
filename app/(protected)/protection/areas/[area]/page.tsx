export const runtime = 'nodejs'

import { notFound } from "next/navigation"

import { answerAssessmentFactor } from "@/app/(protected)/protection/assessment-actions"
import { AreaDetail } from "@/components/protection/AreaDetail"
import { buildAreaDetail, isAttentionAreaId, questionFlowCopy, type AreaPolicyRow } from "@/components/protection/area-detail-model"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { canRunDeepAnalysis } from "@/lib/monetization/feature-gates"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"
import { toPolicyFields } from "@/lib/services/gap-engine/profile-gap-rules"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"

/**
 * One area of attention — /protection/areas/[area] (docs/planning/
 * PERSONAL_RISK_PROFILE.md §D). The bundle comes from the one read seam
 * (`loadAttentionAreas`); the area's risks are the engine's own assessment
 * over the same rows, through the same mapper the seam uses; the policy rows
 * add only identity and the extracted envelope, owner-scoped, and are named
 * through policy-identity and the one status pipeline. Read-only: the write
 * path is `answerAssessmentFactor`, which the question flow calls.
 */
export default async function ProtectionAreaPage({ params }: { params: Promise<{ area: string }> }) {
    const { area } = await params
    if (!isAttentionAreaId(area)) notFound()

    const { dbUser } = await getAuthenticatedUser()
    const lang: "el" | "en" = dbUser.preferredLanguage === "en" ? "en" : "el"
    const t = getTranslations(lang)
    const now = new Date()

    const [bundle, entitlements, policyRows] = await Promise.all([
        loadAttentionAreas({ userId: dbUser.id, language: lang, now }),
        resolveUserEntitlements(dbUser.id),
        db.policy.findMany({
            // The person's own rows — the same visibility the seam reads.
            where: { ownerUserId: dbUser.id, status: { not: "deleted" } },
            select: {
                id: true,
                insurerName: true,
                policyNumber: true,
                lineOfBusiness: true,
                status: true,
                endDate: true,
                acordData: true,
            },
        }),
    ])

    const view = bundle.areas.find((a) => a.area === area)
    if (!view) notFound()

    const rows = new Map<string, AreaPolicyRow>(policyRows.map((p) => [p.id, p]))
    const model = buildAreaDetail({
        view,
        assessments: assessRisks(bundle.ctx, toPolicyFields(policyRows)),
        ctx: bundle.ctx,
        provenance: bundle.provenance,
        policyRows: rows,
        uncertaintyReasons: bundle.needs.uncertaintyReasons,
        // Limits are read by the deep run, and whether THIS tier may run it is
        // the one predicate every gate reads (lib/monetization/feature-gates.ts).
        // A paying Starter is locked too, and the detail says so as a fact.
        deepAnalysisLocked: !canRunDeepAnalysis(entitlements.tier),
        t,
        language: lang,
        now,
    })

    return <AreaDetail model={model} copy={t.protection.attention} flowCopy={questionFlowCopy(t)} onAnswer={answerAssessmentFactor} />
}
