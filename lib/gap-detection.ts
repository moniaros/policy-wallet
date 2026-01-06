import type { Policy, GapDefinition } from '@prisma/client'
import { db } from '@/lib/db'

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low'
export type GapStatus = 'detected' | 'acknowledged' | 'resolved' | 'dismissed'

export interface DetectedGap {
    gapDefinitionId: string
    policyId: string
    severity: GapSeverity
    title: string
    description: string
    detectedAt: Date
}

/**
 * Detect gaps for a single policy
 */
export async function detectGapsForPolicy(policy: Policy): Promise<DetectedGap[]> {
    const detectedGaps: DetectedGap[] = []

    // Get active gap definitions for this line of business
    const gapDefinitions = await db.gapDefinition.findMany({
        where: {
            lineOfBusiness: policy.lineOfBusiness,
            isActive: true,
        },
    })

    for (const gapDef of gapDefinitions) {
        const isGapPresent = evaluateGapLogic(policy, gapDef)

        if (isGapPresent) {
            detectedGaps.push({
                gapDefinitionId: gapDef.id,
                policyId: policy.id,
                severity: gapDef.severity as GapSeverity,
                title: gapDef.title,
                description: gapDef.description,
                detectedAt: new Date(),
            })
        }
    }

    return detectedGaps
}

/**
 * Detect gaps for all user policies
 */
export async function detectGapsForUser(userId: string): Promise<DetectedGap[]> {
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: userId,
        },
    })

    const allGaps: DetectedGap[] = []

    for (const policy of policies) {
        const policyGaps = await detectGapsForPolicy(policy)
        allGaps.push(...policyGaps)
    }

    return allGaps
}

/**
 * Evaluate gap detection logic
 * This is a simplified version - in production, you'd have more sophisticated logic
 */
function evaluateGapLogic(policy: Policy, gapDef: GapDefinition): boolean {
    const logic = gapDef.detectionLogic as any

    // Simple rule evaluation
    // In production, this would be more sophisticated with a proper rule engine

    if (logic.type === 'missing_coverage') {
        // Check if coverage summary doesn't include required coverage
        const coverageSummary = policy.coverageSummary?.toLowerCase() || ''
        const requiredCoverage = logic.requiredCoverage?.toLowerCase() || ''
        return !coverageSummary.includes(requiredCoverage)
    }

    if (logic.type === 'low_limit') {
        // Check if coverage limit is below threshold
        const limit = policy.premiumAmount ? Number(policy.premiumAmount) : 0
        const threshold = logic.threshold || 0
        return limit < threshold
    }

    if (logic.type === 'high_deductible') {
        // Check if deductible is above threshold
        // This would require a deductible field in the policy model
        // For now, we'll skip this check
        return false
    }

    if (logic.type === 'always') {
        // Always detect this gap (for testing or universal gaps)
        return true
    }

    return false
}

/**
 * Create gap instances for detected gaps
 */
export async function createGapInstances(detectedGaps: DetectedGap[]): Promise<void> {
    for (const gap of detectedGaps) {
        // Check if gap instance already exists
        const existing = await db.gapInstance.findFirst({
            where: {
                policyId: gap.policyId,
                gapDefinitionId: gap.gapDefinitionId,
                status: {
                    in: ['detected', 'acknowledged'],
                },
            },
        })

        // Only create if doesn't exist
        if (!existing) {
            await db.gapInstance.create({
                data: {
                    policyId: gap.policyId,
                    gapDefinitionId: gap.gapDefinitionId,
                    detectedAt: gap.detectedAt,
                    status: 'detected',
                },
            })
        }
    }
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: GapSeverity): {
    bg: string
    text: string
    border: string
    dot: string
} {
    const colors = {
        critical: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
            dot: 'bg-red-500',
        },
        high: {
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            text: 'text-orange-700 dark:text-orange-400',
            border: 'border-orange-200 dark:border-orange-800',
            dot: 'bg-orange-500',
        },
        medium: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
            dot: 'bg-amber-500',
        },
        low: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-700 dark:text-blue-400',
            border: 'border-blue-200 dark:border-blue-800',
            dot: 'bg-blue-500',
        },
    }

    return colors[severity]
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: GapSeverity, language: 'el' | 'en' = 'el'): string {
    const labels = {
        el: {
            critical: 'Κρίσιμο',
            high: 'Υψηλό',
            medium: 'Μέτριο',
            low: 'Χαμηλό',
        },
        en: {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        },
    }

    return labels[language][severity]
}
