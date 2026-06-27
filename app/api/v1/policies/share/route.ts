import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { requireApiUser } from '@/lib/api-auth'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { sendPolicySharedAccessEmail } from "@/lib/email/invite-emails"
import { withApiGuard } from '@/lib/api-guard'

const sharePolicySchema = z.object({
    policyId: z.string().min(1),
    email: z.string().email(),
    permissions: z.string().min(1),
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

            // Find or create the grantee user
            let granteeUser = await db.user.findUnique({
                where: { email }
            })

            if (!granteeUser) {
                // Create placeholder user
                granteeUser = await db.user.create({
                    data: {
                        email,
                        name: email.split('@')[0],
                        roles: 'policyholder'
                    }
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

            try {
                await sendPolicySharedAccessEmail({
                    to: email,
                    inviterName: authResult.dbUser.name || authResult.dbUser.email,
                    policyNumber: policy.policyNumber,
                    language: (authResult.dbUser.preferredLanguage as "el" | "en") || "en",
                })
            } catch (emailError) {
                console.error("Failed to send policy share email", emailError)
            }

            return createApiResponse({
                message: `Policy shared with ${email}`
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

        // Map each policy id to the grant that references it.
        const grantByPolicyId = new Map<string, (typeof grants)[number]>()
        for (const g of grants) {
            grantByPolicyId.set(g.scope.replace('policy:', ''), g)
        }
        const policyIds = [...grantByPolicyId.keys()]

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

        // Trust-chain check: only surface a policy if its CURRENT owner is the same
        // user who granted access. Prevents a stale grant (e.g. after an ownership
        // change, or a grant not created by the present owner) from exposing a
        // policy the current owner never shared.
        const sharedPolicies = policies
            .filter((p) => grantByPolicyId.get(p.id)?.granterUserId === p.ownerUserId)
            .map((p) => {
                const grant = grantByPolicyId.get(p.id)
                return {
                    ...p,
                    sharedBy: grant?.granter,
                    permissions: grant?.permissions,
                }
            })

        return createApiResponse({ sharedPolicies })
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
