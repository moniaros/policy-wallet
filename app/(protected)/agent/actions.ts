"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { redirect } from "next/navigation"
import {
    ActivationStatus,
    AccessScope,
    InteractionType,
    OpportunityStatus,
    Priority,
    Customer,
    DashboardSummary,
    Permission
} from "@/components/agent/types"



import { AIServiceFactory, getAIService } from "@/lib/services/ai/ai-service.factory";
import { CustomerService } from "@/lib/services/customer.service";
import { customerResolutionService } from "@/lib/services/customer-resolution.service";
import { normalizeTaxId } from "@/lib/identity/tax-id";
import { collaborationService } from "@/lib/services/collaboration.service";
import { sendPolicyInviteEmail, sendAiConsentRequestEmail } from "@/lib/email/invite-emails";
import { getTranslations } from "@/lib/i18n";
import { daysFromNow, INVITE_EXPIRY_DAYS } from "@/lib/constants/time";
import { isAgentRole } from "@/lib/auth/require-agent";

const customerService = new CustomerService(db);

/**
 * AGENT DASHBOARD ACTIONS
 */

export async function getDashboardData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null

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
    if (!isAgentRole(authResult.dbUser.roles)) return []

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
    if (!isAgentRole(authResult.dbUser.roles)) return null

    try {
        const profile = await customerService.getCustomerProfile(authResult.dbUser.id, customerId)

        const nameParts = (profile.customer.name || 'Unknown').split(' ')

        // Build real interaction timeline from collaboration messages + invite events
        const [messages, invites] = await Promise.all([
            db.collaborationMessage.findMany({
                where: {
                    thread: { relationshipId: profile.relationship.id },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, messageType: true, body: true, createdAt: true },
            }),
            db.invite.findMany({
                where: {
                    inviterUserId: authResult.dbUser.id,
                    inviteeEmail: profile.customer.email ?? undefined,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, createdAt: true, consumedAt: true },
            }),
        ])

        const interactions: Array<{ id: string; type: InteractionType; message: string; timestamp: string }> = []

        for (const inv of invites) {
            interactions.push({
                id: inv.id,
                type: 'invite_sent',
                message: inv.consumedAt ? 'Invitation accepted.' : 'Digital wallet invitation dispatched.',
                timestamp: inv.createdAt.toISOString(),
            })
        }

        for (const msg of messages) {
            interactions.push({
                id: msg.id,
                type: msg.messageType === 'note' ? 'note_added' : 'message_sent',
                message: msg.body.length > 80 ? msg.body.slice(0, 80) + '...' : msg.body,
                timestamp: msg.createdAt.toISOString(),
            })
        }

        // Sort by most recent first
        interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        // Always include the relationship creation as the first event if no invites found
        if (invites.length === 0) {
            interactions.push({
                id: profile.relationship.id,
                type: 'relationship_created',
                message: 'Customer relationship established.',
                timestamp: profile.relationship.joinedAt.toISOString(),
            })
        }

        // Cross-sell analysis
        const { analyzePortfolioGaps, calculateCoverageScore } = await import("@/lib/services/cross-sell.service")
        const existingLines = [...new Set(profile.policies.map(p => (p.type || 'other').toLowerCase()))]
        const missingLines = analyzePortfolioGaps(existingLines)
        const coverageScore = calculateCoverageScore(existingLines)

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
            crossSell: { existingLines, missingLines, coverageScore },
            policies: profile.policies.map(p => ({
                policyId: p.id,
                policyNumber: p.number,
                insurerName: p.insurer,
                lineOfBusiness: p.type as any,
                startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
                endDate: new Date(p.expiresAt).toISOString(),
                // The service already returns the lifecycle status; this used
                // to hardcode 'active', so an expired policy showed as active
                // in the agent's client view.
                status: p.status as any,
                managedByAgent: p.createdByUserId === authResult.dbUser.id
            })),
            opportunities: (await (async () => {
                // Score all of this customer's opportunities in one batched pass.
                // Engagement + profile are per-customer, so per-opportunity
                // scoring re-fetched the same customer facts N times.
                let scores = new Map<string, { likelihood: "high" | "medium" | "low"; score: number }>()
                try {
                    const { scoreOpportunitiesBatch } = await import("@/lib/services/gap-engine/opportunity-scoring")
                    const scored = await scoreOpportunitiesBatch(profile.opportunities.map(o => o.id))
                    scores = new Map([...scored].map(([id, s]) => [id, { likelihood: s.likelihood, score: s.score }]))
                } catch {
                    // Best-effort enrichment: scoring is non-critical. On failure
                    // opportunities render without a conversion score.
                }
                return profile.opportunities.map((o) => {
                    const scored = scores.get(o.id)
                    return {
                        opportunityId: o.id,
                        policyId: o.policyId || '',
                        gapId: o.gapInstanceId || '',
                        gapTitle: o.relatedGap || 'Coverage Gap',
                        severity: (o.severity || 'medium') as any,
                        status: o.status as OpportunityStatus,
                        nextActionDate: '',
                        notes: o.notes || '',
                        createdAt: new Date(o.createdAt).toISOString(),
                        conversionLikelihood: scored?.likelihood ?? null,
                        conversionScore: scored?.score ?? null,
                    }
                })
            })()),
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
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

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
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "Unauthorized" }

    const email = formData.get("email") as string
    if (!email) return { success: false, error: "Email is required" }

    return await createAgentInvite(email, "portfolio")
}

export async function createAgentInvite(email: string, scope: AccessScope) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "Unauthorized" }

    // Sends an email — cap per agent so re-inviting an existing customer (which
    // doesn't consume the customer count) can't be used to email-bomb an address.
    const { rateLimit } = await import("@/lib/rate-limit")
    const inviteLimit = await rateLimit(authResult.dbUser.id, 20, 60 * 60 * 1000, `agent-invite:${authResult.dbUser.id}`)
    if (!inviteLimit.success) {
        return { success: false, error: "Too many invites sent. Please wait a bit and try again." }
    }

    // Check customer limit
    const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
    const customerCheck = await canAgentAddCustomer(authResult.dbUser.id)
    if (!customerCheck.allowed) {
        return {
            success: false,
            error: `Customer limit reached (${customerCheck.current}/${customerCheck.limit}). Upgrade your plan to add more customers.`,
        }
    }

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
            token: crypto.randomUUID().replace(/-/g, ''),
            inviteType: 'signup',
            relationshipType: 'agent_client',
            scope,
            expiresAt: daysFromNow(INVITE_EXPIRY_DAYS)
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

    revalidatePath("/dashboard/agent")
    revalidatePath("/customers")
    revalidatePath(`/customers/${customer.id}`)
    return { success: true, inviteId: invite.id, token: invite.token }
}

export async function addCustomerManually(data: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    taxId?: string;
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
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

    const agentId = authResult.dbUser.id

    try {
        // 0. Subscription gate — same cap the invite/bulk paths enforce
        const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
        const customerGate = await canAgentAddCustomer(agentId)
        if (!customerGate.allowed) {
            return {
                error: `Customer limit reached (${customerGate.current}/${customerGate.limit}). Upgrade your plan.`,
                reason: customerGate.reason,
                current: customerGate.current,
                limit: customerGate.limit,
            }
        }

        // 1. Create Customer Relationship via Service
        const relationship = await customerService.createCustomer(agentId, {
            email: data.email,
            name: `${data.name} ${data.surname}`,
            phoneNumber: data.phone,
            taxId: data.taxId,
        });

        // 2. Create policy if provided, minting the management grant with it
        if (data.policy) {
            await db.$transaction(async (tx) => {
                const created = await tx.policy.create({
                    data: {
                        ownerUserId: relationship.policyholderUserId,
                        createdByUserId: agentId,
                        insurerName: data.policy!.insurerName,
                        policyNumber: data.policy!.policyNumber,
                        lineOfBusiness: data.policy!.lineOfBusiness,
                        startDate: new Date(data.policy!.startDate),
                        endDate: new Date(data.policy!.endDate),
                        coverageEndDate: new Date(data.policy!.endDate),
                        premiumAmount: data.policy!.premiumAmount,
                        status: 'active'
                    }
                })
                await tx.accessGrant.create({
                    data: {
                        granterUserId: relationship.policyholderUserId,
                        granteeUserId: agentId,
                        scope: `policy:${created.id}`,
                        permissions: 'manage',
                        status: 'active',
                    }
                })
            })
        }

        revalidatePath("/customers")
        return { success: true, customerId: relationship.policyholderUserId }
    } catch (e) {
        // Expected conflicts (e.g. "customer already exists") are a normal user
        // outcome, not an incident — don't spam the error dashboards at scale.
        if (e && typeof e === 'object' && 'userMessage' in e) {
            return { error: (e as any).userMessage }
        }
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
    };
    /** Agent affirms the customer consented to AI processing (phantom owners). */
    attestedAiConsent?: boolean;
    /** Agent saw the duplicate warning and chose to add the policy anyway. */
    confirmDuplicate?: boolean;
}, documentFormData?: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "Unauthorized" }

    const agentId = authResult.dbUser.id
    const agentUser = authResult.dbUser as { name?: string | null; email?: string | null }
    const language = ((authResult.dbUser as any).preferredLanguage as 'en' | 'el') || 'en'

    try {
        // 1. Verify the agent has a usable relationship with this customer
        const relationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: agentId,
                policyholderUserId: data.customerId
            }
        })

        if (!relationship || relationship.status === 'inactive') {
            return { success: false, error: "You don't have access to this customer" }
        }

        // 2. Subscription gate: maxPoliciesPerCustomer for this tier
        const { canAgentAddPolicyForCustomer } = await import("@/lib/subscription-entitlements")
        const policyGate = await canAgentAddPolicyForCustomer(agentId, data.customerId)
        if (!policyGate.allowed) {
            return {
                success: false,
                error: language === 'el'
                    ? `Φτάσατε το όριο συμβολαίων ανά πελάτη του πλάνου σας (${policyGate.current}/${policyGate.limit}).`
                    : `You reached your plan's per-customer policy limit (${policyGate.current}/${policyGate.limit}).`,
                reason: policyGate.reason,
                current: policyGate.current,
                limit: policyGate.limit,
            }
        }

        // 3. Optional document from the AI scanner step — validate before any writes
        let file: File | null = null
        if (documentFormData) {
            const candidate = documentFormData.get("file")
            if (candidate instanceof File && candidate.size > 0) {
                if (candidate.size > 10 * 1024 * 1024) {
                    return { success: false, error: "File too large. Maximum size is 10MB." }
                }
                const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
                if (!allowedTypes.includes(candidate.type)) {
                    return { success: false, error: "Invalid file type. Only PDF and images are allowed." }
                }
                file = candidate
            }
        }

        // 3b. Pre-add duplicate guard. The only other dedup runs post-analysis
        // and is skipped when analysis doesn't run (no consent/quota), so the
        // same policy could be added twice. Warn the agent BEFORE creating a
        // second row for the same customer + policy number + branch + start date
        // (startDate is the issue-date proxy — a genuine renewal has a different
        // term, so it's not flagged). The agent can "Add anyway" (confirmDuplicate).
        if (!data.confirmDuplicate && data.policy.policyNumber.trim() && data.policy.startDate) {
            const startDate = new Date(data.policy.startDate)
            const existing = !isNaN(startDate.getTime())
                ? await db.policy.findFirst({
                    where: {
                        ownerUserId: data.customerId,
                        policyNumber: { equals: data.policy.policyNumber.trim(), mode: 'insensitive' },
                        lineOfBusiness: data.policy.lineOfBusiness,
                        startDate,
                        NOT: { status: 'cancelled' },
                    },
                    select: { id: true, policyNumber: true, insurerName: true, lineOfBusiness: true, startDate: true },
                })
                : null
            if (existing) {
                return {
                    success: false as const,
                    duplicate: true as const,
                    existing: {
                        id: existing.id,
                        policyNumber: existing.policyNumber,
                        insurerName: existing.insurerName,
                        lineOfBusiness: existing.lineOfBusiness,
                        startDate: existing.startDate.toISOString(),
                    },
                }
            }
        }

        // 4. Create the policy + mint the management grant atomically. The
        // owner stays the customer; the agent's capabilities flow from the
        // grant, which the customer can revoke at any time.
        const policy = await db.$transaction(async (tx) => {
            const created = await tx.policy.create({
                data: {
                    ownerUserId: data.customerId,
                    createdByUserId: agentId,
                    insurerName: data.policy.insurerName,
                    policyNumber: data.policy.policyNumber,
                    lineOfBusiness: data.policy.lineOfBusiness,
                    startDate: new Date(data.policy.startDate),
                    endDate: new Date(data.policy.endDate),
                    coverageEndDate: new Date(data.policy.endDate),
                    premiumAmount: data.policy.premiumAmount,
                    premiumCurrency: data.policy.premiumCurrency || 'EUR',
                    status: 'active',
                    // Store car plate in acordData JSON field
                    acordData: data.policy.carPlate ? { vehicle: { plateNumber: data.policy.carPlate } } : undefined
                }
            })

            // No unique constraint exists on (granter, grantee, scope) —
            // idempotency is enforced here.
            const existingGrant = await tx.accessGrant.findFirst({
                where: {
                    granterUserId: data.customerId,
                    granteeUserId: agentId,
                    scope: `policy:${created.id}`,
                    status: 'active',
                }
            })
            if (!existingGrant) {
                await tx.accessGrant.create({
                    data: {
                        granterUserId: data.customerId,
                        granteeUserId: agentId,
                        scope: `policy:${created.id}`,
                        permissions: 'manage',
                        status: 'active',
                    }
                })
            }

            return created
        })

        // 5. Agent-attested AI consent for unactivated owners (D1 decision).
        if (data.attestedAiConsent) {
            const owner = await db.user.findUnique({
                where: { id: data.customerId },
                select: { aiProcessingConsentVersion: true, password: true, emailVerified: true, lastActiveAt: true },
            })
            // "Unactivated" MUST match the canonical activation check
            // (customer.service isActivatedAccount): password OR emailVerified
            // OR lastActiveAt. `password` is always null for real users (Supabase
            // holds the credential), so without lastActiveAt this collapsed to
            // "email-unverified" — letting an agent attest consent for a real,
            // logged-in account and run AI over their policy without genuine
            // consent (GDPR). A user who has EVER been active is a live account
            // and must be asked directly.
            const isUnactivated = owner && !owner.password && !owner.emailVerified && !owner.lastActiveAt
            if (owner && !owner.aiProcessingConsentVersion && isUnactivated) {
                const { AGENT_ATTESTED_CONSENT_PREFIX } = await import("@/lib/ai-consent")
                await db.user.update({
                    where: { id: data.customerId },
                    data: { aiProcessingConsentVersion: `${AGENT_ATTESTED_CONSENT_PREFIX}${agentId}` },
                })
                await (db.activityLog as any).create({
                    data: {
                        adminUserId: agentId,
                        adminEmail: authResult.dbUser.email || "unknown",
                        actionType: "AI_CONSENT_AGENT_ATTESTED",
                        description: `Agent attested customer AI-processing consent for policy ${policy.policyNumber}`,
                        metadata: { policyId: policy.id, customerId: data.customerId },
                    }
                })
            }
        }

        // 6. Update relationship last interaction
        await db.customerRelationship.update({
            where: { id: relationship.id },
            data: { lastInteractionAt: new Date() }
        })

        // 7. Notify the customer — and say plainly what the agent can now see.
        // The agent's access is limited to THIS policy (the auto-minted, owner-
        // revocable grant above); it never extends to policies the customer
        // uploaded themselves.
        const agentLabel = agentUser?.name || agentUser?.email || 'Your agent'
        await db.notificationEvent.create({
            data: {
                userId: data.customerId,
                eventType: 'policy_added',
                channel: 'in_app',
                title: 'New Policy Added',
                message: `${agentLabel} added a ${data.policy.lineOfBusiness} policy from ${data.policy.insurerName} to your wallet and can view and manage that policy. You can revoke this access at any time from My Agent.`,
                relatedObjectType: 'policy',
                relatedObjectId: policy.id
            }
        })

        // 8. Persist the scanned document (if provided), then run analysis
        // attributed to the AGENT (agent-plan run count + token budget).
        let analysisState: 'started' | 'consent_required' | 'limit_reached' | 'none' = 'none'
        if (file) {
            const { uploadFile } = await import("@/lib/storage")
            const fileUrl = await uploadFile(file, "policies")
            await db.policyDocument.create({
                data: {
                    policyId: policy.id,
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size,
                    source: 'agent',
                    uploadedByUserId: agentId,
                    processingStatus: 'pending',
                }
            })

            const owner = await db.user.findUnique({
                where: { id: data.customerId },
                select: { aiProcessingConsentVersion: true },
            })
            if (!owner?.aiProcessingConsentVersion) {
                analysisState = 'consent_required'
            } else {
                const { canAgentRunAnalysis } = await import("@/lib/subscription-entitlements")
                const analysisGate = await canAgentRunAnalysis(agentId)
                if (!analysisGate.allowed) {
                    analysisState = 'limit_reached'
                } else {
                    await db.policy.update({
                        where: { id: policy.id },
                        data: { status: 'analyzing' }
                    })
                    // Defer with after(): the analysis takes ~90s and the agent
                    // must be able to close the dialog and keep working while it
                    // runs — the action used to await it, so the "Adding…"
                    // spinner blocked for the whole run and closing the modal
                    // lost the result.
                    analysisState = 'started'
                    after(async () => {
                        try {
                            const { PolicyService } = await import("@/lib/services/policy.service")
                            const policyService = new PolicyService()
                            await policyService.runBackgroundAnalysis(policy.id, agentId, language)
                        } catch (e) {
                            console.error("Failed to run background analysis", e)
                        }
                    })
                }
            }
        }

        revalidatePath(`/customers/${data.customerId}`)
        revalidatePath("/customers")
        revalidatePath("/wallet")
        return { success: true, policyId: policy.id, analysisState }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to add policy" }
    }
}

export async function parsePolicyPdfWithGemini(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

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
        return { error: "PolicyWallet AI is not configured" }
    }

    // Abuse/cost cap: this is a real, billable AI extraction. Without a limit an
    // agent could scan unbounded PDFs and never create a policy, running up cost
    // outside the analysis-quota gate that addPolicyForCustomer enforces.
    const { rateLimit } = await import("@/lib/rate-limit")
    const scan = await rateLimit(authResult.dbUser.id, 30, 60 * 60 * 1000, `agent-scan:${authResult.dbUser.id}`)
    if (!scan.success) {
        return { error: "Too many scans. Please wait a bit and try again." }
    }

    try {
        const aiService = getAIService();

        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const result = await aiService.extractPolicyData(
            {
                data: base64Data,
                mimeType: file.type,
                fileName: file.name
            },
            // Attribute the token cost to the agent — the scan used to run
            // entirely off the books.
            { userId: authResult.dbUser.id },
        );

        return { success: true, data: result }
    } catch (e) {
        console.error(e)
        return { error: "Failed to parse PDF" }
    }
}

/**
 * SMART UPLOAD — scan a policy document, then resolve the extracted
 * policyholder identity against the agent's existing customers.
 *
 * Reuses parsePolicyPdfWithGemini for extraction so the billable scan runs
 * exactly once on the shared 30/hr `agent-scan:` rate-limit bucket; the commit
 * step (commitScannedPolicy) never re-extracts.
 */
export async function scanPolicyForResolution(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false as const, error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false as const, error: "Unauthorized" }
    const agentId = authResult.dbUser.id

    const parsed = await parsePolicyPdfWithGemini(formData)
    if (!('data' in parsed) || !parsed.data) {
        return { success: false as const, error: ('error' in parsed && parsed.error) || "Failed to parse PDF" }
    }

    const data = parsed.data
    const fullName = [data.customerName, data.customerSurname].filter(Boolean).join(' ').trim()

    const resolution = await customerResolutionService.resolveCustomerCandidates(agentId, {
        taxId: data.customerTaxId,
        email: data.customerEmail,
        name: fullName || undefined,
        phone: data.customerPhone,
    })

    return { success: true as const, extraction: data, resolution }
}

/** Backfill a customer's ΑΦΜ only when the record has none — never overwrite. */
async function backfillCustomerTaxId(customerId: string, rawTaxId?: string | null) {
    const taxId = normalizeTaxId(rawTaxId)
    if (!taxId) return
    const user = await db.user.findUnique({ where: { id: customerId }, select: { taxId: true } })
    if (user && !user.taxId) {
        await db.user.update({ where: { id: customerId }, data: { taxId } })
    }
}

type CommitPolicyInput = {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount?: number
    premiumCurrency?: string
    carPlate?: string
}

type CommitDecision =
    | { mode: 'attach'; customerId: string; taxId?: string }
    | { mode: 'create_new'; customer: { name: string; surname?: string; email: string; phone?: string; taxId?: string } }

/**
 * SMART UPLOAD — commit the agent's resolution decision, then converge on the
 * existing addPolicyForCustomer core (policy + grant + document + deferred
 * analysis + agent-attested consent). For a new customer we create the
 * phantom + relationship first so the core's relationship gate is satisfied
 * without relaxing it.
 */
export async function commitScannedPolicy(
    decision: CommitDecision,
    policy: CommitPolicyInput,
    attestedAiConsent?: boolean,
    documentFormData?: FormData,
    confirmDuplicate?: boolean,
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "Unauthorized" }
    const agentId = authResult.dbUser.id

    try {
        let customerId: string
        let created = false

        if (decision.mode === 'create_new') {
            // createCustomer does not self-gate — enforce the customer cap here,
            // matching addCustomerManually.
            const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
            const gate = await canAgentAddCustomer(agentId)
            if (!gate.allowed) {
                return {
                    success: false,
                    error: `Customer limit reached (${gate.current}/${gate.limit}). Upgrade your plan.`,
                    reason: gate.reason,
                    current: gate.current,
                    limit: gate.limit,
                }
            }

            const name = [decision.customer.name, decision.customer.surname].filter(Boolean).join(' ').trim()
            try {
                const relationship = await customerService.createCustomer(agentId, {
                    email: decision.customer.email,
                    name,
                    phoneNumber: decision.customer.phone,
                    taxId: decision.customer.taxId,
                })
                customerId = relationship.policyholderUserId
                created = true
            } catch (e: any) {
                // The agent already has this customer (email already maps to a
                // relationship) — attach to the existing customer instead of
                // failing. createCustomer already backfilled the ΑΦΜ if null.
                if (e?.code === 'CONFLICT') {
                    const existing = await db.user.findUnique({
                        where: { email: decision.customer.email },
                        select: { id: true },
                    })
                    if (!existing) throw e
                    customerId = existing.id
                } else {
                    throw e
                }
            }
        } else {
            customerId = decision.customerId
            await backfillCustomerTaxId(customerId, decision.taxId)
        }

        const result = await addPolicyForCustomer(
            { customerId, policy, attestedAiConsent, confirmDuplicate },
            documentFormData,
        )

        return { ...result, customerId, created }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to add policy" }
    }
}

/**
 * QUESTIONNAIRE ACTIONS
 */

export async function getQuestionnaireTemplates() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")
    if (!isAgentRole(authResult.dbUser.roles)) throw new Error("Unauthorized")

    // Same visibility rule as the questionnaire manager: system templates
    // plus the caller's own — never other agents' custom templates.
    return await db.questionnaireTemplate.findMany({
        where: {
            isActive: true,
            OR: [{ isSystem: true }, { createdByUserId: authResult.dbUser.id }],
        },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    })
}

export async function sendQuestionnaire(relationshipId: string, templateId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")
    if (!isAgentRole(authResult.dbUser.roles)) throw new Error("Unauthorized")

    const relationship = await db.customerRelationship.findUnique({
        where: { id: relationshipId },
        select: { policyholderUserId: true, agentUserId: true }
    })

    if (!relationship || relationship.agentUserId !== authResult.dbUser.id) {
        throw new Error("Relationship not found")
    }

    // Same visibility rule as getQuestionnaireTemplates: only a system template
    // or the agent's OWN — never another agent's private template (its id could
    // be guessed, disclosing its questions).
    const template = await db.questionnaireTemplate.findFirst({
        where: {
            id: templateId,
            isActive: true,
            OR: [{ isSystem: true }, { createdByUserId: authResult.dbUser.id }],
        },
        select: { id: true },
    })
    if (!template) {
        throw new Error("Template not found")
    }

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

export async function updateAgentProfile(data: {
    agencyName?: string;
    licenseNumber?: string;
    commissionRates?: Record<string, number>;
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

    const agentId = authResult.dbUser.id

    try {
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        }
        if (data.agencyName !== undefined) updateData.agencyName = data.agencyName
        if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber
        if (data.commissionRates !== undefined) updateData.commissionRates = data.commissionRates

        await db.agentProfile.upsert({
            where: { userId: agentId },
            update: updateData,
            create: {
                userId: agentId,
                agencyName: data.agencyName,
                licenseNumber: data.licenseNumber,
                commissionRates: data.commissionRates ?? undefined,
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

/**
 * CROSS-SELL INTELLIGENCE
 */

export async function getCustomerCrossSell(customerId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null

    const { runCrossSellForCustomer } = await import("@/lib/services/cross-sell.service")
    return runCrossSellForCustomer(authResult.dbUser.id, customerId, false)
}

export async function createCrossSellOpportunities(customerId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

    const { runCrossSellForCustomer } = await import("@/lib/services/cross-sell.service")
    const result = await runCrossSellForCustomer(authResult.dbUser.id, customerId, true)

    revalidatePath(`/customers/${customerId}`)
    return { success: true, opportunitiesCreated: result.opportunitiesCreated }
}


/**
 * GDPR consent request: an agent cannot consent on the data subject's behalf,
 * but is never dead-ended — this asks the policy OWNER for AI-processing
 * consent. Account holders get an in-app notification + approval email;
 * customers without a usable account get a signup invite whose onboarding
 * captures consent at first upload.
 */
export async function requestAiConsent(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

    // Sends an email/notification to the policy owner — cap per agent.
    const { rateLimit } = await import("@/lib/rate-limit")
    const consentLimit = await rateLimit(authResult.dbUser.id, 20, 60 * 60 * 1000, `agent-consent:${authResult.dbUser.id}`)
    if (!consentLimit.success) {
        return { error: "Too many consent requests. Please wait a bit and try again." }
    }

    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return { error: "Policy not found" }

    const hasGrant = await db.accessGrant.findFirst({
        where: {
            granterUserId: policy.ownerUserId,
            granteeUserId: authResult.dbUser.id,
            status: "active",
        },
    })
    const hasRelationship = hasGrant
        ? null
        : await db.customerRelationship.findFirst({
            where: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: policy.ownerUserId,
            },
        })
    if (!hasGrant && !hasRelationship) return { error: "Unauthorized" }

    const owner = await db.user.findUnique({
        where: { id: policy.ownerUserId },
        select: {
            id: true, email: true, preferredLanguage: true,
            emailVerified: true, lastActiveAt: true, aiProcessingConsentVersion: true,
        },
    })
    if (!owner) return { error: "Policy owner not found" }
    if (owner.aiProcessingConsentVersion) return { success: true, mode: "already_consented" as const }

    const language = (owner.preferredLanguage as "en" | "el") || "el"
    const t = getTranslations(language)
    const agentName = authResult.dbUser.name || authResult.dbUser.email || "PolicyWallet agent"

    const hasAccount = Boolean(owner.emailVerified || owner.lastActiveAt)
    if (hasAccount) {
        await db.notificationEvent.create({
            data: {
                userId: owner.id,
                eventType: "ai_consent_request",
                channel: "in_app",
                title: t.common.aiConsentRequestTitle,
                message: `${agentName}: ${t.common.aiConsentRequestMessage}`,
                relatedObjectType: "policy",
                relatedObjectId: policy.id,
            },
        })
        if (owner.email) {
            // Best-effort — the in-app notification is the durable request.
            await sendAiConsentRequestEmail({ to: owner.email, agentName, language }).catch(() => null)
        }
        return { success: true, mode: "notification" as const }
    }

    const invite = await db.invite.create({
        data: {
            inviterUserId: authResult.dbUser.id,
            inviteeEmail: owner.email,
            token: crypto.randomUUID().replace(/-/g, ""),
            inviteType: "signup",
            relationshipType: "agent_client",
            scope: `policy:${policy.id}`,
            expiresAt: daysFromNow(INVITE_EXPIRY_DAYS),
        },
    })
    await sendPolicyInviteEmail({
        to: owner.email,
        token: invite.token,
        inviterName: agentName,
        policyNumber: policy.policyNumber,
        language,
    })
    return { success: true, mode: "invite" as const }
}
