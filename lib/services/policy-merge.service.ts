import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { resolveCoverageEndDate } from "@/lib/policy-status"

/**
 * Same policy, two uploaders.
 *
 * An agent and the policyholder may legitimately both upload the same
 * contract (same owner + insurer + policy number). Keeping both records is
 * allowed. MERGING them is not a decision either side makes alone: the party
 * who did not ask for the merge must approve it. Only a duplicate from the
 * SAME uploader (a re-upload / renewal) merges silently — that is handled in
 * PolicyService.
 */

export interface MergeRequestInput {
    existingPolicyId: string
    incomingPolicyId: string
    requestedByUserId: string
}

/**
 * Raise (or reuse) a pending merge request and notify the approver — the
 * other uploader. Never merges anything by itself.
 */
export async function requestPolicyMerge(input: MergeRequestInput): Promise<string | null> {
    const [existing, incoming] = await Promise.all([
        db.policy.findUnique({
            where: { id: input.existingPolicyId },
            select: { id: true, ownerUserId: true, createdByUserId: true, insurerName: true, policyNumber: true },
        }),
        db.policy.findUnique({
            where: { id: input.incomingPolicyId },
            select: { id: true, ownerUserId: true, createdByUserId: true },
        }),
    ])
    if (!existing || !incoming) return null
    if (existing.ownerUserId !== incoming.ownerUserId) return null

    // The approver is the other uploader; if that is somehow the requester,
    // there is nothing to consent to.
    const approverUserId =
        existing.createdByUserId === input.requestedByUserId
            ? incoming.createdByUserId
            : existing.createdByUserId
    if (approverUserId === input.requestedByUserId) return null

    const request = await db.policyMergeRequest.upsert({
        where: {
            existingPolicyId_incomingPolicyId: {
                existingPolicyId: existing.id,
                incomingPolicyId: incoming.id,
            },
        },
        create: {
            existingPolicyId: existing.id,
            incomingPolicyId: incoming.id,
            requestedByUserId: input.requestedByUserId,
            approverUserId,
            status: "pending",
        },
        update: {},
        select: { id: true, status: true },
    })

    if (request.status === "pending") {
        await db.notificationEvent.create({
            data: {
                userId: approverUserId,
                eventType: "policy_merge_requested",
                channel: "in_app",
                title: "Duplicate policy detected",
                message: `The policy ${existing.policyNumber} (${existing.insurerName}) exists twice — uploaded by both you and the other party. Merging the two records needs your approval.`,
                relatedObjectType: "policy_merge_request",
                relatedObjectId: request.id,
            },
        })
    }

    return request.id
}

/** Merge requests waiting for this user's decision. */
export async function getPendingMergeRequests(userId: string) {
    return db.policyMergeRequest.findMany({
        where: { approverUserId: userId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            existingPolicy: {
                select: { id: true, policyNumber: true, insurerName: true, lineOfBusiness: true, createdByUserId: true },
            },
            incomingPolicy: {
                select: { id: true, policyNumber: true, insurerName: true, lineOfBusiness: true, createdByUserId: true },
            },
            requestedBy: { select: { id: true, name: true, email: true } },
        },
    })
}

/**
 * Approve: fold the incoming record into the existing one (documents move,
 * the incoming period joins the renewal history) and delete the duplicate.
 * Reject: keep both records, forever — the duplicate is not an error.
 */
export async function decidePolicyMerge(
    requestId: string,
    approverUserId: string,
    decision: "approved" | "rejected"
): Promise<{ ok: boolean; mergedIntoPolicyId?: string; error?: string }> {
    const request = await db.policyMergeRequest.findUnique({
        where: { id: requestId },
        select: {
            id: true,
            status: true,
            approverUserId: true,
            requestedByUserId: true,
            existingPolicyId: true,
            incomingPolicyId: true,
        },
    })
    if (!request || request.approverUserId !== approverUserId) {
        return { ok: false, error: "NOT_FOUND" }
    }
    if (request.status !== "pending") {
        return { ok: false, error: "ALREADY_DECIDED" }
    }

    if (decision === "rejected") {
        await db.policyMergeRequest.update({
            where: { id: request.id },
            data: { status: "rejected", decidedAt: new Date() },
        })
        await db.notificationEvent.create({
            data: {
                userId: request.requestedByUserId,
                eventType: "policy_merge_rejected",
                channel: "in_app",
                title: "Merge declined",
                message: "The duplicate policy stays as a separate record.",
                relatedObjectType: "policy_merge_request",
                relatedObjectId: request.id,
            },
        })
        return { ok: true }
    }

    const [existing, incoming] = await Promise.all([
        db.policy.findUnique({ where: { id: request.existingPolicyId }, include: { documents: true } }),
        db.policy.findUnique({ where: { id: request.incomingPolicyId }, include: { documents: true } }),
    ])
    if (!existing || !incoming) return { ok: false, error: "NOT_FOUND" }

    const existingEnd = existing.endDate?.getTime() ?? 0
    const incomingEnd = incoming.endDate?.getTime() ?? 0
    const promoteIncoming = incomingEnd >= existingEnd

    const renewalHistory = [
        ...(((existing.acordData as any)?.renewalHistory || []) as any[]),
        {
            uploadedAt: new Date().toISOString(),
            sourcePolicyId: incoming.id,
            policyNumber: incoming.policyNumber,
            startDate: incoming.startDate?.toISOString() ?? null,
            endDate: incoming.endDate?.toISOString() ?? null,
            insurerName: incoming.insurerName,
            documents: incoming.documents.map((doc) => ({
                id: doc.id,
                fileName: doc.fileName,
                uploadedAt: doc.uploadedAt?.toISOString() ?? null,
            })),
        },
    ].slice(-20)

    const mergedAcord = {
        ...((promoteIncoming ? (incoming.acordData as any) : (existing.acordData as any)) || {}),
        renewalHistory,
    }

    await db.$transaction(async (tx) => {
        await tx.policyDocument.updateMany({
            where: { policyId: incoming.id },
            data: { policyId: existing.id },
        })
        await tx.policy.update({
            where: { id: existing.id },
            data: {
                acordData: mergedAcord,
                coverageEndDate: resolveCoverageEndDate({
                    acordData: mergedAcord,
                    endDate: promoteIncoming ? incoming.endDate : existing.endDate,
                    status: existing.status,
                    policyNumber: promoteIncoming ? incoming.policyNumber : existing.policyNumber,
                    insurerName: promoteIncoming ? incoming.insurerName : existing.insurerName,
                }),
                ...(promoteIncoming
                    ? {
                          insurerName: incoming.insurerName,
                          lineOfBusiness: incoming.lineOfBusiness,
                          startDate: incoming.startDate,
                          endDate: incoming.endDate,
                          premiumAmount: incoming.premiumAmount,
                          coverageSummary: incoming.coverageSummary,
                      }
                    : {}),
            },
        })
        await tx.policyMergeRequest.update({
            where: { id: request.id },
            data: { status: "approved", decidedAt: new Date() },
        })
        // The duplicate row goes; its documents and period now live on the
        // surviving policy. (Cascade removes the merge request row too.)
        await tx.policy.delete({ where: { id: incoming.id } })
    })

    logger("info", "Policies merged by mutual consent", {
        existingPolicyId: existing.id,
        incomingPolicyId: incoming.id,
        approverUserId,
    })

    await db.notificationEvent.create({
        data: {
            userId: request.requestedByUserId,
            eventType: "policy_merged",
            channel: "in_app",
            title: "Policies merged",
            message: `The duplicate of ${existing.policyNumber} was merged into one record.`,
            relatedObjectType: "policy",
            relatedObjectId: existing.id,
        },
    })

    return { ok: true, mergedIntoPolicyId: existing.id }
}
