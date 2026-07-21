import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { requireApiUser } from '@/lib/api-auth'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { sendPolicySharedAccessEmail, sendPolicyInviteEmail } from "@/lib/email/invite-emails"
import { daysFromNow, POLICY_SHARE_EXPIRY_DAYS } from "@/lib/constants/time"
import { withApiGuard } from '@/lib/api-guard'

const sharePolicySchema = z.object({
    policyId: z.string().min(1),
    email: z.string().email(),
    // Free-form permission strings were persisted verbatim; only these exist.
    permissions: z.enum(["view", "edit"]),
})

const revokeShareQuerySchema = z.object({
    grantId: z.string().min(1),
})

export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { body: sharePolicySchema },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth }) => `policy:share:create:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        const authResult = auth!
        try {
            const { policyId, email, permissions } = body!

            // Verify the user owns this policy
            const policy = await db.policy.findUnique({
                where: { id: policyId },
                select: { ownerUserId: true, policyNumber: true }
            })

            if (!policy || policy.ownerUserId !== authResult.dbUser.id) {
                return createApiError("NOT_FOUND", "Policy not found or access denied", 404)
            }

            // Find the grantee — an unknown email gets an INVITE the recipient
            // must accept, mirroring the wallet share action. The old path
            // minted a placeholder User row + a silently ACTIVE grant for any
            // address a caller typed (account-enumeration and spam vector).
            const granteeUser = await db.user.findUnique({
                where: { email }
            })

            if (!granteeUser) {
                // Dedup: an unexpired unconsumed invite for the same recipient
                // and policy means the email already went out — repeat POSTs
                // must not become a platform-branded spam channel (30/min).
                const existingInvite = await db.invite.findFirst({
                    where: {
                        inviterUserId: authResult.dbUser.id,
                        inviteeEmail: email,
                        scope: `policy:${policyId}`,
                        consumedAt: null,
                        expiresAt: { gt: new Date() },
                    },
                    select: { id: true },
                })
                let emailDelivered = false
                if (!existingInvite) {
                    const invite = await db.invite.create({
                        data: {
                            inviterUserId: authResult.dbUser.id,
                            inviteeEmail: email,
                            token: crypto.randomUUID(),
                            inviteType: 'share',
                            relationshipType: 'policy_share',
                            scope: `policy:${policyId}`,
                            requestedPermissions: permissions,
                            expiresAt: daysFromNow(POLICY_SHARE_EXPIRY_DAYS)
                        }
                    })
                    try {
                        const emailResult = await sendPolicyInviteEmail({
                            to: email,
                            token: invite.token,
                            inviterName: authResult.dbUser.name || authResult.dbUser.email,
                            policyNumber: policy.policyNumber,
                            language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
                        })
                        emailDelivered = emailResult.success
                    } catch (emailError) {
                        console.error("Failed to send policy share invite email", emailError)
                    }
                }
                // UNIFORM response shape with the registered-user branch below —
                // a differential response is an account-existence oracle.
                return createApiResponse({
                    message: `Share sent to ${email}`,
                    email_delivered: emailDelivered,
                })
            }

            // Check if grant already exists
            const existingGrant = await db.accessGrant.findFirst({
                where: {
                    granterUserId: authResult.dbUser.id,
                    granteeUserId: granteeUser.id,
                    scope: `policy:${policyId}`,
                    status: 'active'
                }
            })

            if (existingGrant) {
                // Update existing grant
                await db.accessGrant.update({
                    where: { id: existingGrant.id },
                    data: { permissions }
                })
            } else {
                // Create new grant
                await db.accessGrant.create({
                    data: {
                        granterUserId: authResult.dbUser.id,
                        granteeUserId: granteeUser.id,
                        scope: `policy:${policyId}`,
                        permissions,
                        status: 'active'
                    }
                })
            }

            let emailDelivered = false
            try {
                const emailResult = await sendPolicySharedAccessEmail({
                    to: email,
                    inviterName: authResult.dbUser.name || authResult.dbUser.email,
                    policyNumber: policy.policyNumber,
                    language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
                })
                emailDelivered = emailResult.success
            } catch (emailError) {
                console.error("Failed to send policy share email", emailError)
            }

            // Same shape as the unknown-email branch — see the oracle note above.
            return createApiResponse({
                message: `Share sent to ${email}`,
                email_delivered: emailDelivered,
            })
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    endpoint: '/api/v1/policies/share',
                    method: 'POST',
                    userId: authResult.dbUser.id
                }
            })

            return createApiError("INTERNAL_ERROR", "Failed to share policy", 500)
        }
    }
)

// Get shared policies for current user
export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const grants = await db.accessGrant.findMany({
            where: {
                granteeUserId: authResult.dbUser.id,
                status: 'active',
                scope: {
                    startsWith: 'policy:'
                }
            },
            include: {
                granter: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Extract policy IDs from scope
        const policyIds = grants.map(g => g.scope.replace('policy:', ''))

        // Fetch the actual policies
        const policies = await db.policy.findMany({
            where: {
                id: { in: policyIds }
            },
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Explicit projection — the old full-row spread shipped acordData and
        // internal ids to the client for every shared policy.
        return createApiResponse({
            sharedPolicies: policies.map(p => ({
                id: p.id,
                policyNumber: p.policyNumber,
                insurerName: p.insurerName,
                lineOfBusiness: p.lineOfBusiness,
                status: p.status,
                startDate: p.startDate,
                endDate: p.endDate,
                coverageEndDate: p.coverageEndDate,
                premiumAmount: p.premiumAmount,
                premiumCurrency: p.premiumCurrency,
                owner: p.owner,
                sharedBy: grants.find(g => g.scope === `policy:${p.id}`)?.granter,
                permissions: grants.find(g => g.scope === `policy:${p.id}`)?.permissions
            }))
        })
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/policies/share',
                method: 'GET',
                userId: authResult.dbUser.id
            }
        })

        return createApiError("INTERNAL_ERROR", "Failed to fetch shared policies", 500)
    }
}

// Revoke access
export const DELETE = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { query: revokeShareQuerySchema },
        rateLimit: {
            limit: 30,
            windowMs: 60 * 1000,
            key: ({ auth }) => `policy:share:revoke:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, query }) => {
        const authResult = auth!
        const { grantId } = query

        try {
            // Verify the user owns this grant
            const grant = await db.accessGrant.findUnique({
                where: { id: grantId }
            })

            if (!grant || grant.granterUserId !== authResult.dbUser.id) {
                return createApiError("NOT_FOUND", "Grant not found or access denied", 404)
            }

            // Revoke the grant
            await db.accessGrant.update({
                where: { id: grantId },
                data: {
                    status: 'revoked',
                    revokedAt: new Date()
                }
            })

            return createApiResponse({
                message: 'Access revoked'
            })
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    endpoint: '/api/v1/policies/share',
                    method: 'DELETE',
                    userId: authResult.dbUser.id
                }
            })

            return createApiError("INTERNAL_ERROR", "Failed to revoke access", 500)
        }
    }
)
