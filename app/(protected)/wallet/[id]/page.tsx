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
            where: {
                id: policyId,
                ownerUserId: dbUser.id
            },
            include: {
                documents: true,
                gapInstances: {
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

    const shares = sharesResult || []

    const status = calculatePolicyStatus(policy)
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status)
    const daysLeft = getDaysUntilExpiry(policy.endDate)

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
            t={t}
        />
    )
}
