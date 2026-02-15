import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { calculatePolicyStatus, getStatusColor, getStatusLabel, getDaysUntilExpiry } from "@/lib/policy-status"
import { getPolicyShares } from "../actions"
import { getTranslations } from "@/lib/i18n"
import { getAIUsageStats } from "../actions"
import { PolicyDetailsClient } from "./PolicyDetailsClient"

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
    const t = getTranslations((dbUser.preferredLanguage as 'el' | 'en') || 'el')

    const [policy, sharesResult, aiUsageStats] = await Promise.all([
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
        getAIUsageStats()
    ])

    if (!policy) {
        notFound()
    }

    // Authorization Check
    const isOwner = policy.ownerUserId === dbUser.id
    if (!isOwner) {
        // Check for Access Grant
        const grant = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: dbUser.id,
                scope: `policy:${policyId}`,
                status: 'active'
            }
        })

        if (!grant) {
            // Optional: Check if they are the assigned Agent via CustomerRelationship
            // Depending on business rules, an active relationship might grant read access to all policies
            // For now, let's stick to explicit grants or assume relationship checking if needed.
            // As per plan, we allow if AccessGrant exists.
            notFound() // Or redirect/unauthorized
        }
    }

    const shares = sharesResult || []

    const status = calculatePolicyStatus(policy)
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status)
    const daysLeft = getDaysUntilExpiry(policy.endDate)

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
        verified: !(
            (policy.acordData as any)?.extraction?.requiresReview ||
            (typeof (policy.acordData as any)?.extraction?.confidence?.overall === 'number' &&
                (policy.acordData as any).extraction.confidence.overall < 80) ||
            (Array.isArray((policy.acordData as any)?.extraction?.missingCriticalFields) &&
                (policy.acordData as any).extraction.missingCriticalFields.length > 0)
        ),
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
            holderName={dbUser.name || "Policy Holder"}
            shouldOpenWallet={shouldOpenWallet}
            isOwner={isOwner}
            relationshipId={relationshipId}
            t={t}
        />
    )
}
