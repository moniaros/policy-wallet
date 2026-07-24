import { requireApiUser } from '@/lib/api-auth'
import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"

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

    // Throttle mass-attach per agent — without this an agent could enumerate/
    // attach the whole user base by email. Independent of the global /api limit.
    const limitCheck = await rateLimit(
        authResult.dbUser.id,
        5,
        60_000,
        `bulk-import:${authResult.dbUser.id}`
    )
    if (!limitCheck.success && limitCheck.error) return limitCheck.error

    try {
        const { customers } = bulkImportSchema.parse(await req.json())

        // Check bulk import limit
        const { resolveAgentEntitlements } = await import("@/lib/subscription-entitlements")
        const agentEntitlements = await resolveAgentEntitlements(authResult.dbUser.id)
        const bulkLimit = agentEntitlements.limits.bulkImportLimit
        if (bulkLimit !== null && customers.length > bulkLimit) {
            // Distinct code, and the numbers in `details` — the client cannot
            // localize "limited to 25 rows" from a prose string.
            return createApiError(
                "BULK_IMPORT_ROW_LIMIT",
                `Bulk import limited to ${bulkLimit} rows on your plan.`,
                403,
                { limit: bulkLimit, submitted: customers.length }
            )
        }

        // Check customer limit — accounting for the WHOLE batch, not just the
        // current count. Without this, an agent at 95/100 could import 50 rows
        // (the up-front check only saw 95 < 100) and end up at 145.
        const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
        const customerCheck = await canAgentAddCustomer(authResult.dbUser.id)
        if (!customerCheck.allowed) {
            return createApiError(
                "CUSTOMER_LIMIT_REACHED",
                `Customer limit reached (${customerCheck.current}/${customerCheck.limit}).`,
                403,
                { current: customerCheck.current, limit: customerCheck.limit }
            )
        }
        if (customerCheck.limit != null && customerCheck.current != null) {
            // Only rows that aren't already this agent's customers consume headroom.
            const emails = [...new Set(customers.map((c) => c.email.toLowerCase()))]
            const alreadyLinked = await db.customerRelationship.count({
                where: { agentUserId: authResult.dbUser.id, customer: { email: { in: emails } } },
            })
            const newCount = emails.length - alreadyLinked
            const headroom = customerCheck.limit - customerCheck.current
            if (newCount > headroom) {
                return createApiError(
                    "CUSTOMER_HEADROOM_EXCEEDED",
                    `This import adds ${newCount} new customers but only ${Math.max(0, headroom)} slots remain on your plan.`,
                    403,
                    { adding: newCount, headroom: Math.max(0, headroom), current: customerCheck.current, limit: customerCheck.limit }
                )
            }
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

                // Create the relationship if it's new; NEVER touch an existing
                // one — a re-imported CSV row used to downgrade an already
                // active/invited customer back to 'inactive'.
                await db.customerRelationship.upsert({
                    where: {
                        agentUserId_policyholderUserId: {
                            agentUserId: authResult.dbUser.id,
                            policyholderUserId: user.id
                        }
                    },
                    update: {},
                    create: {
                        agentUserId: authResult.dbUser.id,
                        policyholderUserId: user.id,
                        status: 'inactive', // Imported but not yet invited
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
