"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { uploadFile, deleteFile } from "@/lib/storage"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { recordAiProcessingConsent } from "@/lib/compliance/ai-processing-consent"
import fs from "fs/promises"
import path from "path"
import { getAIService } from "@/lib/services/ai"
import { GapAnalysisService } from "@/lib/services/gap-analysis.service"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { PolicyService } from "@/lib/services/policy.service"
import { canUserUseTokens } from "@/lib/token-tracking"
import { canUserAddPolicy, canUserUseFeature, getUpgradeMessage, getUserSubscription, SUBSCRIPTION_LIMITS } from "@/lib/subscription-limits"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { after } from 'next/server'
import { collaborationService } from "@/lib/services/collaboration.service"
import { sendPolicyInviteEmail, sendPolicySharedAccessEmail } from "@/lib/email/invite-emails"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { daysFromNow, POLICY_SHARE_EXPIRY_DAYS } from "@/lib/constants/time"

const PolicySchema = z.object({
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    lineOfBusiness: z.enum([
        "motor", "health", "home", "life", "travel", "liability",
        "pet", "breakdown", "legal_expenses", "income_protection",
        "gadget", "bicycle", "business", "cyber", "motorbike",
        "public_liability", "renters", "other"
    ]),
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.coerce.number().optional(),
}).refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
)

export async function createPolicy(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) throw new Error("Unauthorized")

    // We need to map Supabase User ID to our local DB User ID
    // Assumption: We synced them properly or use email as lookup if IDs differ.
    // If IDs are synced (ideal), then user.id is correct.
    // If not, we might need: const dbUser = await db.user.findUnique({ where: { email: user.email } })
    // For now, let's assume sync or db lookup by email for safety if ID mismatch is possible.

    // Safer approach: Lookup by email to get the integer/UUID ID used in public.User table if it differs.
    // But earlier we used db.user.create without specifying ID, so it generated a UUID.
    // And we didn't force Supabase ID. 
    // Let's rely on email for robust linking.
    const dbUser = await db.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) throw new Error("User record not found")

    const userId = dbUser.id
    const canAdd = await canUserAddPolicy(userId)
    if (!canAdd.allowed) {
        throw new Error(getUpgradeMessage("policy_limit_reached", (dbUser.preferredLanguage as "el" | "en") || "en"))
    }

    const rawData = {
        insurerName: formData.get("insurerName"),
        policyNumber: formData.get("policyNumber"),
        lineOfBusiness: formData.get("lineOfBusiness"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        premiumAmount: formData.get("premiumAmount"),
    }

    const validatedData = PolicySchema.parse(rawData)

    // Handle files (Files are now uploaded client-side to Supabase)
    const documentUrls = formData.getAll("documentUrls") as string[]
    const documentNames = formData.getAll("documentNames") as string[]
    const documentSizes = formData.getAll("documentSizes") as string[]

    // Determine default status based on uploads
    const initialStatus = documentUrls.length > 0 ? 'analyzing' : 'active'

    const policy = await db.policy.create({
        data: {
            ownerUserId: userId,
            createdByUserId: userId,
            insurerName: validatedData.insurerName,
            policyNumber: validatedData.policyNumber,
            lineOfBusiness: validatedData.lineOfBusiness,
            startDate: new Date(validatedData.startDate),
            endDate: new Date(validatedData.endDate),
            premiumAmount: validatedData.premiumAmount,
            status: initialStatus,
        }
    })

    // Handle files
    for (let i = 0; i < documentUrls.length; i++) {
        const fileUrl = documentUrls[i]
        const rawFileName = documentNames[i] || "Unknown Document"
        const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileSize = parseInt(documentSizes[i] || "0")

        // Security: validate extension
        const lowerName = fileName.toLowerCase()
        const hasValidExt = lowerName.endsWith('.pdf') ||
            lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.webp')

        if (!hasValidExt) {
            console.warn(`Skipping policy document with invalid extension: ${fileName}`)
            continue
        }

        if (fileUrl) {
            await db.policyDocument.create({
                data: {
                    policyId: policy.id,
                    fileUrl: fileUrl,
                    fileName: fileName,
                    fileSize: fileSize,
                    source: "policyholder",
                    uploadedByUserId: userId,
                    processingStatus: initialStatus === 'analyzing' ? 'processing' : 'completed'
                }
            })
        }
    }

    // Trigger analysis if needed
    if (initialStatus === 'analyzing') {
        const policyService = new PolicyService()
        const language = (user.user_metadata?.language as 'en' | 'el') || 'en' // Get from metadata or default

        after(async () => {
            try {
                await policyService.runBackgroundAnalysis(policy.id, userId, language)
            } catch (e) {
                logger('error', 'Deferred analysis failed', { policyId: policy.id, error: e })
            }
        })
    }

    // Log Activity
    await (db as any).activityLog.create({
        data: {
            adminUserId: userId,
            adminEmail: user.email || "unknown",
            actionType: "POLICY_CREATED",
            description: `Created policy ${policy.policyNumber} for ${policy.insurerName}`,
            metadata: {
                policyId: policy.id,
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber
            }
        }
    })

    revalidatePath("/wallet")
    return { success: true, policyId: policy.id }
}

export async function getPolicyReviewData(policyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user.email) return { error: "Unauthorized" }

    // Use email-based lookup to match the local DB user ID (same as createPolicy)
    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    if (!dbUser) return { error: "User not found" }

    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
        select: {
            id: true,
            status: true,
            insurerName: true,
            lineOfBusiness: true,
            startDate: true,
            endDate: true,
            premiumAmount: true,
            premiumCurrency: true,
            policyNumber: true,
            acordData: true,
        }
    })

    if (!policy) return { error: "Not found" }

    // Sanitize — never expose raw placeholders
    const sanitize = (val: string | null | undefined, marker?: string): string | null => {
        if (!val) return null
        if (val === '__PENDING_EXTRACTION__') return null
        if (marker && val.startsWith(marker)) return null
        return val
    }

    const acordData = policy.acordData as any
    const coverageSummary = acordData?.coverageSummary || acordData?.extraction?.coverageSummary || null

    return {
        id: policy.id,
        status: policy.status,
        insurerName: sanitize(policy.insurerName),
        lineOfBusiness: policy.lineOfBusiness,
        policyNumber: sanitize(policy.policyNumber, 'PENDING-'),
        startDate: policy.startDate?.toISOString() || null,
        endDate: policy.endDate?.toISOString() || null,
        premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
        premiumCurrency: policy.premiumCurrency || 'EUR',
        coverageSummary,
        verified: Boolean(acordData?.extraction && !acordData.extraction.requiresReview),
    }
}

export async function retryPolicyAnalysis(policyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user.email) return { error: "Unauthorized" }

    const dbUser = await db.user.findUnique({ where: { email: user.email } })
    if (!dbUser) return { error: "User not found" }

    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
        include: { documents: true },
    })

    if (!policy) return { error: "Policy not found" }
    if (policy.documents.length === 0) return { error: "No documents to analyze" }

    // Reset policy status to analyzing
    await db.policy.update({
        where: { id: policyId },
        data: { status: 'analyzing' }
    })
    await db.policyDocument.updateMany({
        where: { policyId },
        data: { processingStatus: 'processing' }
    })

    const policyService = new PolicyService()
    const language = (dbUser.preferredLanguage as 'en' | 'el') || 'en'

    after(async () => {
        try {
            await policyService.runBackgroundAnalysis(policyId, dbUser.id, language)
        } catch (e) {
            logger('error', 'Retry analysis failed', { policyId, error: e })
        }
    })

    revalidatePath("/wallet")
    return { success: true }
}

export async function updatePolicy(policyId: string, formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    try {
        const rawData = {
            insurerName: formData.get("insurerName"),
            policyNumber: formData.get("policyNumber"),
            lineOfBusiness: formData.get("lineOfBusiness"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            premiumAmount: formData.get("premiumAmount"),
            coverageSummary: formData.get("coverageSummary"),
        }

        const data: any = {}
        if (rawData.insurerName) data.insurerName = rawData.insurerName
        if (rawData.policyNumber) data.policyNumber = rawData.policyNumber
        if (rawData.lineOfBusiness) data.lineOfBusiness = rawData.lineOfBusiness
        if (rawData.startDate) data.startDate = rawData.startDate
        if (rawData.endDate) data.endDate = rawData.endDate
        if (rawData.premiumAmount) data.premiumAmount = Number(rawData.premiumAmount)
        if (rawData.coverageSummary) data.coverageSummary = rawData.coverageSummary

        const policyService = new PolicyService()
        const language = (authResult.dbUser.preferredLanguage as 'en' | 'el') || 'en'

        await policyService.update(policyId, authResult.dbUser.id, data, language)

        revalidatePath("/wallet")
        revalidatePath(`/wallet/${policyId}`)
        return { success: true }
    } catch (e: any) {
        logger('error', 'Update policy failed', { policyId, error: e.message })
        return { error: e.message || "Update failed" }
    }
}

export async function uploadPolicyDocument(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { error: "Unauthorized" }
    }

    const userId = authResult.dbUser.id
    const canAdd = await canUserAddPolicy(userId)
    if (!canAdd.allowed) {
        return { error: getUpgradeMessage("policy_limit_reached", (authResult.dbUser.preferredLanguage as "el" | "en") || "en") }
    }
    const file = formData.get("file") as File

    if (!file) {
        return { error: "No file uploaded" }
    }

    try {
        const policyService = new PolicyService()
        const language = (authResult.dbUser.preferredLanguage as 'en' | 'el') || 'en'

        // 1. Initiate upload (Creates 'analyzing' record)
        const result = await policyService.uploadAndParse(userId, file, language)

        // 2. Trigger background analysis (Survives route changes)
        after(async () => {
            try {
                await policyService.runBackgroundAnalysis(result.policyId, userId, language)
            } catch (e) {
                logger('error', 'Deferred analysis failed', { policyId: result.policyId, error: e })
            }
        })

        revalidatePath("/wallet")
        return { success: true, policyId: result.policyId }
    } catch (e: any) {
        logger('error', 'Policy upload action failed', { userId, error: e.message })
        return { error: e.message || "Upload failed" }
    }
}

export async function getInsurers() {
    return db.insurer.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    })
}

export async function getInsuranceTypes() {
    // Return expanded static list (mocking DB for immediate availability)
    const types = [
        { name: "Motor", slug: "motor" },
        { name: "Health", slug: "health" },
        { name: "Home", slug: "home" },
        { name: "Life", slug: "life" },
        { name: "Travel", slug: "travel" },
        { name: "Pet", slug: "pet" },
        { name: "Breakdown", slug: "breakdown" },
        { name: "Legal Expenses", slug: "legal_expenses" },
        { name: "Income Protection", slug: "income_protection" },
        { name: "Gadget", slug: "gadget" },
        { name: "Bicycle", slug: "bicycle" },
        { name: "Business", slug: "business" },
        { name: "Cyber", slug: "cyber" },
        { name: "Motorbike", slug: "motorbike" },
        { name: "Public Liability", slug: "public_liability" },
        { name: "Renters", slug: "renters" },
        { name: "Other", slug: "other" },
    ];

    return types.map(t => ({ id: t.slug, ...t, isActive: true }));
}

export async function sharePolicy(policyId: string, agentEmail: string, permissions: 'view' | 'edit' = 'view') {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Ownership gate: only the policy owner may share it. Runs before the agent
    // lookup so a non-owner cannot trigger invite creation, access grants or emails.
    const ownedPolicy = await db.policy.findUnique({
        where: { id: policyId },
        select: { ownerUserId: true },
    })
    if (!ownedPolicy) return { error: "Policy not found" }
    if (ownedPolicy.ownerUserId !== authResult.dbUser.id) {
        return { error: "You do not have permission to share this policy" }
    }

    // 1. Find the agent
    const agent = await db.user.findUnique({
        where: { email: agentEmail }
    })

    if (!agent) {
        // Create Invite for non-existing user
        const invite = await db.invite.create({
            data: {
                inviterUserId: authResult.dbUser.id,
                inviteeEmail: agentEmail,
                token: crypto.randomUUID(),
                inviteType: 'share',
                scope: `policy:${policyId}`,
                requestedPermissions: permissions,
                expiresAt: daysFromNow(POLICY_SHARE_EXPIRY_DAYS)
            }
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const link = `${baseUrl}/invite/${invite.token}`

        try {
            await sendPolicyInviteEmail({
                to: agentEmail,
                token: invite.token,
                inviterName: authResult.dbUser.name || authResult.dbUser.email,
                language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
            })
        } catch (error) {
            logger('warn', 'Failed to send policy invite email', {
                policyId,
                agentEmail,
                error: error instanceof Error ? error.message : String(error),
            })
        }

        // Log interaction
        await (db as any).activityLog.create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "POLICY_SHARE_INVITE",
                description: `Invited ${agentEmail} to share policy ${policyId} with ${permissions} access`,
                metadata: { policyId, agentEmail, permissions }
            }
        })

        revalidatePath(`/wallet/${policyId}`)
        return { success: true, message: "Invitation sent to new user.", link }
    }

    // Optional: Verify role
    // if (!agent.roles.includes('agent')) return { error: "This user is not an agent." }

    // 2. Create Access Grant
    // We treat policy sharing as a scoped grant
    await db.accessGrant.create({
        data: {
            granterUserId: authResult.dbUser.id,
            granteeUserId: agent.id,
            scope: `policy:${policyId}`,
            permissions: permissions,
            status: "active"
        }
    })

    // 3. Ensure a Relationship exists (so they show up in Agent's Customer list)
    // We use upsert to avoid error if exists
    // Note: status might need to be 'active' if they accepted, but here we force 'active' or 'pending'?
    // Let's check if relationship exists first.
    const existingRel = await db.customerRelationship.findUnique({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id
            }
        }
    })

    let relationshipId = existingRel?.id || null
    if (!existingRel) {
        const createdRel = await db.customerRelationship.create({
            data: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id,
                status: "active", // Auto-activate since customer initiated sharing
                activationStatus: "active"
            }
        })
        relationshipId = createdRel.id
    }

    if (relationshipId) {
        await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
            relationshipId,
            policyId,
            category: "general",
            priority: "medium",
            subject: "Policy shared",
            initialMessage: `${authResult.dbUser.name || "Policyholder"} shared this policy and started collaboration.`,
        })
    }

    // 4. Get policy details for notification
    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { policyNumber: true, insurerName: true, lineOfBusiness: true }
    })

    // 5. Create notification for the agent
    await db.notificationEvent.create({
        data: {
            userId: agent.id,
            eventType: 'policy_shared',
            channel: 'in_app',
            title: 'New Policy Shared With You',
            message: `${authResult.dbUser.name || 'A customer'} has shared their ${policy?.lineOfBusiness || 'insurance'} policy (${policy?.insurerName}) with you with ${permissions} access.`,
            relatedObjectType: 'policy',
            relatedObjectId: policyId
        }
    })

    try {
        const sharedPolicy = await db.policy.findUnique({
            where: { id: policyId },
            select: { policyNumber: true },
        })
        await sendPolicySharedAccessEmail({
            to: agentEmail,
            inviterName: authResult.dbUser.name || authResult.dbUser.email,
            policyNumber: sharedPolicy?.policyNumber,
            language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
        })
    } catch (error) {
        logger('warn', 'Failed to send shared policy access email', {
            policyId,
            agentEmail,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    // 6. Log
    await (db as any).activityLog.create({
        data: {
            adminUserId: authResult.dbUser.id,
            adminEmail: authResult.dbUser.email || "unknown",
            actionType: "POLICY_SHARED",
            description: `Shared policy ${policyId} with ${agentEmail} (${permissions})`,
            metadata: { policyId, agentEmail, permissions }
        }
    })

    revalidatePath(`/wallet/${policyId}`)
    return { success: true }
}

export async function getPolicyShares(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    // Get grants where scope includes this policy
    const grants = await db.accessGrant.findMany({
        where: {
            granterUserId: authResult.dbUser.id,
            scope: `policy:${policyId}`,
            status: 'active'
        },
        include: {
            grantee: {
                select: { email: true, name: true, image: true }
            }
        }
    })

    return grants.map(g => ({
        id: g.id,
        email: g.grantee.email,
        name: g.grantee.name,
        image: g.grantee.image,
        grantedAt: g.grantedAt,
        permissions: g.permissions as 'view' | 'edit'
    }))
}

export async function revokeShare(grantId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.accessGrant.update({
        where: { id: grantId, granterUserId: authResult.dbUser.id },
        data: { status: 'revoked', revokedAt: new Date() }
    })

    revalidatePath("/wallet")
    revalidatePath("/wallet")
    return { success: true }
}

function parseAnalysisDate(d: string | undefined): Date | undefined {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
}

export async function analyzeGaps(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Check Daily Limit for Gap Analysis
    const { tier } = await getUserSubscription(authResult.dbUser.id)
    const dailyLimit = SUBSCRIPTION_LIMITS[tier].gapAnalysisPerDay

    if (dailyLimit !== null && !authResult.dbUser.roles.includes('admin')) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const count = await (db as any).activityLog.count({
            where: {
                adminUserId: authResult.dbUser.id,
                actionType: "POLICY_ANALYZED",
                timestamp: { gte: today }
            }
        })

        if (count >= dailyLimit) {
            return { error: "LIMIT_REACHED" }
        }
    }

    const language = (authResult.dbUser.preferredLanguage as 'en' | 'el') || 'en'
    const gapService = new GapAnalysisService(db)
    const gapTokenGate = await canUserUseTokens(authResult.dbUser.id, 60000)
    if (!gapTokenGate.allowed && !authResult.dbUser.roles.includes('admin')) {
        return { error: "TOKEN_LIMIT_BLOCKED" }
    }

    try {
        const result = await gapService.analyzePolicy(policyId, authResult.dbUser.id, language)
        revalidatePath(`/wallet/${policyId}`)
        return result
    } catch (e) {
        console.error("AI Gap Analysis failed", e)
        return { error: `Analysis failed: ${e instanceof Error ? e.message : String(e)}` }
    }
}

export async function deletePolicy(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    // Case 1: Owner - Full Delete
    if (policy.ownerUserId === authResult.dbUser.id) {
        // 1. Delete physical files
        for (const doc of policy.documents) {
            await deleteFile(doc.fileUrl)
        }

        // 2. Clean up related data that might not cascade
        // Opportunities refer to policy
        await db.opportunity.deleteMany({
            where: { policyId: policy.id }
        })

        // 3. Delete Policy (Cascades to PolicyDocuments, GapInstances)
        await db.policy.delete({
            where: { id: policy.id }
        })

        // Log
        try {
            await (db as any).activityLog.create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_DELETED",
                    description: `Deleted policy ${policy.policyNumber}`,
                    metadata: { policyId, insurer: policy.insurerName }
                }
            })
        } catch (e) { /* ignore */ }

        revalidatePath("/wallet")
        return { success: true }
    }

    // Case 2: Not Owner - Remove Access
    // Check for AccessGrant where I am the grantee
    const grant = await db.accessGrant.findFirst({
        where: {
            granteeUserId: authResult.dbUser.id,
            scope: `policy:${policyId}`,
            status: 'active'
        }
    })

    if (grant) {
        // Revoke/Delete the grant
        await db.accessGrant.update({
            where: { id: grant.id },
            data: { status: 'revoked', revokedAt: new Date() }
        })

        revalidatePath("/wallet")
        return { success: true, message: "Policy removed from your shared wallet" }
    }

    return { error: "You are not authorized to delete this policy" }
}

export async function getAIUsageStats() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { count: 0, limit: 10, remaining: 10, creditBalance: 0 }
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const entitlements = await resolveUserEntitlements(authResult.dbUser.id)

    const [count, latestCreditTransaction] = await Promise.all([
        (db as any).activityLog.count({
            where: {
                adminUserId: authResult.dbUser.id,
                actionType: "POLICY_ANALYZED",
                timestamp: { gte: startOfMonth }
            }
        }),
        db.creditTransaction.findFirst({
            where: { userId: authResult.dbUser.id },
            orderBy: { createdAt: "desc" },
            select: { balanceAfter: true }
        })
    ])

    const limit = entitlements.limits.aiAnalysisPerMonth
    const remaining = limit === null ? null : Math.max(limit - count, 0)
    const creditBalance = latestCreditTransaction?.balanceAfter ?? 0

    return { count, limit, remaining, creditBalance }
}

/**
 * Ask a question about a policy document using AI
 * Uses Gemini 2.0 Flash for intelligent Q&A
 */
export async function askPolicyQuestion(policyId: string, question: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Validate question
    if (!question || question.trim().length < 3) {
        return { error: "Please enter a valid question" }
    }

    // Fetch policy with documents and ACORD data for Q&A context
    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    // Check authorization
    const isOwner = policy.ownerUserId === authResult.dbUser.id
    const hasAccess = isOwner || await db.accessGrant.findFirst({
        where: {
            granterUserId: policy.ownerUserId,
            granteeUserId: authResult.dbUser.id,
            status: 'active'
        }
    })

    if (!hasAccess) return { error: "Unauthorized" }

    // Check feature access
    const isAllowed = await canUserUseFeature(authResult.dbUser.id, 'interactiveQA')
    if (!isAllowed && !authResult.dbUser.roles.includes('admin')) {
        return {
            error: getUpgradeMessage('feature_locked', authResult.dbUser.preferredLanguage as any || 'en')
        }
    }

    // Check Daily Limit
    const { tier } = await getUserSubscription(authResult.dbUser.id)
    const dailyLimit = SUBSCRIPTION_LIMITS[tier].questionsPerDay

    if (dailyLimit !== null && !authResult.dbUser.roles.includes('admin')) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const count = await (db as any).activityLog.count({
            where: {
                adminUserId: authResult.dbUser.id,
                actionType: "POLICY_QUESTION_ASKED",
                timestamp: { gte: today }
            }
        })

        if (count >= dailyLimit) {
            return {
                error: "LIMIT_REACHED"
            }
        }
    }

    const qaTokenGate = await canUserUseTokens(authResult.dbUser.id, 15000)
    if (!qaTokenGate.allowed && !authResult.dbUser.roles.includes('admin')) {
        return { error: "TOKEN_LIMIT_BLOCKED" }
    }

    // Use centralized AI service
    const aiService = getAIService()
    if (!aiService.isAvailable()) {
        return { error: "AI service is not configured" }
    }

    try {
        // Build structuredContext from stored ACORD data so the AI has full
        // policy detail without re-sending the PDF (saves ~50-100K tokens).
        const structuredContext = policy.acordData
            ? {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: policy.lineOfBusiness,
                startDate: policy.startDate.toISOString(),
                endDate: policy.endDate.toISOString(),
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : 0,
                coverageSummary: policy.coverageSummary ?? "",
                acordData: policy.acordData,
              } as import("@/lib/services/ai/ai-service.interface").AIPolicyExtractionResponse
            : undefined

        const answer = await aiService.askQuestion(
            null,
            {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: policy.lineOfBusiness,
                startDate: policy.startDate,
                endDate: policy.endDate,
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
                coverageSummary: policy.coverageSummary
            },
            question,
            {
                userId: authResult.dbUser.id,
                policyId: policy.id,
                structuredContext,
            }
        )


        // Log the interaction
        try {
            await (db as any).activityLog.create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_QUESTION_ASKED",
                    description: `Asked question about policy ${policy.policyNumber}`,
                    metadata: {
                        policyId,
                        question: question.substring(0, 100),
                        answerLength: answer.length
                    }
                }
            })
        } catch (e) { /* ignore logging errors */ }

        logger('info', 'Policy question answered successfully', {
            policyId,
            answerLength: answer.length
        })

        return {
            success: true,
            answer,
            question
        }
    } catch (error) {
        logger('error', 'Failed to answer policy question', {
            policyId,
            error: error instanceof Error ? error.message : String(error)
        })
        return { error: "Failed to process your question. Please try again." }
    }
}

export async function runPolicyAnalysis(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId }
    })

    if (!policy) return { error: "Policy not found" }

    // Check ownership or access grant
    const isOwner = policy.ownerUserId === authResult.dbUser.id
    if (!isOwner) {
        const grant = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: authResult.dbUser.id,
                scope: `policy:${policyId}`,
                status: 'active'
            }
        })
        if (!grant) return { error: "Unauthorized" }
    }

    const language = (authResult.dbUser.preferredLanguage as 'en' | 'el') || 'en'

    // Agent-specific analysis limit check
    if (authResult.dbUser.roles?.includes("agent")) {
        const { canAgentRunAnalysis } = await import("@/lib/subscription-entitlements")
        const analysisCheck = await canAgentRunAnalysis(authResult.dbUser.id)
        if (!analysisCheck.allowed) {
            return {
                error: language === "el"
                    ? `Φτάσατε το μηνιαίο όριο αναλύσεων (${analysisCheck.used}/${analysisCheck.limit}). Αναβαθμίστε το πλάνο σας.`
                    : `Monthly analysis limit reached (${analysisCheck.used}/${analysisCheck.limit}). Upgrade your plan.`,
            }
        }
    }

    try {
        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun(policyId, authResult.dbUser.id)

        if (run.status === "blocked") {
            return { error: "TOKEN_LIMIT_BLOCKED", runId: run.id }
        }

        after(async () => {
            try {
                await orchestrator.executeRun(run.id, language)
            } catch (e) {
                logger('error', 'Deferred manual policy analysis failed', { policyId, runId: run.id, error: e })
            }
        })

        revalidatePath(`/wallet`)
        revalidatePath(`/wallet/${policyId}`)
        return { success: true, message: "Analysis started", runId: run.id }
    } catch (e: any) {
        if (e?.code === "AI_PROCESSING_CONSENT_REQUIRED") {
            return { error: "AI_PROCESSING_CONSENT_REQUIRED" }
        }
        logger('error', 'Manual policy analysis failed', { policyId, error: e.message })
        return { error: e.message || "Analysis failed" }
    }
}

/**
 * Record the current user's explicit consent to AI processing of their policy
 * documents (GDPR Art. 9). Called from the inline consent prompt shown when
 * analysis is blocked by AI_PROCESSING_CONSENT_REQUIRED.
 */
export async function grantAiProcessingConsent() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    try {
        await recordAiProcessingConsent({
            userId: authResult.dbUser.id,
            locale: (authResult.dbUser.preferredLanguage as "el" | "en") || "el",
            source: "wallet-analysis",
        })
        return { success: true }
    } catch (e: any) {
        logger('error', 'Failed to record AI-processing consent', {
            userId: authResult.dbUser.id,
            error: e?.message,
        })
        return { error: "Failed to record consent" }
    }
}

export async function ignoreGap(gapId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const gap = await db.gapInstance.findUnique({
        where: { id: gapId },
        include: { policy: true }
    })
    if (!gap || !gap.policy) return { error: "Gap not found" }

    const isOwner = gap.policy.ownerUserId === authResult.dbUser.id
    if (!isOwner) {
        const hasAccess = await db.accessGrant.findFirst({
            where: {
                granterUserId: gap.policy.ownerUserId,
                granteeUserId: authResult.dbUser.id,
                scope: `policy:${gap.policyId}`,
                status: 'active'
            }
        })
        if (!hasAccess) return { error: "Unauthorized" }
    }

    await db.gapInstance.update({
        where: { id: gapId },
        data: { status: 'ignored' }
    })

    // M7: Bust protection score cache so the dashboard reflects the dismissal immediately
    refreshProtectionScore(gap.policy.ownerUserId).catch((err) => {
        logger('warn', 'Failed to refresh protection score after gap dismissal', {
            gapId,
            error: err instanceof Error ? err.message : String(err),
        })
    })

    revalidatePath("/wallet")
    return { success: true }
}

export async function notifyAgentAboutGap(gapId: string, policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Verify ownership or access
    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return { error: "Policy not found" }
    if (policy.ownerUserId !== authResult.dbUser.id) {
        const hasAccess = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: authResult.dbUser.id,
                scope: `policy:${policy.id}`,
                status: 'active'
            }
        })
        if (!hasAccess) return { error: "Unauthorized" }
    }

    // Find active relationship
    const relationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: authResult.dbUser.id,
            status: 'active'
        }
    })

    if (!relationship) {
        return { error: "No active agent found to notify." }
    }

    // Check if opportunity already exists
    const existing = await db.opportunity.findFirst({
        where: {
            gapInstanceId: gapId,
            relationshipId: relationship.id
        }
    })

    if (existing) {
        return { success: true, message: "Agent already notified." }
    }

    // Create Opportunity
    const opportunity = await db.opportunity.create({
        data: {
            relationshipId: relationship.id,
            policyId: policyId,
            gapInstanceId: gapId,
            ownerAgentUserId: relationship.agentUserId,
            status: 'open',
            notes: 'Customer requested more details on this gap.'
        }
    })

    await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
        relationshipId: relationship.id,
        policyId,
        category: "coverage_gap",
        priority: "high",
        linkedGapInstanceId: gapId,
        linkedOpportunityId: opportunity.id,
        subject: "Coverage gap clarification requested",
        initialMessage: `${authResult.dbUser.name || "Policyholder"} requested help on this coverage gap.`,
    })

    // Notify Agent
    await db.notificationEvent.create({
        data: {
            userId: relationship.agentUserId,
            eventType: 'opportunity_created',
            channel: 'in_app',
            title: 'New Opportunity Detected',
            message: `${authResult.dbUser.name || 'Customer'} requested details on a coverage gap.`,
            relatedObjectType: 'opportunity',
            relatedObjectId: opportunity.id
        }
    })

    revalidatePath("/wallet")
    return { success: true, message: "Agent notified." }
}
