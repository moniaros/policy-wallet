import { requireApiUser } from '@/lib/api-auth'
import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"

const customerImportSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    surname: z.string().min(1).optional().default(''),
    phone: z.string().optional(),
})

const bulkImportSchema = z.object({
    customers: z.array(customerImportSchema).min(1),
})

export async function POST(req: Request) {
    const authCheck = await requireApiUser({ roles: ["agent", "admin"] })
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    try {
        const { customers } = bulkImportSchema.parse(await req.json())

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

        return createApiResponse({
            imported,
            total: customers.length,
            errors: errors.length > 0 ? errors : undefined
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid data", 400, error.issues)
        }
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/customers/bulk-import',
                method: 'POST'
            }
        })

        return createApiError("INTERNAL_ERROR", "Failed to import customers", 500)
    }
}
