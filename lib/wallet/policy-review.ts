/**
 * Shared read model for the post-upload extraction review screen.
 *
 * Plain module (NOT "use server") so the types and sync helpers are usable
 * from server pages, server actions, and client components alike. All data
 * comes from Policy columns + the acordData JSON blob written by
 * lib/services/ai/extraction-enrichment.ts.
 */

export type ReviewState = 'unconfirmed' | 'confirmed' | 'flagged'

export interface ReviewCoverage {
    name: string
    type?: string
    limit?: string
    deductible?: string
    description?: string
    explanation?: { en: string; el: string }
}

export interface ReviewPerk {
    perkType: string
    name: { en: string; el: string }
    description: { en: string; el: string }
    usageLimit?: string
    contactPhone?: string
}

export interface ReviewCondition {
    conditionType: string
    summary: { en: string; el: string }
    value?: string
    deadline?: string
    userActionRequired?: boolean
}

export interface ReviewFinePrint {
    clause: string
    section?: string
    riskLevel: 'info' | 'warning' | 'critical'
    impactSummary?: { en: string; el: string }
}

export interface PolicyReviewData {
    id: string
    status: string
    insurerName: string | null
    lineOfBusiness: string
    policyNumber: string | null
    issueDate: string | null
    startDate: string | null
    endDate: string | null
    renewalDate: string | null
    premiumAmount: number | null
    premiumCurrency: string
    premiumFrequency: string | null
    sumInsured: { value: number; label: string } | null
    coverageSummary: string | null
    coverages: ReviewCoverage[]
    exclusions: string[]
    perksAndBenefits: ReviewPerk[]
    notableConditions: ReviewCondition[]
    finePrintClauses: ReviewFinePrint[]
    overallConfidence: number | null
    fieldConfidence: Record<string, number>
    missingCriticalFields: string[]
    requiresReview: boolean
    reviewState: ReviewState | null
    verified: boolean
}

interface PolicyRowForReview {
    id: string
    status: string
    insurerName: string | null
    lineOfBusiness: string
    policyNumber: string | null
    startDate: Date | null
    endDate: Date | null
    premiumAmount: unknown
    premiumCurrency: string | null
    coverageSummary?: string | null
    acordData: unknown
}

function sanitize(val: string | null | undefined, marker?: string): string | null {
    if (!val) return null
    if (val === '__PENDING_EXTRACTION__') return null
    if (marker && val.startsWith(marker)) return null
    return val
}

function asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : []
}

/**
 * Where the "sum insured" for a line of business lives inside acordData.
 * Returns [section, key]; the write target is always the canonical section.
 */
export function sumInsuredTargetPath(lineOfBusiness: string): [section: string, key: string] {
    const lob = (lineOfBusiness || '').toLowerCase()
    if (lob === 'home' || lob === 'renters' || lob === 'property') return ['property', 'insuredValue']
    if (lob === 'health') return ['health', 'annualLimit']
    if (lob === 'life' || lob === 'income_protection' || lob === 'disability') return ['lifeAndInvestment', 'deathBenefit']
    if (lob === 'motor' || lob === 'motorbike') return ['vehicle', 'estimatedMarketValue']
    if (lob === 'pet') return ['pet', 'annualLimit']
    return ['policy', 'sumInsured']
}

/**
 * Read the sum insured for display, checking the canonical section first and
 * legacy aliases second. `label` is the source path, shown as a sublabel.
 */
export function deriveSumInsured(
    lineOfBusiness: string,
    acord: any
): { value: number; label: string } | null {
    if (!acord) return null
    const [section, key] = sumInsuredTargetPath(lineOfBusiness)

    const candidates: Array<[string, string]> = [[section, key]]
    const lob = (lineOfBusiness || '').toLowerCase()
    if (lob === 'home' || lob === 'renters' || lob === 'property') {
        candidates.push(['property', 'replacementValue'], ['home', 'insuredValue'], ['home', 'replacementValue'])
    }
    if (lob === 'pet') {
        candidates.push(['pet', 'annualLimitTotal'])
    }

    for (const [sec, k] of candidates) {
        const value = asNumber(acord?.[sec]?.[k])
        if (value !== null && value > 0) {
            return { value, label: `${sec}.${k}` }
        }
    }
    return null
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown'

/** 80 matches the pipeline's requiresReview cutoff (extraction-enrichment). */
export function confidenceLevel(score: number | undefined | null): ConfidenceLevel {
    if (score === undefined || score === null || !Number.isFinite(score)) return 'unknown'
    if (score >= 80) return 'high'
    if (score >= 50) return 'medium'
    return 'low'
}

export function buildPolicyReviewData(policy: PolicyRowForReview): PolicyReviewData {
    const acord = (policy.acordData as any) || {}
    const extraction = acord?.extraction || null
    const envelope = acord?.policy || {}

    const reviewState: ReviewState | null =
        extraction?.reviewState === 'unconfirmed' ||
        extraction?.reviewState === 'confirmed' ||
        extraction?.reviewState === 'flagged'
            ? extraction.reviewState
            : null

    return {
        id: policy.id,
        status: policy.status,
        insurerName: sanitize(policy.insurerName),
        lineOfBusiness: policy.lineOfBusiness,
        policyNumber: sanitize(policy.policyNumber, 'PENDING-'),
        issueDate: sanitize(typeof envelope?.issueDate === 'string' ? envelope.issueDate : null),
        startDate: policy.startDate ? new Date(policy.startDate).toISOString() : null,
        endDate: policy.endDate ? new Date(policy.endDate).toISOString() : null,
        renewalDate: sanitize(typeof envelope?.renewalDate === 'string' ? envelope.renewalDate : null),
        premiumAmount: asNumber(policy.premiumAmount),
        premiumCurrency: policy.premiumCurrency || 'EUR',
        premiumFrequency: typeof envelope?.premiumFrequency === 'string' ? envelope.premiumFrequency : null,
        sumInsured: deriveSumInsured(policy.lineOfBusiness, acord),
        coverageSummary:
            policy.coverageSummary ||
            acord?.coverageSummary ||
            extraction?.coverageSummary ||
            null,
        coverages: asArray<ReviewCoverage>(acord?.coverages).filter((c) => c && typeof c.name === 'string'),
        exclusions: asArray<unknown>(acord?.exclusions)
            .map((e) => (typeof e === 'string' ? e.trim() : ''))
            .filter(Boolean),
        perksAndBenefits: asArray<ReviewPerk>(acord?.perksAndBenefits).filter((p) => p && p.name),
        notableConditions: asArray<ReviewCondition>(acord?.notableConditions).filter((c) => c && c.summary),
        finePrintClauses: asArray<ReviewFinePrint>(acord?.finePrintClauses).filter((f) => f && typeof f.clause === 'string'),
        overallConfidence: asNumber(extraction?.confidence?.overall),
        fieldConfidence:
            extraction?.confidence?.fields && typeof extraction.confidence.fields === 'object'
                ? (extraction.confidence.fields as Record<string, number>)
                : {},
        missingCriticalFields: asArray<unknown>(extraction?.missingCriticalFields)
            .map((f) => (typeof f === 'string' ? f : ''))
            .filter(Boolean),
        requiresReview: Boolean(extraction?.requiresReview),
        reviewState,
        verified: Boolean(extraction && !extraction.requiresReview),
    }
}
