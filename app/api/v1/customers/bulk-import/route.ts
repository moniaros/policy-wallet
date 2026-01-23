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
        const { customers } = await req.json()

        if (!Array.isArray(customers) || customers.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        let imported = 0
        const errors: string[] = []

        for (const customer of customers) {
            try {
                // Check if user already exists
                let user = await db.user.findUnique({
                    where: { email: customer.email }
                })

                // Create user if doesn't exist
                if (!user) {
                    user = await db.user.create({
                        data: {
                            email: customer.email,
                            name: `${customer.name} ${customer.surname}`.trim(),
                            phoneNumber: customer.phone || null,
                            roles: 'policyholder'
                        }
                    })
                }

                // Create or update relationship
                await db.customerRelationship.upsert({
                    where: {
                        agentUserId_policyholderUserId: {
                            agentUserId: authResult.dbUser.id,
                            policyholderUserId: user.id
                        }
                    },
                    update: {
                        status: 'inactive' // Imported but not yet invited
                    },
                    create: {
                        agentUserId: authResult.dbUser.id,
                        policyholderUserId: user.id,
                        status: 'inactive',
                        activationStatus: 'not_invited'
                    }
                })

                imported++
            } catch (error) {
                Sentry.captureException(error, {
                    tags: {
                        endpoint: '/api/v1/customers/bulk-import',
                        email: customer.email
                    }
                })
                errors.push(`Failed to import ${customer.email}`)
            }
        }

        return NextResponse.json({
            success: true,
            imported,
            total: customers.length,
            errors: errors.length > 0 ? errors : undefined
        })
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/customers/bulk-import',
                method: 'POST'
            }
        })

        return NextResponse.json(
            { error: 'Failed to import customers' },
            { status: 500 }
        )
    }
}
