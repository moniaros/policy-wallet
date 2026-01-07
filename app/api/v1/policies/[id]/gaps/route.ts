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
        const gaps = await db.gapInstance.findMany({
            where: {
                policyId: id,
                policy: { ownerUserId: session.user.id }
            },
            include: { definition: true }
        })

        const summary = {
            total: gaps.length,
            by_severity: {
                high: gaps.filter(g => g.severity === "high").length,
                medium: gaps.filter(g => g.severity === "medium").length,
                low: gaps.filter(g => g.severity === "low").length
            },
            by_status: {
                open: gaps.filter(g => g.status === "open").length,
                acknowledged: gaps.filter(g => g.status === "acknowledged").length,
                resolved: gaps.filter(g => !!g.resolvedAt).length
            }
        }

        return NextResponse.json({
            data: {
                gaps: gaps.map(gi => ({
                    id: gi.id,
                    gap_definition_id: gi.gapDefinitionId,
                    title: (gi.definition as any).title,
                    description: (gi.definition as any).description,
                    severity: gi.severity,
                    status: gi.status,
                    ai_explanation: gi.aiExplanation,
                    ai_suggestion: gi.aiSuggestion,
                    detected_at: gi.detectedAt,
                    acknowledged_at: gi.status === "acknowledged" ? gi.updatedAt : null
                })),
                summary
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
