import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { notifyCounterparty } from "@/lib/notifications"

// POST — Create a proposal
export const POST = withApiGuard(
    {
        auth: { mode: "user", roles: ["agent"] },
    },
    async ({ auth, body }) => {
        // Proposals are a Starter+ feature (proposalFlow) — sold, previously
        // given to every agent tier including free.
        if (!(await canAgentUseFeature(auth!.dbUser.id, "proposalFlow"))) {
            return NextResponse.json(
                { error: "Proposals require the Starter plan or higher." },
                { status: 403 }
            )
        }
        const {
            relationshipId,
            proposalType,
            insurerName,
            lineOfBusiness,
            premiumAmount,
            coverageSummary,
            comparisonData,
            plainLanguageSummary,
        } = body as {
            relationshipId: string
            proposalType: string
            insurerName: string
            lineOfBusiness: string
            premiumAmount: number
            coverageSummary: string
            comparisonData?: Record<string, unknown>
            plainLanguageSummary?: string
        }

        if (!relationshipId || !insurerName || !lineOfBusiness || !premiumAmount || !coverageSummary) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const agentUserId = auth!.dbUser.id

        // Verify relationship
        const relationship = await prisma.customerRelationship.findFirst({
            where: { id: relationshipId, agentUserId },
        })
        if (!relationship) {
            return NextResponse.json({ error: "Relationship not found" }, { status: 404 })
        }

        const result = await prisma.$transaction(async (tx) => {
            const thread = await tx.collaborationThread.create({
                data: {
                    relationshipId,
                    subject: `Proposal: ${insurerName} — ${lineOfBusiness}`,
                    category: "proposal",
                    threadType: "proposal",
                    priority: "medium",
                    createdByUserId: agentUserId,
                    assignedToUserId: relationship.policyholderUserId,
                },
            })

            const proposal = await tx.proposal.create({
                data: {
                    threadId: thread.id,
                    relationshipId,
                    createdByUserId: agentUserId,
                    proposalType,
                    insurerName,
                    lineOfBusiness,
                    premiumAmount,
                    coverageSummary,
                    comparisonData: comparisonData ? JSON.parse(JSON.stringify(comparisonData)) : undefined,
                    plainLanguageSummary: plainLanguageSummary || null,
                },
            })

            // Add system message
            await tx.collaborationMessage.create({
                data: {
                    threadId: thread.id,
                    senderUserId: agentUserId,
                    messageType: "system",
                    body: `Proposal created: ${insurerName} ${lineOfBusiness} — €${premiumAmount}`,
                },
            })

            return { thread, proposal }
        })

        // Break the silent handoff: tell the customer a proposal is waiting for them.
        await notifyCounterparty({
            userId: relationship.policyholderUserId,
            eventType: "proposal_received",
            title: {
                el: "Νέα πρόταση από τον σύμβουλό σας",
                en: "New proposal from your advisor",
            },
            message: {
                el: `${insurerName} — ${lineOfBusiness}, ασφάλιστρο €${premiumAmount}. Δείτε τη και απαντήστε.`,
                en: `${insurerName} — ${lineOfBusiness}, premium €${premiumAmount}. Review and respond.`,
            },
            relatedObjectType: "thread",
            relatedObjectId: result.thread.id,
        })

        return NextResponse.json(result, { status: 201 })
    }
)

// GET — List proposals
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

        where.relationship = {
            OR: [
                { agentUserId: auth!.dbUser.id },
                { policyholderUserId: auth!.dbUser.id },
            ],
        }

        const proposals = await prisma.proposal.findMany({
            where,
            include: {
                thread: { select: { id: true, subject: true, status: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ proposals })
    }
)
