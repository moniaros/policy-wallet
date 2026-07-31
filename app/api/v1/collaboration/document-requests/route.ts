import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { notifyCounterparty } from "@/lib/notifications"

// withApiGuard only populates `body` when a body schema is declared; without
// this the handler destructured `undefined` and every request 500'd (same
// class as the proposals route — the document-request feature was broken).
const createDocumentRequestSchema = z.object({
    relationshipId: z.string().min(1),
    documentType: z.string().min(1).max(120),
    instruction: z.string().max(2000).optional(),
    urgency: z.enum(["normal", "urgent"]).optional(),
    dueDate: z.string().datetime().optional(),
})

// POST — Create a document request
export const POST = withApiGuard(
    {
        auth: { mode: "user", roles: ["agent"] },
        validation: { body: createDocumentRequestSchema },
        // Creates content and fans out a notification to the customer.
        rateLimit: {
            limit: 30,
            windowMs: 60 * 60 * 1000,
            key: ({ auth }) => `collab-doc-request:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ auth, body }) => {
        // Document requests are a Starter+ feature (documentRequestFlow).
        if (!(await canAgentUseFeature(auth!.dbUser.id, "documentRequestFlow"))) {
            return NextResponse.json(
                { error: "Document requests require the Starter plan or higher." },
                { status: 403 }
            )
        }
        const { relationshipId, documentType, instruction, urgency, dueDate } = body as {
            relationshipId: string
            documentType: string
            instruction?: string
            urgency?: string
            dueDate?: string
        }

        if (!relationshipId || !documentType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const agentUserId = auth!.dbUser.id

        // Verify relationship — and require ACCEPTANCE: this creates a thread
        // and notifies the customer (in-app + email), so an agent must not be
        // able to message someone who never accepted the relationship (same
        // gate as collaborationService.createThread).
        const relationship = await prisma.customerRelationship.findFirst({
            where: { id: relationshipId, agentUserId },
        })
        if (!relationship) {
            return NextResponse.json({ error: "Relationship not found" }, { status: 404 })
        }
        if (relationship.status !== "active") {
            return NextResponse.json(
                { error: "The customer has not accepted this relationship yet" },
                { status: 403 }
            )
        }

        // Create thread + document request in transaction
        const result = await prisma.$transaction(async (tx) => {
            const thread = await tx.collaborationThread.create({
                data: {
                    relationshipId,
                    subject: `Document Request: ${documentType}`,
                    category: "document_request",
                    threadType: "document_request",
                    priority: urgency === "urgent" ? "high" : "medium",
                    createdByUserId: agentUserId,
                    assignedToUserId: relationship.policyholderUserId,
                },
            })

            const documentRequest = await tx.documentRequest.create({
                data: {
                    threadId: thread.id,
                    relationshipId,
                    requestedByUserId: agentUserId,
                    documentType,
                    instruction: instruction || null,
                    urgency: urgency || "normal",
                    dueDate: dueDate ? new Date(dueDate) : null,
                },
            })

            // Add system message to thread
            await tx.collaborationMessage.create({
                data: {
                    threadId: thread.id,
                    senderUserId: agentUserId,
                    messageType: "system",
                    body: `Document requested: ${documentType}`,
                },
            })

            return { thread, documentRequest }
        })

        // Break the silent handoff: tell the customer their advisor needs a document.
        await notifyCounterparty({
            userId: relationship.policyholderUserId,
            eventType: "document_requested",
            title: {
                el: "Ο σύμβουλός σας ζήτησε ένα έγγραφο",
                en: "Your advisor requested a document",
            },
            message: {
                el: `Απαιτείται: ${documentType}. Ανεβάστε το για να συνεχίσει η ομάδα σας.`,
                en: `Requested: ${documentType}. Upload it so your advisor can proceed.`,
            },
            relatedObjectType: "thread",
            relatedObjectId: result.thread.id,
        })

        return NextResponse.json(result, { status: 201 })
    }
)

// GET — List document requests
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async ({ req, auth }) => {
        const { searchParams } = new URL(req.url)
        const relationshipId = searchParams.get("relationshipId")
        const status = searchParams.get("status")

        const where: Record<string, unknown> = {}
        if (relationshipId) where.relationshipId = relationshipId
        if (status) where.status = status

        // Filter by user's relationships
        where.relationship = {
            OR: [
                { agentUserId: auth!.dbUser.id },
                { policyholderUserId: auth!.dbUser.id },
            ],
        }

        const requests = await prisma.documentRequest.findMany({
            where,
            include: {
                thread: { select: { id: true, subject: true, status: true } },
                requestedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ requests })
    }
)
