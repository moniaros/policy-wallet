import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// GET — Get a single proposal
export const GET = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async ({ auth, params }) => {
        const id = (params as { id: string }).id

        const proposal = await prisma.proposal.findUnique({
            where: { id },
            include: {
                thread: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "asc" },
                            include: { sender: { select: { id: true, name: true } } },
                        },
                    },
                },
                relationship: true,
                createdBy: { select: { id: true, name: true, email: true } },
            },
        })

        if (!proposal) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        // Verify access
        const userId = auth!.dbUser.id
        const isAgent = proposal.relationship.agentUserId === userId
        const isClient = proposal.relationship.policyholderUserId === userId

        if (!isAgent && !isClient) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json(proposal)
    }
)

// PATCH — Accept, decline, or update a proposal
export const PATCH = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async ({ req, auth, params }) => {
        const id = (params as { id: string }).id
        const body = (await req.json()) as {
            status?: "accepted" | "declined"
        }

        const proposal = await prisma.proposal.findUnique({
            where: { id },
            include: { relationship: true },
        })

        if (!proposal) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }

        const userId = auth!.dbUser.id
        const isClient = proposal.relationship.policyholderUserId === userId

        if (!isClient) {
            return NextResponse.json({ error: "Only the client can respond to proposals" }, { status: 403 })
        }

        if (proposal.status !== "pending") {
            return NextResponse.json({ error: "Proposal is no longer pending" }, { status: 400 })
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.proposal.update({
                where: { id },
                data: {
                    status: body.status,
                    clientResponseAt: new Date(),
                },
            })

            // Add system message
            const statusText = body.status === "accepted" ? "accepted" : "declined"
            await tx.collaborationMessage.create({
                data: {
                    threadId: proposal.threadId,
                    senderUserId: userId,
                    messageType: "system",
                    body: `Proposal ${statusText} by client`,
                },
            })

            // Update thread status
            await tx.collaborationThread.update({
                where: { id: proposal.threadId },
                data: {
                    status: body.status === "accepted" ? "resolved" : "closed",
                    lastActivityAt: new Date(),
                    resolvedAt: body.status === "accepted" ? new Date() : null,
                },
            })

            return result
        })

        return NextResponse.json(updated)
    }
)
