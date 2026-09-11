/**
 * Shared read model for the post-upload extraction review screen.
 *
 * Plain module (NOT "use server") so the types and sync helpers are usable
 * from server pages, server actions, and client components alike. All data
 * comes from Policy columns + the acordData JSON blob written by
 * lib/services/ai/extraction-enrichment.ts.
 */

import * as Sentry from '@sentry/nextjs'

import { isSameDocumentDate, parseDocumentDate } from '@/lib/dates/document-date'
import { resolveInsurerDisplay } from '@/lib/wallet/insurer-registry'
import {
    isPlaceholderInsurerName,
    isPlaceholderPolicyNumber,
} from '@/lib/wallet/policy-identity'
import { branchFamilyId } from "@/lib/insurance/taxonomy"

export type ReviewState = 'unconfirmed' | 'confirmed' | 'flagged'

/** Deterministic validation state for an extracted date field. */
export interface ReviewFieldFlags {
    /** A raw value exists but no date could be parsed from it. */
    parseFailed: boolean
    /** The value parses, but disagrees with the date in the cited snippet. */
    sourceMismatch: boolean
}

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
    /** Per-field document citations (flag-gated feature; empty when absent). */
    fieldSources: Record<string, { page?: number; snippet?: string }>
    /** Deterministic parse/cross-check state for the date fields. */
    fieldFlags: Record<string, ReviewFieldFlags>
    missingCriticalFields: string[]
    requiresReview: boolean
    reviewState: ReviewState | null
    verified: boolean
    /**
     * Why the analysis did not finish, as a stable code the client maps to
     * Greek copy (TOKEN_LIMIT_BLOCKED, AI_CONSENT_REQUIRED, TIMEOUT, …).
     * Never rendered raw — see lib/i18n/analysis-failure.
     */
    processingErrorCode: string | null
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

/** Blank-or-placeholder → null. Placeholder literals live in policy-identity. */
function sanitize(val: string | null | undefined): string | null {
    if (!val) return null
    if (isPlaceholderInsurerName(val)) return null
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
    // Family, not id: the hand-kept lists here already covered renters and
    // motorbike but not truck or personal accident, so those two lost their
    // section entirely.
    if (branchFamilyId(lob) === 'home') return ['property', 'insuredValue']
    if (branchFamilyId(lob) === 'health') return ['health', 'annualLimit']
    if (branchFamilyId(lob) === 'life') return ['lifeAndInvestment', 'deathBenefit']
    if (branchFamilyId(lob) === 'motor') return ['vehicle', 'estimatedMarketValue']
    if (branchFamilyId(lob) === 'pet') return ['pet', 'annualLimit']
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
    if (branchFamilyId(lob) === 'home') {
        candidates.push(['property', 'replacementValue'], ['home', 'insuredValue'], ['home', 'replacementValue'])
    }
    if (branchFamilyId(lob) === 'pet') {
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

/** Human labels for the acord paths deriveSumInsured can surface. */
const SUM_INSURED_PATH_LABELS: Record<string, { el: string; en: string }> = {
    'health.annualLimit': { el: 'Ετήσιο όριο κάλυψης υγείας', en: 'Annual health coverage limit' },
    'property.insuredValue': { el: 'Ασφαλισμένη αξία κατοικίας', en: 'Insured property value' },
    'property.replacementValue': { el: 'Αξία αντικατάστασης κατοικίας', en: 'Property replacement value' },
    'home.insuredValue': { el: 'Ασφαλισμένη αξία κατοικίας', en: 'Insured home value' },
    'home.replacementValue': { el: 'Αξία αντικατάστασης κατοικίας', en: 'Home replacement value' },
    'lifeAndInvestment.deathBenefit': { el: 'Κεφάλαιο θανάτου', en: 'Death benefit' },
    'vehicle.estimatedMarketValue': { el: 'Εκτιμώμενη αξία οχήματος', en: 'Estimated vehicle value' },
    'pet.annualLimit': { el: 'Ετήσιο όριο κάλυψης κατοικιδίου', en: 'Annual pet coverage limit' },
    'pet.annualLimitTotal': { el: 'Ετήσιο όριο κάλυψης κατοικιδίου', en: 'Annual pet coverage limit' },
    'policy.sumInsured': { el: 'Ασφαλισμένο κεφάλαιο', en: 'Sum insured' },
}

const reportedSumInsuredPaths = new Set<string>()

/**
 * Localized sublabel for the sum-insured source path. Raw acord paths like
 * "health.annualLimit" must never render — unknown paths are reported to
 * Sentry once per process and the sublabel is simply hidden.
 */
export function sumInsuredLabel(path: string | undefined, lang: 'el' | 'en'): string | null {
    if (!path) return null
    const entry = SUM_INSURED_PATH_LABELS[path]
    if (entry) return entry[lang]
    if (!reportedSumInsuredPaths.has(path)) {
        reportedSumInsuredPaths.add(path)
        Sentry.captureMessage('policy-review: unknown sum-insured path', {
            level: 'warning',
            tags: { path },
        })
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

    // Envelope (extracted) dates win over the DB columns: the columns can
    // hold the historical upload-day placeholder when a raw extracted string
    // failed to parse, and the review must show what the document says.
    const envDate = (key: string): string | null => {
        const raw = typeof envelope?.[key] === 'string' ? envelope[key].trim() : ''
        return raw || null
    }
    const issueDate = sanitize(envDate('issueDate'))
    const startDate = envDate('effectiveDate') ?? (policy.startDate ? new Date(policy.startDate).toISOString() : null)
    const endDate = envDate('expirationDate') ?? (policy.endDate ? new Date(policy.endDate).toISOString() : null)
    const renewalDate = sanitize(envDate('renewalDate'))

    const sources: Record<string, { page?: number; snippet?: string }> =
        extraction?.sources && typeof extraction.sources === 'object'
            ? (extraction.sources as Record<string, { page?: number; snippet?: string }>)
            : {}

    const dateFlags = (value: string | null, field: string): ReviewFieldFlags => {
        const parsed = value ? parseDocumentDate(value) : null
        const snippet = sources[field]?.snippet
        return {
            parseFailed: Boolean(value && !parsed),
            sourceMismatch: Boolean(
                parsed && snippet && parseDocumentDate(snippet) && !isSameDocumentDate(value, snippet)
            ),
        }
    }

    const rawInsurer = sanitize(policy.insurerName)

    return {
        id: policy.id,
        status: policy.status,
        insurerName: rawInsurer ? resolveInsurerDisplay(rawInsurer).displayName : null,
        lineOfBusiness: policy.lineOfBusiness,
        policyNumber: isPlaceholderPolicyNumber(policy.policyNumber)
            ? null
            : policy.policyNumber,
        issueDate,
        startDate,
        endDate,
        renewalDate,
        premiumAmount: asNumber(policy.premiumAmount),
        premiumCurrency: policy.premiumCurrency || 'EUR',
        premiumFrequency: typeof envelope?.premiumFrequency === 'string' ? envelope.premiumFrequency : null,
        sumInsured: deriveSumInsured(policy.lineOfBusiness, acord),
        coverageSummary:
            policy.coverageSummary ||
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
        fieldSources: sources,
        fieldFlags: {
            issueDate: dateFlags(issueDate, 'issueDate'),
            startDate: dateFlags(startDate, 'startDate'),
            endDate: dateFlags(endDate, 'endDate'),
            renewalDate: dateFlags(renewalDate, 'renewalDate'),
        },
        missingCriticalFields: asArray<unknown>(extraction?.missingCriticalFields)
            .map((f) => (typeof f === 'string' ? f : ''))
            .filter(Boolean),
        requiresReview: Boolean(extraction?.requiresReview),
        reviewState,
        verified: Boolean(extraction && !extraction.requiresReview),
        processingErrorCode:
            typeof acord?.processingError?.code === 'string' ? acord.processingError.code : null,
    }
}
