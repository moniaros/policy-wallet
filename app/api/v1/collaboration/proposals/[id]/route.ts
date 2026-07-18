import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { notifyCounterparty } from "@/lib/notifications"
import { commissionOn } from "@/lib/agent/commission"
import { recordConversionEvent } from "@/lib/journey/conversion-events"

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

        // The client's decline reason / comment / counter-offer are captured in
        // the human-readable system message below (and echoed to the agent's
        // notification). We do NOT persist them as a structured `metadata` field —
        // the Proposal model has no such column, so writing it threw a Prisma
        // validation error and every decline-with-reason / counter-offer crashed.
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

        // On accept, capture the closed sale as a WON opportunity so it flows into
        // the agent's pipeline + commissions (previously an accepted proposal
        // recorded nothing beyond the status flip). Commission = premium × the
        // agent's per-line rate, mirroring cross-sell.service.ts.
        const agentUserId = proposal.relationship.agentUserId
        let wonOpportunityData: {
            relationshipId: string
            ownerAgentUserId: string
            status: string
            lineOfBusiness: string
            estimatedPremium: number
            estimatedCommission: number
            wonPremium: number
            currency: string
            notes: string
        } | null = null
        if (body.status === "accepted") {
            const agentProfile = await prisma.agentProfile.findUnique({
                where: { userId: agentUserId },
                select: { commissionRates: true },
            })
            const rates = (agentProfile?.commissionRates as Record<string, number> | null) ?? {}
            const premium = Number(proposal.premiumAmount)
            wonOpportunityData = {
                relationshipId: proposal.relationshipId,
                ownerAgentUserId: agentUserId,
                status: "won",
                lineOfBusiness: proposal.lineOfBusiness,
                estimatedPremium: premium,
                estimatedCommission: commissionOn(rates, proposal.lineOfBusiness, premium),
                wonPremium: premium,
                currency: proposal.premiumCurrency,
                notes: `Won from accepted proposal — ${proposal.insurerName}`,
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.proposal.update({
                where: { id },
                data: {
                    status: body.status,
                    clientResponseAt: new Date(),
                },
            })

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

            if (wonOpportunityData) {
                await tx.opportunity.create({ data: wonOpportunityData })
            }

            return result
        })

        // Notify the agent (after commit) — localized to the agent, deep-linked to
        // the customer. Was an in-transaction, English-only, unroutable
        // ('proposal') in-app event.
        const outcome = body.status === "accepted"
            ? "accepted"
            : body.counterOfferNotes
                ? "counter"
                : "declined"
        const notifyContent = {
            accepted: {
                eventType: "proposal_accepted",
                title: { el: "Η πρόταση έγινε αποδεκτή", en: "Proposal accepted" },
                message: {
                    el: `Ο πελάτης αποδέχτηκε την πρότασή σας (${proposal.insurerName}).`,
                    en: `Your client accepted your proposal (${proposal.insurerName}).`,
                },
            },
            counter: {
                eventType: "proposal_counter_offer",
                title: { el: "Ελήφθη αντιπρόταση", en: "Counter-offer received" },
                message: {
                    el: `Ο πελάτης πρότεινε αλλαγή: "${body.counterOfferNotes}"`,
                    en: `Your client proposed a change: "${body.counterOfferNotes}"`,
                },
            },
            declined: {
                eventType: "proposal_declined",
                title: { el: "Η πρόταση απορρίφθηκε", en: "Proposal declined" },
                message: {
                    el: "Ο πελάτης απέρριψε την πρότασή σας.",
                    en: "Your client declined your proposal.",
                },
            },
        }[outcome]
        await notifyCounterparty({
            userId: agentUserId,
            eventType: notifyContent.eventType,
            title: notifyContent.title,
            message: notifyContent.message,
            relatedObjectType: "customer",
            relatedObjectId: proposal.relationship.policyholderUserId,
        })

        // Analytics breadcrumb for the agent's funnel (non-blocking, never throws).
        if (body.status === "accepted") {
            await recordConversionEvent(agentUserId, "proposal_accepted", { source: "proposal" })
        }

        return NextResponse.json(updated)
    }
)

