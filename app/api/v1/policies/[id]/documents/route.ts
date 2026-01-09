import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

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
        const formData = await req.formData()
        const file = formData.get("file") as File
        const source = formData.get("source") || "policyholder"

        if (!file) {
            return NextResponse.json(
                { error: { code: "BAD_REQUEST", message: "No file provided", status: 400 } },
                { status: 400 }
            )
        }

        const policy = await db.policy.findFirst({
            where: {
                id,
                ownerUserId: session.user.id
            }
        })

        if (!policy) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "Policy not found", status: 404 } },
                { status: 404 }
            )
        }

        // Mock upload to object storage
        const mockUrl = `https://storage.googleapis.com/policywallet-uploads/${crypto.randomUUID()}-${file.name}`

        const document = await db.policyDocument.create({
            data: {
                policyId: id,
                fileUrl: mockUrl,
                fileName: file.name,
                fileSize: file.size,
                source: source as string,
                uploadedByUserId: session.user.id,
                processingStatus: "pending"
            }
        })

        await (db.activityLog as any).create({
            data: {
                adminUserId: session.user.id,
                adminEmail: session.user.email || "unknown",
                actionType: "DOCUMENT_UPLOADED",
                description: `Uploaded document ${file.name} for policy ${policy.policyNumber}`,
                timestamp: new Date()
            }
        })

        return NextResponse.json({
            data: {
                id: document.id,
                policy_id: document.policyId,
                file_name: document.fileName,
                file_size: document.fileSize,
                file_url: document.fileUrl,
                signed_url: document.fileUrl, // Stub
                signed_url_expires_at: new Date(Date.now() + 3600000),
                processing_status: document.processingStatus,
                uploaded_at: document.uploadedAt
            },
            meta: { request_id: crypto.randomUUID(), language: "el" },
            error: null
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "Upload failed", status: 500 } },
            { status: 500 }
        )
    }
}
