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

// PATCH — Accept, decline, or counter-offer on a proposal
export const PATCH = withApiGuard(
    {
        auth: { mode: "user" },
    },
    async ({ req, auth, params }) => {
        const id = (params as { id: string }).id
        const body = (await req.json()) as {
            status?: "accepted" | "declined"
            declineReason?: "too_expensive" | "not_needed" | "prefer_different" | "other"
            declineComment?: string
            counterOfferNotes?: string
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
            // Build metadata for decline/counter
            const metadata: Record<string, unknown> = {}
            if (body.declineReason) metadata.declineReason = body.declineReason
            if (body.declineComment) metadata.declineComment = body.declineComment
            if (body.counterOfferNotes) metadata.counterOfferNotes = body.counterOfferNotes

            const result = await tx.proposal.update({
                where: { id },
                data: {
                    status: body.status,
                    clientResponseAt: new Date(),
                    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
                },
            })

            // Build system message
            let systemMessage: string
            if (body.status === "accepted") {
                systemMessage = "Proposal accepted by client"
            } else if (body.counterOfferNotes) {
                systemMessage = `Proposal declined with counter-offer: "${body.counterOfferNotes}"`
            } else if (body.declineReason) {
                const reasonLabels: Record<string, string> = {
                    too_expensive: "Too expensive",
                    not_needed: "Not needed",
                    prefer_different: "Prefer different coverage",
                    other: "Other reason",
                }
                const reason = reasonLabels[body.declineReason] || body.declineReason
                systemMessage = `Proposal declined — Reason: ${reason}${body.declineComment ? `. "${body.declineComment}"` : ""}`
            } else {
                systemMessage = "Proposal declined by client"
            }

            await tx.collaborationMessage.create({
                data: {
                    threadId: proposal.threadId,
                    senderUserId: userId,
                    messageType: "system",
                    body: systemMessage,
                },
            })

            // Update thread status
            await tx.collaborationThread.update({
                where: { id: proposal.threadId },
                data: {
                    status: body.status === "accepted" ? "resolved" : body.counterOfferNotes ? "open" : "closed",
                    lastActivityAt: new Date(),
                    resolvedAt: body.status === "accepted" ? new Date() : null,
                },
            })

            // Notify the agent
            await tx.notificationEvent.create({
                data: {
                    userId: proposal.relationship.agentUserId,
                    eventType: body.status === "accepted"
                        ? "proposal_accepted"
                        : body.counterOfferNotes
                            ? "proposal_counter_offer"
                            : "proposal_declined",
                    channel: "in_app",
                    title: body.status === "accepted"
                        ? "Proposal accepted"
                        : body.counterOfferNotes
                            ? "Counter-offer received"
                            : "Proposal declined",
                    message: systemMessage,
                    relatedObjectType: "proposal",
                    relatedObjectId: id,
                },
            })

            return result
        })

        return NextResponse.json(updated)
    }
)

