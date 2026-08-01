import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { notifyCounterparty } from "@/lib/notifications"
import { commissionOn } from "@/lib/agent/commission"
import {
    buildCloseFields,
    lostOutcomeFromDeclineReason,
    recordStageTransition,
} from "@/lib/agent/opportunity-lifecycle"
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
        // Runtime validation — the old `as` cast persisted ANY status string
        // (e.g. resetting to "pending") straight into the row.
        const respondSchema = z.object({
            status: z.enum(["accepted", "declined"]),
            declineReason: z.enum(["too_expensive", "not_needed", "prefer_different", "other"]).optional(),
            declineComment: z.string().max(2000).optional(),
            counterOfferNotes: z.string().max(2000).optional(),
        })
        const parsedBody = respondSchema.safeParse(await req.json().catch(() => null))
        if (!parsedBody.success) {
            return NextResponse.json({ error: "Invalid proposal response payload" }, { status: 400 })
        }
        const body = parsedBody.data

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

        // The client's decline reason / comment / counter-offer are rendered into
        // the human-readable system message below AND persisted to the dedicated
        // columns on Proposal, so "why do we lose deals?" is answerable from data
        // rather than by parsing chat prose.
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

        // A proposal response CLOSES the deal the agent was already working — it
        // does not start a new one. Creating a fresh row here (as this used to)
        // left the original opportunity open forever, double-counting the deal in
        // pipeline and won, and gave the new row createdAt === updatedAt so its
        // sales-cycle length computed as zero. Find the live deal for this
        // relationship + line and close THAT.
        const agentUserId = proposal.relationship.agentUserId
        const isPlainDecline = body.status === "declined" && !body.counterOfferNotes

        const openOpportunity =
            body.status === "accepted" || isPlainDecline
                ? await prisma.opportunity.findFirst({
                      where: {
                          relationshipId: proposal.relationshipId,
                          lineOfBusiness: proposal.lineOfBusiness,
                          status: { notIn: ["won", "lost"] },
                      },
                      orderBy: { createdAt: "desc" },
                      select: { id: true, status: true },
                  })
                : null

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
            outcome: string
            outcomeAt: Date
        } | null = null
        let wonUpdateData: {
            estimatedPremium: number
            estimatedCommission: number
            wonPremium: number
            currency: string
        } | null = null

        if (body.status === "accepted") {
            const agentProfile = await prisma.agentProfile.findUnique({
                where: { userId: agentUserId },
                select: { commissionRates: true },
            })
            const rates = (agentProfile?.commissionRates as Record<string, number> | null) ?? {}
            const premium = Number(proposal.premiumAmount)
            const commission = commissionOn(rates, proposal.lineOfBusiness, premium)

            if (openOpportunity) {
                // Close the deal in flight — its createdAt is preserved, so the
                // sales cycle stays measurable.
                wonUpdateData = {
                    estimatedPremium: premium,
                    estimatedCommission: commission,
                    wonPremium: premium,
                    currency: proposal.premiumCurrency,
                }
            } else {
                // No deal was being tracked (e.g. the agent proposed straight off a
                // conversation) — record the sale so commissions still see it.
                wonOpportunityData = {
                    relationshipId: proposal.relationshipId,
                    ownerAgentUserId: agentUserId,
                    status: "won",
                    lineOfBusiness: proposal.lineOfBusiness,
                    estimatedPremium: premium,
                    estimatedCommission: commission,
                    wonPremium: premium,
                    currency: proposal.premiumCurrency,
                    notes: `Won from accepted proposal — ${proposal.insurerName}`,
                    outcome: "proposal_accepted",
                    outcomeAt: new Date(),
                }
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.proposal.update({
                where: { id },
                data: {
                    status: body.status,
                    clientResponseAt: new Date(),
                    declineReason: body.declineReason ?? null,
                    declineComment: body.declineComment ?? null,
                    counterOfferNotes: body.counterOfferNotes ?? null,
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

            if (wonUpdateData && openOpportunity) {
                await tx.opportunity.update({
                    where: { id: openOpportunity.id },
                    data: {
                        status: "won",
                        ...wonUpdateData,
                        ...buildCloseFields(
                            "won",
                            "proposal_accepted",
                            `Accepted proposal — ${proposal.insurerName}`
                        ),
                    },
                })
                await recordStageTransition(tx, {
                    opportunityId: openOpportunity.id,
                    fromStatus: openOpportunity.status,
                    toStatus: "won",
                    changedByUserId: userId,
                    outcome: "proposal_accepted",
                    note: `Accepted proposal — ${proposal.insurerName}`,
                })
            } else if (wonOpportunityData) {
                const created = await tx.opportunity.create({ data: wonOpportunityData })
                await recordStageTransition(tx, {
                    opportunityId: created.id,
                    fromStatus: null,
                    toStatus: "won",
                    changedByUserId: userId,
                    outcome: "proposal_accepted",
                    note: wonOpportunityData.notes,
                })
            }

            // A plain decline closes the deal as lost WITH the client's reason.
            // Declines used to record nothing at all, so they were invisible to
            // pipeline analytics while accepts inflated it. A counter-offer is a
            // live negotiation, not a loss, so it deliberately closes nothing.
            if (isPlainDecline && openOpportunity) {
                const lostOutcome = lostOutcomeFromDeclineReason(body.declineReason)
                await tx.opportunity.update({
                    where: { id: openOpportunity.id },
                    data: {
                        status: "lost",
                        ...buildCloseFields("lost", lostOutcome, body.declineComment),
                    },
                })
                await recordStageTransition(tx, {
                    opportunityId: openOpportunity.id,
                    fromStatus: openOpportunity.status,
                    toStatus: "lost",
                    changedByUserId: userId,
                    outcome: lostOutcome,
                    note: body.declineComment ?? `Declined proposal — ${proposal.insurerName}`,
                })
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

