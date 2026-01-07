import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function DELETE(
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
        const grant = await db.accessGrant.update({
            where: {
                id,
                granterUserId: session.user.id
            },
            data: {
                status: "revoked",
                revokedAt: new Date()
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "ACCESS_REVOKED",
                description: `Revoked access grant ${id}`,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            data: { message: "Access revoked successfully" },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Failed to revoke access", status: 403 } },
            { status: 403 }
        )
    }
}
