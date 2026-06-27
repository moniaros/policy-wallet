/**
 * Policy Service
 * 
 * Handles all policy-related business logic including creation, upload,
 * sharing, and deletion. Uses AppError for consistent error handling
 * and domain types for type safety.
 */

import { BaseService } from './base.service'
import { AppError } from '@/lib/errors'
import { uploadFile, deleteFile } from '@/lib/storage'
import { logger } from '@/lib/logger'
import { refreshProtectionScore } from '@/lib/services/gap-engine'
import type { Policy, PolicyDocument } from '@prisma/client'
import type {
    CreatePolicyInput,
    PolicyView,
    PolicyDetailView,
    UserSummary
} from '@/types'
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES, daysFromNow, DEFAULT_POLICY_DURATION_DAYS } from '@/lib/constants/time'

export interface UploadAndParseResult {
    policy: Policy
    extracted: boolean
    policyId: string
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
        return this.withTransaction(async (tx) => {
            // Verify user exists
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true }
            })

            if (!user) {
                throw AppError.notFound('User', userId)
            }

            // Create policy
            const policy = await tx.policy.create({
                data: {
                    ownerUserId: userId,
                    createdByUserId: userId,
                    insurerName: data.insurerName,
                    policyNumber: data.policyNumber,
                    lineOfBusiness: data.lineOfBusiness,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
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
                            policyId: policy.id
                        })
                        continue
                    }

                    await tx.policyDocument.create({
                        data: {
                            policyId: policy.id,
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

            // Log activity
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
        })
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
        const result = await this.withTransaction(async (tx) => {
            // 1. Verify policy exists
            const policy = await tx.policy.findUnique({
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

            // 2. Verify ownership
            if (policy.ownerUserId !== userId) {
                throw AppError.forbidden(
                    language === 'el'
                        ? 'Μόνο ο κάτοχος μπορεί να επεξεργαστεί αυτήν την πολιτική'
                        : 'Only the owner can edit this policy'
                )
            }

            // 3. Build update data
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

            // 4. Validate date logic if both dates are provided or inferred
            if (updateData.startDate && updateData.endDate) {
                if (updateData.endDate <= updateData.startDate) {
                    throw AppError.validation({
                        endDate: [language === 'el'
                            ? 'Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης'
                            : 'End date must be after start date']
                    })
                }
            }

            // 5. Update policy
            const updatedPolicy = await tx.policy.update({
                where: { id: policyId },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                }
            })

            // 6. Log activity
            const changes = Object.keys(updateData).filter(k => k !== 'updatedAt')
            await this.logActivity(
                userId,
                'POLICY_UPDATED',
                `Updated policy ${policy.policyNumber}`,
                { policyId, changes }
            )

            return updatedPolicy
        })

        // M6: Re-sync gap recommendations after policy data changes.
        // Fire-and-forget so the update response isn't held waiting for gap engine.
        refreshProtectionScore(userId).catch((err) => {
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
        // 1. Initial Validation
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            throw AppError.validation({
                file: [language === 'el'
                    ? `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`
                    : `File too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB`]
            })
        }

        if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
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
            logger('error', 'File upload failed', { userId, fileName: file.name, error })
            throw AppError.externalService('Storage', error instanceof Error ? error : new Error('Upload failed'))
        }

        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

        // 3. Create 'Analyzing' record immediately
        // We use placeholders that the AI will soon replace
        const policy = await this.create(userId, {
            insurerName: 'AI Analyzing...',
            policyNumber: `PENDING-${Math.random().toString(36).substring(7).toUpperCase()}`,
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
            // 1. Run orchestrated AI analysis (token-gated checklist + gaps + persistence)
            const { PolicyAnalysisOrchestratorService } = await import('./analysis/policy-analysis-orchestrator.service')
            const orchestrator = new PolicyAnalysisOrchestratorService()
            const run = await orchestrator.createAndExecuteRun(policyId, userId, language)

            if (!run) {
                throw new Error('Analysis run did not return a result')
            }

            if (run.status === 'blocked') {
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

            // 2. Post-Analysis Deduplication
            // Now that we have the real policy number extracted by AI, check if it already exists in the user's wallet
            const currentPolicy = await this.db.policy.findUnique({
                where: { id: policyId },
                include: { documents: true }
            })

            if (currentPolicy && currentPolicy.policyNumber && !currentPolicy.policyNumber.startsWith('PENDING-')) {
                const existingPolicy = await this.db.policy.findFirst({
                    where: {
                        ownerUserId: userId,
                        policyNumber: {
                            equals: currentPolicy.policyNumber.trim(),
                            mode: 'insensitive'
                        },
                        lineOfBusiness: currentPolicy.lineOfBusiness,
                        id: { not: policyId },
                        status: 'active'
                    }
                })

                if (existingPolicy) {
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

                    await this.db.notificationEvent.create({
                        data: {
                            userId,
                            eventType: 'policy_merged',
                            channel: 'in_app',
                            title: language === 'el' ? 'Η ανάλυση ολοκληρώθηκε' : 'Policy Analysis Complete',
                            message: language === 'el'
                                ? `Η νέα μεταφόρτωση ενσωματώθηκε στο υπάρχον συμβόλαιο ${currentPolicy.policyNumber}.`
                                : `Your upload was merged into existing policy ${currentPolicy.policyNumber}.`,
                            relatedObjectType: 'policy',
                            relatedObjectId: existingPolicy.id
                        }
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

            // 4. Mark policy as active (if not deduplicated)
            await this.db.policy.update({
                where: { id: policyId },
                data: { status: 'active' }
            })

            // 5. Notify User
            // Fetch updated details for the message
            const updatedPolicy = await this.db.policy.findUnique({
                where: { id: policyId },
                select: { policyNumber: true, insurerName: true }
            })

            await this.db.notificationEvent.create({
                data: {
                    userId,
                    eventType: 'policy_analyzed',
                    channel: 'in_app',
                    title: language === 'el' ? 'Η ανάλυση ολοκληρώθηκε' : 'Policy Analysis Complete',
                    message: language === 'el'
                        ? `Το ασφαλιστήριο συμβόλαιο ${updatedPolicy?.policyNumber} (${updatedPolicy?.insurerName}) αναλύθηκε επιτυχώς.`
                        : `Policy ${updatedPolicy?.policyNumber} (${updatedPolicy?.insurerName}) has been successfully analyzed.`,
                    relatedObjectType: 'policy',
                    relatedObjectId: policyId
                }
            })

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
            // Owner deletion - full cleanup
            await this.withTransaction(async (tx) => {
                // Delete associated files from storage
                for (const doc of policy.documents) {
                    try {
                        await deleteFile(doc.fileUrl)
                    } catch (error) {
                        logger('warn', 'Failed to delete file from storage', {
                            fileUrl: doc.fileUrl,
                            error: error instanceof Error ? error.message : String(error)
                        })
                        // Continue with deletion even if file delete fails
                    }
                }

                // Delete policy (cascades to documents, gaps, etc.)
                await tx.policy.delete({
                    where: { id: policyId }
                })

                await this.logActivity(
                    userId,
                    'POLICY_DELETED',
                    `Deleted policy ${policy.policyNumber}`,
                    { policyId, insurerName: policy.insurerName }
                )
            })

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

}
