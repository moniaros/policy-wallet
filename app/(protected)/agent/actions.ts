"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
    ActivationStatus,
    AccessScope,
    OpportunityStatus,
    Priority,
    Customer,
    DashboardSummary,
    Permission
} from "@/components/agent/types"



import { AIServiceFactory, getAIService } from "@/lib/services/ai/ai-service.factory";
import { CustomerService } from "@/lib/services/customer.service";
import { collaborationService } from "@/lib/services/collaboration.service";
import { sendPolicyInviteEmail } from "@/lib/email/invite-emails";

const customerService = new CustomerService(db);

/**
 * AGENT DASHBOARD ACTIONS
 */

export async function getDashboardData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const agentId = authResult.dbUser.id

    const [stats, priorities] = await Promise.all([
        customerService.getDashboardStats(agentId),
        customerService.getAgentPriorities(agentId)
    ]);

    return {
        summary: stats.summary,
        priorities: priorities
    }
}

/**
 * CUSTOMER MANAGEMENT
 */

export async function getCustomers(query?: string): Promise<Customer[]> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    const agentId = authResult.dbUser.id

    // Use a large limit for now to mimic "all" without changing UI signature yet
    const result = await customerService.getCustomers(agentId, {
        search: query,
        status: undefined,
        limit: 100
    })

    return result.data.map((c: any) => {
        const nameParts = (c.name || 'Unknown').split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ''

        return {
            id: c.id,
            relationshipId: c.relationshipId,
            name: firstName,
            surname: lastName,
            email: c.email || '',
            phone: c.phoneNumber || '',
            activationStatus: (c.status === 'pending_activation' ? 'invited' : c.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
            accessScope: 'portfolio' as AccessScope,
            permissions: ['view', 'upload'] as any,
            policyCount: c.policyCount || 0,
            openGapsCount: c.openOpportunities || 0, // Approximate using open ops
            lastInteractionDate: c.lastInteraction ? new Date(c.lastInteraction).toISOString() : new Date(c.joinedAt).toISOString(),
            createdAt: new Date(c.joinedAt).toISOString()
        }
    })
}

export async function getCustomerProfile(customerId: string): Promise<Customer | null> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    try {
        const profile = await customerService.getCustomerProfile(authResult.dbUser.id, customerId)

        const nameParts = (profile.customer.name || 'Unknown').split(' ')

        // Mock interactions for now as service doesn't return them directly in this format yet
        const interactions = [
            {
                id: 'i1',
                type: 'invite_sent' as const,
                message: 'Digital wallet invitation dispatched.',
                timestamp: profile.relationship.joinedAt.toISOString()
            }
        ]

        return {
            id: profile.customer.id,
            relationshipId: profile.relationship.id,
            name: nameParts[0],
            surname: nameParts.slice(1).join(' ') || '',
            email: profile.customer.email || '',
            phone: profile.customer.phone || '',
            activationStatus: (profile.relationship.status === 'pending_activation' ? 'invited' : profile.relationship.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
            accessScope: 'portfolio',
            permissions: ['view', 'upload', 'suggest', 'message'],
            policyCount: profile.policies.length,
            openGapsCount: profile.policies.reduce((ts, p) => ts + p.gaps, 0),
            lastInteractionDate: profile.relationship.lastInteraction ? new Date(profile.relationship.lastInteraction).toISOString() : new Date(profile.relationship.joinedAt).toISOString(),
            createdAt: new Date(profile.relationship.joinedAt).toISOString(),
            policies: profile.policies.map(p => ({
                policyId: p.id,
                policyNumber: p.number,
                insurerName: p.insurer,
                lineOfBusiness: p.type as any,
                startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
                endDate: new Date(p.expiresAt).toISOString(),
                status: 'active'
            })),
            opportunities: profile.opportunities.map(o => ({
                opportunityId: o.id,
                policyId: o.policyId || '',
                gapId: o.gapInstanceId || '',
                gapTitle: o.relatedGap || 'Coverage Gap',
                severity: (o.severity || 'medium') as any,
                status: o.status as OpportunityStatus,
                nextActionDate: '',
                notes: o.notes || '',
                createdAt: new Date(o.createdAt).toISOString()
            })),
            interactions
        }
    } catch (e) {
        return null
    }
}

/**
 * ACTIONS
 */

export async function updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus,
    notes?: string,
    nextActionDate?: string
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Verify ownership
    const oppAuth = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: { relationshipId: true, relationship: { select: { agentUserId: true } } }
    })

    if (!oppAuth || oppAuth.relationship?.agentUserId !== authResult.dbUser.id) {
        return { error: "Opportunity not found or access denied" }
    }

    await db.opportunity.update({
        where: { id: opportunityId },
        data: {
            status,
            notes,
            nextActionAt: nextActionDate ? new Date(nextActionDate) : undefined
        }
    })

    if (oppAuth.relationshipId) {
        await db.customerRelationship.update({
            where: { id: oppAuth.relationshipId },
            data: { lastInteractionAt: new Date() }
        })
    }

    revalidatePath("/customers")
    revalidatePath("/opportunities")
    return { success: true }
}

export async function inviteCustomer(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    const email = formData.get("email") as string
    if (!email) return { success: false, error: "Email is required" }

    return await createAgentInvite(email, "portfolio")
}

export async function createAgentInvite(email: string, scope: AccessScope) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    // 1. Ensure User exists (Placeholder if new)
    let customer = await db.user.findUnique({
        where: { email }
    })

    if (!customer) {
        customer = await db.user.create({
            data: {
                email,
                name: email.split('@')[0], // Placeholder name
                roles: "policyholder"
            }
        })
    }

    // 2. Ensure Relationship exists
    await db.customerRelationship.upsert({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: customer.id
            }
        },
        update: {
            status: 'pending_activation'
        },
        create: {
            agentUserId: authResult.dbUser.id,
            policyholderUserId: customer.id,
            status: 'pending_activation',
            activationStatus: 'invited'
        }
    })

    // 3. Create Invite
    const invite = await db.invite.create({
        data: {
            inviterUserId: authResult.dbUser.id,
            inviteeEmail: email,
            token: Math.random().toString(36).substring(7),
            inviteType: 'signup',
            scope,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    })

    try {
        await sendPolicyInviteEmail({
            to: email,
            token: invite.token,
            inviterName: authResult.dbUser.name || authResult.dbUser.email,
            language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
        })
    } catch (error) {
        console.error("Failed to send agent invite email", error)
    }

    revalidatePath("/dashboard")
    revalidatePath("/customers")
    revalidatePath(`/customers/${customer.id}`)
    return { success: true, inviteId: invite.id, token: invite.token }
}

export async function addCustomerManually(data: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    policy?: {
        insurerName: string;
        policyNumber: string;
        lineOfBusiness: string;
        startDate: string;
        endDate: string;
        premiumAmount?: number;
    }
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const agentId = authResult.dbUser.id

    try {
        // 1. Create Customer Relationship via Service
        const relationship = await customerService.createCustomer(agentId, {
            email: data.email,
            name: `${data.name} ${data.surname}`,
            phoneNumber: data.phone
        });

        // 2. Create policy if provided
        if (data.policy) {
            await db.policy.create({
                data: {
                    ownerUserId: relationship.policyholderUserId,
                    createdByUserId: agentId,
                    insurerName: data.policy.insurerName,
                    policyNumber: data.policy.policyNumber,
                    lineOfBusiness: data.policy.lineOfBusiness,
                    startDate: new Date(data.policy.startDate),
                    endDate: new Date(data.policy.endDate),
                    premiumAmount: data.policy.premiumAmount,
                    status: 'active'
                }
            })
        }

        revalidatePath("/customers")
        return { success: true, customerId: relationship.policyholderUserId }
    } catch (e) {
        console.error(e)
        // Check if it's our custom AppError
        if (e && typeof e === 'object' && 'userMessage' in e) {
            return { error: (e as any).userMessage }
        }
        return { error: "Failed to add customer" }
    }
}

export async function addPolicyForCustomer(data: {
    customerId: string;
    policy: {
        insurerName: string;
        policyNumber: string;
        lineOfBusiness: string;
        startDate: string;
        endDate: string;
        premiumAmount?: number;
        premiumCurrency?: string;
        carPlate?: string;
    }
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }

    const agentId = authResult.dbUser.id

    try {
        // 1. Verify the agent has a relationship with this customer
        const relationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: agentId,
                policyholderUserId: data.customerId
            }
        })

        if (!relationship) {
            return { success: false, error: "You don't have access to this customer" }
        }

        // 2. Create the policy
        const policy = await db.policy.create({
            data: {
                ownerUserId: data.customerId,
                createdByUserId: agentId,
                insurerName: data.policy.insurerName,
                policyNumber: data.policy.policyNumber,
                lineOfBusiness: data.policy.lineOfBusiness,
                startDate: new Date(data.policy.startDate),
                endDate: new Date(data.policy.endDate),
                premiumAmount: data.policy.premiumAmount,
                premiumCurrency: data.policy.premiumCurrency || 'EUR',
                status: 'active',
                // Store car plate in acordData JSON field
                acordData: data.policy.carPlate ? { vehicle: { plateNumber: data.policy.carPlate } } : undefined
            }
        })

        // 3. Update relationship last interaction
        await db.customerRelationship.update({
            where: { id: relationship.id },
            data: { lastInteractionAt: new Date() }
        })

        // 4. Create a notification for the customer using NotificationEvent
        await db.notificationEvent.create({
            data: {
                userId: data.customerId,
                eventType: 'policy_added',
                channel: 'in_app',
                title: 'New Policy Added',
                message: `Your agent has added a new ${data.policy.lineOfBusiness} policy from ${data.policy.insurerName} to your wallet.`,
                relatedObjectType: 'policy',
                relatedObjectId: policy.id
            }
        })

        // 5. Trigger background analysis for gaps
        const { PolicyService } = await import("@/lib/services/policy.service")
        const policyService = new PolicyService()
        // Determine language from agent's preference for now
        const language = (authResult.dbUser as any).preferredLanguage || 'en'

        // We use 'after' if available or just run it backgroundly
        try {
            // Since this is a server action, 'after' is preferred if supported
            // If not, we still want to trigger it.
            await policyService.runBackgroundAnalysis(policy.id, data.customerId, language)
        } catch (e) {
            console.error("Failed to trigger background analysis", e)
        }

        revalidatePath(`/customers/${data.customerId}`)
        revalidatePath("/customers")
        revalidatePath("/wallet")
        return { success: true, policyId: policy.id }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to add policy" }
    }
}

export async function parsePolicyPdfWithGemini(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const file = formData.get("file") as File
    if (!file) return { error: "No file provided" }

    // Security: Size Check (10MB)
    if (file.size > 10 * 1024 * 1024) {
        return { error: "File too large. Maximum size is 10MB." }
    }

    // Security: Type Check
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
        return { error: "Invalid file type. Only PDF and images are allowed." }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0 || apiKey === 'undefined') {
        return { error: "Gemini API Key not configured" }
    }

    try {
        const aiService = getAIService();

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const result = await aiService.extractPolicyData({
            data: base64Data,
            mimeType: file.type,
            fileName: file.name
        });

        return { success: true, data: result }
    } catch (e) {
        console.error(e)
        return { error: "Failed to parse PDF" }
    }
}

/**
 * QUESTIONNAIRE ACTIONS
 */

export async function getQuestionnaireTemplates() {
    return await db.questionnaireTemplate.findMany({
        where: { isActive: true }
    })
}

export async function sendQuestionnaire(relationshipId: string, templateId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")

    const relationship = await db.customerRelationship.findUnique({
        where: { id: relationshipId },
        select: { policyholderUserId: true }
    })

    if (!relationship) throw new Error("Relationship not found")

    const instance = await db.questionnaireInstance.create({
        data: {
            relationshipId,
            templateId,
            sentByUserId: authResult.dbUser.id,
            sentToUserId: relationship.policyholderUserId,
            status: 'pending'
        }
    })

    await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
        relationshipId,
        category: "questionnaire",
        priority: "medium",
        linkedQuestionnaireInstanceId: instance.id,
        subject: "Questionnaire requested",
        initialMessage: "A questionnaire has been sent. Use this thread for follow-up and clarifications.",
    })

    // Update last interaction
    await db.customerRelationship.update({
        where: { id: relationshipId },
        data: { lastInteractionAt: new Date() }
    })

    revalidatePath(`/customers/${relationship.policyholderUserId}`)
    return instance
}

export async function sendReminder(customerId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")

    // In a real app, this would send an email or push via a notification service
    // For now, we update the lastInteractionAt to show we touched this relationship

    await (db.customerRelationship.updateMany as any)({
        where: {
            agentUserId: authResult.dbUser.id,
            policyholderUserId: customerId
        },
        data: {
            lastInteractionAt: new Date()
        }
    })

    revalidatePath(`/customers/${customerId}`)
    revalidatePath("/customers")
    return { success: true }
}

export async function updateAgentProfile(data: {
    agencyName?: string;
    licenseNumber?: string;
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const agentId = authResult.dbUser.id

    try {
        await db.agentProfile.upsert({
            where: { userId: agentId },
            update: {
                agencyName: data.agencyName,
                licenseNumber: data.licenseNumber,
                updatedAt: new Date()
            },
            create: {
                userId: agentId,
                agencyName: data.agencyName,
                licenseNumber: data.licenseNumber,
                verificationStatus: 'pending'
            }
        })

        revalidatePath("/agent/settings")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update profile" }
    }
}
