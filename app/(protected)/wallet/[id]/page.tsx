export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { getStatusColor, getStatusLabel, resolvePolicyLifecycle } from "@/lib/policy-status"
import { getPolicyShares } from "../actions"
import { getTranslations } from "@/lib/i18n"
import { getAIUsageStats } from "../actions"
import { PolicyDetailsClient } from "./PolicyDetailsClient"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { normalizeRemindersSent } from "@/lib/wallet/policy-detail"
import {
    computeReportUnlocked,
    dedupeGaps,
    resolveGapContent,
    type GapReportItem,
} from "@/lib/wallet/gap-report"

export default async function PolicyDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: policyId } = await params
    const { dbUser } = await getAuthenticatedUser()
    const language = (dbUser.preferredLanguage as 'el' | 'en') || 'el'
    const t = getTranslations(language)

    const [policy, sharesResult, aiUsageStats, entitlements, renewalRows] = await Promise.all([
        db.policy.findUnique({
            where: { id: policyId },
            include: {
                documents: {
                    orderBy: { uploadedAt: 'desc' }
                },
                gapInstances: {
                    where: { status: 'open' },
                    include: { definition: true }
                }
            }
        }),
        getPolicyShares(policyId).catch(error => {
            console.error("Failed to load policy shares:", error)
            return []
        }),
        getAIUsageStats(),
        resolveUserEntitlements(dbUser.id),
        db.policyRenewal.findMany({
            where: { policyId },
            orderBy: { policyEndDate: 'desc' },
            take: 5
        })
    ])

    if (!policy) {
        notFound()
    }

    // Authorization: owner, active policy-scoped grant, or a relationship-
    // connected agent (central rule in lib/policy-access).
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: dbUser.id,
        roles: dbUser.roles,
    })
    if (!access.canRead) {
        notFound()
    }
    const isOwner = access.isOwner

    const shares = sharesResult || []

    // Lifecycle from the REAL (extracted) end date — never the DB column's
    // historical upload placeholder. daysUntilExpiry is null when no
    // trustworthy end date exists (no fabricated countdown).
    const lifecycle = resolvePolicyLifecycle(policy)
    const status = lifecycle.status
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status, language)
    const daysLeft = lifecycle.daysUntilExpiry

    // Gap report items: dedupe DB-level slug twins and resolve Greek/English
    // titles + grouping dimensions server-side (unknown slugs are Sentry-
    // reported here, ad-blocker-proof). The pipeline's raw English titles
    // never reach the client.
    const gapReportItems: GapReportItem[] = dedupeGaps(policy.gapInstances).map((gap) => ({
        id: gap.id,
        slug: gap.normalizedSlug,
        duplicateIds: gap.duplicateIds,
        content: resolveGapContent(gap.definition?.slug || "", {
            lineOfBusiness: policy.lineOfBusiness,
            aiExplanationEl: gap.aiExplanationEl,
            aiExplanation: gap.aiExplanation,
        }),
        aiExplanation: gap.aiExplanation || null,
        aiExplanationEl: gap.aiExplanationEl || null,
        aiSuggestion: gap.aiSuggestion || null,
        aiSuggestionEl: gap.aiSuggestionEl || null,
    }))
    const reportConcepts = new Set(gapReportItems.map((item) => item.content.concept))

    // Free-tier owners see the first gaps only until the €3 unlock or an
    // upgrade; agents/viewers always get the full report (unchanged).
    const reportUnlocked = computeReportUnlocked({
        isOwner,
        tier: entitlements.tier,
        reportUnlockedAt: policy.reportUnlockedAt,
    })

    // Related recommendations (owner only): reuse the persisted gap-engine
    // output, preferring same-line-of-business suggestions. Read-only — the
    // engine itself is not re-run here. Policy-derived recommendations that
    // already render as gap cards above are dropped — the same finding must
    // not appear twice on this page (profile/portfolio recs stay).
    let relatedRecommendations: Array<Record<string, unknown>> = []
    if (isOwner) {
        try {
            const { getActiveRecommendations, policyGapConcept } = await import("@/lib/services/gap-engine")
            const recommendations = (await getActiveRecommendations(dbUser.id)).filter((r) => {
                const concept = policyGapConcept(r.ruleId)
                if (concept === null) return true // profile/portfolio rule — always shown
                return !reportConcepts.has(concept)
            })
            const sameLob = recommendations.filter(r => r.lineOfBusiness === policy.lineOfBusiness)
            relatedRecommendations = (sameLob.length > 0 ? sameLob : recommendations)
                .slice(0, 4)
                .map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
        } catch (error) {
            console.error("Failed to load related recommendations:", error)
        }
    }

    let relationshipId: string | null = null
    if (isOwner) {
        const rel = await db.customerRelationship.findFirst({
            where: {
                policyholderUserId: dbUser.id,
                status: "active",
            },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        })
        relationshipId = rel?.id || null
    } else {
        const rel = await db.customerRelationship.findFirst({
            where: {
                policyholderUserId: policy.ownerUserId,
                agentUserId: dbUser.id,
            },
            select: { id: true },
        })
        relationshipId = rel?.id || null
    }

    const serializedShares = Array.isArray(shares) ? shares.map(s => ({
        ...s,
        grantedAt: s.grantedAt ? s.grantedAt.toISOString() : new Date().toISOString()
    })) : []

    // Renewal-reminder trail written by the renewal-check cron.
    const serializedRenewals = renewalRows.map(r => ({
        id: r.id,
        policyEndDate: r.policyEndDate.toISOString(),
        status: r.status,
        outcome: r.outcome,
        lastReminderAt: r.lastReminderAt?.toISOString() || null,
        remindersSent: normalizeRemindersSent(r.remindersSent)
    }))

    const serializedPolicy = {
        ...policy,
        startDate: policy.startDate.toISOString(),
        endDate: policy.endDate.toISOString(),
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
        lastAnalyzedAt: policy.lastAnalyzedAt?.toISOString() || null,
        reportUnlockedAt: policy.reportUnlockedAt?.toISOString() || null,
        premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
        verified: (() => {
            const ext = (policy.acordData as any)?.extraction
            if (!ext) return false
            return !(
                ext.requiresReview ||
                (typeof ext.confidence?.overall === 'number' && ext.confidence.overall < 80) ||
                (Array.isArray(ext.missingCriticalFields) && ext.missingCriticalFields.length > 0)
            )
        })(),
        reviewState: (() => {
            const state = (policy.acordData as any)?.extraction?.reviewState
            return state === 'unconfirmed' || state === 'confirmed' || state === 'flagged' ? state : null
        })(),
        premiumCurrency: policy.premiumCurrency,
        documents: policy.documents.map(d => ({
            ...d,
            uploadedAt: d.uploadedAt.toISOString()
        })),
        gapInstances: policy.gapInstances.map(g => ({
            ...g,
            detectedAt: g.detectedAt.toISOString(),
            resolvedAt: g.resolvedAt?.toISOString() || null,
            definition: {
                ...g.definition,
                createdAt: g.definition.createdAt.toISOString(),
                updatedAt: g.definition.updatedAt.toISOString()
            }
        }))
    }

    return (
        <PolicyDetailsClient
            policy={serializedPolicy}
            serializedShares={serializedShares}
            aiUsageStats={aiUsageStats}
            statusLabel={statusLabel}
            statusColor={statusColor}
            daysLeft={daysLeft}
            isOwner={isOwner}
            relationshipId={relationshipId}
            t={t}
            tier={entitlements.tier}
            tierLimits={entitlements.limits}
            relatedRecommendations={relatedRecommendations}
            renewals={serializedRenewals}
            gapReportItems={gapReportItems}
            reportUnlocked={reportUnlocked}
        />
    )
}
