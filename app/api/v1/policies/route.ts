import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { createPolicySchema } from "@/lib/validations/policy"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const lineOfBusiness = searchParams.get("line_of_business")
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "20")

    try {
        const policies = await db.policy.findMany({
            where: {
                ownerUserId: authResult.dbUser.id,
                lineOfBusiness: lineOfBusiness || undefined,
                status: status || { not: "deleted" },
            },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { gapInstances: { where: { resolvedAt: null } } }
                }
            }
        })

        let nextCursor: string | null = null
        if (policies.length > limit) {
            const nextItem = policies.pop()
            nextCursor = nextItem!.id
        }

        const groupedByLine = await db.policy.groupBy({
            by: ["lineOfBusiness"],
            where: { ownerUserId: authResult.dbUser.id, status: { not: "deleted" } },
            _count: true
        })

        const stats: Record<string, number> = {}
        groupedByLine.forEach(item => {
            stats[item.lineOfBusiness] = item._count
        })

        return createApiResponse({
            policies: policies.map(p => ({
                id: p.id,
                policyNumber: p.policyNumber,
                insurerName: p.insurerName,
                lineOfBusiness: p.lineOfBusiness,
                status: p.status,
                startDate: p.startDate,
                endDate: p.endDate,
                premiumAmount: p.premiumAmount,
                premiumCurrency: p.premiumCurrency,
                coverageSummary: p.coverageSummary,
                openGapsCount: (p as any)._count.gapInstances,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })),
            groupedByLine: stats,
            pagination: {
                next_cursor: nextCursor,
                has_more: !!nextCursor
            }
        })
    } catch (error) {
        logger('error', 'Fetch policies failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}

export async function POST(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return createApiError("UNAUTHORIZED", "Unauthorized", 401)

    // Rate limiting: max 10 policy creations per minute
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const limitCheck = await rateLimit(ip as string, 10, 60000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const body = await req.json()

        // Validate input with comprehensive schema
        const validatedData = createPolicySchema.parse(body)

        const policy = await db.policy.create({
            data: {
                policyNumber: validatedData.policyNumber,
                insurerName: validatedData.insurerName,
                lineOfBusiness: validatedData.lineOfBusiness,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                premiumAmount: validatedData.premium,
                premiumCurrency: "EUR",
                coverageSummary: validatedData.coverageSummary,
                status: validatedData.status,
                ownerUserId: authResult.dbUser.id,
                createdByUserId: authResult.dbUser.id,
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "POLICY_CREATED",
                description: `Manual policy creation: ${policy.policyNumber}`,
            }
        })

        return createApiResponse({
            ...policy,
            openGapsCount: 0
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid policy data", 400, error.issues)
        }

        // Log error to Sentry
        Sentry.captureException(error, {
            tags: {
                endpoint: '/api/v1/policies',
                method: 'POST',
                userId: authResult.dbUser.id
            },
            extra: {
                userEmail: authResult.dbUser.email
            }
        })

        logger('error', 'Create policy failed', { userId: authResult.dbUser.id, error })
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}
