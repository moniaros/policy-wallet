/**
 * Gap Analysis Service
 * 
 * Handles coverage gap detection and analysis using AI.
 * Identifies potential coverage gaps in insurance policies and provides
 * recommendations for improvement.
 */

import { BaseService } from './base.service'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import path from 'path'
import fs from 'fs/promises'
import type { Policy, GapInstance } from '@prisma/client'
import type { GapSeverity, GapStatus } from '@/types'

// Type Definitions
export interface GapAnalysisResult {
    success: boolean
    count: number
    message?: string
}

export interface DetectedGap {
    gapDefinitionId: string
    policyId: string
    severity: GapSeverity
    title: string
    description: string
    detectedAt: Date
}

export interface GapDefinition {
    id: string
    name: string
    slug: string
    description: string | null
    lineOfBusiness: string
    isActive: boolean
    defaultSeverity: string
    detectionLogic: any
}

export interface VerifiedMetadata {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
    coverageSummary?: string
}

export interface GapResult {
    slug: string
    isDetected: boolean
    explanation: { en: string; el: string } | string
    suggestion: { en: string; el: string } | string
}

export interface AIAnalysisResponse {
    verifiedMetadata: VerifiedMetadata
    gapResults: GapResult[]
    acordData?: any
}

// In-memory cache for definitions (simple optimization)
let gapDefinitionsCache: Record<string, GapDefinition[]> = {}
let lastCacheUpdate: number = 0

/**
 * Service for analyzing insurance policy coverage gaps
 */
export class GapAnalysisService extends BaseService {

    /**
     * Analyzes a policy for coverage gaps using AI
     * 
     * Performs comprehensive gap analysis by:
     * 1. Verifying user authorization
     * 2. Fetching applicable gap definitions
     * 3. Using AI to analyze policy documents
     * 4. Creating gap instances for detected issues
     * 5. Updating policy with verified metadata
     * 
     * @param policyId - ID of the policy to analyze
     * @param userId - ID of the user requesting analysis
     * @param language - User's preferred language for error messages
     * @returns Analysis result with gap count
     * 
     * @throws {AppError} NOT_FOUND if policy doesn't exist
     * @throws {AppError} FORBIDDEN if user lacks access
     * @throws {AppError} EXTERNAL_SERVICE if AI service unavailable
     * 
     * @example
     * ```typescript
     * const result = await gapService.analyzePolicy(policyId, userId, 'en')
     * console.log(`Found ${result.count} gaps`)
     * ```
     */
    async analyzePolicy(
        policyId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<GapAnalysisResult> {
        // 1. Authorization
        const policy = await this.db.policy.findUnique({
            where: { id: policyId },
            include: { documents: true }
        })

        if (!policy) {
            throw AppError.notFound('Policy', policyId)
        }

        // Check authorization: Owner OR Authorized Agent
        const isOwner = policy.ownerUserId === userId
        if (!isOwner) {
            const hasAccess = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: policy.ownerUserId,
                    granteeUserId: userId,
                    status: 'active'
                }
            })

            const hasRelationship = !hasAccess ? await this.db.customerRelationship.findFirst({
                where: {
                    agentUserId: userId,
                    policyholderUserId: policy.ownerUserId
                }
            }) : null

            if (!hasAccess && !hasRelationship) {
                throw AppError.forbidden(
                    language === 'el'
                        ? 'Δεν έχετε πρόσβαση σε αυτήν την πολιτική'
                        : 'You do not have access to this policy'
                )
            }
        }

        // 2. Fetch Gap Definitions
        const gaps = await this.getGapDefinitions(policy.lineOfBusiness)

        if (gaps.length === 0) {
            logger('info', 'No gap definitions found for policy', {
                policyId,
                lineOfBusiness: policy.lineOfBusiness
            })
            return {
                success: true,
                count: 0,
                message: language === 'el'
                    ? 'Δεν υπάρχουν εφαρμόσιμοι ορισμοί κενών'
                    : 'No applicable gap definitions'
            }
        }

        // Clear existing gaps to re-analyze
        await this.db.gapInstance.deleteMany({ where: { policyId } })

        // 3. Use AI Service
        const { getAIService } = await import('@/lib/services/ai')
        const aiService = getAIService()

        if (!aiService.isAvailable()) {
            throw AppError.externalService(
                'AI Service',
                new Error('AI service not available')
            )
        }

        try {
            // 4. Prepare Document
            let aiDocument = null
            if (policy.documents.length > 0) {
                const doc = policy.documents[0]
                try {
                    let buffer: Buffer

                    if (doc.fileUrl.startsWith('http')) {
                        const response = await fetch(doc.fileUrl)
                        if (!response.ok) {
                            throw new Error(`Failed to fetch: ${response.statusText}`)
                        }
                        const arrayBuffer = await response.arrayBuffer()
                        buffer = Buffer.from(arrayBuffer)
                    } else {
                        const relativePath = doc.fileUrl.startsWith('/')
                            ? doc.fileUrl.slice(1)
                            : doc.fileUrl
                        const filePath = path.join(process.cwd(), 'public', relativePath)
                        buffer = await fs.readFile(filePath)
                    }

                    // Determine MIME type
                    let mimeType = 'application/pdf'
                    const lowerName = doc.fileName.toLowerCase()
                    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
                        mimeType = 'image/jpeg'
                    } else if (lowerName.endsWith('.png')) {
                        mimeType = 'image/png'
                    } else if (lowerName.endsWith('.webp')) {
                        mimeType = 'image/webp'
                    }

                    aiDocument = {
                        data: buffer.toString('base64'),
                        mimeType,
                        fileName: doc.fileName
                    }

                    logger('info', 'Document prepared for analysis', {
                        policyId,
                        fileName: doc.fileName,
                        mimeType
                    })
                } catch (error) {
                    logger('error', 'Failed to read document for analysis', {
                        policyId,
                        fileUrl: doc.fileUrl,
                        error: error instanceof Error ? error.message : String(error)
                    })

                    throw AppError.externalService(
                        'Document Storage',
                        error instanceof Error ? error : new Error('Failed to read document')
                    )
                }
            }

            // 5. Prepare metadata and gap definitions for AI
            const metadata = {
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber,
                lineOfBusiness: policy.lineOfBusiness,
                startDate: policy.startDate,
                endDate: policy.endDate,
                premiumAmount: policy.premiumAmount ? Number(policy.premiumAmount) : null,
                coverageSummary: policy.coverageSummary
            }

            const gapDefinitions = gaps.map(g => ({
                slug: g.slug,
                name: g.name,
                description: g.description,
                checkCriteria: (g.detectionLogic as any)?.check || g.description || 'Check for this gap'
            }))

            // 6. Call AI Service
            const analysis = await aiService.analyzeGaps(aiDocument, metadata, gapDefinitions, { userId, policyId })
            const { verifiedMetadata, gapResults, acordData } = analysis

            // 7. Update Policy with Verified Data
            await this.db.policy.update({
                where: { id: policyId },
                data: {
                    insurerName: verifiedMetadata.insurerName || policy.insurerName,
                    policyNumber: verifiedMetadata.policyNumber || policy.policyNumber,
                    lineOfBusiness: verifiedMetadata.lineOfBusiness || policy.lineOfBusiness,
                    startDate: this.parseAnalysisDate(verifiedMetadata.startDate) || policy.startDate,
                    endDate: this.parseAnalysisDate(verifiedMetadata.endDate) || policy.endDate,
                    premiumAmount: typeof verifiedMetadata.premiumAmount === 'number'
                        ? verifiedMetadata.premiumAmount
                        : policy.premiumAmount,
                    coverageSummary: verifiedMetadata.coverageSummary || policy.coverageSummary,
                    acordData: acordData || (policy as any).acordData || {},
                    lastAnalyzedAt: new Date()
                }
            })

            // 8. Create Gap Instances
            let detectedCount = 0
            for (const item of gapResults) {
                if (item.isDetected) {
                    const def = gaps.find(g => g.slug === item.slug)
                    if (def) {
                        await this.db.gapInstance.create({
                            data: {
                                policyId,
                                gapDefinitionId: def.id,
                                severity: def.defaultSeverity || 'medium',
                                status: 'open',
                                aiExplanation: typeof item.explanation === 'object'
                                    ? item.explanation.en
                                    : item.explanation || 'No explanation provided',
                                aiExplanationEl: typeof item.explanation === 'object'
                                    ? item.explanation.el
                                    : item.explanation || 'Δεν δόθηκε εξήγηση',
                                aiSuggestion: typeof item.suggestion === 'object'
                                    ? item.suggestion.en
                                    : item.suggestion || 'No suggestion',
                                aiSuggestionEl: typeof item.suggestion === 'object'
                                    ? item.suggestion.el
                                    : item.suggestion || 'Καμία πρόταση',
                                detectedAt: new Date()
                            }
                        })
                        detectedCount++
                    }
                }
            }

            // 9. Log Activity
            await this.logActivity(
                userId,
                'POLICY_ANALYZED',
                `Analyzed policy ${policy.policyNumber} - ${detectedCount} gaps found`,
                { policyId, detectedCount, updated: true }
            )

            logger('info', 'Gap analysis completed successfully', {
                policyId,
                detectedCount,
                totalGapsChecked: gapResults.length,
                aiService: aiService.getServiceName()
            })

            return {
                success: true,
                count: detectedCount,
                message: language === 'el'
                    ? `Βρέθηκαν ${detectedCount} κενά`
                    : `Found ${detectedCount} gaps`
            }

        } catch (error) {
            logger('error', 'Gap analysis failed', {
                policyId,
                error: error instanceof Error ? error.message : String(error)
            })

            throw AppError.externalService(
                'AI Analysis',
                error instanceof Error ? error : new Error('Analysis failed')
            )
        }
    }
    /**
     * Retrieves active gap definitions for a specific line of business
     * 
     * Uses in-memory caching (5 minutes) to reduce database load.
     * 
     * @param lineOfBusiness - Line of business to filter by (optional)
     * @returns Array of gap definitions
     * 
     * @example
     * ```typescript
     * const motorGaps = await gapService.getGapDefinitions('motor')
     * ```
     */
    async getGapDefinitions(lineOfBusiness?: string): Promise<GapDefinition[]> {
        const now = Date.now()

        // Cache for 5 minutes
        if (now - lastCacheUpdate > 5 * 60 * 1000) {
            gapDefinitionsCache = {}
            lastCacheUpdate = now
        }

        const normalizedLOB = lineOfBusiness
            ? lineOfBusiness.toLowerCase().replace(' protection', '').trim()
            : 'all'

        // Check cache
        if (gapDefinitionsCache[normalizedLOB]) {
            return gapDefinitionsCache[normalizedLOB]
        }

        // Fetch from database
        const gaps = await this.db.gapDefinition.findMany({
            where: {
                ...(lineOfBusiness ? {
                    lineOfBusiness: {
                        equals: normalizedLOB,
                        mode: 'insensitive'
                    }
                } : {}),
                isActive: true
            }
        })

        // Parse detection logic if stored as string
        const mappedGaps = gaps.map(g => ({
            ...g,
            detectionLogic: g.detectionLogic
                ? (typeof g.detectionLogic === 'string'
                    ? JSON.parse(g.detectionLogic)
                    : g.detectionLogic)
                : {}
        })) as GapDefinition[]

        // Update cache
        gapDefinitionsCache[normalizedLOB] = mappedGaps

        logger('info', 'Gap definitions loaded', {
            lineOfBusiness: normalizedLOB,
            count: mappedGaps.length
        })

        return mappedGaps
    }

    /**
     * Marks a gap instance as resolved
     * 
     * @param gapInstanceId - ID of the gap instance
     * @param userId - ID of the user resolving the gap
     * @param language - User's preferred language
     * 
     * @throws {AppError} NOT_FOUND if gap doesn't exist
     * @throws {AppError} FORBIDDEN if user lacks authorization
     * 
     * @example
     * ```typescript
     * await gapService.resolveGap(gapId, userId, 'en')
     * ```
     */
    async resolveGap(
        gapInstanceId: string,
        userId: string,
        language: 'en' | 'el' = 'en'
    ): Promise<void> {
        const gap = await this.db.gapInstance.findUnique({
            where: { id: gapInstanceId },
            include: { policy: true }
        })

        if (!gap) {
            throw AppError.notFound('Gap', gapInstanceId)
        }

        // Check authorization
        const isOwner = gap.policy.ownerUserId === userId
        if (!isOwner) {
            // Check for agent access
            const hasAccess = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: gap.policy.ownerUserId,
                    granteeUserId: userId,
                    status: 'active'
                }
            })

            if (!hasAccess) {
                throw AppError.forbidden(
                    language === 'el'
                        ? 'Δεν έχετε δικαίωμα να επιλύσετε αυτό το κενό'
                        : 'You do not have permission to resolve this gap'
                )
            }
        }

        await this.db.gapInstance.update({
            where: { id: gapInstanceId },
            data: { status: 'resolved' }
        })

        await this.logActivity(
            userId,
            'GAP_RESOLVED',
            `Resolved gap ${gapInstanceId}`,
            { gapInstanceId, policyId: gap.policyId }
        )

        logger('info', 'Gap resolved', {
            gapInstanceId,
            userId,
            policyId: gap.policyId
        })
    }

    /**
     * Marks a gap instance as dismissed
     * 
     * @param gapInstanceId - ID of the gap instance
     * @param userId - ID of the user dismissing the gap
     * @param reason - Reason for dismissal
     * @param language - User's preferred language
     * 
     * @throws {AppError} NOT_FOUND if gap doesn't exist
     * @throws {AppError} FORBIDDEN if user lacks authorization
     * 
     * @example
     * ```typescript
     * await gapService.dismissGap(gapId, userId, 'Not applicable', 'en')
     * ```
     */
    async dismissGap(
        gapInstanceId: string,
        userId: string,
        reason: string,
        language: 'en' | 'el' = 'en'
    ): Promise<void> {
        const gap = await this.db.gapInstance.findUnique({
            where: { id: gapInstanceId },
            include: { policy: true }
        })

        if (!gap) {
            throw AppError.notFound('Gap', gapInstanceId)
        }

        // Check authorization
        const isOwner = gap.policy.ownerUserId === userId
        if (!isOwner) {
            // Check for agent access
            const hasAccess = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: gap.policy.ownerUserId,
                    granteeUserId: userId,
                    status: 'active'
                }
            })

            if (!hasAccess) {
                throw AppError.forbidden(
                    language === 'el'
                        ? 'Δεν έχετε δικαίωμα να απορρίψετε αυτό το κενό'
                        : 'You do not have permission to dismiss this gap'
                )
            }
        }

        await this.db.gapInstance.update({
            where: { id: gapInstanceId },
            data: { status: 'dismissed' }
        })

        await this.logActivity(
            userId,
            'GAP_DISMISSED',
            `Dismissed gap ${gapInstanceId}: ${reason}`,
            { gapInstanceId, policyId: gap.policyId, reason }
        )

        logger('info', 'Gap dismissed', {
            gapInstanceId,
            userId,
            policyId: gap.policyId,
            reason
        })
    }

    /**
     * Parses a date string from AI analysis
     * 
     * @param dateString - Date string to parse
     * @returns Parsed Date object or undefined if invalid
     * @private
     */
    private parseAnalysisDate(dateString: string | undefined): Date | undefined {
        if (!dateString) return undefined
        const date = new Date(dateString)
        return isNaN(date.getTime()) ? undefined : date
    }
}
