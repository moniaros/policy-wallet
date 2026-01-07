import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    try {
        const grants = await db.accessGrant.findMany({
            where: {
                granterUserId: session.user.id,
                status: "active"
            },
            include: {
                granteeUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            data: {
                grants: grants.map(g => ({
                    id: g.id,
                    grantee: g.granteeUser,
                    scope: g.scope,
                    permissions: g.permissions.split(","),
                    status: g.status,
                    granted_at: g.createdAt
                }))
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

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // This won't work for GET/POST in route.ts root, but for DELETE it might if I use [id] folder.
) {
    // Actually, DELETE should be in /access-grants/[id]/route.ts
    return NextResponse.json({ error: "Use /access-grants/[id]" }, { status: 405 })
}
