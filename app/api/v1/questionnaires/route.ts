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
    const status = searchParams.get("status") || "pending"

    try {
        const questionnaires = await db.questionnaireInstance.findMany({
            where: {
                sentToUserId: session.user.id,
                status: status as any
            },
            include: {
                template: true,
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        return NextResponse.json({
            data: {
                questionnaires: questionnaires.map(q => ({
                    id: q.id,
                    template: q.template,
                    sent_by: q.sender,
                    status: q.status,
                    sent_at: q.createdAt,
                    completed_at: q.completedAt
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
