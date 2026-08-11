/**
 * What a policy asks of its holder, and what follows from that.
 *
 * `acordData.conditions` is where warranties and conditions of cover now live.
 * This module turns them into the three things the product can act on, all from
 * the same source:
 *
 *  - a **condition gap** — cover exists but rests on something the customer may
 *    not satisfy, which is a different finding from having no cover at all;
 *  - a **prevention action** — an alarm, a service, a locked key cabinet. These
 *    map onto the risk engine's existing `reduce` mitigation kind, so prevention
 *    is not a new subsystem, it is content for one that already exists;
 *  - a **compliance obligation** — a recurring requirement with a due date, which
 *    is the only genuinely new notification this expansion needs.
 *
 * The insight worth stating plainly: on these lines prevention and cover are the
 * SAME conversation. The cyber policy excludes loss following a failure to change
 * a device's default password; the yacht warrants annual servicing; the cash
 * policy requires an alarm linked to a monitoring centre. In each case the
 * control is not advice sitting beside the insurance — it is a term of it.
 */

import type { AcordDataInput } from '@/lib/schemas/acord-data'

type ConditionInput = NonNullable<AcordDataInput['conditions']>[number]

export type ConditionSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * How much a breach costs, from what the policy itself says.
 *
 * `voids_cover` is `critical` because the customer keeps paying and has nothing;
 * an unknown effect is `medium` rather than `low`, since the honest reading of
 * "we could not tell what breaching this does" is caution, not comfort.
 */
export function conditionSeverity(condition: ConditionInput): ConditionSeverity {
    switch (condition.breachEffect) {
        case 'voids_cover':
            return 'critical'
        case 'suspends_cover':
            return 'high'
        case 'reduces_claim':
            return 'medium'
        default:
            return condition.kind === 'warranty' ? 'high' : 'medium'
    }
}

/** Conditions the customer can actually do something about. */
const ACTIONABLE_KINDS = new Set(['security_requirement', 'maintenance', 'documentation', 'reporting'])

export function isPreventable(condition: ConditionInput): boolean {
    return ACTIONABLE_KINDS.has(condition.kind)
}

export interface PreventionAction {
    /** Stable id derived from the condition, so a card does not change identity between runs. */
    id: string
    kind: ConditionInput['kind']
    severity: ConditionSeverity
    text: string
    summary?: { en: string; el: string }
    /** True where the customer could confirm it themselves today. */
    verifiable: boolean
    recurrence?: ConditionInput['recurrence']
}

/**
 * The prevention actions a policy's own terms imply.
 *
 * Deliberately derived rather than authored: these are the insurer's
 * requirements read back, not our advice. That distinction is what keeps the
 * output on the right side of the advice boundary — we are describing the
 * contract, not recommending a course of action.
 */
export function preventionActions(
    conditions: AcordDataInput['conditions'] | undefined | null
): PreventionAction[] {
    return (conditions ?? [])
        .filter(isPreventable)
        .map((condition, index) => ({
            id: conditionId(condition, index),
            kind: condition.kind,
            severity: conditionSeverity(condition),
            text: condition.text,
            summary: condition.summary,
            verifiable: condition.verifiable ?? false,
            recurrence: condition.recurrence,
        }))
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

const SEVERITY_RANK: Record<ConditionSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

export interface ConditionGap {
    id: string
    severity: ConditionSeverity
    text: string
    summary?: { en: string; el: string }
    /**
     * Why this is reported. `unverified` means we can see the requirement and
     * cannot see whether it is met — which is a question for the customer, not
     * an accusation.
     */
    reason: 'unverified' | 'depends_on_other_policy'
    /** Branch id of the policy this condition depends on, when it names one. */
    dependsOnLine?: string
}

/**
 * Conditions worth putting in front of someone.
 *
 * Only conditions whose breach actually costs something are reported: a
 * `reduces_claim` documentation note is real but does not belong on the same
 * surface as a warranty that voids the contract. Cross-policy dependencies are
 * always reported, whatever their stated effect, because they are invisible from
 * inside the policy that carries them — the customer cannot know that letting a
 * property policy lapse quietly undermines their cash cover.
 */
export function conditionGaps(
    conditions: AcordDataInput['conditions'] | undefined | null
): ConditionGap[] {
    const gaps: ConditionGap[] = []

    ;(conditions ?? []).forEach((condition, index) => {
        const severity = conditionSeverity(condition)

        if (condition.dependsOnOtherPolicy) {
            gaps.push({
                id: conditionId(condition, index),
                severity: severity === 'medium' ? 'high' : severity,
                text: condition.text,
                summary: condition.summary,
                reason: 'depends_on_other_policy',
                dependsOnLine: condition.dependsOnOtherPolicy,
            })
            return
        }

        if (severity === 'critical' || severity === 'high') {
            gaps.push({
                id: conditionId(condition, index),
                severity,
                text: condition.text,
                summary: condition.summary,
                reason: 'unverified',
            })
        }
    })

    return gaps.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

export interface ComplianceObligation {
    id: string
    text: string
    summary?: { en: string; el: string }
    recurrence: NonNullable<ConditionInput['recurrence']>
    severity: ConditionSeverity
    /** ISO date the policy itself names, when it names one. */
    dueBy?: string
}

/**
 * Recurring obligations — the compliance calendar.
 *
 * `continuous` requirements (an alarm that must stay connected) are included: a
 * standing obligation still needs a periodic check, and the whole failure mode
 * is that it silently stops being true. One-off conditions are excluded, since a
 * reminder to do something already done is noise.
 */
export function complianceObligations(
    conditions: AcordDataInput['conditions'] | undefined | null
): ComplianceObligation[] {
    return (conditions ?? [])
        .filter((c): c is ConditionInput & { recurrence: NonNullable<ConditionInput['recurrence']> } =>
            c.recurrence === 'annual' || c.recurrence === 'periodic' || c.recurrence === 'continuous')
        .map((condition, index) => ({
            id: conditionId(condition, index),
            text: condition.text,
            summary: condition.summary,
            recurrence: condition.recurrence,
            severity: conditionSeverity(condition),
            dueBy: condition.dueBy,
        }))
}

/**
 * A stable id for a condition.
 *
 * Content-derived rather than positional, so re-extraction that reorders the
 * list does not mint new cards for conditions the customer has already seen.
 * The index is only a tiebreaker for genuinely identical text.
 */
function conditionId(condition: ConditionInput, index: number): string {
    const slug = condition.text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
    return slug ? `${condition.kind}:${slug}` : `${condition.kind}:${index}`
}
