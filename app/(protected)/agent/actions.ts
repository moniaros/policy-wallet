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

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AGENT DASHBOARD ACTIONS
 */

export async function getDashboardData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const agentId = authResult.dbUser.id

    // 1. Fetch Summary Stats
    const relationships = await db.customerRelationship.findMany({
        where: { agentUserId: agentId },
        select: { status: true, lastInteractionAt: true }
    })

    const summary: DashboardSummary = {
        activated: relationships.filter((r: any) => r.status === 'active').length,
        invited: relationships.filter((r: any) => r.status === 'pending_activation').length,
        inactive: relationships.filter((r: any) => r.status === 'inactive').length
    }

    // 2. Fetch Priorities (Smart signals)
    const priorities: Priority[] = []

    // Signal: Open Opportunities
    const openOpps = await (db.opportunity.findMany as any)({
        where: {
            ownerAgentUserId: agentId,
            status: 'open'
        },
        include: {
            relationship: {
                include: { customer: true }
            },
            gapInstance: {
                include: { definition: true }
            }
        },
        take: 5
    })

    openOpps.forEach((opp: any) => {
        priorities.push({
            id: opp.id,
            type: 'open_opportunity',
            customerId: opp.relationship?.policyholderUserId || '',
            customerName: opp.relationship?.customer?.name || 'Unknown',
            message: `New risk gap detected: ${opp.gapInstance?.definition?.title || 'Coverage Gap'}`,
            priority: opp.gapInstance?.severity === 'critical' || opp.gapInstance?.severity === 'high' ? 1 : 2
        })
    })

    // Signal: Follow-up needed (activated but no interaction recently)
    const followUps = await (db.customerRelationship.findMany as any)({
        where: {
            agentUserId: agentId,
            status: 'active',
            lastInteractionAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        include: { customer: true },
        take: 5
    })

    followUps.forEach((rel: any) => {
        priorities.push({
            id: rel.id,
            type: 'follow_up',
            customerId: rel.policyholderUserId,
            customerName: rel.customer?.name || 'Unknown',
            message: "Customer hasn't been contacted in over a week.",
            priority: 3
        })
    })

    // Signal: Pending Invites (sent but not consumed)
    const pendingInvites = await db.invite.findMany({
        where: {
            inviterUserId: agentId,
            consumedAt: null,
            createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        },
        take: 5
    })

    pendingInvites.forEach((inv: any) => {
        priorities.push({
            id: inv.id,
            type: 'pending_invite',
            customerId: '', // No ID yet
            customerName: inv.inviteeEmail,
            message: "Invitation sent 3+ days ago but not yet opened.",
            priority: 4
        })
    })

    return {
        summary,
        priorities: priorities.sort((a, b) => a.priority - b.priority)
    }
}

/**
 * CUSTOMER MANAGEMENT
 */

export async function getCustomers(query?: string): Promise<Customer[]> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    const agentId = authResult.dbUser.id

    const relationships = await (db.customerRelationship.findMany as any)({
        where: {
            agentUserId: agentId,
            ...(query ? {
                customer: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ]
                }
            } : {})
        },
        include: {
            customer: {
                include: {
                    policiesOwned: {
                        include: {
                            gapInstances: {
                                where: { resolvedAt: null }
                            }
                        }
                    }
                }
            }
        },
        orderBy: [
            { lastInteractionAt: 'desc' }
        ]
    })

    return relationships.map((rel: any) => {
        const nameParts = (rel.customer?.name || 'Unknown').split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ''

        const allGaps = rel.customer?.policiesOwned?.flatMap((p: any) => p.gapInstances) || []

        return {
            id: rel.policyholderUserId,
            relationshipId: rel.id,
            name: firstName,
            surname: lastName,
            email: rel.customer?.email || '',
            phone: '',
            activationStatus: (rel.status === 'pending_activation' ? 'invited' : rel.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
            accessScope: 'portfolio' as AccessScope,
            permissions: ['view', 'upload'] as any,
            policyCount: rel.customer?.policiesOwned?.length || 0,
            openGapsCount: allGaps.length,
            lastInteractionDate: rel.lastInteractionAt?.toISOString() || rel.createdAt.toISOString(),
            createdAt: rel.createdAt.toISOString()
        }
    })
}

export async function getCustomerProfile(customerId: string): Promise<Customer | null> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const agentId = authResult.dbUser.id

    const relationship = await (db.customerRelationship.findFirst as any)({
        where: {
            agentUserId: agentId,
            policyholderUserId: customerId
        },
        include: {
            customer: {
                include: {
                    policiesOwned: {
                        include: {
                            gapInstances: {
                                where: { resolvedAt: null },
                                include: { definition: true }
                            }
                        }
                    },
                    questionnairesReceived: {
                        where: { relationshipId: { not: null } },
                        include: { template: true },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            },
            opportunities: {
                include: {
                    gapInstance: {
                        include: { definition: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!relationship) return null

    const nameParts = (relationship.customer?.name || 'Unknown').split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    const allGaps = relationship.customer?.policiesOwned?.flatMap((p: any) => p.gapInstances) || []

    // Fetch Interactions (Mocked for now)
    const interactions = [
        {
            id: 'i1',
            type: 'invite_sent' as const,
            message: 'Digital wallet invitation dispatched.',
            timestamp: relationship.createdAt.toISOString()
        }
    ]

    const uiCustomer: Customer = {
        id: relationship.policyholderUserId,
        relationshipId: relationship.id,
        name: firstName,
        surname: lastName,
        email: relationship.customer?.email || '',
        phone: '',
        activationStatus: (relationship.status === 'pending_activation' ? 'invited' : relationship.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
        accessScope: 'portfolio',
        permissions: ['view', 'upload', 'suggest', 'message'],
        policyCount: relationship.customer?.policiesOwned?.length || 0,
        openGapsCount: allGaps.length,
        lastInteractionDate: relationship.lastInteractionAt?.toISOString() || relationship.createdAt.toISOString(),
        createdAt: relationship.createdAt.toISOString(),
        policies: (relationship.customer?.policiesOwned || []).map((p: any) => ({
            policyId: p.id,
            policyNumber: p.policyNumber,
            insurerName: p.insurerName,
            lineOfBusiness: p.lineOfBusiness as any,
            carPlate: p.carPlate || undefined,
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            status: 'active'
        })),
        opportunities: (relationship.opportunities || []).map((o: any) => ({
            opportunityId: o.id,
            policyId: o.policyId || '',
            gapId: o.gapInstanceId || '',
            gapTitle: o.gapInstance?.definition?.title || 'Coverage Gap',
            severity: (o.gapInstance?.severity || 'medium') as any,
            status: o.status as OpportunityStatus,
            nextActionDate: o.nextActionAt?.toISOString() || '',
            notes: o.notes || '',
            createdAt: o.createdAt.toISOString()
        })),
        interactions: interactions
    }

    return uiCustomer
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

    await db.opportunity.update({
        where: { id: opportunityId },
        data: {
            status,
            notes,
            nextActionAt: nextActionDate ? new Date(nextActionDate) : undefined
        }
    })

    // Update relationship last interaction
    const opp = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: { relationshipId: true }
    })

    if (opp?.relationshipId) {
        await db.customerRelationship.update({
            where: { id: opp.relationshipId },
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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    })

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

    try {
        // 1. Create or find user
        let user = await db.user.findUnique({
            where: { email: data.email }
        })

        if (!user) {
            user = await db.user.create({
                data: {
                    email: data.email,
                    name: `${data.name} ${data.surname}`,
                    roles: "policyholder"
                }
            })
        }

        // 2. Create relationship
        const relationship = await db.customerRelationship.upsert({
            where: {
                agentUserId_policyholderUserId: {
                    agentUserId: authResult.dbUser.id,
                    policyholderUserId: user.id
                }
            },
            update: {
                status: 'inactive' // Added but not invited yet
            },
            create: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: user.id,
                status: 'inactive'
            }
        })

        // 3. Create policy if provided
        if (data.policy) {
            await db.policy.create({
                data: {
                    ownerUserId: user.id,
                    createdByUserId: authResult.dbUser.id,
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
        return { success: true, customerId: user.id }
    } catch (e) {
        console.error(e)
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

    if (!process.env.GEMINI_API_KEY) {
        return { error: "Gemini API Key not configured" }
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const prompt = `
        Analyze this insurance policy document and extract the following JSON. 
        Do not include Markdown formatting, just the raw JSON.
        Fields: 
        - insurerName (string)
        - policyNumber (string)
        - lineOfBusiness (one of: motor, health, home, life, travel, liability)
        - startDate (YYYY-MM-DD)
        - endDate (YYYY-MM-DD)
        - premiumAmount (number)
        - customerName (string)
        - customerSurname (string)
        - customerEmail (string)
        
        If a field is missing, make a best guess or use null.
        `;

        const part = {
            inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
            },
        };

        const result = await model.generateContent([prompt, part]);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiJson = JSON.parse(jsonStr);

        return { success: true, data: aiJson }
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
