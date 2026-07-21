import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { notifyCounterparty } from "@/lib/notifications"
import { isOwnedStorageUrl } from "@/lib/supabase/storage-download"

const ALLOWED_STATUSES = new Set(["pending", "uploaded", "expired", "cancelled"])

// PATCH — Update document request (upload, expire)
export const PATCH = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async ({ req, auth, params }) => {
        const id = (params as { id: string }).id
        const body = (await req.json()) as {
            status?: string
            uploadedDocumentUrl?: string
        }

        const documentRequest = await prisma.documentRequest.findUnique({
            where: { id },
            include: {
                relationship: true,
                thread: true,
            },
        })

        if (!documentRequest) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        // Verify access
        const userId = auth!.dbUser.id
        const isAgent = documentRequest.relationship.agentUserId === userId
        const isClient = documentRequest.relationship.policyholderUserId === userId

        if (!isAgent && !isClient) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const updateData: Record<string, unknown> = {}
        if (body.status) {
            if (!ALLOWED_STATUSES.has(body.status)) {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 })
            }
            updateData.status = body.status
        }
        if (body.uploadedDocumentUrl) {
            // Only accept a reference to an object in OUR storage — never persist
            // an arbitrary client-supplied URL into the collaboration record.
            if (!isOwnedStorageUrl(body.uploadedDocumentUrl)) {
                return NextResponse.json({ error: "Invalid document reference" }, { status: 400 })
            }
            updateData.uploadedDocumentUrl = body.uploadedDocumentUrl
            updateData.status = "uploaded"
            updateData.completedAt = new Date()
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.documentRequest.update({
                where: { id },
                data: updateData,
            })

            // Add system message
            if (body.uploadedDocumentUrl) {
                await tx.collaborationMessage.create({
                    data: {
                        threadId: documentRequest.threadId,
                        senderUserId: userId,
                        messageType: "system",
                        body: `Document uploaded: ${documentRequest.documentType}`,
                    },
                })

                // Update thread
                await tx.collaborationThread.update({
                    where: { id: documentRequest.threadId },
                    data: {
                        status: "resolved",
                        lastActivityAt: new Date(),
                    },
                })
            }

            return result
        })

        // Break the silent handoff: when the customer uploads the requested
        // document, tell the agent who asked for it (they may have moved on).
        if (body.uploadedDocumentUrl && isClient) {
            await notifyCounterparty({
                userId: documentRequest.relationship.agentUserId,
                eventType: "document_uploaded",
                title: {
                    el: "Ο πελάτης ανέβασε το έγγραφο που ζητήσατε",
                    en: "Your client uploaded the requested document",
                },
                message: {
                    el: `Παραλήφθηκε: ${documentRequest.documentType}.`,
                    en: `Received: ${documentRequest.documentType}.`,
                },
                relatedObjectType: "thread",
                relatedObjectId: documentRequest.threadId,
            })
        }

        return NextResponse.json(updated)
    }
)
