/**
 * Policy Service
 * 
 * Handles all policy-related business logic including creation, upload,
 * sharing, and deletion. Uses AppError for consistent error handling
 * and domain types for type safety.
 */

import { BaseService } from './base.service'
import { emit } from '@/lib/notifications/dispatch'
import { AppError } from '@/lib/errors'
import { uploadFile, deleteFile } from '@/lib/storage'
import { sanitizeDisplayName, validateUploadFile } from '@/lib/security/file-upload'
import { logger } from '@/lib/logger'
import { sendPolicyInviteEmail, sendPolicySharedAccessEmail } from '@/lib/email/invite-emails'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import { resolveCoverageEndDate } from '@/lib/policy-status'
import { recordConversionEvent } from '@/lib/journey/conversion-events'
import type { Policy, PolicyDocument } from '@prisma/client'
import type {
    CreatePolicyInput,
    SharePolicyInput,
    PolicyView,
    PolicyDetailView,
    UserSummary
} from '@/types'
import { MAX_UPLOAD_SIZE_BYTES, daysFromNow, POLICY_SHARE_EXPIRY_DAYS, DEFAULT_POLICY_DURATION_DAYS } from '@/lib/constants/time'

export interface UploadAndParseResult {
    policy: Policy
    extracted: boolean
    policyId: string
}

export interface ShareResult {
    success: boolean
    message?: string
    link?: string
    // false = the invite exists but the email failed — offer the link fallback.
    emailDelivered?: boolean
}

export interface PolicyShare {
    id: string
    user: UserSummary
    grantedAt: Date
}

/**
 * Service for managing insurance policies
 */
export class PolicyService extends BaseService {

    /**
     * Creates a new policy for a user
     * 
     * @param userId - ID of the policy owner
     * @param data - Policy creation data
     * @param language - User's preferred language for error messages
     * @returns The created policy
     * 
     * @throws {AppError} NOT_FOUND if user doesn't exist
     * @throws {AppError} VALIDATION if data is invalid
     * 
     * @example
     * ```typescript
     * const policy = await policyService.create(userId, {
     *   insurerName: 'Acme Insurance',
     *   policyNumber: 'POL-123',
     *   lineOfBusiness: 'motor',
     *   startDate: '2024-01-01',
     *   endDate: '2025-01-01',
     *   premiumAmount: 500
     * })
     * ```
     */
    async create(
        userId: string,
        data: CreatePolicyInput & { status?: string },
        language: 'en' | 'el' = 'en'
    ): Promise<Policy> {
        const policy = await this.withTransaction(async (tx) => {
            // Verify user exists
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true }
            })

            if (!user) {
                throw AppError.notFound('User', userId)
            }

            // Create policy
            const created = await tx.policy.create({
                data: {
                    ownerUserId: userId,
                    createdByUserId: userId,
                    insurerName: data.insurerName,
                    policyNumber: data.policyNumber,
                    lineOfBusiness: data.lineOfBusiness,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    coverageEndDate: new Date(data.endDate),
                    premiumAmount: data.premiumAmount,
                    premiumCurrency: data.premiumCurrency || 'EUR',
                    status: data.status || 'active'
                }
            })

            // Handle document metadata (if provided)
            if (data.documents && data.documents.length > 0) {
                for (const doc of data.documents) {
                    const rawFileName = doc.name || 'Unknown Document'
                    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_')

                    // Validate file extension
                    const lowerName = fileName.toLowerCase()
                    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic']
                    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext))

                    if (!hasValidExt) {
                        logger('warn', 'Skipping document with invalid extension', {
                            userId,
                            fileName,
                            policyId: created.id
                        })
                        continue
                    }

                    await tx.policyDocument.create({
                        data: {
                            policyId: created.id,
                            fileUrl: doc.url,
                            fileName,
                            fileSize: doc.size,
                            source: 'policyholder',
                            uploadedByUserId: userId,
                            processingStatus: data.status === 'analyzing' ? 'processing' : 'completed'
                        }
                    })
                }
            }

            return created
        })

        // Activity logging runs AFTER the transaction commits — never inside it.
        // logActivity issues its own this.db queries (a second pool connection);
        // awaiting it inside the interactive tx while that tx holds a connection
        // deadlocks under the serverless connection limit and expires the tx at
        // 15s (the onboarding-upload "Transaction already closed" failure). It is
        // non-critical (swallows its own errors), so post-commit is correct.
        await this.logActivity(
            userId,
            'POLICY_CREATED',
            `Created policy ${policy.policyNumber} for ${policy.insurerName}`,
            {
                policyId: policy.id,
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber
            }
        )

        logger('info', 'Policy created successfully', {
            userId,
            policyId: policy.id,
            insurerName: policy.insurerName,
            status: policy.status
        })

        return policy
    }

    /**
     * Updates an existing policy
     * 
     * @param policyId - ID of the policy to update
     * @param userId - ID of the user requesting the update
     * @param data - Partial policy data to update
     * @param language - User's preferred language for error messages
     * @returns The updated policy
     * 
     * @throws {AppError} NOT_FOUND if policy doesn't exist
     * @throws {AppError} FORBIDDEN if user is not the owner
     * @throws {AppError} VALIDATION if data is invalid
     */
    async update(
        policyId: string,
        userId: string,
        data: Partial<CreatePolicyInput> & { status?: string },
        language: 'en' | 'el' = 'en'
    ): Promise<Policy> {
        // Verify existence, write access, and validate the payload BEFORE the
        // write. getPolicyAccess issues its own this.db queries, so these reads
        // must NOT run inside an interactive transaction — a nested pool
        // connection there deadlocks under the serverless connection limit (the
        // "Transaction already closed" failure). A single policy update is
        // atomic on its own and needs no interactive tx.
        const policy = await this.db.policy.findUnique({
            where: { id: policyId },
            select: {
                id: true,
                ownerUserId: true,
                policyNumber: true,
                insurerName: true
            }
        })

        if (!policy) {
            throw AppError.notFound('Policy', policyId)
        }

        // Verify write access: owner, or an active policy-scoped grant with
        // edit/manage permission (agent-managed policies).
        const { getPolicyAccess } = await import('@/lib/policy-access')
        const access = await getPolicyAccess(policyId, { id: userId })
        if (!access.canWrite) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Δεν έχετε δικαίωμα επεξεργασίας αυτού του συμβολαίου'
                    : 'You do not have permission to edit this policy'
            )
        }

        // Build update data
        const updateData: any = {}
        if (data.insurerName !== undefined) updateData.insurerName = data.insurerName
        if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber
        if (data.lineOfBusiness !== undefined) updateData.lineOfBusiness = data.lineOfBusiness
        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
        if (data.premiumAmount !== undefined) updateData.premiumAmount = data.premiumAmount
        if (data.premiumCurrency !== undefined) updateData.premiumCurrency = data.premiumCurrency
        if (data.coverageSummary !== undefined) updateData.coverageSummary = data.coverageSummary
        if (data.status !== undefined) updateData.status = data.status

        // Validate date logic if both dates are provided or inferred
        if (updateData.startDate && updateData.endDate) {
            if (updateData.endDate <= updateData.startDate) {
                throw AppError.validation({
                    endDate: [language === 'el'
                        ? 'Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης'
                        : 'End date must be after start date']
                })
            }
        }

        // Single atomic write — no interactive tx needed.
        const result = await this.db.policy.update({
            where: { id: policyId },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        })

        // Activity logging runs after the write (its own this.db queries).
        const logPolicyNumber = policy.policyNumber
        const logChanges = Object.keys(updateData).filter(k => k !== 'updatedAt')
        await this.logActivity(
            userId,
            'POLICY_UPDATED',
            `Updated policy ${logPolicyNumber}`,
            { policyId, changes: logChanges }
        )

        // M6: Re-sync gap recommendations after policy data changes.
        //
        // For the OWNER, not the editor. `userId` is whoever made the edit, and
        // an agent with an edit grant can change a customer's policy — recomputing
        // the agent's own portfolio then rebuilds gaps that did not change and
        // leaves the customer's (the gaps that DID change, and the ones the
        // customer actually sees) stale. The gap engine is per-user; it must run
        // for the user whose coverage this policy is.
        //
        // Fire-and-forget so the update response isn't held waiting for gap engine.
        refreshProtectionScore(policy.ownerUserId).catch((err) => {
            logger('warn', 'Failed to refresh protection score after policy update', {
                policyId,
                error: err instanceof Error ? err.message : String(err),
            })
        })

        return result
    }

    /**
     * Uploads and parses a policy document using AI extraction
     * 
     * @param userId - ID of the uploader
     * @param file - File to upload
     * @param language - User's preferred language
     * @returns Created policy with extraction status
     * 
     * @throws {AppError} VALIDATION if file is invalid
     * @throws {AppError} EXTERNAL_SERVICE if upload fails
     * 
     * @example
     * ```typescript
     * const result = await policyService.uploadAndParse(userId, file)
     * if (result.extracted) {
     *   console.log('AI extraction successful')
     * }
     * ```
     */
    async uploadAndParse(
        userId: string,
        file: File,
        language: 'en' | 'el' = 'en'
    ): Promise<UploadAndParseResult> {
        // 1. Initial Validation — content-based (magic bytes + extension
        // allowlist), never the client Content-Type header alone. This is the
        // localized-error front door; uploadFile re-validates centrally.
        const validation = await validateUploadFile(file, { category: 'policy' })
        if (!validation.ok) {
            if (validation.reason === 'too_large') {
                throw AppError.validation({
                    file: [language === 'el'
                        ? `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`
                        : `File too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`]
                })
            }
            throw AppError.validation({
                file: [language === 'el'
                    ? 'Μη έγκυρος τύπος αρχείου. Επιτρέπονται PDF, JPG, PNG, WEBP και HEIC'
                    : 'Invalid file type. Allowed: PDF, JPG, PNG, WEBP, and HEIC']
            })
        }

        // 2. Immediate Upload
        let fileUrl: string
        try {
            fileUrl = await uploadFile(file, 'policies')
        } catch (error) {
            // Never log the raw client filename (PII) — uploadFile already
            // logged the safe rejection reason when validation failed.
            logger('error', 'File upload failed', { userId, error })
            throw AppError.externalService('Storage', error instanceof Error ? error : new Error('Upload failed'))
        }

        // Display metadata only (Greek-safe) — never used as a storage key.
        const sanitizedFileName = sanitizeDisplayName(file.name)

        // 3. Create 'Analyzing' record immediately
        // We use placeholders that the AI will soon replace
        let policy
        try {
            policy = await this.create(userId, {
                insurerName: 'AI Analyzing...',
                // A collision here is not cosmetic. The duplicate check below
                // matches on (ownerUserId, policyNumber, insurerName), and every
                // placeholder shares the insurer 'AI Analyzing...' — so two
                // in-flight uploads for the same owner that drew the same suffix
                // look like the same policy, and a merge request goes to the
                // other party for approval. Approving it would fold two genuinely
                // different policies into one.
                //
                // `Math.random().toString(36).substring(7)` yields fewer than
                // four characters about once in 4,800 and can in principle yield
                // none at all, which a batch upload makes concurrent by design.
                policyNumber: `PENDING-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                lineOfBusiness: 'other',
                startDate: new Date().toISOString(),
                endDate: daysFromNow(DEFAULT_POLICY_DURATION_DAYS).toISOString(),
                premiumAmount: 0,
                status: 'analyzing', // Marks it for background processing
                documents: [{
                    url: fileUrl,
                    name: sanitizedFileName,
                    size: file.size
                }]
            }, language)
        } catch (createError) {
            // The object landed but no record references it — clean it up
            // rather than leaving an orphan in the bucket.
            await deleteFile(fileUrl).catch(() => {})
            throw createError
        }

        logger('info', 'Policy upload initiated - analysis deferred to background', {
            userId,
            policyId: policy.id,
            fileName: sanitizedFileName
        })

        return {
            policy,
            extracted: false, // Will be true later
            policyId: policy.id
        }
    }

    /**
     * Executes the background AI analysis (Extraction + Gaps)
     * This should be called asynchronously by the server action
     */
    async runBackgroundAnalysis(
        policyId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<void> {
        const startTime = Date.now()
        logger('info', 'Starting background policy analysis', { policyId, userId })

        try {
            const { PolicyAnalysisOrchestratorService } = await import('./analysis/policy-analysis-orchestrator.service')
            const orchestrator = new PolicyAnalysisOrchestratorService()

            // Free/Starter (non-agent) get the basic parsed summary only —
            // extraction, no deep AI. Deep analysis is a Plus (code "pro")
            // feature and never runs the full pipeline for them.
            const initiator = await this.db.user.findUnique({
                where: { id: userId },
                select: { roles: true },
            })
            const isAgent = Boolean(initiator?.roles?.includes('agent'))
            if (!isAgent) {
                const { resolveUserEntitlements } = await import('@/lib/subscription-entitlements')
                const entitlements = await resolveUserEntitlements(userId)
                if (entitlements.tier !== 'pro') {
                    await orchestrator.extractBasicSummary(policyId, userId)
                    return
                }
            }

            // 1. Run orchestrated AI analysis (token-gated checklist + gaps + persistence)
            await recordConversionEvent(userId, "paid_ai_call_started", {
                kind: "full_analysis",
                source: "background_analysis",
            })
            const run = await orchestrator.createAndExecuteRun(policyId, userId, language)

            if (!run) {
                throw new Error('Analysis run did not return a result')
            }

            if (run.status === 'blocked') {
                // Free/Starter: deep AI is a Plus feature and was intentionally
                // not run. The basic parsed summary is already saved from upload,
                // so leave the policy as a normal basic policy — NOT a failure.
                if (run.blockedReason === 'free_tier_ai_locked') {
                    await this.db.policy.update({
                        where: { id: policyId },
                        data: { status: 'active' }
                    })
                    await this.db.policyDocument.updateMany({
                        where: { policyId },
                        data: { processingStatus: 'completed' }
                    })
                    return
                }

                logger('warn', 'Background policy analysis blocked by token budget', {
                    policyId,
                    userId,
                    blockedReason: run.blockedReason || null,
                    failureMessage: run.failureMessage || null
                })

                await this.db.policyDocument.updateMany({
                    where: { policyId },
                    data: { processingStatus: 'failed' }
                })
                await this.notifyAnalysisFailed(userId, policyId, language)
                return
            }

            if (run.status !== 'completed' && run.status !== 'completed_with_warnings') {
                const reason = run?.failureMessage || run?.blockedReason || 'analysis_orchestration_failed'
                throw new Error(`Analysis run did not complete: ${reason}`)
            }

            if (run.status === 'completed_with_warnings') {
                logger('warn', 'Background policy analysis completed with warnings', {
                    policyId,
                    userId,
                    runId: run.id
                })
            }

            await recordConversionEvent(userId, "paid_ai_call_completed", {
                kind: "full_analysis",
                source: "background_analysis",
            })

            // 2. Post-Analysis Deduplication
            // Now that we have the real policy number extracted by AI, check if it already exists in the user's wallet
            const currentPolicy = await this.db.policy.findUnique({
                where: { id: policyId },
                include: { documents: true }
            })

            if (currentPolicy && currentPolicy.policyNumber && !currentPolicy.policyNumber.startsWith('PENDING-')) {
                // Duplicate = same policyholder + same insurer + same policy
                // number. NOTE: this used to filter on `ownerUserId: userId`,
                // the *caller* — for an agent upload that is the AGENT's id, so
                // the check never matched and the merge was dead code there.
                const existingPolicy = await this.db.policy.findFirst({
                    where: {
                        ownerUserId: currentPolicy.ownerUserId,
                        policyNumber: {
                            equals: currentPolicy.policyNumber.trim(),
                            mode: 'insensitive'
                        },
                        insurerName: {
                            equals: (currentPolicy.insurerName || '').trim(),
                            mode: 'insensitive'
                        },
                        id: { not: policyId },
                        NOT: { status: 'cancelled' }
                    }
                })

                // Two parties uploading the same policy (the agent and the
                // policyholder) is ALLOWED — but merging their records is not
                // ours to decide. Raise a merge request the other side must
                // approve; only a same-uploader duplicate merges silently.
                if (existingPolicy && existingPolicy.createdByUserId !== currentPolicy.createdByUserId) {
                    const { requestPolicyMerge } = await import("@/lib/services/policy-merge.service")
                    await requestPolicyMerge({
                        existingPolicyId: existingPolicy.id,
                        incomingPolicyId: currentPolicy.id,
                        requestedByUserId: currentPolicy.createdByUserId,
                    })
                    logger('info', 'Duplicate policy from a different uploader — merge request raised', {
                        existingPolicyId: existingPolicy.id,
                        incomingPolicyId: currentPolicy.id,
                    })
                } else if (existingPolicy) {
                    logger('info', 'Duplicate policy detected, merging documents', {
                        userId,
                        existingPolicyId: existingPolicy.id,
                        tempPolicyId: policyId,
                        policyNumber: currentPolicy.policyNumber
                    })

                    const existingPolicyFull = await this.db.policy.findUnique({
                        where: { id: existingPolicy.id }
                    })
                    const existingEnd = existingPolicyFull?.endDate ? existingPolicyFull.endDate.getTime() : 0
                    const incomingEnd = currentPolicy.endDate ? currentPolicy.endDate.getTime() : 0
                    const shouldPromoteIncoming = incomingEnd >= existingEnd

                    const mergedHistory = [
                        ...(((existingPolicyFull as any)?.acordData?.renewalHistory || []) as any[]),
                        {
                            uploadedAt: new Date().toISOString(),
                            sourcePolicyId: currentPolicy.id,
                            policyNumber: currentPolicy.policyNumber,
                            startDate: currentPolicy.startDate?.toISOString?.() || null,
                            endDate: currentPolicy.endDate?.toISOString?.() || null,
                            insurerName: currentPolicy.insurerName || null,
                            documents: (currentPolicy.documents || []).map((d: any) => ({
                                id: d.id,
                                fileName: d.fileName,
                                uploadedAt: d.uploadedAt?.toISOString?.() || null
                            }))
                        }
                    ].slice(-20)

                    const mergedAcordData = {
                        ...((existingPolicyFull as any)?.acordData || {}),
                        ...((currentPolicy as any).acordData || {}),
                        renewalHistory: mergedHistory
                    }

                    await this.db.policy.update({
                        where: { id: existingPolicy.id },
                        data: {
                            insurerName: shouldPromoteIncoming ? currentPolicy.insurerName : existingPolicyFull?.insurerName,
                            lineOfBusiness: shouldPromoteIncoming ? currentPolicy.lineOfBusiness : existingPolicyFull?.lineOfBusiness,
                            startDate: shouldPromoteIncoming ? currentPolicy.startDate : existingPolicyFull?.startDate,
                            endDate: shouldPromoteIncoming ? currentPolicy.endDate : existingPolicyFull?.endDate,
                            premiumAmount: shouldPromoteIncoming ? currentPolicy.premiumAmount : existingPolicyFull?.premiumAmount,
                            premiumCurrency: shouldPromoteIncoming ? currentPolicy.premiumCurrency : existingPolicyFull?.premiumCurrency,
                            coverageSummary: currentPolicy.coverageSummary || existingPolicyFull?.coverageSummary,
                            acordData: mergedAcordData,
                            coverageEndDate: resolveCoverageEndDate({
                                acordData: mergedAcordData,
                                endDate: shouldPromoteIncoming ? currentPolicy.endDate : existingPolicyFull?.endDate,
                                status: 'active',
                                policyNumber: shouldPromoteIncoming ? currentPolicy.policyNumber : existingPolicyFull?.policyNumber,
                                insurerName: shouldPromoteIncoming ? currentPolicy.insurerName : existingPolicyFull?.insurerName,
                            }),
                            lastAnalyzedAt: new Date(),
                            status: 'active',
                        }
                    })

                    // Move documents to the existing policy
                    await this.db.policyDocument.updateMany({
                        where: { policyId },
                        data: { policyId: existingPolicy.id }
                    })

                    // Optional: Merge coverage summary or other fields if the new analysis is more detailed
                    // For now, we prioritize the existing record but add the new docs.

                    // Delete the temporary placeholder policy
                    await this.db.policy.delete({
                        where: { id: policyId }
                    })

                    // Add a log for the merge
                    await this.logActivity(
                        userId,
                        'POLICY_DEDUPLICATED',
                        `Identified and merged duplicate upload for policy ${currentPolicy.policyNumber}`,
                        {
                            existingPolicyId: existingPolicy.id,
                            mergedPolicyId: policyId,
                            policyNumber: currentPolicy.policyNumber
                        }
                    )

                    await emit({
                        event: 'policy_merged',
                        userId,
                        title: {
                            el: 'Η ανάλυση ολοκληρώθηκε',
                            en: 'Policy Analysis Complete',
                        },
                        message: {
                            el: `Η νέα μεταφόρτωση ενσωματώθηκε στο υπάρχον συμβόλαιο ${currentPolicy.policyNumber}.`,
                            en: `Your upload was merged into existing policy ${currentPolicy.policyNumber}.`,
                        },
                        relatedObjectType: 'policy',
                        relatedObjectId: existingPolicy.id,
                    })

                    logger('info', 'Deduplication merge complete', { policyId: existingPolicy.id })
                    return // Exit early since we deleted the current policy record
                }
            }

            // 3. Mark document as completed (if not deduplicated)
            await this.db.policyDocument.updateMany({
                where: { policyId },
                data: { processingStatus: 'completed' }
            })

            // 4. Mark policy as active + persist the resolved coverage end date
            // (acordData is now final) so counts can run in SQL.
            await this.db.policy.update({
                where: { id: policyId },
                data: {
                    status: 'active',
                    ...(currentPolicy
                        ? { coverageEndDate: resolveCoverageEndDate({ ...currentPolicy, status: 'active' }) }
                        : {}),
                }
            })

            // 5. Notify User
            // Fetch updated details for the message
            const updatedPolicy = await this.db.policy.findUnique({
                where: { id: policyId },
                select: {
                    policyNumber: true,
                    insurerName: true,
                    ownerUserId: true,
                    owner: { select: { preferredLanguage: true } },
                }
            })

            // Publish the FACT — the notification and the recomputation are
            // consequences the decision engine decides. Dual-written alongside
            // the direct calls during the migration.
            const { publishAnalysisCompleted } = await import('@/lib/events/publishers')
            await publishAnalysisCompleted({
                policyId,
                ownerUserId: updatedPolicy?.ownerUserId ?? userId,
                runId: policyId,
                actor: {
                    type: updatedPolicy?.ownerUserId === userId ? 'customer' : 'advisor',
                    id: userId,
                },
                insurerName: updatedPolicy?.insurerName,
                policyNumber: updatedPolicy?.policyNumber,
            })

            await emit({
                event: 'policy_analyzed',
                userId,
                title: {
                    el: 'Η ανάλυση ολοκληρώθηκε',
                    en: 'Policy Analysis Complete',
                },
                message: {
                    el: `Το ασφαλιστήριο συμβόλαιο ${updatedPolicy?.policyNumber} (${updatedPolicy?.insurerName}) αναλύθηκε επιτυχώς.`,
                    en: `Policy ${updatedPolicy?.policyNumber} (${updatedPolicy?.insurerName}) has been successfully analyzed.`,
                },
                relatedObjectType: 'policy',
                relatedObjectId: policyId,
            })

            // Break the silent handoff: when someone other than the owner (e.g. an
            // agent uploading on the client's behalf) triggered this analysis, the
            // owner never hears about it. Notify them too — the bus resolves the
            // language against the RECIPIENT, so the hand-rolled `ownerLang`
            // lookup this used to need is gone.
            if (updatedPolicy?.ownerUserId && updatedPolicy.ownerUserId !== userId) {
                await emit({
                    event: 'policy_analyzed',
                    userId: updatedPolicy.ownerUserId,
                    title: {
                        el: 'Η ανάλυση ολοκληρώθηκε',
                        en: 'Policy Analysis Complete',
                    },
                    message: {
                        el: `Το ασφαλιστήριο συμβόλαιο ${updatedPolicy.policyNumber} (${updatedPolicy.insurerName}) αναλύθηκε από τον σύμβουλό σας.`,
                        en: `Policy ${updatedPolicy.policyNumber} (${updatedPolicy.insurerName}) was analyzed by your advisor.`,
                    },
                    relatedObjectType: 'policy',
                    relatedObjectId: policyId,
                })
            }

            logger('info', 'Background policy analysis completed successfully', {
                policyId,
                durationMs: Date.now() - startTime
            })
        } catch (error) {
            logger('error', 'Background policy analysis failed', {
                policyId,
                userId,
                error: error instanceof Error ? error.message : String(error)
            })

            const errorMessage = error instanceof Error ? error.message : String(error)
            const isTimeout = errorMessage.toLowerCase().includes('timeout')
            const isTokenLimit = /token budget check failed|monthly_limit_reached|insufficient_tokens|token_limit_blocked/i.test(errorMessage)
            const currentPolicy = await this.db.policy.findUnique({
                where: { id: policyId },
                select: { acordData: true }
            })

            await this.db.policy.update({
                where: { id: policyId },
                data: {
                    status: 'action_needed',
                    acordData: {
                        ...((currentPolicy?.acordData as any) || {}),
                        processingError: {
                            message: errorMessage,
                            code: isTimeout ? 'TIMEOUT' : isTokenLimit ? 'TOKEN_LIMIT_BLOCKED' : 'ANALYSIS_FAILED',
                            occurredAt: new Date().toISOString(),
                            retryable: true,
                        },
                    },
                }
            })

            await this.db.policyDocument.updateMany({
                where: { policyId },
                data: { processingStatus: 'failed' }
            })
            await this.notifyAnalysisFailed(userId, policyId, language)
        }
    }

    /**
     * Emit exactly one "analysis finished unsuccessfully" notification to the
     * initiator (the agent, for an agent upload). Success and silent-merge
     * already notify inside runBackgroundAnalysis; this covers the token-blocked
     * and failure branches so a finished-but-failed run always tells the agent
     * (who may have closed the upload dialog and moved on) instead of leaving
     * them waiting. Never throws — a notification failure must not surface as an
     * analysis failure.
     */
    private async notifyAnalysisFailed(
        userId: string,
        policyId: string,
        language: 'en' | 'el'
    ): Promise<void> {
        try {
            const policy = await this.db.policy.findUnique({
                where: { id: policyId },
                select: { policyNumber: true, insurerName: true },
            })
            const label = [policy?.policyNumber, policy?.insurerName ? `(${policy.insurerName})` : null]
                .filter(Boolean)
                .join(' ')
            await emit({
                event: 'policy_analysis_failed',
                userId,
                title: {
                    el: 'Η ανάλυση δεν ολοκληρώθηκε',
                    en: 'Analysis not completed',
                },
                message: {
                    el: `Η ανάλυση του συμβολαίου ${label} δεν ολοκληρώθηκε. Μπορείτε να δοκιμάσετε ξανά.`,
                    en: `Analysis of policy ${label} could not be completed. You can retry.`,
                },
                relatedObjectType: 'policy',
                relatedObjectId: policyId,
            })
        } catch (error) {
            logger('error', 'Failed to emit analysis-failed notification', {
                policyId,
                userId,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    /**
     * Deletes a policy or revokes access
     * 
     * - If user is owner: Deletes policy and all associated data
     * - If user has shared access: Revokes their access grant
     * 
     * @param policyId - ID of the policy
     * @param userId - ID of the user requesting deletion
     * @param language - User's preferred language
     * 
     * @throws {AppError} NOT_FOUND if policy doesn't exist
     * @throws {AppError} FORBIDDEN if user has no access
     * 
     * @example
     * ```typescript
     * await policyService.delete(policyId, userId)
     * ```
     */
    async delete(
        policyId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<void> {
        const policy = await this.db.policy.findUnique({
            where: { id: policyId },
            include: { documents: true }
        })

        if (!policy) {
            throw AppError.notFound('Policy', policyId)
        }

        const isOwner = policy.ownerUserId === userId

        if (isOwner) {
            // Owner deletion. The DB record is the source of truth, so only the
            // cascade delete runs inside the transaction. Storage cleanup (slow
            // network I/O) and the activity log (its own this.db queries) run
            // AFTER commit — doing them inside the interactive tx held it open on
            // storage I/O and grabbed a second pool connection, which deadlocks
            // under the serverless connection limit ("Transaction already closed").
            await this.withTransaction(async (tx) => {
                // Delete policy (cascades to documents, gaps, etc.)
                await tx.policy.delete({
                    where: { id: policyId }
                })
            })

            // Best-effort storage cleanup — an orphaned file is harmless and must
            // never block or fail the deletion (fileUrls captured before delete).
            for (const doc of policy.documents) {
                await deleteFile(doc.fileUrl).catch((error) => {
                    logger('warn', 'Failed to delete file from storage', {
                        fileUrl: doc.fileUrl,
                        error: error instanceof Error ? error.message : String(error)
                    })
                })
            }

            await this.logActivity(
                userId,
                'POLICY_DELETED',
                `Deleted policy ${policy.policyNumber}`,
                { policyId, insurerName: policy.insurerName }
            )

            logger('info', 'Policy deleted by owner', {
                userId,
                policyId,
                policyNumber: policy.policyNumber
            })
        } else {
            // Check if user has shared access
            const grant = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: policy.ownerUserId,
                    granteeUserId: userId,
                    status: 'active'
                }
            })

            if (!grant) {
                throw AppError.forbidden(
                    language === 'el'
                        ? 'Δεν έχετε πρόσβαση σε αυτήν την πολιτική'
                        : 'You do not have access to this policy'
                )
            }

            // Revoke access
            await this.db.accessGrant.update({
                where: { id: grant.id },
                data: { status: 'revoked' }
            })

            await this.logActivity(
                userId,
                'POLICY_ACCESS_REVOKED',
                `Revoked access to policy ${policy.policyNumber}`,
                { policyId, grantId: grant.id }
            )

            logger('info', 'Policy access revoked', {
                userId,
                policyId,
                grantId: grant.id
            })
        }
    }

    /**
     * Shares a policy with another user
     * 
     * - If recipient exists: Creates access grant
     * - If recipient doesn't exist: Creates invite
     * 
     * @param policyId - ID of the policy to share
     * @param ownerUserId - ID of the policy owner
     * @param data - Share data (recipient email)
     * @param language - User's preferred language
     * @returns Share result with success status
     * 
     * @throws {AppError} NOT_FOUND if policy doesn't exist
     * @throws {AppError} FORBIDDEN if user is not owner
     * @throws {AppError} CONFLICT if already shared
     * 
     * @example
     * ```typescript
     * const result = await policyService.share(policyId, userId, {
     *   recipientEmail: 'agent@example.com'
     * })
     * ```
     */
    async share(
        policyId: string,
        ownerUserId: string,
        data: SharePolicyInput,
        language: 'en' | 'el' = 'en'
    ): Promise<ShareResult> {
        const policy = await this.db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy) {
            throw AppError.notFound('Policy', policyId)
        }

        if (policy.ownerUserId !== ownerUserId) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Μόνο ο κάτοχος μπορεί να μοιραστεί αυτήν την πολιτική'
                    : 'Only the owner can share this policy'
            )
        }

        const recipientEmail = data.agentEmail.toLowerCase().trim()
        const owner = await this.db.user.findUnique({
            where: { id: ownerUserId },
            select: { name: true, email: true }
        })
        const inviterName = owner?.name || owner?.email || 'PolicyWallet user'

        // Check if recipient exists
        const recipient = await this.db.user.findUnique({
            where: { email: recipientEmail }
        })

        if (recipient) {
            // Check if already shared
            const existingGrant = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: ownerUserId,
                    granteeUserId: recipient.id,
                    status: 'active'
                }
            })

            if (existingGrant) {
                throw AppError.conflict(
                    language === 'el'
                        ? 'Η πολιτική έχει ήδη κοινοποιηθεί σε αυτόν τον χρήστη'
                        : 'Policy is already shared with this user'
                )
            }

            // Create access grant
            await this.db.accessGrant.create({
                data: {
                    granterUserId: ownerUserId,
                    granteeUserId: recipient.id,
                    scope: 'portfolio',
                    permissions: 'view',
                    status: 'active'
                }
            })

            // The RECIPIENT's language, not the sharer's — this used to render in
            // whichever language the person doing the sharing happened to use.
            await emit({
                event: 'policy_shared',
                userId: recipient.id,
                title: {
                    el: 'Νέο κοινόχρηστο συμβόλαιο',
                    en: 'New Shared Policy',
                },
                message: {
                    el: `Ένα ασφαλιστήριο κοινοποιήθηκε μαζί σας: ${policy.policyNumber}`,
                    en: `A policy has been shared with you: ${policy.policyNumber}`,
                },
                relatedObjectType: 'policy',
                relatedObjectId: policyId,
            })

            await this.logActivity(
                ownerUserId,
                'POLICY_SHARED',
                `Shared policy ${policy.policyNumber} with ${recipientEmail}`,
                { policyId, recipientEmail, recipientId: recipient.id }
            )

            try {
                await sendPolicySharedAccessEmail({
                    to: recipientEmail,
                    inviterName,
                    policyNumber: policy.policyNumber,
                    language,
                })
            } catch (emailError) {
                logger('warn', 'Policy share email failed', {
                    ownerUserId,
                    policyId,
                    recipientEmail,
                    error: emailError instanceof Error ? emailError.message : String(emailError),
                })
            }

            logger('info', 'Policy shared successfully', {
                ownerUserId,
                policyId,
                recipientEmail
            })

            return {
                success: true,
                message: language === 'el'
                    ? 'Η πολιτική κοινοποιήθηκε επιτυχώς'
                    : 'Policy shared successfully'
            }
        } else {
            // Create invite
            const token = `inv_${crypto.randomUUID().replace(/-/g, '')}`
            const invite = await this.db.invite.create({
                data: {
                    inviterUserId: ownerUserId,
                    inviteeEmail: recipientEmail,
                    inviteType: 'share',
                    relationshipType: 'policy_share',
                    scope: `policy:${policyId}`,
                    requestedPermissions: 'view',
                    token,
                    expiresAt: daysFromNow(POLICY_SHARE_EXPIRY_DAYS) // 7 days
                }
            })

            // sendEmail returns {success:false} instead of throwing — capture
            // the delivery outcome so the caller can offer the link fallback.
            let emailDelivered = false
            try {
                const emailResult = await sendPolicyInviteEmail({
                    to: recipientEmail,
                    token: invite.token,
                    inviterName,
                    policyNumber: policy.policyNumber,
                    language,
                })
                emailDelivered = emailResult.success
                if (!emailDelivered) {
                    logger('warn', 'Policy invite email not delivered', {
                        ownerUserId,
                        policyId,
                        recipientEmail,
                        inviteId: invite.id,
                    })
                }
            } catch (emailError) {
                logger('warn', 'Policy invite email failed', {
                    ownerUserId,
                    policyId,
                    recipientEmail,
                    inviteId: invite.id,
                    error: emailError instanceof Error ? emailError.message : String(emailError),
                })
            }

            await this.logActivity(
                ownerUserId,
                'POLICY_INVITE_SENT',
                `Sent policy share invite to ${recipientEmail}`,
                { policyId, inviteId: invite.id }
            )

            logger('info', 'Policy share invite created', {
                ownerUserId,
                policyId,
                recipientEmail,
                inviteId: invite.id
            })

            return {
                success: true,
                emailDelivered,
                message: emailDelivered
                    ? (language === 'el'
                        ? 'Η πρόσκληση στάλθηκε επιτυχώς'
                        : 'Invite sent successfully')
                    : (language === 'el'
                        ? 'Το email δεν παραδόθηκε — μοιραστείτε τον σύνδεσμο πρόσκλησης'
                        : 'Email not delivered — share the invite link instead'),
                link: `/invite/${invite.token}`
            }
        }
    }

    /**
     * Gets all users who have access to a policy
     * 
     * @param policyId - ID of the policy
     * @param userId - ID of the user checking (must be owner)
     * @param language - User's preferred language
     * @returns List of users with access
     * 
     * @throws {AppError} NOT_FOUND if policy doesn't exist
     * @throws {AppError} FORBIDDEN if user is not owner
     * 
     * @example
     * ```typescript
     * const shares = await policyService.getShares(policyId, userId)
     * ```
     */
    async getShares(
        policyId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<PolicyShare[]> {
        const policy = await this.db.policy.findUnique({
            where: { id: policyId }
        })

        if (!policy) {
            throw AppError.notFound('Policy', policyId)
        }

        if (policy.ownerUserId !== userId) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Μόνο ο κάτοχος μπορεί να δει τις κοινοποιήσεις'
                    : 'Only the owner can view shares'
            )
        }

        const grants = await this.db.accessGrant.findMany({
            where: {
                granterUserId: userId,
                status: 'active'
            },
            include: {
                grantee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        return grants.map(grant => ({
            id: grant.id,
            user: {
                id: grant.grantee.id,
                name: grant.grantee.name || grant.grantee.email,
                email: grant.grantee.email,
                image: grant.grantee.image || undefined
            },
            grantedAt: grant.grantedAt
        }))
    }

    /**
     * Revokes access to a policy
     * 
     * @param grantId - ID of the access grant
     * @param userId - ID of the user revoking (must be granter)
     * @param language - User's preferred language
     * 
     * @throws {AppError} NOT_FOUND if grant doesn't exist
     * @throws {AppError} FORBIDDEN if user is not granter
     * 
     * @example
     * ```typescript
     * await policyService.revokeShare(grantId, userId)
     * ```
     */
    async revokeShare(
        grantId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<void> {
        const grant = await this.db.accessGrant.findUnique({
            where: { id: grantId },
            include: {
                grantee: {
                    select: { email: true }
                }
            }
        })

        if (!grant) {
            throw AppError.notFound('Access Grant', grantId)
        }

        if (grant.granterUserId !== userId) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Μόνο ο κάτοχος μπορεί να ανακαλέσει την πρόσβαση'
                    : 'Only the owner can revoke access'
            )
        }

        await this.db.accessGrant.update({
            where: { id: grantId },
            data: { status: 'revoked' }
        })

        await this.logActivity(
            userId,
            'POLICY_SHARE_REVOKED',
            `Revoked access for ${grant.grantee.email}`,
            { grantId, recipientEmail: grant.grantee.email }
        )

        logger('info', 'Policy share revoked', {
            userId,
            grantId,
            recipientEmail: grant.grantee.email
        })
    }
}
