/**
 * Subject-access projection of the MEDIC qualification snapshot (GDPR Art. 15).
 *
 * The medic JSON is a profile ABOUT a policyholder — what the advisor concluded
 * their need is, how much is at risk in €, how far along the decision is. That
 * is personal data undergoing processing, so it belongs in the subject's data
 * export, exactly like `detectedGaps` and `advisorRelationships` already do.
 * Retention under the agent's own IDD basis (erasure decision, audit H1) is a
 * DIFFERENT right — holding data lawfully never exempts it from disclosure.
 *
 * Art. 15(4): a copy "shall not adversely affect the rights and freedoms of
 * others". The stakeholder map names third parties (spouse, accountant, office
 * manager) who are not the requester, so names and free-text evidence pointers
 * are dropped here; the structure (how many people, in which role, identified
 * or not) is disclosed because it describes how the subject's own case is being
 * handled. Everything about the SUBJECT is disclosed in full.
 */

import type { MedicData } from '@/lib/medic/types'

export interface SubjectStakeholderView {
    stance: string
    party?: string
    identified: boolean
}

export interface SubjectQualificationView {
    pain: {
        category?: string
        summary?: string
        severity?: string
        validationState?: string
        gapInstanceIds?: string[]
    } | null
    metrics: { valueAtRisk?: number; targetOutcome?: string } | null
    criteria: Array<{ label: string; met: boolean; compliance: boolean }>
    decisionProcess: { compellingEvent?: string; compellingEventAt?: string } | null
    /** Third-party names deliberately omitted — see Art. 15(4) above. */
    stakeholders: SubjectStakeholderView[]
    thirdPartyNamesWithheld: boolean
}

export function toSubjectQualificationView(medic: unknown): SubjectQualificationView | null {
    if (!medic || typeof medic !== 'object' || Array.isArray(medic)) return null
    const data = medic as MedicData

    const stakeholders = Array.isArray(data.stakeholders) ? data.stakeholders : []

    return {
        pain: data.pain
            ? {
                  category: data.pain.category,
                  summary: data.pain.summary,
                  severity: data.pain.severity,
                  validationState: data.pain.validationState,
                  gapInstanceIds: data.pain.gapInstanceIds,
              }
            : null,
        metrics: data.metrics
            ? { valueAtRisk: data.metrics.valueAtRisk, targetOutcome: data.metrics.targetOutcome }
            : null,
        criteria: Array.isArray(data.criteria)
            ? data.criteria.map((c) => ({
                  label: c.label,
                  met: c.met === true,
                  compliance: c.compliance === true,
              }))
            : [],
        decisionProcess: data.decisionProcess
            ? {
                  compellingEvent: data.decisionProcess.compellingEvent,
                  compellingEventAt: data.decisionProcess.compellingEventAt,
              }
            : null,
        stakeholders: stakeholders.map((s) => ({
            stance: s.stance,
            party: s.party,
            identified: s.identified === true,
        })),
        thirdPartyNamesWithheld: stakeholders.length > 0,
    }
}
