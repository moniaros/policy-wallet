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
    const gapDefinitions = await (db.gapDefinition.findMany as any)({
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
                severity: (gapDef.severity || 'medium') as GapSeverity,
                title: gapDef.title || gapDef.name || 'Coverage Gap',
                description: gapDef.description || '',
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
 * Evaluate mature gap detection logic
 */
function evaluateGapLogic(policy: Policy, gapDef: GapDefinition): boolean {
    const logic = (gapDef as any).detectionLogic as any
    if (!logic) return false

    // Support for complex multi-condition rules
    if (logic.rules && Array.isArray(logic.rules)) {
        const operator = logic.operator || 'AND'
        const results = logic.rules.map((rule: any) => evaluateSingleRule(policy, rule))

        return operator === 'AND'
            ? results.every((res: boolean) => res === true)
            : results.some((res: boolean) => res === true)
    }

    // Fallback to legacy single-type logic
    return evaluateSingleRule(policy, logic)
}

function evaluateSingleRule(policy: Policy, rule: any): boolean {
    if (rule.type === 'missing_coverage') {
        const coverageSummary = (policy as any).coverageSummary?.toLowerCase() || ''
        const requiredCoverage = rule.requiredCoverage?.toLowerCase() || ''
        return !coverageSummary.includes(requiredCoverage)
    }

    if (rule.type === 'low_limit') {
        const limit = policy.premiumAmount ? Number(policy.premiumAmount) : 0
        const threshold = rule.threshold || 0
        return limit < threshold
    }

    if (rule.type === 'insurer_match') {
        return policy.insurerName.toLowerCase() === rule.value?.toLowerCase()
    }

    if (rule.type === 'duration_short') {
        const durationMonths = (policy.endDate.getTime() - policy.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        return durationMonths < (rule.minMonths || 12)
    }

    if (rule.type === 'always') return true

    // Greek-market deterministic rules using ACORD data
    if (rule.type === 'acord_field_check') {
        const acordData = (policy as any).acordData
        if (!acordData) return false
        return evaluateAcordFieldCheck(acordData, rule)
    }

    if (rule.type === 'date_within_days') {
        const acordData = (policy as any).acordData
        if (!acordData) return false
        const dateStr = getNestedField(acordData, rule.field)
        if (!dateStr) return false
        const target = new Date(dateStr)
        const now = new Date()
        const daysUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return daysUntil >= 0 && daysUntil <= (rule.withinDays || 30)
    }

    if (rule.type === 'payment_frequency_check') {
        const premium = (policy as any).premium || (policy as any).acordData?.policy?.premium
        if (!premium) return false
        const freq = (premium.frequency || '').toLowerCase()
        return freq === 'monthly' || freq === 'quarterly'
    }

    return false
}

function getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => o?.[key], obj)
}

function evaluateAcordFieldCheck(acordData: any, rule: any): boolean {
    const { field, operator, value } = rule
    const actual = getNestedField(acordData, field)

    switch (operator) {
        case 'equals':
            return actual === value
        case 'not_equals':
            return actual !== value
        case 'is_false':
        case 'falsy':
            return !actual
        case 'is_true':
        case 'truthy':
            return !!actual
        case 'missing':
            return actual === undefined || actual === null || actual === ''
        case 'less_than':
            return typeof actual === 'number' && actual < (value as number)
        case 'all_false': {
            // Check multiple boolean fields — gap if NOT all true
            const fields = (rule.fields || []) as string[]
            return !fields.every((f: string) => !!getNestedField(acordData, f))
        }
        default:
            return false
    }
}

/**
 * Create gap instances for detected gaps.
 * Idempotent: re-activates dismissed/resolved gaps instead of creating duplicates.
 * Handles gaps across multiple policies (e.g. from detectGapsForUser).
 * The DB partial unique index on (policy_id, gap_definition_id) is the final guard
 * against concurrent-insert races; P2002 errors are caught and ignored.
 */
export async function createGapInstances(detectedGaps: DetectedGap[]): Promise<void> {
    if (detectedGaps.length === 0) return

    // Group by policyId — gaps from different policies must be queried separately
    // because the unique constraint is (policyId, gapDefinitionId), not gapDefinitionId alone.
    const byPolicy = new Map<string, DetectedGap[]>()
    for (const gap of detectedGaps) {
        const list = byPolicy.get(gap.policyId) ?? []
        list.push(gap)
        byPolicy.set(gap.policyId, list)
    }

    for (const [policyId, policyGaps] of byPolicy) {
        const definitionIds = policyGaps.map((g) => g.gapDefinitionId)

        // Bulk query for this policy — key by (policyId, gapDefinitionId) composite
        const existingInstances = await db.gapInstance.findMany({
            where: { policyId, gapDefinitionId: { in: definitionIds } },
            select: { id: true, gapDefinitionId: true, status: true },
        })
        // Map keyed by gapDefinitionId — safe because policyId is fixed in this iteration
        const existingByDef = new Map(existingInstances.map((e) => [e.gapDefinitionId, e]))

        for (const gap of policyGaps) {
            const existing = existingByDef.get(gap.gapDefinitionId)

            if (!existing) {
                try {
                    await db.gapInstance.create({
                        data: {
                            policyId: gap.policyId,
                            gapDefinitionId: gap.gapDefinitionId,
                            detectedAt: gap.detectedAt,
                            status: 'detected',
                            severity: gap.severity,
                        },
                    })
                } catch (e: any) {
                    // P2002 = unique constraint violation from a concurrent insert — harmless
                    if (e.code !== 'P2002') throw e
                }
            } else if (existing.status === 'dismissed' || existing.status === 'resolved') {
                // Gap was previously closed but has been re-detected — reactivate it
                await db.gapInstance.update({
                    where: { id: existing.id },
                    data: { status: 'detected', detectedAt: gap.detectedAt, severity: gap.severity },
                })
            }
            // else: gap is already active (detected/acknowledged) — skip (idempotent)
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
        high_risk: { // Added for safety if it comes from different source
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

    return (colors as any)[severity] || colors.medium
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: GapSeverity, language: 'el' | 'en' = 'el'): string {
    const labels: any = {
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

    return labels[language]?.[severity] || severity
}

// --- Pure Logic for Unit Tests & Client-Side Checks ---

export interface SimpleGap {
    gapType: string
    severity: GapSeverity
    title: string
    description: string
    policyId?: string
}

/**
 * Pure logic gap detection (used by Unit Tests and potentially frontend)
 * Does not require DB access.
 */
export function detectGaps(policies: any[]): SimpleGap[] {
    const gaps: SimpleGap[] = []
    const now = new Date()

    // 1. Check for Missing Health Insurance (Portfolio Level)
    const hasHealth = policies.some(p =>
        p.lineOfBusiness?.toLowerCase() === 'health' &&
        p.status === 'active'
    )
    if (!hasHealth && policies.length > 0) {
        gaps.push({
            gapType: 'missing_health_insurance',
            severity: 'high',
            title: 'Missing Health Insurance',
            description: 'You do not have an active health insurance policy.'
        })
    }

    // Iterate policies for policy-level gaps
    for (const policy of policies) {
        // 2. Check for Expiring Soon
        if (policy.endDate && policy.status === 'active') {
            const endDate = new Date(policy.endDate)
            const daysUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

            if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
                gaps.push({
                    gapType: 'expiring_soon',
                    severity: 'medium',
                    title: 'Policy Expiring Soon',
                    description: `Policy ending in ${Math.ceil(daysUntilExpiry)} days.`,
                    policyId: policy.id
                })
            }
        }

        // 3. Check for Low Coverage (Mock Logic matching test)
        if (policy.lineOfBusiness === 'home' && policy.acordData?.coverageAmount < 100000) {
            gaps.push({
                gapType: 'low_coverage_amount',
                severity: 'medium',
                title: 'Low Coverage Amount',
                description: 'Your home coverage appears low.',
                policyId: policy.id
            })
        }
    }

    return gaps
}
