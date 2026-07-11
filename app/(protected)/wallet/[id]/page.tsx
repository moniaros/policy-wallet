export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { calculatePolicyStatus, getStatusColor, getStatusLabel, getDaysUntilExpiry } from "@/lib/policy-status"
import { getPolicyShares } from "../actions"
import { getTranslations } from "@/lib/i18n"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { getAIUsageStats } from "../actions"
import { PolicyDetailsClient } from "./PolicyDetailsClient"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"

export default async function PolicyDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id: policyId } = await params
    const resolvedSearchParams = await searchParams
    const shouldOpenWallet = resolvedSearchParams.openWallet === 'true'
    const { dbUser } = await getAuthenticatedUser()
    const language = (dbUser.preferredLanguage as 'el' | 'en') || 'el'
    const t = getTranslations(language)
    const roleCopy = getRoleCopy(language)

    const [policy, sharesResult, aiUsageStats, entitlements] = await Promise.all([
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
        resolveUserEntitlements(dbUser.id)
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

    const status = calculatePolicyStatus(policy)
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status)
    const daysLeft = getDaysUntilExpiry(policy.endDate)

    // Related recommendations (owner only): reuse the persisted gap-engine
    // output, preferring same-line-of-business suggestions. Read-only — the
    // engine itself is not re-run here.
    let relatedRecommendations: Array<Record<string, unknown>> = []
    if (isOwner) {
        try {
            const { getActiveRecommendations } = await import("@/lib/services/gap-engine")
            const recommendations = await getActiveRecommendations(dbUser.id)
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

    // Create serializable policy object for Client Component
    const walletPolicy = {
        id: policy.id,
        policyNumber: policy.policyNumber,
        insurerName: policy.insurerName,
        lineOfBusiness: policy.lineOfBusiness,
        startDate: policy.startDate ? policy.startDate.toISOString() : null,
        endDate: policy.endDate ? policy.endDate.toISOString() : null,
        status: status || 'incomplete'
    }

    const serializedShares = Array.isArray(shares) ? shares.map(s => ({
        ...s,
        grantedAt: s.grantedAt ? s.grantedAt.toISOString() : new Date().toISOString()
    })) : []

    const serializedPolicy = {
        ...policy,
        startDate: policy.startDate.toISOString(),
        endDate: policy.endDate.toISOString(),
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
        lastAnalyzedAt: policy.lastAnalyzedAt?.toISOString() || null,
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
            walletPolicy={walletPolicy}
            serializedShares={serializedShares}
            aiUsageStats={aiUsageStats}
            statusLabel={statusLabel}
            statusColor={statusColor}
            daysLeft={daysLeft}
            holderName={dbUser.name || roleCopy.defaults.policyholderName}
            shouldOpenWallet={shouldOpenWallet}
            isOwner={isOwner}
            relationshipId={relationshipId}
            t={t}
            tier={entitlements.tier}
            tierLimits={entitlements.limits}
            relatedRecommendations={relatedRecommendations}
        />
    )
}
