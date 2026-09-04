/**
 * Discarding a policy whose analysis failed.
 *
 * A PDF upload creates the policy row BEFORE anything is known about it — the
 * NOT NULL identity columns are filled with placeholders that extraction is
 * supposed to overwrite. When the analysis never completes, that row survives
 * with its placeholders intact, and the product shows the customer a policy it
 * knows nothing about. The owner's call: on a technical failure the policy is
 * not saved at all.
 *
 * Two rules make that safe rather than destructive.
 *
 * **1. Only a placeholder identity is discarded.** A policy an agent typed an
 * insurer and a number into holds work a re-upload would not reproduce; a
 * provider timeout must not delete it. `hasPlaceholderIdentity` is the gate.
 *
 * **2. Storage first, database second.** The bucket object is personal data.
 * If the row goes first and the object delete then fails, the object is
 * orphaned — unreachable by a GDPR export and by an erasure request, which is
 * a compliance defect, not clutter. So every object is removed first, and if
 * any removal fails the row is KEPT (and marked action_needed) so the data
 * stays reachable. A visible broken document beats invisible personal data.
 */

import { db as defaultDb } from "@/lib/db"
import { deleteFile } from "@/lib/storage"
import { logger } from "@/lib/logger"
import { hasPlaceholderIdentity } from "@/lib/wallet/policy-identity"

type Db = typeof defaultDb

/**
 * How a finished-unsuccessfully analysis should be treated.
 *
 * `discard` — a technical failure. Nothing was learned, nothing was typed;
 *   the upload is removed and the customer is told to try again.
 * `inform`  — the run never started for a reason the customer must act on
 *   (quota, consent, permission). Discarding these silently would make the
 *   product look broken: the file vanishes and nobody says why.
 */
export type AnalysisFailureKind = "discard" | "inform"

export interface AnalysisFailureClassification {
    kind: AnalysisFailureKind
    /** Stable code persisted on the policy and mapped to Greek copy by the UI. */
    code: string
    retryable: boolean
}

/**
 * Reasons the run never started, keyed by the `blockedReason` the orchestrator
 * writes. Everything NOT in here is a technical failure.
 */
const INFORM_REASONS: Record<string, { code: string; retryable: boolean }> = {
    insufficient_tokens: { code: "TOKEN_LIMIT_BLOCKED", retryable: true },
    monthly_limit_reached: { code: "TOKEN_LIMIT_BLOCKED", retryable: true },
    token_limit_blocked: { code: "TOKEN_LIMIT_BLOCKED", retryable: true },
    ai_consent_missing: { code: "AI_CONSENT_REQUIRED", retryable: true },
    forbidden: { code: "ANALYSIS_NOT_PERMITTED", retryable: false },
}

export function classifyAnalysisFailure(input: {
    blockedReason?: string | null
    failureCode?: string | null
    message?: string | null
}): AnalysisFailureClassification {
    const blocked = (input.blockedReason || "").toLowerCase()
    if (blocked && INFORM_REASONS[blocked]) {
        return { kind: "inform", ...INFORM_REASONS[blocked] }
    }

    const haystack = `${input.failureCode || ""} ${input.message || ""}`.toLowerCase()

    // The token gate can also surface as a thrown error rather than a blocked
    // run (the preflight inside a step), so match the message too.
    if (
        /token budget check failed|monthly_limit_reached|insufficient_tokens|token_limit_blocked/.test(
            haystack
        )
    ) {
        return { kind: "inform", code: "TOKEN_LIMIT_BLOCKED", retryable: true }
    }
    if (/ai_consent_required|ai consent/.test(haystack)) {
        return { kind: "inform", code: "AI_CONSENT_REQUIRED", retryable: true }
    }

    // A document that was READ and carries no policy — no identity, no
    // period, no coverages (lib/wallet/unread-policy.ts). Not a technical
    // failure: the file may be the wrong one, or a scan the person can
    // replace. Discarding it silently would make a readable upload vanish.
    if (/extraction_empty/.test(haystack)) {
        return { kind: "inform", code: "EXTRACTION_EMPTY", retryable: true }
    }

    if (/timeout|deadline/.test(haystack)) {
        return { kind: "discard", code: "TIMEOUT", retryable: true }
    }
    return { kind: "discard", code: "ANALYSIS_FAILED", retryable: true }
}

export interface DiscardResult {
    /** True only when the policy row is gone AND every object was removed. */
    discarded: boolean
    /** Why not, when `discarded` is false. */
    keptReason?: "user_supplied_identity" | "storage_delete_failed" | "not_found"
    documentsRemoved: number
    objectsRemoved: number
    objectsFailed: number
}

/**
 * Remove a failed upload completely: bucket objects, document rows, policy row.
 *
 * Returns without deleting anything when the policy carries a user-supplied
 * identity — the caller then falls back to marking it `action_needed`.
 */
export async function discardFailedPolicy(
    policyId: string,
    options: { reason: string; db?: Db } = { reason: "analysis_failed" }
): Promise<DiscardResult> {
    const db = options.db ?? defaultDb

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: {
            id: true,
            insurerName: true,
            policyNumber: true,
            ownerUserId: true,
            documents: { select: { id: true, fileUrl: true } },
        },
    })

    if (!policy) {
        return { discarded: false, keptReason: "not_found", documentsRemoved: 0, objectsRemoved: 0, objectsFailed: 0 }
    }

    if (!hasPlaceholderIdentity(policy)) {
        logger("info", "Analysis failed but the policy carries a user-supplied identity — keeping it", {
            policyId,
            reason: options.reason,
        })
        return {
            discarded: false,
            keptReason: "user_supplied_identity",
            documentsRemoved: 0,
            objectsRemoved: 0,
            objectsFailed: 0,
        }
    }

    // Storage FIRST. deleteFile resolves the bucket + object key from the URL
    // and returns false rather than throwing when the removal fails.
    let objectsRemoved = 0
    let objectsFailed = 0
    for (const doc of policy.documents) {
        const removed = await deleteFile(doc.fileUrl).catch((error) => {
            logger("warn", "Storage delete threw while discarding a failed policy", {
                policyId,
                documentId: doc.id,
                error: error instanceof Error ? error.message : String(error),
            })
            return false
        })
        if (removed) objectsRemoved += 1
        else objectsFailed += 1
    }

    if (objectsFailed > 0) {
        // Keep the row: it is the only thing that still points at the objects
        // we could not remove. Deleting it here is what manufactures orphans.
        logger("error", "Refusing to discard a policy whose storage objects could not be removed", {
            policyId,
            objectsRemoved,
            objectsFailed,
        })
        return {
            discarded: false,
            keptReason: "storage_delete_failed",
            documentsRemoved: 0,
            objectsRemoved,
            objectsFailed,
        }
    }

    // Cascades to policy_documents, gap instances, analysis runs and steps.
    await db.policy.delete({ where: { id: policyId } })

    logger("info", "Discarded a policy whose analysis failed", {
        policyId,
        ownerUserId: policy.ownerUserId,
        reason: options.reason,
        documents: policy.documents.length,
    })

    return {
        discarded: true,
        documentsRemoved: policy.documents.length,
        objectsRemoved,
        objectsFailed: 0,
    }
}

/**
 * Remove storage objects that were uploaded client-side but never got a
 * database row — the create path's rollback. Best-effort by definition: there
 * is nothing left to keep them reachable, so a failure is logged and reported,
 * never thrown into the user's face.
 */
export async function discardOrphanedUploads(
    fileUrls: Array<string | null | undefined>,
    context: { reason: string; userId?: string }
): Promise<{ removed: number; failed: number }> {
    let removed = 0
    let failed = 0

    for (const fileUrl of fileUrls) {
        if (!fileUrl) continue
        const ok = await deleteFile(fileUrl).catch(() => false)
        if (ok) removed += 1
        else failed += 1
    }

    if (removed > 0 || failed > 0) {
        logger(failed > 0 ? "warn" : "info", "Rolled back client-side uploads", {
            reason: context.reason,
            userId: context.userId,
            removed,
            failed,
        })
    }

    return { removed, failed }
}
