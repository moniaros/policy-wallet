import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { id } = await params

    try {
        const gap = await db.gapInstance.update({
            where: {
                id,
                policy: { ownerUserId: session.user.id }
            },
            data: {
                status: "acknowledged"
            }
        })

        return NextResponse.json({
            data: {
                id: gap.id,
                status: gap.status,
                acknowledged_at: gap.updatedAt
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Failed to acknowledge gap", status: 403 } },
            { status: 403 }
        )
    }
}
