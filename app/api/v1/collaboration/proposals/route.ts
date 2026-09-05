import { z } from "zod"
import { withApiGuard } from "@/lib/api-guard"
import { db as prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { canAgentUseFeature } from "@/lib/subscription-entitlements"
import { notifyCounterparty } from "@/lib/notifications"
import { readGapRow } from "@/lib/gaps/gap-rows"

// withApiGuard only populates `body` when a body schema is declared; without
// this the handler destructured `undefined` and every request 500'd
// (Sentry POLICYWALLET-C — the proposal feature was hard-broken in prod).
const createProposalSchema = z.object({
    relationshipId: z.string().min(1),
    proposalType: z.string().min(1).max(60).default("recommendation"),
    insurerName: z.string().min(1).max(160),
    lineOfBusiness: z.string().min(1).max(60),
    premiumAmount: z.coerce.number().positive().max(10_000_000),
    coverageSummary: z.string().min(1).max(8000),
    comparisonData: z.record(z.string(), z.unknown()).optional(),
    plainLanguageSummary: z.string().max(8000).optional(),
    /** Optional evidence link: the gap this proposal documents a fix for.
     *  Creating the proposal is the "documented recommendation" moment, so the
     *  gap's evidence ladder advances to `validated` (MEDIC blueprint §C). */
    gapInstanceId: z.string().min(1).optional(),
})

// POST — Create a proposal
export const POST = withApiGuard(
    {
        auth: { mode: "user", roles: ["agent"] },
        validation: { body: createProposalSchema },
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

        // Verify relationship — and require ACCEPTANCE: this creates a thread
        // and notifies the customer, so an agent must not be able to message
        // someone who never accepted the relationship (same gate as
        // collaborationService.createThread).
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

        // Optional gap evidence link: the gap must belong to THIS relationship's
        // policyholder — the client supplies the id, and trusting it would let
        // an agent "validate" (and link a proposal to) another customer's gap.
        const gapInstanceId = (body as { gapInstanceId?: string }).gapInstanceId
        if (gapInstanceId) {
            const gap = await readGapRow({
                where: {
                    id: gapInstanceId,
                    OR: [
                        { userId: relationship.policyholderUserId },
                        { policy: { ownerUserId: relationship.policyholderUserId } },
                    ],
                },
                select: { id: true },
            })
            if (!gap) {
                return NextResponse.json({ error: "Gap not found for this customer" }, { status: 404 })
            }
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
                    linkedGapInstanceId: gapInstanceId ?? null,
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

            // The documented recommendation exists — advance the gap's evidence
            // ladder to `validated`. Forward-only: never regresses, and a gap
            // already validated stays put.
            if (gapInstanceId) {
                await tx.gapInstance.updateMany({
                    where: { id: gapInstanceId, validationState: { in: ['probable', 'confirmed'] } },
                    data: { validationState: 'validated' },
                })

                // Sync linked opportunities' medic mirror + score with the
                // ladder (same discipline as confirmGap).
                const { advancePainValidation } = await import("@/lib/medic/seed")
                const { casUpdateOpportunityMedic, medicIoFor } = await import("@/lib/medic/cas")
                const linkedOpps = await tx.opportunity.findMany({
                    where: { gapInstanceId },
                    select: { id: true },
                })
                for (const opp of linkedOpps) {
                    // CAS bound to the tx client: never overwrite a concurrent
                    // € patch / suggestion apply wholesale.
                    await casUpdateOpportunityMedic(medicIoFor(tx), opp.id, (medic) =>
                        advancePainValidation(medic, gapInstanceId, 'validated')
                    )
                }
            }

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
