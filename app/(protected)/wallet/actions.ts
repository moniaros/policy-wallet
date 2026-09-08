"use server"

import { storedDocumentLabel } from "@/lib/wallet/document-label"
import { displayPersonName, policyLabel } from "@/lib/wallet/policy-identity"
import { db } from "@/lib/db"
import { emit, emitToMany } from "@/lib/notifications/dispatch"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { INSURANCE_BRANCHES, normalizeBranch } from "@/lib/insurance/taxonomy"
import { lineOfBusinessEnum } from "@/lib/validations/policy"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { uploadFile, deleteFile } from "@/lib/storage"
import { sanitizeDisplayName, MAX_DOCUMENTS_PER_POLICY } from "@/lib/security/file-upload"
import { isOwnedStorageUrl, storageColumnsFor } from "@/lib/supabase/storage-download"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import fs from "fs/promises"
import path from "path"
import { getAIService } from "@/lib/services/ai"
import { guardUserText, enforceBillableCallPolicy } from "@/lib/services/ai/guard"
import { GapAnalysisService } from "@/lib/services/gap-analysis.service"
import { AppError } from "@/lib/errors/app-error"
import { enqueueAnalysisRun } from "@/lib/services/analysis/analysis-queue"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { resolveCoverageEndDate } from "@/lib/policy-status"
import { PolicyService } from "@/lib/services/policy.service"
import { canUserUseTokens } from "@/lib/token-tracking"
import { canUserAddPolicy, canUserUseFeature, getUserSubscription, SUBSCRIPTION_LIMITS } from "@/lib/subscription-limits"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { after } from 'next/server'
import { collaborationService } from "@/lib/services/collaboration.service"
import { sendPolicyInviteEmail, sendPolicySharedAccessEmail } from "@/lib/email/invite-emails"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { daysFromNow, POLICY_SHARE_EXPIRY_DAYS } from "@/lib/constants/time"
import { buildPolicyReviewData, sumInsuredTargetPath } from "@/lib/wallet/policy-review"
import { startOfAthensDay, startOfAthensMonth } from "@/lib/policy-status"
import { isAcceptedImageFile, isPdfFile } from "@/lib/security/file-upload"
import { normalizeEmail } from "@/lib/identity/normalize-email"
import { ingestPolicyDocument } from "@/lib/ingestion/ingest-policy-document"
import { readGapRow } from "@/lib/gaps/gap-rows"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

/**
 * The add-policy form WITH a document. The branch is the only thing the
 * person must choose; identity and dates are optional because the extraction
 * reads them off the document — the server mints the placeholders the
 * identity layer knows how to hide (lib/wallet/policy-identity.ts). The
 * client used to mint them itself, which is how `__PENDING_EXTRACTION__`
 * became a literal in a component.
 */
const UploadPolicySchema = z.object({
    lineOfBusiness: lineOfBusinessEnum,
    insurerName: z.string().trim().optional(),
    policyNumber: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    premiumAmount: z.coerce.number().optional(),
}).refine(
    (data) => !data.startDate || !data.endDate || new Date(data.endDate) > new Date(data.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
)

const PolicySchema = z.object({
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    // Shared with the API write path via lib/validations/policy.ts. Previously a
    // hand-copied 18-value list that had drifted out of step with the taxonomy in
    // both directions — it carried two aliases as ids and rejected `pension`,
    // `boat`, `roadside`, `personal_accident` and every group line.
    lineOfBusiness: lineOfBusinessEnum,
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.coerce.number().optional(),
}).refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
)

export async function createPolicy(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) throw new Error("Unauthorized")

    // We need to map Supabase User ID to our local DB User ID
    // Assumption: We synced them properly or use email as lookup if IDs differ.
    // If IDs are synced (ideal), then user.id is correct.
    // If not, we might need: const dbUser = await db.user.findUnique({ where: { email: user.email } })
    // For now, let's assume sync or db lookup by email for safety if ID mismatch is possible.

    // Safer approach: Lookup by email to get the integer/UUID ID used in public.User table if it differs.
    // But earlier we used db.user.create without specifying ID, so it generated a UUID.
    // And we didn't force Supabase ID. 
    // Let's rely on email for robust linking.
    const dbUser = await db.user.findUnique({ where: { email: normalizeEmail(user.email) }, select: { id: true } })
    if (!dbUser) throw new Error("User record not found")

    const userId = dbUser.id
    const canAdd = await canUserAddPolicy(userId)
    if (!canAdd.allowed) {
        // Structured return, NOT a throw — prod builds redact thrown
        // server-action messages to a digest, so the client can only ever
        // see this code as a return value (a throw reads as a generic
        // failure instead of the policy_limit upgrade modal).
        await recordConversionEvent(userId, "limit_hit", { kind: "policy", source: "create_policy" })
        return { error: "POLICY_LIMIT_REACHED" }
    }

    const rawData = {
        insurerName: formData.get("insurerName") || undefined,
        policyNumber: formData.get("policyNumber") || undefined,
        lineOfBusiness: formData.get("lineOfBusiness"),
        startDate: formData.get("startDate") || undefined,
        endDate: formData.get("endDate") || undefined,
        premiumAmount: formData.get("premiumAmount") || undefined,
    }
    const language = (user.user_metadata?.language as 'en' | 'el') || 'en'

    // ── With a document: ONE door ────────────────────────────────────────
    // The file travels IN the action (bodySizeLimit is sized for it), so the
    // server sees the bytes before anything exists. The ingestion service
    // validates them, runs the document gate against the branch the person
    // selected, and only then stores the object and creates the Policy +
    // stamped PolicyDocument in one transaction. Until Sept 2026 the browser
    // uploaded straight into the bucket and this action committed a policy
    // for whatever landed there — a menu declared as «Αυτοκίνητο» became an
    // analysing policy and a full extraction was spent finding that out.
    const file = formData.get("file")
    if (file instanceof File && file.size > 0) {
        const parsed = UploadPolicySchema.safeParse(rawData)
        if (!parsed.success) {
            return { error: "VALIDATION_ERROR" as const }
        }
        const typed = parsed.data
        const result = await ingestPolicyDocument({
            actorUserId: userId,
            ownerUserId: userId,
            file,
            surface: "wallet_add",
            mode: "policy",
            declaredBranch: typed.lineOfBusiness,
            declaredBranchSource: "user",
            branchConfirmed: formData.get("branchConfirmed") === "true",
            typedMetadata: {
                insurerName: typed.insurerName || null,
                policyNumber: typed.policyNumber || null,
                startDate: typed.startDate || null,
                endDate: typed.endDate || null,
                premiumAmount: typed.premiumAmount ?? null,
            },
            policyStatus: "analyzing",
            processingStatus: "processing",
            source: "policyholder",
        })
        if (!result.ok) {
            if (result.kind === "upload_invalid") {
                return { error: `DOCUMENT_REJECTED_${result.code}`, gate: { status: "rejected" as const, code: result.code } }
            }
            // Structured, NOT a throw — prod builds redact thrown server-action
            // messages to a digest. The client renders the code's copy and the
            // actions the verdict allows (change type / confirm / upload another).
            return {
                error: "DOCUMENT_REJECTED" as const,
                gate: {
                    status: result.status,
                    code: result.code,
                    documentType: result.documentType,
                    documentKind: result.documentKind,
                    detectedBranch: result.detectedBranch,
                    declaredBranch: result.declaredBranch,
                    resolvable: result.resolvable,
                    reviewReasons: result.reviewReasons,
                    ...(result.existingPolicyId ? { existingPolicyId: result.existingPolicyId } : {}),
                },
            }
        }

        const policyService = new PolicyService()
        const createdPolicyId = result.policyId
        after(async () => {
            try {
                await policyService.runBackgroundAnalysis(createdPolicyId, userId, language)
            } catch (e) {
                logger('error', 'Deferred analysis failed', { policyId: createdPolicyId, error: e })
            }
        })

        await (db as any).activityLog.create({
            data: {
                adminUserId: userId,
                adminEmail: "",
                actionType: "POLICY_CREATED",
                description: "Created policy from a validated document",
                metadata: {
                    policyId: createdPolicyId,
                    lineOfBusiness: result.lineOfBusiness,
                    documentType: result.verdict.documentType,
                },
            }
        })

        revalidatePath("/wallet")
        return { success: true, policyId: createdPolicyId }
    }

    // ── Without a document: a manual entry ───────────────────────────────
    // Nothing to validate and nothing to analyse; every field is typed.
    const validatedData = PolicySchema.parse(rawData)

    const policy = await db.policy.create({
        data: {
            ownerUserId: userId,
            createdByUserId: userId,
            insurerName: validatedData.insurerName,
            policyNumber: validatedData.policyNumber,
            lineOfBusiness: validatedData.lineOfBusiness,
            startDate: new Date(validatedData.startDate),
            endDate: new Date(validatedData.endDate),
            coverageEndDate: new Date(validatedData.endDate),
            premiumAmount: validatedData.premiumAmount,
            status: 'active',
        }
    })

    // Log Activity
    await (db as any).activityLog.create({
        data: {
            adminUserId: userId,
            adminEmail: user.email || "unknown",
            actionType: "POLICY_CREATED",
            description: `Created policy ${policy.policyNumber} for ${policy.insurerName}`,
            metadata: {
                policyId: policy.id,
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber
            }
        }
    })

    revalidatePath("/wallet")
    return { success: true, policyId: policy.id }
}

/**
 * Lightweight analysis-status poll — status, current step and progress only.
 *
 * The post-upload screen used to poll getPolicyReviewData every few seconds:
 * ~45 calls per analysis, each 2.5-2.9s, each dragging the FULL page payload
 * (the entire acordData JSON) through two queries just to learn whether
 * `status` changed. This is ONE skinny owner-scoped roundtrip (~200 bytes);
 * the client fetches the full review payload exactly once, on the terminal
 * transition.
 *
 * Owner-only by construction (the policy row must belong to the session's
 * email) — deliberately narrower than getPolicyAccess, same as
 * getPolicyReviewData above.
 */
export async function getPolicyAnalysisStatus(policyId: string): Promise<
    | { error: string }
    | {
          status: string
          processingErrorCode: string | null
          runStatus: string | null
          currentStep: string | null
          stepsCompleted: number
          stepsTotal: number
      }
> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user.email) return { error: "Unauthorized" }

    const rows = await db.$queryRaw<
        Array<{
            status: string
            error_code: string | null
            run_status: string | null
            current_step: string | null
            steps_completed: bigint | number | null
        }>
    >`
        SELECT p.status,
               p.acord_data -> 'processingError' ->> 'code' AS error_code,
               r.status AS run_status,
               (SELECT s.step_key FROM policy_analysis_steps s
                 WHERE s.analysis_run_id = r.analysis_run_id AND s.status = 'running'
                 ORDER BY s.step_order DESC LIMIT 1) AS current_step,
               (SELECT count(*) FROM policy_analysis_steps s
                 WHERE s.analysis_run_id = r.analysis_run_id
                   AND s.status IN ('completed', 'skipped')) AS steps_completed
        FROM policies p
        JOIN users u ON u.user_id = p.owner_user_id
        LEFT JOIN LATERAL (
            SELECT pr.analysis_run_id, pr.status
            FROM policy_analysis_runs pr
            WHERE pr.policy_id = p.policy_id
            ORDER BY pr.created_at DESC LIMIT 1
        ) r ON true
        WHERE p.policy_id = ${policyId} AND u.email = ${user.email}
    `

    const row = rows[0]
    if (!row) return { error: "Not found" }

    return {
        status: row.status,
        processingErrorCode: row.error_code,
        runStatus: row.run_status,
        currentStep: row.current_step,
        stepsCompleted: Number(row.steps_completed ?? 0),
        stepsTotal: 8,
    }
}

export async function getPolicyReviewData(policyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user.email) return { error: "Unauthorized" }

    // Use email-based lookup to match the local DB user ID (same as createPolicy)
    const dbUser = await db.user.findUnique({ where: { email: normalizeEmail(user.email) }, select: { id: true } })
    if (!dbUser) return { error: "User not found" }

    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
        select: {
            id: true,
            status: true,
            insurerName: true,
            lineOfBusiness: true,
            startDate: true,
            endDate: true,
            premiumAmount: true,
            premiumCurrency: true,
            policyNumber: true,
            coverageSummary: true,
            acordData: true,
        }
    })

    if (!policy) return { error: "Not found" }

    return buildPolicyReviewData(policy)
}

const ConfirmReviewSchema = z.object({
    insurerName: z.string().min(1).max(200).optional(),
    policyNumber: z.string().min(1).max(100).optional(),
    lineOfBusiness: lineOfBusinessEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    issueDate: z.string().optional(),
    renewalDate: z.string().optional(),
    premiumAmount: z.coerce.number().nonnegative().optional(),
    premiumFrequency: z.enum(["annual", "semiannual", "quarterly", "monthly", "one_off"]).optional(),
    sumInsured: z.coerce.number().nonnegative().optional(),
})

export type ConfirmReviewInput = z.infer<typeof ConfirmReviewSchema>

/**
 * AGENT confirmed the AI-extracted data (optionally with corrections).
 * Applies column edits + acordData envelope edits and stamps
 * extraction.reviewState = 'confirmed' in one transaction.
 *
 * The extraction review is an agent-only professional verification step:
 * agent (or admin) role plus write access to the policy (owner, or an
 * active write/manage grant). B2C policyholders never review extractions —
 * their agent does.
 */
export async function confirmPolicyReview(policyId: string, edits: ConfirmReviewInput = {}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    const dbUser = authResult.dbUser

    const parsed = ConfirmReviewSchema.safeParse(edits)
    if (!parsed.success) return { error: "Invalid input" }
    const input = parsed.data

    const { getPolicyAccess } = await import("@/lib/policy-access")
    const { isAgentRole } = await import("@/lib/auth/require-agent")
    // The policy fetch depends only on the id — run it alongside the access
    // check and discard it on denial.
    const [access, policy] = await Promise.all([
        getPolicyAccess(policyId, { id: dbUser.id, roles: dbUser.roles }),
        db.policy.findUnique({ where: { id: policyId } }),
    ])
    // "Not found" for anyone who can't read the policy — no existence leak.
    if (!access.canRead || !policy) return { error: "Not found" }
    if (!isAgentRole(dbUser.roles) || !access.canWrite) return { error: "Unauthorized" }
    if (policy.status === 'analyzing') return { error: "ANALYSIS_IN_PROGRESS" }

    const effectiveStart = input.startDate ? new Date(input.startDate) : policy.startDate
    const effectiveEnd = input.endDate ? new Date(input.endDate) : policy.endDate
    if ((input.startDate || input.endDate) && effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
        return { error: "END_DATE_BEFORE_START" }
    }

    const columnData: Record<string, unknown> = {}
    if (input.insurerName) columnData.insurerName = input.insurerName
    if (input.policyNumber) columnData.policyNumber = input.policyNumber
    if (input.lineOfBusiness) columnData.lineOfBusiness = input.lineOfBusiness
    if (input.startDate) columnData.startDate = new Date(input.startDate)
    if (input.endDate) columnData.endDate = new Date(input.endDate)
    if (input.premiumAmount !== undefined) columnData.premiumAmount = input.premiumAmount

    const acord = (policy.acordData as Record<string, any> | null) || {}
    const effectiveLob = input.lineOfBusiness || policy.lineOfBusiness
    const nextAcord: Record<string, any> = {
        ...acord,
        policy: {
            ...(acord.policy || {}),
            ...(input.insurerName ? { insurerName: input.insurerName } : {}),
            ...(input.policyNumber ? { policyNumber: input.policyNumber } : {}),
            ...(input.lineOfBusiness ? { lineOfBusiness: input.lineOfBusiness } : {}),
            ...(input.startDate ? { effectiveDate: input.startDate } : {}),
            ...(input.endDate ? { expirationDate: input.endDate } : {}),
            ...(input.issueDate ? { issueDate: input.issueDate } : {}),
            ...(input.renewalDate ? { renewalDate: input.renewalDate } : {}),
            ...(input.premiumFrequency ? { premiumFrequency: input.premiumFrequency } : {}),
        },
        extraction: {
            ...(acord.extraction || {}),
            reviewState: 'confirmed',
            confirmedAt: new Date().toISOString(),
            // Declared actor (PW-BRIDGE-01 A-06): the record status names who confirmed.
            confirmedBy: 'agent',
            confirmedByUserId: dbUser.id,
            flaggedAt: null,
        },
    }
    if (input.sumInsured !== undefined) {
        // Write target derived server-side from the post-edit LOB.
        const [section, key] = sumInsuredTargetPath(effectiveLob)
        nextAcord[section] = { ...(nextAcord[section] || {}), [key]: input.sumInsured }
    }

    try {
        await db.$transaction([
            db.policy.update({
                where: { id: policyId },
                data: {
                    ...columnData,
                    acordData: nextAcord,
                    coverageEndDate: resolveCoverageEndDate({
                        acordData: nextAcord,
                        endDate: (columnData as { endDate?: Date }).endDate ?? policy.endDate,
                        status: policy.status,
                        policyNumber: input.policyNumber || policy.policyNumber,
                        insurerName: (columnData as { insurerName?: string }).insurerName ?? policy.insurerName,
                    }),
                },
            }),
            (db as any).activityLog.create({
                data: {
                    adminUserId: dbUser.id,
                    adminEmail: dbUser.email || "unknown",
                    actionType: "POLICY_REVIEW_CONFIRMED",
                    description: `Confirmed AI-extracted data for policy ${input.policyNumber || policy.policyNumber}`,
                    metadata: {
                        policyId,
                        editedFields: Object.keys(input),
                    },
                },
            }),
        ])
    } catch (e: any) {
        logger('error', 'Confirm policy review failed', { policyId, error: e.message })
        return { error: "Confirm failed" }
    }

    // The review step exists to CORRECT the AI extraction — so the gaps and the
    // protection score, both derived from exactly this data, have to be recomputed
    // or they keep contradicting the correction: a sum insured an agent just
    // raised still reads "underinsured", a motor→health line fix leaves the motor
    // gaps and mismatches the coverage panel, a corrected end date leaves a lapsed
    // policy scoring as cover. runGapEngine is deterministic (no AI tokens; the
    // same call coverage-insights already makes), recomputes for the whole owner
    // so cross-policy rules stay consistent, and runs before revalidatePath so the
    // refreshed pages read the new gaps. Best-effort: a recompute failure must not
    // undo a save that already succeeded.
    try {
        const { runGapEngine } = await import("@/lib/services/gap-engine")
        await runGapEngine(policy.ownerUserId)
    } catch (e: any) {
        logger('error', 'Gap recompute after review confirm failed', { policyId, error: e?.message })
    }

    // The owner's record was just OVERWRITTEN by someone else: insurer, number,
    // dates, premium and sum insured take the agent's values, and the
    // «unverified» badge goes away because a person vouched for them. The
    // person whose record it is heard nothing about it (PW-BRIDGE-01 I-08).
    // Skipped when the owner confirmed their own policy — this action is
    // agent-only today, but the guard is cheap and the rule is the same one
    // updatePolicy follows. Best-effort: the write has committed.
    if (policy.ownerUserId !== dbUser.id) {
        try {
            const actorName = displayPersonName(dbUser.name)
            const label = policyLabel({
                insurerName: (columnData as { insurerName?: string }).insurerName ?? policy.insurerName,
                policyNumber: input.policyNumber || policy.policyNumber,
            })
            await emit({
                event: "policy_details_confirmed",
                userId: policy.ownerUserId,
                title: {
                    el: "Τα στοιχεία του ασφαλιστηρίου σας επιβεβαιώθηκαν",
                    en: "Your policy's details were confirmed",
                },
                message: {
                    el: `${actorName || "Ο σύμβουλός σας"} έλεγξε και επιβεβαίωσε τα στοιχεία${label ? ` του ασφαλιστηρίου ${label}` : ""}. Μπορείτε να τα δείτε και να τα διορθώσετε.`,
                    en: `${actorName || "Your advisor"} reviewed and confirmed the details${label ? ` on policy ${label}` : ""}. You can see them and correct them.`,
                },
                relatedObjectType: "policy",
                relatedObjectId: policyId,
            })
        } catch (e: any) {
            logger('error', 'Review-confirmed notification failed', { policyId, error: e?.message })
        }
    }

    revalidatePath("/wallet")
    revalidatePath(`/wallet/${policyId}`)
    revalidatePath(`/customers/${policy.ownerUserId}/policy/${policyId}`)
    revalidatePath("/protection")
    revalidatePath("/dashboard")
    return { success: true }
}

/**
 * AGENT flagged the AI extraction as incorrect. Stamps
 * extraction.reviewState = 'flagged' (policy columns untouched — soft gate)
 * and records the report for triage. Same agent-only gate as
 * confirmPolicyReview.
 */
export async function flagPolicyExtraction(policyId: string, reason?: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    const dbUser = authResult.dbUser

    const { getPolicyAccess } = await import("@/lib/policy-access")
    const { isAgentRole } = await import("@/lib/auth/require-agent")
    const [access, policy] = await Promise.all([
        getPolicyAccess(policyId, { id: dbUser.id, roles: dbUser.roles }),
        db.policy.findUnique({ where: { id: policyId } }),
    ])
    if (!access.canRead || !policy) return { error: "Not found" }
    if (!isAgentRole(dbUser.roles) || !access.canWrite) return { error: "Unauthorized" }

    const trimmedReason = (reason || '').trim().slice(0, 500) || null
    const acord = (policy.acordData as Record<string, any> | null) || {}
    const nextAcord = {
        ...acord,
        extraction: {
            ...(acord.extraction || {}),
            reviewState: 'flagged',
            flaggedAt: new Date().toISOString(),
            flagReason: trimmedReason,
        },
    }

    try {
        await db.$transaction([
            db.policy.update({
                where: { id: policyId },
                data: { acordData: nextAcord },
            }),
            (db as any).activityLog.create({
                data: {
                    adminUserId: dbUser.id,
                    adminEmail: dbUser.email || "unknown",
                    actionType: "POLICY_EXTRACTION_FLAGGED",
                    description: `Flagged AI extraction for policy ${policy.policyNumber}`,
                    metadata: {
                        policyId,
                        reason: trimmedReason,
                        overallConfidence: acord?.extraction?.confidence?.overall ?? null,
                        provider: acord?.extraction?.source ?? null,
                    },
                },
            }),
        ])
    } catch (e: any) {
        logger('error', 'Flag policy extraction failed', { policyId, error: e.message })
        return { error: "Flag failed" }
    }

    const { publishExtractionFlagged } = await import("@/lib/events/publishers")
    await publishExtractionFlagged({
        policyId,
        ownerUserId: policy.ownerUserId,
        actor: { type: "advisor", id: dbUser.id },
        reason: trimmedReason || "flagged as incorrect",
        overallConfidence: acord?.extraction?.confidence?.overall ?? null,
    })

    // AFTER the transaction, never inside it: a notification is a consequence of
    // the flag, not a precondition of it, and a mail provider having a bad
    // minute must not roll back the flag itself. (It also cannot be inside —
    // `emit` performs its own writes, and this used to be a bare create in the
    // transaction array, which is what kept it on one channel.)
    // TWO audiences, two events — they used to share one row, addressed to the
    // agent, while the registry declared `owner` and the copy spoke to the owner
    // (PW-BRIDGE-01 I-09). The owner's record is now marked «flagged» and the
    // «unverified» badge stays up; they are the only person who can resolve it,
    // and they were the one person not told.
    const flaggerName = displayPersonName(dbUser.name)
    await emit({
        event: "extraction_flagged",
        userId: policy.ownerUserId,
        title: {
            el: "Η αυτόματη ανάγνωση χρειάζεται έλεγχο",
            en: "The automatic read needs review",
        },
        message: {
            el: `${flaggerName || "Ο σύμβουλός σας"} επισήμανε ότι η αυτόματη ανάγνωση του ασφαλιστηρίου ${policy.policyNumber} χρειάζεται έλεγχο${trimmedReason ? `: ${trimmedReason}` : "."}`,
            en: `${flaggerName || "Your advisor"} flagged the automatic read of policy ${policy.policyNumber} as needing review${trimmedReason ? `: ${trimmedReason}` : "."}`,
        },
        relatedObjectType: "policy",
        relatedObjectId: policyId,
    })

    // ...and the triage row, addressed to the person who raised it. This is what
    // the admin flag queue reads, so its «who flagged this» column keeps meaning
    // the flagger rather than the customer.
    await emit({
        event: "extraction_flag_raised",
        userId: dbUser.id,
        title: {
            el: "Επισημάνθηκε εξαγωγή AI",
            en: "AI extraction flagged",
        },
        message: {
            el: `Ασφαλιστήριο ${policy.policyNumber}: ${trimmedReason || "επισημάνθηκε ως λανθασμένο"}`,
            en: `Policy ${policy.policyNumber}: ${trimmedReason || "flagged as incorrect"}`,
        },
        relatedObjectType: "policy",
        relatedObjectId: policyId,
    })

    revalidatePath("/wallet")
    revalidatePath(`/wallet/${policyId}`)
    revalidatePath(`/customers/${policy.ownerUserId}/policy/${policyId}`)
    return { success: true }
}

/**
 * Owner asks for a renewal quote on a policy: records the request
 * (notification + activity trail) and notifies the connected agent when a
 * relationship exists. No quote is generated — this hands the request to
 * a human, it does not promise terms.
 */
export async function requestRenewalQuote(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }
    const dbUser = authResult.dbUser

    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
    })
    if (!policy) return { error: "Not found" }

    const relationship = await db.customerRelationship.findFirst({
        where: { policyholderUserId: dbUser.id, status: "active" },
        select: { agentUserId: true },
    })

    const policyRef = policy.policyNumber || policy.insurerName || policyId

    try {
        const writes: any[] = [
            (db as any).activityLog.create({
                data: {
                    adminUserId: dbUser.id,
                    adminEmail: dbUser.email || "unknown",
                    actionType: "RENEWAL_QUOTE_REQUESTED",
                    description: `Requested renewal quote for policy ${policyRef}`,
                    metadata: {
                        policyId,
                        lineOfBusiness: policy.lineOfBusiness,
                        endDate: policy.endDate?.toISOString() ?? null,
                        agentNotified: Boolean(relationship),
                    },
                },
            }),
        ]
        await db.$transaction(writes)
    } catch (e: any) {
        logger('error', 'Renewal quote request failed', { policyId, error: e.message })
        return { error: "Request failed" }
    }

    // Both notifications AFTER the commit. The advisor's copy used to sit inside
    // the transaction array, which meant a quote request could only ever reach
    // the advisor through the bell — never email, never push — on an event whose
    // whole value is that a human sees it quickly.
    await emit({
        event: "renewal_quote_requested",
        userId: dbUser.id,
        title: {
            el: "Ζητήθηκε προσφορά ανανέωσης",
            en: "Renewal quote requested",
        },
        message: {
            el: `Ασφαλιστήριο ${policyRef}: ζητήθηκε προσφορά ανανέωσης`,
            en: `Policy ${policyRef}: renewal quote requested`,
        },
        relatedObjectType: "policy",
        relatedObjectId: policyId,
    })

    if (relationship) {
        await emit({
            event: "renewal_quote_requested",
            userId: relationship.agentUserId,
            title: {
                el: "Πελάτης ζήτησε προσφορά ανανέωσης",
                en: "Client requested a renewal quote",
            },
            message: {
                el: `${displayPersonName(dbUser.name) || dbUser.email || "Ένας πελάτης"} ζήτησε προσφορά ανανέωσης για το ασφαλιστήριο ${policyRef}`,
                en: `${displayPersonName(dbUser.name) || dbUser.email || "A client"} requested a renewal quote for policy ${policyRef}`,
            },
            relatedObjectType: "policy",
            relatedObjectId: policyId,
        })
    }

    revalidatePath(`/wallet/${policyId}`)
    return { success: true, agentNotified: Boolean(relationship) }
}

export async function retryPolicyAnalysis(policyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id || !user.email) return { error: "Unauthorized" }

    const dbUser = await db.user.findUnique({ where: { email: normalizeEmail(user.email) }, select: { id: true, roles: true, preferredLanguage: true } })
    if (!dbUser) return { error: "User not found" }

    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
        include: { documents: true },
    })

    if (!policy) return { error: "Policy not found" }
    if (policy.documents.length === 0) return { error: "No documents to analyze" }

    // Same manual-trigger gate as runPolicyAnalysis — without it, this retry
    // was a free re-analysis loophole for agent-role users (the orchestrator
    // skips the b2c pro gate for agent initiators).
    const { canAgentTriggerManualAnalysis } = await import("@/lib/subscription-entitlements")
    const manualGate = await canAgentTriggerManualAnalysis(dbUser.id, dbUser.roles)
    if (!manualGate.allowed) {
        return { error: manualGate.code }
    }

    // Reset policy status to analyzing
    await db.policy.update({
        where: { id: policyId },
        data: { status: 'analyzing' }
    })
    await db.policyDocument.updateMany({
        where: { policyId },
        data: { processingStatus: 'processing' }
    })

    const policyService = new PolicyService()
    const language = resolveUserLanguage(dbUser.preferredLanguage)

    after(async () => {
        try {
            await policyService.runBackgroundAnalysis(policyId, dbUser.id, language)
        } catch (e) {
            logger('error', 'Retry analysis failed', { policyId, error: e })
        }
    })

    revalidatePath("/wallet")
    return { success: true }
}

export async function updatePolicy(policyId: string, formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    try {
        const rawData = {
            insurerName: formData.get("insurerName"),
            policyNumber: formData.get("policyNumber"),
            lineOfBusiness: formData.get("lineOfBusiness"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            premiumAmount: formData.get("premiumAmount"),
            coverageSummary: formData.get("coverageSummary"),
        }

        const data: any = {}
        if (rawData.insurerName) data.insurerName = rawData.insurerName
        if (rawData.policyNumber) data.policyNumber = rawData.policyNumber
        if (rawData.lineOfBusiness) data.lineOfBusiness = rawData.lineOfBusiness
        if (rawData.startDate) data.startDate = rawData.startDate
        if (rawData.endDate) data.endDate = rawData.endDate
        if (rawData.premiumAmount) data.premiumAmount = Number(rawData.premiumAmount)
        if (rawData.coverageSummary) data.coverageSummary = rawData.coverageSummary

        const policyService = new PolicyService()
        const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)

        const updated = await policyService.update(policyId, authResult.dbUser.id, data, language)

        // Notify the OWNER, who is not necessarily the editor: a managing agent
        // can update a policy, and a change to cover, dates or premium made by
        // someone else is something the owner should hear about rather than
        // discover. Skipped when the owner is the one who just made the edit —
        // telling someone what they did ten seconds ago is noise.
        // ...and tell the ADVISORS who hold a grant over it. Their book changed
        // under them: the cover, dates or premium they are working from are no
        // longer the ones on screen, and `policy_updated` reached only the owner
        // (PW-BRIDGE-01 I-22). The actor is excluded either way.
        try {
            const { getPolicyGranteeUserIds } = await import("@/lib/agent-visibility")
            const grantees = await getPolicyGranteeUserIds(policyId, authResult.dbUser.id)
            if (grantees.length > 0) {
                const actorName = displayPersonName(authResult.dbUser.name)
                const label = policyLabel({
                    insurerName: (data as { insurerName?: string }).insurerName ?? null,
                    policyNumber: (data as { policyNumber?: string }).policyNumber ?? null,
                })
                await emitToMany(grantees, {
                    event: "policy_updated",
                    title: {
                        el: "Ένα κοινοποιημένο ασφαλιστήριο ενημερώθηκε",
                        en: "A shared policy was updated",
                    },
                    message: {
                        el: `${actorName || "Ο πελάτης"} άλλαξε τα στοιχεία${label ? ` του ασφαλιστηρίου ${label}` : " ενός ασφαλιστηρίου"} που βλέπετε.`,
                        en: `${actorName || "The client"} changed the details${label ? ` on policy ${label}` : " on a policy"} you can see.`,
                    },
                    relatedObjectType: "policy",
                    relatedObjectId: policyId,
                })
            }
        } catch (e: any) {
            logger('error', 'Policy-updated notification to grantees failed', { policyId, error: e?.message })
        }

        const ownerUserId = (updated as { ownerUserId?: string } | null)?.ownerUserId
        if (ownerUserId && ownerUserId !== authResult.dbUser.id) {
            await emit({
                event: "policy_updated",
                userId: ownerUserId,
                title: {
                    el: "Ένα ασφαλιστήριό σας ενημερώθηκε",
                    en: "One of your policies was updated",
                },
                message: {
                    el: `${displayPersonName(authResult.dbUser.name) || "Ο σύμβουλός σας"} ενημέρωσε τα στοιχεία αυτού του ασφαλιστηρίου.`,
                    en: `${displayPersonName(authResult.dbUser.name) || "Your advisor"} updated the details on this policy.`,
                },
                relatedObjectType: "policy",
                relatedObjectId: policyId,
            })
        }

        revalidatePath("/wallet")
        revalidatePath(`/wallet/${policyId}`)
        return { success: true }
    } catch (e: any) {
        logger('error', 'Update policy failed', { policyId, error: e.message })
        return { error: e.message || "Update failed" }
    }
}

export async function uploadPolicyDocument(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { error: "Unauthorized" }
    }

    const userId = authResult.dbUser.id
    const canAdd = await canUserAddPolicy(userId)
    if (!canAdd.allowed) {
        await recordConversionEvent(userId, "limit_hit", { kind: "policy", source: "upload_document" })
        return { error: "POLICY_LIMIT_REACHED" }
    }
    const file = formData.get("file") as File

    if (!file) {
        return { error: "No file uploaded" }
    }

    try {
        const policyService = new PolicyService()
        const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)

        // 1. Initiate upload (Creates 'analyzing' record)
        const result = await policyService.uploadAndParse(userId, file, language)

        // 2. Trigger background analysis (Survives route changes)
        after(async () => {
            try {
                await policyService.runBackgroundAnalysis(result.policyId, userId, language)
            } catch (e) {
                logger('error', 'Deferred analysis failed', { policyId: result.policyId, error: e })
            }
        })

        revalidatePath("/wallet")
        return { success: true, policyId: result.policyId }
    } catch (e: any) {
        logger('error', 'Policy upload action failed', { userId, error: e.message })
        return { error: e.message || "Upload failed" }
    }
}

/**
 * «Προσθήκη ανανεωτηρίου» — attach a renewal to an EXISTING policy.
 *
 * A Greek policy is a chain, not a document. The πρωτασφαλιστήριο carries the
 * full terms; each later year issues an ανανεωτήριο that changes a few things
 * and is silent about the rest. Uploading that renewal as a NEW policy is what
 * users did before this action existed, and it split one contract into two
 * records neither of which was complete.
 *
 * This is deliberately not a new pipeline. It is the ordinary upload path with
 * the policy named up front, so storage, extraction, the atomic-discard rules
 * and the quota gate all behave identically — the only difference is where the
 * document lands and that it is marked `renewal_notice`.
 *
 * Authorization goes through getPolicyAccess like every other caller-named
 * policy operation: attaching a renewal writes to someone's policy, so it
 * needs `canAnalyze`, not mere readability.
 */
export async function addRenewalDocument(policyId: string, formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { error: "Unauthorized" }
    }

    const userId = authResult.dbUser.id

    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: userId,
        roles: authResult.dbUser.roles,
    })
    // 404 rather than 403: a policy you may not touch should not be
    // distinguishable from one that does not exist.
    if (!access.exists || !access.canAnalyze) {
        return { error: "NOT_FOUND" }
    }

    const file = formData.get("file") as File
    if (!file) {
        return { error: "No file uploaded" }
    }

    try {
        const policyService = new PolicyService()
        const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)

        const result = await policyService.attachRenewalDocument(policyId, userId, file, language)

        after(async () => {
            try {
                // Re-analysis runs over the MERGED view: base terms from the
                // original, overridden only where the renewal speaks.
                await policyService.runBackgroundAnalysis(policyId, userId, language)
            } catch (e) {
                logger("error", "Deferred renewal analysis failed", { policyId, error: e })
            } finally {
                // Revalidate AGAIN, here, once the run has actually moved the
                // dates. The pair below runs while `after()` is still queued —
                // by construction it can only ever flush the pre-renewal state.
                // Without this second pass nothing invalidates when the work
                // lands, which is why the page kept its stale expiry verdict
                // until the reader refreshed by hand. `finally`, not the try:
                // a failed run also changes what the page should say.
                revalidatePath("/wallet")
                revalidatePath(`/wallet/${policyId}`)
            }
        })

        // The first pass publishes the `analyzing` state that
        // attachRenewalDocument just wrote — so the page immediately stops
        // asserting a verdict it can no longer support.
        revalidatePath("/wallet")
        revalidatePath(`/wallet/${policyId}`)
        return { success: true, policyId, documentId: result.documentId }
    } catch (e: any) {
        logger("error", "Renewal upload action failed", { userId, policyId, error: e.message })
        return { error: e.message || "Upload failed" }
    }
}

export async function getInsurers() {
    // Explicit select: the enriched reference row (contacts, address, notes)
    // must not ship to the client for a dropdown that only needs the name.
    return db.insurer.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })
}

/**
 * The vocabulary behind the add/edit/review policy-type dropdown.
 *
 * Derived from the taxonomy's `writeEnabled` flag rather than hand-listed. The
 * previous static list shadowed the `InsuranceType` table that `prisma/seed.ts`
 * already generates from the very same flag, and it had fallen four branches
 * behind: a user could have a `pension` or `boat` policy created by extraction
 * and then be unable to keep that type when editing it.
 *
 * `id` keeps returning the slug so existing callers, which compare against
 * `Policy.lineOfBusiness`, are unaffected.
 */
export async function getInsuranceTypes() {
    return INSURANCE_BRANCHES
        .filter((branch) => branch.writeEnabled)
        .map((branch) => ({
            id: branch.id,
            slug: branch.id,
            name: branch.label.en,
            isActive: true,
        }))
}

export async function sharePolicy(policyId: string, agentEmail: string, permissions: 'view' | 'edit' = 'view') {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Ownership gate: only the policy owner may share it. Runs before the agent
    // lookup so a non-owner cannot trigger invite creation, access grants or emails.
    const ownedPolicy = await db.policy.findUnique({
        where: { id: policyId },
        select: { ownerUserId: true },
    })
    if (!ownedPolicy) return { error: "Policy not found" }
    if (ownedPolicy.ownerUserId !== authResult.dbUser.id) {
        return { error: "You do not have permission to share this policy" }
    }

    // 1. Find the agent
    const agent = await db.user.findUnique({
        where: { email: normalizeEmail(agentEmail) },
        // id for the grant and the relationship, name/email for the notice (A-01b).
        select: { id: true, name: true, email: true },
    })

    if (!agent) {
        // Create Invite for non-existing user
        const invite = await db.invite.create({
            data: {
                inviterUserId: authResult.dbUser.id,
                inviteeEmail: agentEmail,
                token: crypto.randomUUID(),
                inviteType: 'share',
                relationshipType: 'client_agent',
                scope: `policy:${policyId}`,
                requestedPermissions: permissions,
                expiresAt: daysFromNow(POLICY_SHARE_EXPIRY_DAYS)
            }
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const link = `${baseUrl}/invite/${invite.token}`

        // Delivery state must reach the caller — sendEmail returns
        // {success:false} instead of throwing, so a bare try/catch reported
        // "sent" while the invitee never got the link.
        let emailDelivered = false
        try {
            const emailResult = await sendPolicyInviteEmail({
                to: agentEmail,
                token: invite.token,
                inviterName: displayPersonName(authResult.dbUser.name) || authResult.dbUser.email,
                language: resolveUserLanguage(authResult.dbUser.preferredLanguage),
            })
            emailDelivered = emailResult.success
            if (!emailDelivered) {
                logger('warn', 'Policy invite email not delivered', { policyId, agentEmail })
            }
        } catch (error) {
            logger('warn', 'Failed to send policy invite email', {
                policyId,
                agentEmail,
                error: error instanceof Error ? error.message : String(error),
            })
        }

        // Log interaction
        await (db as any).activityLog.create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "POLICY_SHARE_INVITE",
                description: `Invited ${agentEmail} to share policy ${policyId} with ${permissions} access`,
                metadata: { policyId, agentEmail, permissions }
            }
        })

        revalidatePath(`/wallet/${policyId}`)
        return { success: true, emailDelivered, link }
    }

    // Optional: Verify role
    // if (!agent.roles.includes('agent')) return { error: "This user is not an agent." }

    // 2 + 3. The GRANT and the RELATIONSHIP in ONE transaction.
    //
    // They were two separate awaits, and the half-state between them is not
    // harmless: `computePolicyAccess` derives read/write/delete from an
    // AccessGrant's level ALONE and never re-checks the relationship (see
    // CLAUDE.md), so a grant that committed while the relationship create failed
    // leaves an advisor holding real access that no relationship explains — and
    // that no termination path would find, because every one of them works from
    // the relationship. Half of a share is not a smaller share; it is an
    // unexplained one (PW-BRIDGE-01 I-03).
    const existingRel = await db.customerRelationship.findUnique({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id
            }
        }
    })

    const createdRel = await db.$transaction(async (tx) => {
        await tx.accessGrant.create({
            data: {
                granterUserId: authResult.dbUser.id,
                granteeUserId: agent.id,
                scope: `policy:${policyId}`,
                permissions: permissions,
                status: "active"
            }
        })
        if (existingRel) return null
        // Auto-activated: the customer initiated the share, which is the consent.
        return tx.customerRelationship.create({
            data: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id,
                status: "active",
                activationStatus: "active"
            }
        })
    })

    let relationshipId = existingRel?.id || createdRel?.id || null
    if (createdRel) {

        const { publishAdvisorLinked } = await import("@/lib/events/publishers")
        await publishAdvisorLinked({
            relationshipId: createdRel.id,
            customerUserId: authResult.dbUser.id,
            advisorUserId: agent.id,
            actor: { type: "customer", id: authResult.dbUser.id },
        })

        // A relationship becoming active is the moment another person gains
        // sight of this customer's policies. They are entitled to know it
        // happened, so this is transactional and audit-logged — both sides get
        // it, each in their own language.
        await emit({
            event: "advisor_assigned",
            userId: authResult.dbUser.id,
            title: { el: "Συνδεθήκατε με σύμβουλο", en: "You are connected to an advisor" },
            message: {
                el: `${displayPersonName(agent.name) || agent.email || "Ο σύμβουλός σας"} μπορεί πλέον να συνεργάζεται μαζί σας. Μπορείτε να ανακαλέσετε την πρόσβαση οποτεδήποτε.`,
                en: `${displayPersonName(agent.name) || agent.email || "Your advisor"} can now work with you. You can revoke this at any time.`,
            },
            dedupeKey: `advisor_assigned:${createdRel.id}`,
        })
        await emit({
            event: "advisor_assigned",
            userId: agent.id,
            title: { el: "Νέος πελάτης συνδέθηκε", en: "A new client connected" },
            message: {
                el: `${displayPersonName(authResult.dbUser.name) || "Ένας πελάτης"} συνδέθηκε μαζί σας.`,
                en: `${displayPersonName(authResult.dbUser.name) || "A client"} is now connected to you.`,
            },
            relatedObjectType: "customer",
            relatedObjectId: authResult.dbUser.id,
            dedupeKey: `advisor_assigned_agent:${createdRel.id}`,
        })
    }

    if (relationshipId) {
        await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
            relationshipId,
            policyId,
            category: "general",
            priority: "medium",
            subject: "Policy shared",
            initialMessage: `${authResult.dbUser.name || "Policyholder"} shared this policy and started collaboration.`,
        })
    }

    // 4. Get policy details for notification
    const policy = await db.policy.findUnique({
        where: { id: policyId },
        select: { policyNumber: true, insurerName: true, lineOfBusiness: true }
    })

    // 5. Notify the agent, in their own language. The branch label is resolved
    // per language too — this used to interpolate `.label.en` into a message a
    // Greek advisor would read.
    const branch = policy?.lineOfBusiness ? normalizeBranch(policy.lineOfBusiness) : null
    const sharer = authResult.dbUser.name
    await emit({
        event: 'policy_shared',
        userId: agent.id,
        title: {
            el: 'Νέο ασφαλιστήριο κοινοποιήθηκε μαζί σας',
            en: 'New Policy Shared With You',
        },
        message: {
            el: `${sharer || 'Ένας πελάτης'} κοινοποίησε το ασφαλιστήριό του ${branch ? branch.label.el : 'ασφάλισης'} (${policy?.insurerName}) μαζί σας με δικαιώματα ${permissions}.`,
            en: `${sharer || 'A customer'} has shared their ${branch ? branch.label.en : 'insurance'} policy (${policy?.insurerName}) with you with ${permissions} access.`,
        },
        relatedObjectType: 'policy',
        relatedObjectId: policyId,
    })

    try {
        const sharedPolicy = await db.policy.findUnique({
            where: { id: policyId },
            select: { policyNumber: true },
        })
        await sendPolicySharedAccessEmail({
            to: agentEmail,
            inviterName: displayPersonName(authResult.dbUser.name) || authResult.dbUser.email,
            policyNumber: sharedPolicy?.policyNumber,
            language: resolveUserLanguage(authResult.dbUser.preferredLanguage),
        })
    } catch (error) {
        logger('warn', 'Failed to send shared policy access email', {
            policyId,
            agentEmail,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    // 6. Log
    await (db as any).activityLog.create({
        data: {
            adminUserId: authResult.dbUser.id,
            adminEmail: authResult.dbUser.email || "unknown",
            actionType: "POLICY_SHARED",
            description: `Shared policy ${policyId} with ${agentEmail} (${permissions})`,
            metadata: { policyId, agentEmail, permissions }
        }
    })

    revalidatePath(`/wallet/${policyId}`)
    return { success: true }
}

export async function getPolicyShares(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    // Get grants where scope includes this policy
    const grants = await db.accessGrant.findMany({
        where: {
            granterUserId: authResult.dbUser.id,
            scope: `policy:${policyId}`,
            status: 'active'
        },
        include: {
            grantee: {
                select: { email: true, name: true, image: true }
            }
        }
    })

    return grants.map(g => ({
        id: g.id,
        email: g.grantee.email,
        name: g.grantee.name,
        image: g.grantee.image,
        grantedAt: g.grantedAt,
        permissions: g.permissions as 'view' | 'edit' | 'manage'
    }))
}

export async function revokeShare(grantId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const grant = await db.accessGrant.update({
        where: { id: grantId, granterUserId: authResult.dbUser.id },
        data: { status: 'revoked', revokedAt: new Date() },
        select: { granteeUserId: true, scope: true },
    })

    // The grantee loses sight of the policy this instant. Until now nothing
    // said so: it simply stopped appearing in their book, which is
    // indistinguishable from a bug (PW-BRIDGE-01 I-04). Best-effort — the
    // revocation has already committed and is the part that matters.
    try {
        const policyId = grant.scope?.startsWith("policy:") ? grant.scope.slice("policy:".length) : null
        const policy = policyId
            ? await db.policy.findUnique({ where: { id: policyId }, select: { policyNumber: true, insurerName: true } })
            : null
        const granterName = displayPersonName(authResult.dbUser.name)
        const label = policy ? policyLabel(policy) : null
        await emit({
            event: "policy_share_revoked",
            userId: grant.granteeUserId,
            title: {
                el: "Η πρόσβαση σε ένα ασφαλιστήριο ανακλήθηκε",
                en: "Access to a policy was withdrawn",
            },
            message: {
                el: `${granterName || "Ο πελάτης"} ανακάλεσε την πρόσβασή σας${label ? ` στο ασφαλιστήριο ${label}` : ""}.`,
                en: `${granterName || "The client"} withdrew your access${label ? ` to policy ${label}` : ""}.`,
            },
            ...(policyId ? { relatedObjectType: "policy" as const, relatedObjectId: policyId } : {}),
            dedupeKey: `policy_share_revoked:${grantId}`,
        })
    } catch (e: any) {
        logger('error', 'Share-revoked notification failed', { grantId, error: e?.message })
    }

    revalidatePath("/wallet")
    // The agent's own list is cached separately; without this their book can
    // still show a policy they can no longer open until their next render.
    revalidatePath("/customers")
    return { success: true }
}

function parseAnalysisDate(d: string | undefined): Date | undefined {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
}

// NOTE: analyzeGaps() lived here until Aug 2026 — a server action wired to a
// third gap pipeline (GapAnalysisService.analyzePolicy) that no component ever
// imported. Both are gone; the orchestrator is the one path, and detection is
// decided by lib/gap-detection.ts rather than by a model.
export async function deletePolicy(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })

    // Who can currently see this policy, read BEFORE anything is deleted — the
    // grants go with the row, so after the delete there is nobody left to tell.
    const granteesBeforeDelete = await (async () => {
        try {
            const { getPolicyGranteeUserIds } = await import("@/lib/agent-visibility")
            return await getPolicyGranteeUserIds(policyId, authResult.dbUser.id)
        } catch {
            return [] as string[]
        }
    })()

    // Case 1: Owner or managing agent (active "manage" grant) - Full Delete.
    // The owner controls this capability: revoking the manage grant removes it.
    if (access.canDelete) {
        // 1. Delete physical files
        for (const doc of policy.documents) {
            await deleteFile(doc.fileUrl)
        }

        // 2. Clean up related data that might not cascade
        // Opportunities refer to policy
        await db.opportunity.deleteMany({
            where: { policyId: policy.id }
        })

        // 3. Delete Policy (Cascades to PolicyDocuments, GapInstances)
        await db.policy.delete({
            where: { id: policy.id }
        })

        // Log
        try {
            await (db as any).activityLog.create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_DELETED",
                    description: `Deleted policy ${policy.policyNumber}`,
                    metadata: { policyId, insurer: policy.insurerName }
                }
            })
        } catch (e) { /* ignore */ }

        // Publish the FACT. The notification and the risk recomputation are
        // consequences the decision engine decides — dual-written alongside the
        // direct calls below during the migration.
        const { publishPolicyDeleted } = await import("@/lib/events/publishers")
        await publishPolicyDeleted({
            policyId,
            ownerUserId: policy.ownerUserId,
            actor: {
                type: policy.ownerUserId === authResult.dbUser.id ? "customer" : "advisor",
                id: authResult.dbUser.id,
            },
            insurerName: policy.insurerName,
            policyNumber: policy.policyNumber,
        })

        // Tell the ADVISORS who could see it, too. Deleting a policy removes it
        // from their book with no explanation otherwise, which is the same
        // silence a revoked share used to leave (PW-BRIDGE-01 I-22). Collected
        // before the row is gone; the actor is excluded.
        try {
            if (granteesBeforeDelete.length > 0) {
                const actorName = displayPersonName(authResult.dbUser.name)
                await emitToMany(granteesBeforeDelete, {
                    event: "policy_removed",
                    title: {
                        el: "Ένα κοινοποιημένο ασφαλιστήριο διαγράφηκε",
                        en: "A shared policy was removed",
                    },
                    message: {
                        el: `${actorName || "Ο πελάτης"} διέγραψε το ασφαλιστήριο ${policyLabel(policy)}. Δεν εμφανίζεται πλέον στον κατάλογό σας.`,
                        en: `${actorName || "The client"} deleted policy ${policyLabel(policy)}. It no longer appears in your book.`,
                    },
                    dedupeKey: `policy_removed:${policyId}`,
                })
            }
        } catch (e: any) {
            logger('error', 'Policy-removed notification to grantees failed', { policyId, error: e?.message })
        }

        // Tell the owner their policy is gone — HIGH, and emailed, because it
        // is destructive and may not have been them: a managing agent with a
        // "manage" grant can reach this branch. This is the notification that
        // lets someone notice.
        await emit({
            event: "policy_removed",
            userId: policy.ownerUserId,
            title: {
                el: "Ένα ασφαλιστήριο διαγράφηκε",
                en: "A policy was removed",
            },
            message: {
                el: `Το ασφαλιστήριο ${policy.policyNumber} (${policy.insurerName}) διαγράφηκε από το wallet σας.`,
                en: `Policy ${policy.policyNumber} (${policy.insurerName}) was removed from your wallet.`,
            },
            // No relatedObject: the policy no longer exists, and a link to a
            // deleted record is a 404 at the worst possible moment.
            dedupeKey: `policy_removed:${policyId}`,
        })

        // A deleted policy's own gaps cascade away, but the OWNER's portfolio
        // gaps and score do not: delete one of two motor policies and the
        // `duplicate_coverage` gap on the survivor should clear, and the score
        // reflects one fewer line of cover. Recompute for the owner (best-effort;
        // the delete already committed).
        refreshProtectionScore(policy.ownerUserId).catch((err) => {
            logger('warn', 'Failed to refresh protection score after policy delete', {
                policyId, error: err instanceof Error ? err.message : String(err),
            })
        })

        revalidatePath("/wallet")
        revalidatePath("/protection")
        revalidatePath("/dashboard")
        return { success: true }
    }

    // Case 2: Not Owner - Remove Access
    // Check for AccessGrant where I am the grantee
    const grant = await db.accessGrant.findFirst({
        where: {
            granteeUserId: authResult.dbUser.id,
            scope: `policy:${policyId}`,
            status: 'active'
        }
    })

    if (grant) {
        // Revoke/Delete the grant
        await db.accessGrant.update({
            where: { id: grant.id },
            data: { status: 'revoked', revokedAt: new Date() }
        })

        revalidatePath("/wallet")
        return { success: true, message: "Policy removed from your shared wallet" }
    }

    return { error: "You are not authorized to delete this policy" }
}

export async function getAIUsageStats() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { count: 0, limit: 10, remaining: 10, creditBalance: 0 }
    }

    // The reader's month, not the server's — see startOfAthensMonth.
    const startOfMonth = startOfAthensMonth(new Date())
    const entitlements = await resolveUserEntitlements(authResult.dbUser.id)

    const [count, latestCreditTransaction] = await Promise.all([
        (db as any).activityLog.count({
            where: {
                adminUserId: authResult.dbUser.id,
                actionType: "POLICY_ANALYZED",
                timestamp: { gte: startOfMonth }
            }
        }),
        db.creditTransaction.findFirst({
            where: { userId: authResult.dbUser.id },
            orderBy: { createdAt: "desc" },
            select: { balanceAfter: true }
        })
    ])

    const limit = entitlements.limits.aiAnalysisPerMonth
    const remaining = limit === null ? null : Math.max(limit - count, 0)
    const creditBalance = latestCreditTransaction?.balanceAfter ?? 0

    return { count, limit, remaining, creditBalance }
}

/**
 * Ask a question about a policy document using AI
 * Uses Gemini 2.0 Flash for intelligent Q&A
 */
export async function askPolicyQuestion(policyId: string, question: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // Validate question
    if (!question || question.trim().length < 3) {
        return { error: "Please enter a valid question" }
    }

    // Zero-cost guardrail: length cap + prompt-injection scoring BEFORE any
    // billable AI call. A blocked question never reaches a provider. High-
    // confidence injections get an auditable row (metadata only — no raw text,
    // no email, GDPR M3) that the /admin/ai dashboard counts as attack pressure.
    const guard = guardUserText(question, { maxChars: 2000, field: "question" })
    if (!guard.ok) {
        if (guard.code === "INPUT_REJECTED") {
            try {
                await db.activityLog.create({
                    data: {
                        adminUserId: authResult.dbUser.id,
                        adminEmail: "",
                        actionType: "AI_INPUT_REJECTED",
                        description: `Blocked Q&A input on policy ${policyId}`,
                        metadata: { surface: "policy_qa", patternIds: guard.flags, score: guard.score },
                    },
                })
            } catch { /* never fail the request on a logging error */ }
            return { error: "INPUT_REJECTED" }
        }
        return { error: "QUESTION_TOO_LONG" }
    }
    // The sanitized question (control/zero-width/bidi stripped) is what reaches
    // the model and the audit metadata from here on.
    const safeQuestion = guard.sanitized

    // Fetch policy with documents and ACORD data for Q&A context
    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    // Check authorization through the central rule. The previous inline check
    // accepted ANY active grant from the owner — so one shared policy opened Q&A
    // (which ships extracted content to an LLM) on ALL of that owner's policies.
    // getPolicyAccess requires a grant scoped to THIS policy (or ownership / an
    // active managing-agent relationship).
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    const isOwner = access.isOwner

    if (!access.canRead) return { error: "Unauthorized" }

    // GDPR Art. 9 gate: Q&A sends extracted policy content to an LLM — the policy
    // OWNER (the data subject) must have granted AI-processing consent.
    const policyOwner = await db.user.findUnique({
        where: { id: policy.ownerUserId },
        select: { aiProcessingConsentVersion: true },
    })
    if (!policyOwner?.aiProcessingConsentVersion) {
        return { error: "AI_CONSENT_REQUIRED" }
    }

    // Check feature access — interactiveQA is paid-only for policyholders;
    // agents on granted policies are metered by their agent-plan budgets.
    // Under the paid-aha-loop tier restructure the deep-AI Q&A is a paid
    // feature with no free allowance, so a free-tier ask is blocked outright.
    const isAllowed = await canUserUseFeature(authResult.dbUser.id, 'interactiveQA')
    if (!isAllowed && !hasAnyRole(authResult.dbUser.roles, ['admin', 'agent'])) {
        await recordConversionEvent(authResult.dbUser.id, "limit_hit", { kind: "ai_question", source: "policy_qa" })
        await recordConversionEvent(authResult.dbUser.id, "free_ai_call_blocked", {
            kind: "ai_question",
            source: "policy_qa",
            feature: "unlimited_ai_questions",
        })
        return { error: "UPGRADE_REQUIRED" }
    }

    // Check Daily Limit
    const { tier } = await getUserSubscription(authResult.dbUser.id)
    const dailyLimit = SUBSCRIPTION_LIMITS[tier].questionsPerDay

    if (dailyLimit !== null && !hasAnyRole(authResult.dbUser.roles, ['admin'])) {
        // The reader's day, not the server's — see startOfAthensDay.
        const today = startOfAthensDay(new Date())

        const count = await (db as any).activityLog.count({
            where: {
                adminUserId: authResult.dbUser.id,
                actionType: "POLICY_QUESTION_ASKED",
                timestamp: { gte: today }
            }
        })

        if (count >= dailyLimit) {
            await recordConversionEvent(authResult.dbUser.id, "limit_hit", { kind: "ai_question", source: "policy_qa_daily" })
            return {
                error: "LIMIT_REACHED"
            }
        }
    }

    const qaTokenGate = await canUserUseTokens(authResult.dbUser.id, 15000)
    if (!qaTokenGate.allowed && !hasAnyRole(authResult.dbUser.roles, ['admin'])) {
        return { error: "TOKEN_LIMIT_BLOCKED" }
    }

    // Abuse/cost backstop for the billable call. The daily tier limit above is a
    // product cap; this is the anti-hammering guard the Q&A path never had. The
    // DB-backed count is instance-independent (prod runs RATELIMIT_ALLOW_LOCAL=1
    // with no Upstash), counting the POLICY_QUESTION_ASKED rows this action
    // writes below. Admins are exempt, matching the gates above.
    if (!hasAnyRole(authResult.dbUser.roles, ['admin'])) {
        const gate = await enforceBillableCallPolicy({
            userId: authResult.dbUser.id,
            actionType: "POLICY_QUESTION_ASKED",
            redisBucket: `policy-qa:${authResult.dbUser.id}`,
            redisLimit: 20,
            redisWindowMs: 60 * 60 * 1000,
            dbLimit: 30,
            dbWindowMs: 60 * 60 * 1000,
        })
        if (!gate.allowed) return { error: "RATE_LIMITED" }
    }

    // Use centralized AI service
    const aiService = getAIService()
    if (!aiService.isAvailable()) {
        return { error: "AI service is not configured" }
    }

    try {
        // Build structuredContext from stored ACORD data so the AI has full
        // policy detail without re-sending the PDF (saves ~50-100K tokens).
        const structuredContext = policy.acordData
            ? {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: policy.lineOfBusiness,
                startDate: policy.startDate.toISOString(),
                endDate: policy.endDate.toISOString(),
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : 0,
                coverageSummary: policy.coverageSummary ?? "",
                acordData: policy.acordData,
              } as import("@/lib/services/ai/ai-service.interface").AIPolicyExtractionResponse
            : undefined

        // Route through the AI gateway: it resolves provider + model + the
        // output-token cap for this call (per-call routing) before dispatching.
        const { aiGateway } = await import("@/lib/services/ai/gateway")
        const answer = await aiGateway.askQuestion(
            {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: policy.lineOfBusiness,
                startDate: policy.startDate,
                endDate: policy.endDate,
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
                coverageSummary: policy.coverageSummary
            },
            safeQuestion,
            {
                userId: authResult.dbUser.id,
                policyId: policy.id,
                userTier: tier,
                structuredContext,
                // Selects a LoB-scoped operator-guidance override when one exists.
                lineOfBusiness: policy.lineOfBusiness,
            }
        )


        // Log the interaction
        try {
            await (db as any).activityLog.create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_QUESTION_ASKED",
                    description: `Asked question about policy ${policy.policyNumber}`,
                    metadata: {
                        policyId,
                        question: safeQuestion.substring(0, 100),
                        answerLength: answer.length
                    }
                }
            })
        } catch (e) { /* ignore logging errors */ }

        logger('info', 'Policy question answered successfully', {
            policyId,
            answerLength: answer.length
        })

        return {
            success: true,
            answer,
            question
        }
    } catch (error) {
        logger('error', 'Failed to answer policy question', {
            policyId,
            error: error instanceof Error ? error.message : String(error)
        })
        return { error: "Failed to process your question. Please try again." }
    }
}

export async function runPolicyAnalysis(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId }
    })

    if (!policy) return { error: "Policy not found" }

    // Central rule: owner, write/manage grant, or relationship-connected
    // agent may spend analysis resources; pure read grants may not.
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    if (!access.canAnalyze) return { error: "Unauthorized" }

    const language = resolveUserLanguage(authResult.dbUser.preferredLanguage)

    // MANUAL re-analysis is a paid-plan feature for agent-role users
    // (upload-time auto-analysis is a different path); the shared gate also
    // enforces the per-plan monthly analysis cap.
    const { canAgentTriggerManualAnalysis } = await import("@/lib/subscription-entitlements")
    const manualGate = await canAgentTriggerManualAnalysis(authResult.dbUser.id, authResult.dbUser.roles)
    if (!manualGate.allowed) {
        if (manualGate.code === "AGENT_UPGRADE_REQUIRED") {
            return { error: "AGENT_UPGRADE_REQUIRED" }
        }
        return {
            error: language === "el"
                ? `Φτάσατε το μηνιαίο όριο αναλύσεων (${manualGate.used}/${manualGate.limit}). Αναβαθμίστε το πλάνο σας.`
                : `Monthly analysis limit reached (${manualGate.used}/${manualGate.limit}). Upgrade your plan.`,
        }
    }

    try {
        const orchestrator = new PolicyAnalysisOrchestratorService()
        const run = await orchestrator.createRun(policyId, authResult.dbUser.id)

        if (run.status === "blocked") {
            return { error: run.failureCode || "TOKEN_LIMIT_BLOCKED", runId: run.id }
        }

        // Hand execution to the durable queue when configured; otherwise run
        // inline via after() (dev / no-QStash) — identical behavior.
        const queued = await enqueueAnalysisRun(run.id, language)
        if (!queued) {
            after(async () => {
                try {
                    await orchestrator.executeRun(run.id, language)
                } catch (e) {
                    logger('error', 'Deferred manual policy analysis failed', { policyId, runId: run.id, error: e })
                }
            })
        }

        revalidatePath(`/wallet`)
        revalidatePath(`/wallet/${policyId}`)
        return { success: true, message: "Analysis started", runId: run.id }
    } catch (e: any) {
        logger('error', 'Manual policy analysis failed', { policyId, error: e.message })
        return { error: e.message || "Analysis failed" }
    }
}

export async function ignoreGap(gapId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const gap = await readGapRow({
        where: { id: gapId },
        include: { policy: true }
    })
    if (!gap || !gap.policy) return { error: "Gap not found" }

    // Dismissing a gap MUTATES the owner's coverage picture and moves their
    // protection score, so it is a WRITE. This checked only that a grant existed,
    // ignoring its permission level — a view-only agent could dismiss a customer's
    // coverage gap. Gate on canWrite, like every other policy write (updatePolicy,
    // confirmPolicyReview, deletePolicy). Owner still passes (canWrite true).
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(gap.policy.id, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    if (!access.canWrite) return { error: "Unauthorized" }

    await db.gapInstance.update({
        where: { id: gapId },
        data: { status: 'ignored' }
    })

    // M7: Bust protection score cache so the dashboard reflects the dismissal immediately
    refreshProtectionScore(gap.policy.ownerUserId).catch((err) => {
        logger('warn', 'Failed to refresh protection score after gap dismissal', {
            gapId,
            error: err instanceof Error ? err.message : String(err),
        })
    })

    revalidatePath("/wallet")
    return { success: true }
}

/**
 * Advisor confirms an AI-detected gap (MEDIC blueprint §C evidence ladder:
 * probable → confirmed). Agent-only — the ladder's meaning IS "an advisor
 * agrees", so the owner cannot self-confirm — and forward-only: confirmation
 * never regresses to probable, and `validated` (documented recommendation)
 * belongs to the cross-sell gate, not this action.
 */
export async function confirmGap(gapId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const { isAgentRole } = await import("@/lib/auth/require-agent")
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "Unauthorized" }

    const gap = await readGapRow({
        where: { id: gapId },
        include: { policy: true },
    })
    if (!gap || !gap.policy) return { error: "Gap not found" }

    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(gap.policy.id, {
        id: authResult.dbUser.id,
        roles: authResult.dbUser.roles,
    })
    if (!access.canWrite) return { error: "Unauthorized" }

    // Forward-only: probable → confirmed. Already confirmed/validated is a no-op
    // success so a double-click never errors or regresses the ladder.
    if (gap.validationState === 'probable') {
        await db.gapInstance.update({
            where: { id: gapId },
            data: { validationState: 'confirmed' },
        })

        // Keep linked opportunities' medic mirror + score in step with the
        // ladder — otherwise the scorecard keeps showing "probable" pain and a
        // stale score after the advisor confirmed.
        const { advancePainValidation } = await import("@/lib/medic/seed")
        const { casUpdateOpportunityMedic, medicIoFor } = await import("@/lib/medic/cas")
        const linkedOpps = await db.opportunity.findMany({
            where: { gapInstanceId: gapId },
            select: { id: true },
        })
        for (const opp of linkedOpps) {
            // CAS: never overwrite a concurrent € patch / suggestion apply
            // wholesale; advancePainValidation returning null = noop.
            await casUpdateOpportunityMedic(medicIoFor(db), opp.id, (medic) =>
                advancePainValidation(medic, gapId, 'confirmed')
            )
        }
    }

    revalidatePath(`/customers/${gap.policy.ownerUserId}/policy/${gap.policy.id}`)
    revalidatePath(`/wallet/${gap.policy.id}`)
    return { success: true, validationState: 'confirmed' as const }
}

export async function notifyAgentAboutGap(gapId: string, policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // OWNER-ONLY. This action means "I, the policyholder, want to ask my agent
    // about this gap": below, the relationship is looked up with the CALLER as
    // the policyholder. The previous ownership-OR-grant check let a non-owner
    // (an agent with a grant) through — but for them that lookup finds THEIR own
    // agent relationship, not the customer's, so the opportunity would be minted
    // in the wrong relationship, cross-linking this owner's gap. It only makes
    // sense for the owner, like updateGapStatus.
    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return { error: "Policy not found" }
    if (policy.ownerUserId !== authResult.dbUser.id) return { error: "Unauthorized" }

    // Agent collaboration (incl. gap escalation) is a paid-plan feature.
    const notifierEntitlements = await resolveUserEntitlements(authResult.dbUser.id)
    if (!notifierEntitlements.limits.agentCollaboration && !hasAnyRole(authResult.dbUser.roles, ['admin'])) {
        return { error: "UPGRADE_REQUIRED" }
    }

    // The gap must actually belong to the authorized policy — the client
    // supplies gapId, and trusting it let a caller mint an Opportunity
    // cross-linked to another policy's gap.
    const gap = await readGapRow({
        where: { id: gapId, policyId },
        select: {
            id: true,
            severity: true,
            validationState: true,
            aiExplanation: true,
            definition: { select: { title: true } },
        },
    })
    if (!gap) {
        return { error: "Gap not found for this policy." }
    }

    // Find active relationship
    const relationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: authResult.dbUser.id,
            status: 'active'
        }
    })

    if (!relationship) {
        return { error: "No active agent found to notify." }
    }

    // Check if opportunity already exists
    const existing = await db.opportunity.findFirst({
        where: {
            gapInstanceId: gapId,
            relationshipId: relationship.id
        }
    })

    if (existing) {
        return { success: true, message: "Agent already notified." }
    }

    // Create Opportunity — seeded with the MEDIC pain evidence the platform
    // already holds (gap + its validation state + the policy's contractual
    // end date as the compelling event), so qualification starts honest.
    const { seedOpportunityMedic } = await import("@/lib/medic/seed")
    const medicSeed = seedOpportunityMedic({
        pain: {
            category: 'coverage_gap',
            gapInstanceIds: [gap.id],
            summary: gap.definition?.title || gap.aiExplanation || undefined,
            severity: (gap.severity as any) ?? undefined,
            validationState: gap.validationState,
        },
        compellingEventAt: policy.endDate,
    })
    const opportunity = await db.opportunity.create({
        data: {
            relationshipId: relationship.id,
            policyId: policyId,
            gapInstanceId: gapId,
            ownerAgentUserId: relationship.agentUserId,
            status: 'open',
            notes: 'Customer requested more details on this gap.',
            medic: medicSeed.medic as any,
            medicScore: medicSeed.medicScore,
            medicUpdatedAt: medicSeed.medicUpdatedAt,
        }
    })

    await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
        relationshipId: relationship.id,
        policyId,
        category: "coverage_gap",
        priority: "high",
        linkedGapInstanceId: gapId,
        linkedOpportunityId: opportunity.id,
        subject: "Coverage gap clarification requested",
        initialMessage: `${authResult.dbUser.name || "Policyholder"} requested help on this coverage gap.`,
    })

    // Notify Agent
    await emit({
        event: 'opportunity_created',
        userId: relationship.agentUserId,
        title: {
            el: 'Νέα ευκαιρία εντοπίστηκε',
            en: 'New Opportunity Detected',
        },
        message: {
            el: `${authResult.dbUser.name || 'Πελάτης'} ζήτησε λεπτομέρειες για ένα κενό κάλυψης.`,
            en: `${authResult.dbUser.name || 'Customer'} requested details on a coverage gap.`,
        },
        relatedObjectType: 'opportunity',
        relatedObjectId: opportunity.id,
    })

    revalidatePath("/wallet")
    return { success: true, message: "Agent notified." }
}

/**
 * Same policy uploaded by both the policyholder and their agent: merging the
 * two records needs the other party's consent (lib/services/policy-merge).
 */
export async function decideMergeRequest(
    requestId: string,
    decision: "approved" | "rejected"
) {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "UNAUTHORIZED" }
    const dbUser = auth.dbUser
    const { decidePolicyMerge } = await import("@/lib/services/policy-merge.service")

    const result = await decidePolicyMerge(requestId, dbUser.id, decision)
    if (!result.ok) return { error: result.error || "MERGE_FAILED" }

    revalidatePath("/wallet")
    if (result.mergedIntoPolicyId) revalidatePath(`/wallet/${result.mergedIntoPolicyId}`)
    return { success: true, mergedIntoPolicyId: result.mergedIntoPolicyId ?? null }
}
