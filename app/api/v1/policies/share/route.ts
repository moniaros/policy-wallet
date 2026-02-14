import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { requireApiUser } from '@/lib/api-auth'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"

const sharePolicySchema = z.object({
    policyId: z.string().min(1),
    email: z.string().email(),
    permissions: z.string().min(1),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const { policyId, email, permissions } = sharePolicySchema.parse(await req.json())

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

        // TODO: Send email notification to grantee
        // This would integrate with Brevo to send an invitation email

        return createApiResponse({
            message: `Policy shared with ${email}`
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid payload", 400, error.issues)
        }
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

        return createApiResponse({
            sharedPolicies: policies.map(p => ({
                ...p,
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
export async function DELETE(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const { searchParams } = new URL(req.url)
        const grantId = z.string().min(1).parse(searchParams.get('grantId'))

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
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Missing or invalid grantId", 400)
        }
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
