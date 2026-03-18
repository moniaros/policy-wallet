import { db } from "@/lib/db"
import { z } from "zod"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { createPolicySchema } from "@/lib/validations/policy"
import * as Sentry from "@sentry/nextjs"
import { requireApiUser } from "@/lib/api-auth"
import { LINES_OF_BUSINESS } from "@/types/enums"
import { withApiGuard } from "@/lib/api-guard"

const policyQueryStatuses = [
    "active",
    "pending",
    "cancelled",
    "expired",
    "lapsed",
    "expiring_soon",
    "incomplete",
    "analyzing",
    "action_needed",
    "deleted",
] as const

const policiesQuerySchema = z.object({
    line_of_business: z.enum(LINES_OF_BUSINESS).optional(),
    status: z.enum(policyQueryStatuses).optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * @swagger
 * /api/v1/policies:
 *   get:
 *     summary: List policies
 *     description: Retrieve a paginated list of policies for the authenticated user.
 *     tags:
 *       - Policies
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: line_of_business
 *         schema:
 *           type: string
 *           enum: [motor, health, home, life, travel, liability, pet, breakdown, legal_expenses, income_protection, gadget, bicycle, business, cyber, motorbike, public_liability, renters, other]
 *         description: Filter by line of business
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, cancelled, expired, lapsed, expiring_soon, incomplete, analyzing, action_needed, deleted]
 *         description: Filter by policy status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Pagination cursor
 *     responses:
 *       200:
 *         description: A list of policies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     policies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           policyNumber:
 *                             type: string
 *                           insurerName:
 *                             type: string
 *                           premiumAmount:
 *                             type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         next_cursor:
 *                           type: string
 *                         has_more:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { searchParams } = new URL(req.url)
    const queryParse = policiesQuerySchema.safeParse({
        line_of_business: searchParams.get("line_of_business") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    })
    if (!queryParse.success) {
        return createApiError("VALIDATION_ERROR", "Invalid query parameters", 400, queryParse.error.issues)
    }
    const { line_of_business: lineOfBusiness, status, cursor, limit } = queryParse.data

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

/**
 * @swagger
 * /api/v1/policies:
 *   post:
 *     summary: Create a policy
 *     description: Manually create a new insurance policy.
 *     tags:
 *       - Policies
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyNumber
 *               - insurerName
 *               - lineOfBusiness
 *               - startDate
 *               - endDate
 *             properties:
 *               policyNumber:
 *                 type: string
 *               insurerName:
 *                 type: string
 *               lineOfBusiness:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               premium:
 *                 type: number
 *               status:
 *                 type: string
 *                 default: active
 *     responses:
 *       200:
 *         description: Policy created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        validation: { body: createPolicySchema },
        rateLimit: {
            limit: 10,
            windowMs: 60000,
            key: ({ auth }) => `policy:create:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        const authResult = auth!
        try {
            const validatedData = body!

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
)
