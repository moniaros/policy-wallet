import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"

const creditsQuerySchema = z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: Request) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { searchParams } = new URL(req.url)
    const queryParse = creditsQuerySchema.safeParse({
        cursor: searchParams.get("cursor") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
    })
    if (!queryParse.success) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", status: 400, details: queryParse.error.issues } },
            { status: 400 }
        )
    }
    const { cursor, limit } = queryParse.data

    try {
        const transactions = await (db as any).creditTransaction.findMany({
            where: { userId: authResult.dbUser.id },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        })

        let nextCursor: string | null = null
        if (transactions.length > limit) {
            const nextItem = transactions.pop()
            nextCursor = nextItem!.id
        }

        const latestTx = await db.creditTransaction.findFirst({
            where: { userId: authResult.dbUser.id },
            orderBy: { createdAt: 'desc' },
            select: { balanceAfter: true }
        })

        return NextResponse.json({
            data: {
                current_balance: latestTx?.balanceAfter || 0,
                transactions: transactions.map((t: any) => ({
                    id: t.id,
                    amount: t.amount,
                    type: t.type,
                    description: t.description,
                    balance_after: t.balanceAfter,
                    created_at: t.createdAt
                })),
                pagination: {
                    next_cursor: nextCursor,
                    has_more: !!nextCursor
                }
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Server error", status: 500 } },
            { status: 500 }
        )
    }
}
