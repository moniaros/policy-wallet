import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(
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
        const questionnaire = await db.questionnaireInstance.findFirst({
            where: {
                id,
                sentToUserId: session.user.id
            },
            include: {
                template: true,
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        if (!questionnaire) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Questionnaire not found", status: 404 } },
                { status: 404 }
            )
        }

        return NextResponse.json({
            data: {
                ...questionnaire,
                questions: questionnaire.template.questions ? JSON.parse(questionnaire.template.questions as string) : []
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

export async function POST(
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
        const body = await req.json()
        const { answers } = body

        const response = await db.questionnaireResponse.create({
            data: {
                instanceId: id,
                userId: session.user.id,
                answers: JSON.stringify(answers)
            }
        })

        await db.questionnaireInstance.update({
            where: { id },
            data: {
                status: "completed",
                completedAt: new Date()
            }
        })

        return NextResponse.json({
            data: response,
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "Failed to submit questionnaire", status: 400 } },
            { status: 400 }
        )
    }
}
