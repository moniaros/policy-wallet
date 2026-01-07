import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
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
            where: { userId: session.user.id },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: "desc" }
        })

        let nextCursor: string | null = null
        if (transactions.length > limit) {
            const nextItem = transactions.pop()
            nextCursor = nextItem!.id
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { creditBalance: true }
        } as any)

        return NextResponse.json({
            data: {
                current_balance: user?.creditBalance || 0,
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
