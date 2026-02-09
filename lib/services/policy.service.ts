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
import type { Policy, PolicyDocument } from '@prisma/client'
import type {
    CreatePolicyInput,
    SharePolicyInput,
    PolicyView,
    PolicyDetailView,
    UserSummary
} from '@/types'

export interface UploadAndParseResult {
    policy: Policy
    extracted: boolean
    policyId: string
}

export interface ShareResult {
    success: boolean
    message?: string
    link?: string
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
                    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
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
        const MAX_FILE_SIZE = 15 * 1024 * 1024 // Increased to 15MB for better document support
        if (file.size > MAX_FILE_SIZE) {
            throw AppError.validation({
                file: [language === 'el'
                    ? 'Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 15MB'
                    : 'File too large. Maximum size is 15MB']
            })
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            throw AppError.validation({
                file: [language === 'el'
                    ? 'Μη έγκυρος τύπος αρχείου. Επιτρέπονται μόνο PDF, JPG, PNG και WEBP'
                    : 'Invalid file type. Only PDF, JPG, PNG, and WEBP are allowed']
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
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
            // 1. Run Gap Analysis (Includes metadata extraction and gap detection)
            const { GapAnalysisService } = await import('./gap-analysis.service')
            const gapService = new GapAnalysisService(this.db)

            // This service handles the call to aiService and updates the policy record with extracted data
            await gapService.analyzePolicy(policyId, userId, language)

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

            // Update status to indicate manual action might be needed
            await this.db.policy.update({
                where: { id: policyId },
                data: { status: 'action_needed' }
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

            // Create notification
            await this.db.notificationEvent.create({
                data: {
                    userId: recipient.id,
                    eventType: 'policy_shared',
                    channel: 'in_app',
                    title: language === 'el' ? 'Νέα κοινή πολιτική' : 'New Shared Policy',
                    message: language === 'el'
                        ? `Μια πολιτική έχει κοινοποιηθεί μαζί σας: ${policy.policyNumber}`
                        : `A policy has been shared with you: ${policy.policyNumber}`,
                    relatedObjectType: 'policy',
                    relatedObjectId: policyId
                }
            })

            await this.logActivity(
                ownerUserId,
                'POLICY_SHARED',
                `Shared policy ${policy.policyNumber} with ${recipientEmail}`,
                { policyId, recipientEmail, recipientId: recipient.id }
            )

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
            const token = `inv_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
            const invite = await this.db.invite.create({
                data: {
                    inviterUserId: ownerUserId,
                    inviteeEmail: recipientEmail,
                    inviteType: 'policy_share',
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                }
            })

            // TODO: Send email invite (email service integration)

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
                message: language === 'el'
                    ? 'Η πρόσκληση στάλθηκε επιτυχώς'
                    : 'Invite sent successfully',
                link: `/invite/${invite.id}`
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
