/**
 * Policy Service
 * 
 * Handles all policy-related business logic including creation, upload,
 * sharing, and deletion. Uses AppError for consistent error handling
 * and domain types for type safety.
 */

import { BaseService } from './base.service'
import { closeSupersededRenewals } from "./renewal.service"
import { mergeAcordData } from './acord-merge'
import { storedDocumentLabel } from '@/lib/wallet/document-label'
import { emit } from '@/lib/notifications/dispatch'
import { AppError } from '@/lib/errors'
import { uploadFile, deleteFile } from '@/lib/storage'
import { storageColumnsFor } from '@/lib/supabase/storage-download'
import { sanitizeDisplayName, validateUploadFile } from '@/lib/security/file-upload'
import { logger } from '@/lib/logger'
import { sendPolicyInviteEmail, sendPolicySharedAccessEmail } from '@/lib/email/invite-emails'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import { resolveCoverageEndDate } from '@/lib/policy-status'
import { policyLabel } from '@/lib/wallet/policy-identity'
import { classifyAnalysisFailure, discardFailedPolicy, discardOrphanedUploads } from '@/lib/services/policy-discard'
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
                    // The caller's name is used to CHECK the extension and for
                    // nothing else — it is never what gets stored. Sanitizing
                    // it and persisting it (which this did) keeps the leak and
                    // only tidies the spelling: `LIFE_POLICY.pdf` on a health
                    // policy still names a life component.
                    const rawFileName = doc.name || 'Unknown Document'

                    // Validate file extension
                    const lowerName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
                    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic']
                    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext))

                    if (!hasValidExt) {
                        // The rejected EXTENSION is the diagnostic; the name is
                        // not. Logging the whole name to explain "wrong file
                        // type" is how a customer's file name ends up in an
                        // operational log.
                        logger('warn', 'Skipping document with invalid extension', {
                            userId,
                            extension: lowerName.slice(lowerName.lastIndexOf('.')) || 'none',
                            policyId: created.id
                        })
                        continue
                    }

                    await tx.policyDocument.create({
                        data: {
                            policyId: created.id,
                            fileUrl: doc.url,
                            // GENERATED. See lib/wallet/document-label.ts.
                            fileName: storedDocumentLabel({}),
                            fileSize: doc.size,
                            source: 'policyholder',
                            uploadedByUserId: userId,
                            processingStatus: data.status === 'analyzing' ? 'processing' : 'completed',
                            // Resolve the locator ONCE, here, rather than
                            // re-deriving it from the URL on every read.
                            ...storageColumnsFor(doc.url),
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
            if (validation.reason === 'encrypted') {
                throw AppError.validation({
                    file: [language === 'el'
                        ? 'Το PDF είναι κλειδωμένο με κωδικό. Αποθηκεύστε ένα αντίγραφο χωρίς κωδικό και ανεβάστε το.'
                        : 'This PDF is password-protected. Save an unlocked copy and upload that.']
                })
            }
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

        // The user's file name is deliberately NOT read here. It is not
        // sanitized-and-stored, it is discarded: see lib/wallet/document-label.ts.

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
                    // GENERATED, never the user's file name. At this point
                    // extraction has not run, so there is no branch and no
                    // policy number — the label says so rather than inventing
                    // one. See lib/wallet/document-label.ts.
                    name: storedDocumentLabel({}),
                    size: file.size
                }]
            }, language)
        } catch (createError) {
            // The object landed but no record references it — clean it up
            // rather than leaving an orphan in the bucket.
            await discardOrphanedUploads([fileUrl], { reason: 'policy_create_failed', userId })
            throw createError
        }

        // No fileName here. Logs are a sink like any other: the 2026-08-14 run
        // recorded fileName:"motor.pdf", which is the line of business in
        // plain text, in a log nobody classified as personal data.
        logger('info', 'Policy upload initiated - analysis deferred to background', {
            userId,
            policyId: policy.id,
        })

        return {
            policy,
            extracted: false, // Will be true later
            policyId: policy.id
        }
    }

    /**
     * Attach an ανανεωτήριο to an EXISTING policy.
     *
     * Deliberately the same front door as uploadAndParse — identical content
     * validation, the same bucket, the same orphan cleanup when the row fails
     * to write. A renewal that took a different upload path would drift from
     * the rules the main path enforces, and those rules are the ones that stop
     * a failed upload leaving bytes nobody can reach.
     *
     * The differences are only these: the policy already exists, so no
     * placeholder identity is minted and no quota is consumed (the customer is
     * not adding a policy, they are completing one); and the document is
     * marked `renewal_notice` with the effective period the extraction finds,
     * so the chain can be ordered by what the documents COVER rather than by
     * when somebody uploaded them.
     *
     * AUTHORIZATION IS THE CALLER'S JOB and is not repeated here — callers go
     * through getPolicyAccess (see addRenewalDocument). This method is not
     * reachable without one.
     */
    async attachRenewalDocument(
        policyId: string,
        userId: string,
        file: File,
        language: 'en' | 'el' = 'en'
    ): Promise<{ documentId: string; policyId: string }> {
        const validation = await validateUploadFile(file, { category: 'policy' })
        if (!validation.ok) {
            if (validation.reason === 'encrypted') {
                throw AppError.validation({
                    file: [language === 'el'
                        ? 'Το PDF είναι κλειδωμένο με κωδικό. Αποθηκεύστε ένα αντίγραφο χωρίς κωδικό και ανεβάστε το.'
                        : 'This PDF is password-protected. Save an unlocked copy and upload that.']
                })
            }
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

        let fileUrl: string
        try {
            fileUrl = await uploadFile(file, 'policies')
        } catch (error) {
            logger('error', 'Renewal upload failed', { userId, policyId, error })
            throw AppError.externalService('Storage', error instanceof Error ? error : new Error('Upload failed'))
        }

        try {
            const document = await this.db.$transaction(async (tx) => {
                const created = await tx.policyDocument.create({
                    data: {
                        policyId,
                        fileUrl,
                        // Generated. The renewal's own period is not known until
                        // extraction, so the label starts as the renewal base and
                        // the render path fills the period in.
                        fileName: storedDocumentLabel({ documentKind: 'renewal_notice' }),
                        fileSize: file.size,
                        source: 'policyholder',
                        processingStatus: 'processing',
                        uploadedByUserId: userId,
                        // Stated up front rather than inferred later: the user told
                        // us this is a renewal by choosing this action, and that is
                        // better evidence than a classifier guess.
                        documentKind: 'renewal_notice',
                    },
                    select: { id: true },
                })

                // The renewal is in hand and NOTHING has read it yet. Mark the
                // policy `analyzing` in the same write, synchronously — before
                // the caller's `after()` defers the actual run.
                //
                // Without this the action returns, revalidatePath flushes, and
                // the page re-renders the pre-renewal dates: it goes on saying
                // «Το ασφαλιστήριο έχει λήξει. Δεν έχετε κάλυψη από αυτό.» — a
                // verdict that is no longer established, over a document that
                // may well disprove it. `retryAnalysis` has always set this
                // before deferring; the renewal path was the one that skipped
                // it, so every surface keyed on `status === 'analyzing'` (the
                // head chip, AnalysisCard's progress, the wallet-list poller)
                // stayed dark and the page had nothing honest to show.
                await tx.policy.update({ where: { id: policyId }, data: { status: 'analyzing' } })

                return created
            })

            logger('info', 'Renewal document attached', { userId, policyId, documentId: document.id })
            return { documentId: document.id, policyId }
        } catch (createError) {
            // Same rule as the main path: the object landed but nothing
            // references it, so it is personal data no export can reach.
            await discardOrphanedUploads([fileUrl], { reason: 'renewal_document_create_failed', userId })
            throw createError
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
                    // The result was previously awaited and thrown away, so for
                    // every free/Starter user — the majority — a failed or
                    // consent-blocked extraction left the policy stuck at
                    // 'analyzing' forever, with no notification and no way back.
                    const basic = await orchestrator.extractBasicSummary(policyId, userId)
                    if (basic.status === 'completed') return

                    if (basic.status === 'blocked') {
                        await this.handleBlockedAnalysis(policyId, userId, language, basic.reason || 'blocked')
                        return
                    }
                    await this.handleFailedAnalysis(
                        policyId,
                        userId,
                        language,
                        { message: basic.reason || 'extraction_failed' }
                    )
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

                // KEEP-AND-INFORM. The run never started for a reason the
                // customer has to act on — quota, consent, permission. The
                // upload is NOT discarded: silently deleting a quota-blocked
                // file makes the product look broken.
                await this.handleBlockedAnalysis(
                    policyId,
                    userId,
                    language,
                    run.blockedReason || 'blocked',
                    run.failureMessage
                )
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

                    // Silence inherits. A renewal notice states the premium and
                    // the period and is quiet about the rest; a shallow spread
                    // read that quiet as deletion and replaced whole sections,
                    // so a renewal mentioning only the vehicle's value erased
                    // make, model, green-card expiry and the cover flags the
                    // gap engine reads. See lib/services/acord-merge.ts.
                    const mergedAcordData = {
                        ...mergeAcordData(
                            (existingPolicyFull as any)?.acordData,
                            (currentPolicy as any).acordData
                        ),
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

                    // CLOSE OUT THE RENEWAL ROW THE OLD DATE BELONGED TO.
                    //
                    // `PolicyRenewal` is unique on [policyId, policyEndDate]. Move
                    // a policy's end date forward and the daily cron finds no row
                    // for the NEW date and creates a second one — while the old
                    // row, keyed to the date that just stopped being true, stays
                    // `pending`/`overdue` for ever. It keeps counting toward
                    // /renewals and /insights, and because `remindersSent` is
                    // still its own array the reminder ladder can fire again. The
                    // customer renewed; the product goes on saying they did not.
                    //
                    // Nothing closed these before, because until now nothing moved
                    // a policy's dates outside the agent-driven outcome flow.
                    //
                    // The outcome is DERIVED FROM A DOCUMENT, not judged by a
                    // person, and `outcomeNotes` says so: an agent setting
                    // `renewed_same_insurer` in /renewals has decided it; this has
                    // only observed that a later-dated document arrived. Same
                    // enum, different provenance, and the note is the only place
                    // that distinction survives.
                    if (shouldPromoteIncoming && currentPolicy.endDate) {
                        await closeSupersededRenewals(
                            this.db,
                            existingPolicy.id,
                            currentPolicy.endDate,
                            (currentPolicy.insurerName || "").trim().toLowerCase() ===
                                (existingPolicyFull?.insurerName || "").trim().toLowerCase()
                        )
                    }

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

            // A successful run can still leave a placeholder identity: the
            // providers substitute 'Unknown Insurer' / 'PENDING-<epoch>' for an
            // empty extraction, and buildMetadata keeps whatever is stored when
            // the evidence gate rejects the document. So the success message
            // goes through the same primitive as the failure one.
            const analyzedLabel = policyLabel(updatedPolicy ?? {})

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
                    el: `Το ασφαλιστήριο συμβόλαιο ${analyzedLabel} αναλύθηκε επιτυχώς.`,
                    en: `Policy ${analyzedLabel} has been successfully analyzed.`,
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
                        el: `Το ασφαλιστήριο συμβόλαιο ${analyzedLabel} αναλύθηκε από τον σύμβουλό σας.`,
                        en: `Policy ${analyzedLabel} was analyzed by your advisor.`,
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

            await this.handleFailedAnalysis(policyId, userId, language, {
                message: error instanceof Error ? error.message : String(error),
            })
        }
    }

    /**
     * The run finished unsuccessfully for a technical reason.
     *
     * DISCARD-class: a policy that carries nothing but placeholders is removed
     * outright — row, document rows and bucket objects — because there is
     * nothing in it a re-upload would not reproduce, and leaving it behind is
     * what put "__PENDING_EXTRACTION__" in front of a customer. A policy
     * somebody typed an insurer into is kept and marked `action_needed`.
     */
    private async handleFailedAnalysis(
        policyId: string,
        userId: string,
        language: 'en' | 'el',
        failure: { message: string; failureCode?: string | null }
    ): Promise<void> {
        const classification = classifyAnalysisFailure({
            failureCode: failure.failureCode,
            message: failure.message,
        })

        // A quota/consent failure that surfaced as a throw rather than a
        // blocked run is still KEEP-AND-INFORM.
        if (classification.kind === 'inform') {
            await this.markAnalysisIncomplete(policyId, classification.code, failure.message, classification.retryable)
            await this.notifyAnalysisFailed(userId, policyId, language, classification.code)
            return
        }

        const outcome = await discardFailedPolicy(policyId, {
            reason: classification.code,
            db: this.db as any,
        })

        if (outcome.discarded) {
            // Nothing left to point a notification at, so it names the upload
            // rather than a policy that no longer exists.
            await this.notifyUploadDiscarded(userId, language)
            return
        }

        await this.markAnalysisIncomplete(
            policyId,
            classification.code,
            failure.message,
            classification.retryable
        )
        await this.notifyAnalysisFailed(userId, policyId, language, classification.code)
    }

    /**
     * The run never started for a reason the customer must act on. The policy
     * and its document stay exactly where they are; the reason is persisted so
     * the wallet can say, in Greek, what to do about it.
     */
    private async handleBlockedAnalysis(
        policyId: string,
        userId: string,
        language: 'en' | 'el',
        blockedReason: string,
        failureMessage?: string | null
    ): Promise<void> {
        const classification = classifyAnalysisFailure({ blockedReason })

        logger('warn', 'Background policy analysis did not start', {
            policyId,
            userId,
            blockedReason,
            code: classification.code,
            failureMessage: failureMessage || null,
        })

        await this.markAnalysisIncomplete(
            policyId,
            classification.code,
            failureMessage || blockedReason,
            classification.retryable
        )
        await this.notifyAnalysisFailed(userId, policyId, language, classification.code)
    }

    /** Stamp the policy `action_needed` with a code the UI can localize. */
    private async markAnalysisIncomplete(
        policyId: string,
        code: string,
        message: string,
        retryable: boolean
    ): Promise<void> {
        const currentPolicy = await this.db.policy.findUnique({
            where: { id: policyId },
            select: { acordData: true },
        })

        await this.db.policy.update({
            where: { id: policyId },
            data: {
                status: 'action_needed',
                acordData: {
                    ...((currentPolicy?.acordData as any) || {}),
                    processingError: {
                        message,
                        code,
                        occurredAt: new Date().toISOString(),
                        retryable,
                    },
                },
            },
        })

        await this.db.policyDocument.updateMany({
            where: { policyId },
            data: { processingStatus: 'failed' },
        })
    }

    /**
     * The upload was thrown away. Told plainly, because the alternative — the
     * file simply never appearing — is indistinguishable from a broken product.
     */
    private async notifyUploadDiscarded(userId: string, language: 'en' | 'el'): Promise<void> {
        try {
            await emit({
                event: 'policy_analysis_failed',
                userId,
                title: {
                    el: 'Η ανάλυση δεν ολοκληρώθηκε',
                    en: 'Analysis not completed',
                },
                message: {
                    el: 'Το έγγραφο που ανεβάσατε δεν μπόρεσε να αναλυθεί, οπότε δεν αποθηκεύτηκε. Δοκιμάστε ξανά με καθαρότερο αντίγραφο.',
                    en: 'The document you uploaded could not be analysed, so it was not saved. Please try again with a clearer copy.',
                },
                relatedObjectType: 'policy',
            })
        } catch (error) {
            logger('error', 'Failed to emit upload-discarded notification', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            })
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
        language: 'en' | 'el',
        code?: string
    ): Promise<void> {
        try {
            const policy = await this.db.policy.findUnique({
                where: { id: policyId },
                select: { policyNumber: true, insurerName: true },
            })
            // Named through the shared primitive: this notification fires on
            // the very path where the identity is still a placeholder, so the
            // naive join printed "PENDING-1786… (__PENDING_EXTRACTION__)".
            const label = policyLabel(policy ?? {})
            const subject = {
                el: label ? `του συμβολαίου ${label}` : 'του εγγράφου που ανεβάσατε',
                en: label ? `of policy ${label}` : 'of the document you uploaded',
            }

            // KEEP-AND-INFORM copy: the customer is told WHAT to do, in their
            // own language, and never sees the internal code.
            const reasonCopy: Record<string, { el: string; en: string }> = {
                TOKEN_LIMIT_BLOCKED: {
                    el: `Η ανάλυση ${subject.el} δεν ξεκίνησε επειδή εξαντλήθηκε το διαθέσιμο όριο AI. Αναβαθμίστε το πρόγραμμά σας ή αγοράστε credits και δοκιμάστε ξανά — το έγγραφό σας είναι αποθηκευμένο.`,
                    en: `Analysis ${subject.en} did not start because your AI allowance is used up. Upgrade your plan or buy credits and try again — your document is saved.`,
                },
                AI_CONSENT_REQUIRED: {
                    el: `Η ανάλυση ${subject.el} χρειάζεται τη συγκατάθεσή σας για επεξεργασία με τεχνητή νοημοσύνη. Δώστε τη συγκατάθεση από τις ρυθμίσεις και δοκιμάστε ξανά — το έγγραφό σας είναι αποθηκευμένο.`,
                    en: `Analysis ${subject.en} needs your consent for AI processing. Grant it in your settings and try again — your document is saved.`,
                },
                ANALYSIS_NOT_PERMITTED: {
                    el: `Δεν έχετε δικαίωμα να εκτελέσετε ανάλυση ${subject.el}. Ζητήστε δικαίωμα επεξεργασίας από τον κάτοχο του ασφαλιστηρίου.`,
                    en: `You do not have permission to run the analysis ${subject.en}. Ask the policy owner for edit access.`,
                },
            }

            const message = (code && reasonCopy[code]) || {
                el: `Η ανάλυση ${subject.el} δεν ολοκληρώθηκε. Μπορείτε να δοκιμάσετε ξανά.`,
                en: `Analysis ${subject.en} could not be completed. You can retry.`,
            }

            await emit({
                event: 'policy_analysis_failed',
                userId,
                title: {
                    el: 'Η ανάλυση δεν ολοκληρώθηκε',
                    en: 'Analysis not completed',
                },
                message,
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


    // NOTE: delete / share / getShares / revokeShare lived here until
    // Aug 2026. They were a fourth copy of the policy-authorization rule —
    // including a grant lookup with no scope filter — and nothing called them.
    // Dead code that decides who may read a policy is worse than no code: it
    // reads as the rule while never being exercised, and it drifts silently.
    // The live paths are lib/policy-access.ts (per policy) and
    // lib/agent-visibility.ts (per agent's visible set).
}
