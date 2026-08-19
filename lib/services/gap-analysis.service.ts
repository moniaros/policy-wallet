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
import { enrichExtractionPayload } from '@/lib/services/ai/extraction-enrichment'
import { documentMimeType } from '@/lib/security/file-upload'

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

    // NOTE: analyzePolicy() lived here until Aug 2026. It was a THIRD gap
    // pipeline — its own AI call, its own delete-and-recreate of GapInstance,
    // and a third provenance for severity (GapDefinition.defaultSeverity,
    // where the orchestrator used a hardcoded literal and the clarity pass used
    // the model's enum). Nothing imported the action that called it.
    //
    // Three code paths that each decide what a customer's coverage gaps are is
    // three answers waiting to disagree. There is one now: the orchestrator,
    // deciding through lib/gap-detection.ts.
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

        if (!gap.policy) {
            throw AppError.notFound('Gap policy', gapInstanceId)
        }

        // Central authorization rule: mutating a gap requires WRITE access to
        // its policy. The old check accepted any active grant between the two
        // users regardless of scope — a read-only or unrelated-policy grant
        // could resolve gaps. Grants are fetched through this.db (the class's
        // injected client) and decided by the PURE computePolicyAccess, so
        // tests and transactional callers keep their DI boundary.
        const { computePolicyAccess } = await import('@/lib/policy-access')
        const grants = await this.db.accessGrant.findMany({
            where: { granteeUserId: userId, granterUserId: gap.policy.ownerUserId, status: 'active' },
            select: { status: true, scope: true, permissions: true },
        })
        const access = computePolicyAccess({
            policy: { id: gap.policy.id, ownerUserId: gap.policy.ownerUserId, createdByUserId: gap.policy.createdByUserId },
            viewer: { id: userId },
            grants,
            relationship: null,
        })
        if (!access.canWrite) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Δεν έχετε δικαίωμα να επιλύσετε αυτό το κενό'
                    : 'You do not have permission to resolve this gap'
            )
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

        if (!gap.policy) {
            throw AppError.notFound('Gap policy', gapInstanceId)
        }

        // Central authorization rule: mutating a gap requires WRITE access to
        // its policy (see resolveGap above — same DI-respecting shape).
        const { computePolicyAccess } = await import('@/lib/policy-access')
        const grants = await this.db.accessGrant.findMany({
            where: { granteeUserId: userId, granterUserId: gap.policy.ownerUserId, status: 'active' },
            select: { status: true, scope: true, permissions: true },
        })
        const access = computePolicyAccess({
            policy: { id: gap.policy.id, ownerUserId: gap.policy.ownerUserId, createdByUserId: gap.policy.createdByUserId },
            viewer: { id: userId },
            grants,
            relationship: null,
        })
        if (!access.canWrite) {
            throw AppError.forbidden(
                language === 'el'
                    ? 'Δεν έχετε δικαίωμα να απορρίψετε αυτό το κενό'
                    : 'You do not have permission to dismiss this gap'
            )
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
