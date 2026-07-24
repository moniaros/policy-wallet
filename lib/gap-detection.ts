import type { Policy, GapDefinition } from '@prisma/client'
import { db } from '@/lib/db'
import { isPolicyCoverageActive, calendarDaysUntil } from '@/lib/policy-status'

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
    const allPolicies = await db.policy.findMany({
        where: {
            ownerUserId: userId,
        },
    })

    // Lapsed policies carry no current risk — detecting gaps "inside" a
    // policy that no longer covers anything just manufactures false findings.
    const policies = allPolicies.filter((policy) => isPolicyCoverageActive(policy))

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
        // An EMPTY summary is not evidence of missing cover. `coverageSummary` is
        // a nullable free-text column that many policies never get — and with
        // `''.includes(x)` false for any non-empty x, an unpopulated field made
        // every configured missing-coverage rule fire at once. The one policy
        // least understood by the product was the one reported as riddled with
        // gaps.
        const coverageSummary = (policy as any).coverageSummary?.toLowerCase() || ''
        const requiredCoverage = rule.requiredCoverage?.toLowerCase() || ''
        if (!coverageSummary || !requiredCoverage) return false
        return !coverageSummary.includes(requiredCoverage)
    }

    if (rule.type === 'low_limit') {
        // A limit is the SUM INSURED — what the policy would pay. This read
        // `premiumAmount`, what the customer pays for it: different quantities,
        // routinely three orders of magnitude apart. A rule set to flag cover
        // below €500,000 matched every policy in the book, because no premium is
        // half a million euros; a rule set at €200 flagged cheap policies while
        // claiming their COVER was inadequate. The check could not be right at
        // any threshold.
        const acord = (policy as any).acordData
        const declared =
            getNestedField(acord, rule.field || 'coverage.sumInsured') ??
            getNestedField(acord, 'property.insuredValue') ??
            getNestedField(acord, 'coverage.sumInsured')
        // Unknown sum insured is not a low one — say nothing rather than guess.
        if (typeof declared !== 'number' || !Number.isFinite(declared)) return false
        const threshold = rule.threshold || 0
        return declared < threshold
    }

    if (rule.type === 'insurer_match') {
        return policy.insurerName.toLowerCase() === rule.value?.toLowerCase()
    }

    if (rule.type === 'duration_short') {
        // Calendar arithmetic, not days ÷ 30.44. The average-month divisor made a
        // standard 365-day annual policy compute as 11.99 months, so it was
        // flagged as short — while the SAME policy spanning a leap day (366 days)
        // computed as 12.02 and was not. Whether a customer's annual cover looked
        // unusually short came down to which side of 29 February it fell.
        // detectionLogic is a JSON column, so an admin can add a duration rule at
        // any time; this is reachable, not hypothetical.
        const minMonths = rule.minMonths || 12
        const threshold = new Date(policy.startDate.getTime())
        const dayOfMonth = threshold.getUTCDate()
        threshold.setUTCMonth(threshold.getUTCMonth() + minMonths)
        // Rolled past the end of a shorter month (31 Jan + 1 → 3 Mar): step back.
        if (threshold.getUTCDate() < dayOfMonth) threshold.setUTCDate(0)
        return policy.endDate.getTime() < threshold.getTime()
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
        if (Number.isNaN(target.getTime())) return false
        // Athens calendar days, like every other expiry count in the product —
        // this drives the Green Card expiry warning, and a document that expires
        // TODAY must still be inside the window.
        const daysUntil = calendarDaysUntil(target, new Date())
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
 * A second, parallel gap engine used to live here — `detectGaps(policies)`, with
 * its own `SimpleGap` shape and rules for missing health cover, expiring
 * policies and "low coverage amount".
 *
 * It was referenced by nothing but its own test file. Its doc comment said
 * "used by Unit Tests and potentially frontend", one of its rules was commented
 * "Mock Logic matching test", and every title and description it emitted was
 * hardcoded English — so had it ever been wired to a screen it would have shown
 * "Missing Health Insurance" to a Greek policyholder, alongside verdicts that
 * disagreed with the real engine's (different severities, no line-of-business
 * awareness, `=== 'home'` matching that skipped renters).
 *
 * The engine that runs is `detectGapsForPolicy` above, plus
 * lib/services/gap-engine. A ninety-line duplicate with a passing test suite
 * reads as maintained; it was a prototype, and it is gone.
 */

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
