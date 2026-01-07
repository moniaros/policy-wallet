import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, docId: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "Unauthorized", status: 401 } },
            { status: 401 }
        )
    }

    const { id, docId } = await params

    try {
        // Verify policy ownership and document existence
        const document = await db.policyDocument.findFirst({
            where: {
                id: docId,
                policyId: id,
                policy: { ownerUserId: session.user.id }
            },
            include: { policy: true }
        })

        if (!document) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Document not found", status: 404 } },
                { status: 404 }
            )
        }

        await db.policyDocument.delete({
            where: { id: docId }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "DOCUMENT_DELETED",
                description: `Deleted document ${document.fileName} from policy ${document.policy.policyNumber}`,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            data: { message: "Document deleted successfully" },
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
