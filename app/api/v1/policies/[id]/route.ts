import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const UpdatePolicySchema = z.object({
    policyNumber: z.string().optional(),
    insurerName: z.string().optional(),
    startDate: z.string().pipe(z.coerce.date()).optional(),
    endDate: z.string().pipe(z.coerce.date()).optional(),
    premiumAmount: z.number().optional(),
    status: z.string().optional(),
})

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
        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: session.user.id
            },
            include: {
                documents: true,
                gapInstances: {
                    where: { resolvedAt: null },
                    include: { definition: true }
                }
            }
        })

        if (!policy) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Policy not found", status: 404 } },
                { status: 404 }
            )
        }

        // Mock highlights for MVP
        const highlights = [
            `Policy Number: ${policy.policyNumber}`,
            `Insurer: ${policy.insurerName}`,
            `LOB: ${policy.lineOfBusiness}`,
            `Valid until: ${policy.endDate.toDateString()}`
        ]

        return NextResponse.json({
            data: {
                ...policy,
                highlights,
                gaps: {
                    count: policy.gapInstances.length,
                    items: policy.gapInstances.map(gi => ({
                        id: gi.id,
                        gap_definition_id: gi.gapDefinitionId,
                        title: (gi.definition as any).title,
                        description: (gi.definition as any).description,
                        severity: gi.severity,
                        status: gi.status,
                        ai_explanation: gi.aiExplanation,
                        ai_suggestion: gi.aiSuggestion,
                        detected_at: gi.detectedAt
                    }))
                }
            },
            meta: {
                request_id: crypto.randomUUID(),
                language: "el"
            },
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
        const body = await req.json()
        const validatedData = UpdatePolicySchema.parse(body)

        const policy = await db.policy.update({
            where: {
                id,
                ownerUserId: session.user.id
            },
            data: validatedData
        })

        return NextResponse.json({
            data: policy,
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "Update failed", status: 400 } },
            { status: 400 }
        )
    }
}

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
        await db.policy.update({
            where: {
                id,
                ownerUserId: session.user.id
            },
            data: { status: "deleted" }
        })

        return NextResponse.json({
            data: { message: "Policy deleted successfully" },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Delete failed", status: 500 } },
            { status: 500 }
        )
    }
}
