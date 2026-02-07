"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { uploadFile, deleteFile } from "@/lib/storage"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import fs from "fs/promises"
import path from "path"
import { getAIService } from "@/lib/services/ai"
import { GapAnalysisService } from "@/lib/services/gap-analysis.service"
import { PolicyService } from "@/lib/services/policy.service"
import { trackTokenUsage } from "@/lib/token-tracking"
import { canUserUseFeature, getUpgradeMessage, getUserSubscription, SUBSCRIPTION_LIMITS } from "@/lib/subscription-limits"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { after } from 'next/server'

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
})

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

    const rawData = {
        insurerName: formData.get("insurerName"),
        policyNumber: formData.get("policyNumber"),
        lineOfBusiness: formData.get("lineOfBusiness"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        premiumAmount: formData.get("premiumAmount"),
    }

    const validatedData = PolicySchema.parse(rawData)

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
            status: "active",
        }
    })

    // Handle files
    // Handle files (Files are now uploaded client-side to Supabase)
    const documentUrls = formData.getAll("documentUrls") as string[]
    const documentNames = formData.getAll("documentNames") as string[]
    const documentSizes = formData.getAll("documentSizes") as string[]

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
                    processingStatus: "completed"
                }
            })
        }
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
    revalidatePath("/wallet")
    return { success: true }
}

export async function uploadPolicyDocument(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { error: "Unauthorized" }
    }

    const userId = authResult.dbUser.id
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
                token: Math.random().toString(36).substring(7),
                inviteType: 'share',
                scope: `policy:${policyId}`,
                requestedPermissions: permissions,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const link = `${baseUrl}/invite/${invite.token}`

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

    if (!existingRel) {
        await db.customerRelationship.create({
            data: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id,
                status: "active", // Auto-activate since customer initiated sharing
                activationStatus: "active"
            }
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
    if (!authResult) return { count: 0, limit: 5 }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const count = await (db as any).activityLog.count({
        where: {
            adminUserId: authResult.dbUser.id,
            actionType: "POLICY_ANALYZED",
            timestamp: { gte: startOfMonth }
        }
    })

    return { count, limit: 5 }
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

    // Fetch policy with documents
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

    // Use centralized AI service
    const aiService = getAIService()
    if (!aiService.isAvailable()) {
        return { error: "AI service is not configured" }
    }

    try {
        const answer = await aiService.askQuestion(
            null, // No document for now
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
                policyId: policy.id
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

    const policyService = new PolicyService()
    const language = (authResult.dbUser.preferredLanguage as 'en' | 'el') || 'en'

    try {
        // Trigger background analysis
        await policyService.runBackgroundAnalysis(policyId, authResult.dbUser.id, language)
        revalidatePath(`/wallet`)
        revalidatePath(`/wallet/${policyId}`)
        return { success: true, message: "Analysis started" }
    } catch (e: any) {
        logger('error', 'Manual policy analysis failed', { policyId, error: e.message })
        return { error: e.message || "Analysis failed" }
    }
}

export async function ignoreGap(gapId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.gapInstance.update({
        where: { id: gapId },
        data: { status: 'ignored' }
    })

    revalidatePath("/wallet")
    return { success: true }
}

export async function notifyAgentAboutGap(gapId: string, policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

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
