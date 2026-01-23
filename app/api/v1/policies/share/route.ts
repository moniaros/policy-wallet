import { NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { policyId, email, permissions } = await req.json()

        if (!policyId || !email || !permissions) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify the user owns this policy
        const policy = await db.policy.findUnique({
            where: { id: policyId },
            select: { ownerUserId: true, policyNumber: true }
        })

        if (!policy || policy.ownerUserId !== authResult.dbUser.id) {
            return NextResponse.json({ error: 'Policy not found or access denied' }, { status: 404 })
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

        return NextResponse.json({
            success: true,
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

        return NextResponse.json(
            { error: 'Failed to share policy' },
            { status: 500 }
        )
    }
}

// Get shared policies for current user
export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

        return NextResponse.json({
            success: true,
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

        return NextResponse.json(
            { error: 'Failed to fetch shared policies' },
            { status: 500 }
        )
    }
}

// Revoke access
export async function DELETE(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const grantId = searchParams.get('grantId')

        if (!grantId) {
            return NextResponse.json({ error: 'Missing grantId' }, { status: 400 })
        }

        // Verify the user owns this grant
        const grant = await db.accessGrant.findUnique({
            where: { id: grantId }
        })

        if (!grant || grant.granterUserId !== authResult.dbUser.id) {
            return NextResponse.json({ error: 'Grant not found or access denied' }, { status: 404 })
        }

        // Revoke the grant
        await db.accessGrant.update({
            where: { id: grantId },
            data: {
                status: 'revoked',
                revokedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
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

        return NextResponse.json(
            { error: 'Failed to revoke access' },
            { status: 500 }
        )
    }
}
