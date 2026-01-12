import { NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "20")

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
