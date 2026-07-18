import type { PremiumFrequency } from './ai-service.interface'
import { sanitizeExtractionSources } from './extraction-citations'
import { parseDocumentDate, toIsoDateString } from '@/lib/dates/document-date'
import { normalizeTaxId } from '@/lib/identity/tax-id'

type RawExtractionPayload = {
    insurerName?: unknown
    policyNumber?: unknown
    lineOfBusiness?: unknown
    startDate?: unknown
    endDate?: unknown
    premiumAmount?: unknown
    issueDate?: unknown
    premiumFrequency?: unknown
    renewalDate?: unknown
    customerName?: unknown
    customerSurname?: unknown
    customerEmail?: unknown
    customerPhone?: unknown
    customerTaxId?: unknown
    exclusions?: unknown
    extractionConfidence?: unknown
    /** Per-field source citations (flag-gated; see extraction-citations.ts) */
    extractionSources?: unknown
    acordData?: any
}

type EnrichedExtraction = {
    acordData: any
    exclusions: string[]
    extractionMeta: {
        overallConfidence: number
        fieldConfidence: Record<string, number>
        missingCriticalFields: string[]
        requiresReview: boolean
    }
}

const CRITICAL_FIELDS = [
    'insurerName',
    'policyNumber',
    'lineOfBusiness',
    'startDate',
    'endDate',
    'premiumAmount',
] as const

// Scored for confidence but never "critical" — their absence does not
// trigger requiresReview.
const EXTENDED_FIELDS = [
    'issueDate',
    'premiumFrequency',
    'renewalDate',
] as const

const CONFIDENCE_FIELDS = [...CRITICAL_FIELDS, ...EXTENDED_FIELDS]

function asText(value: unknown): string {
    return String(value ?? '').trim()
}

/** Date field: ISO when parseable, otherwise the raw text (review flags it). */
function asDateText(value: unknown): string {
    const raw = asText(value)
    if (!raw) return ''
    return toIsoDateString(parseDocumentDate(raw)) || raw
}

function normalizeConfidenceValue(value: unknown): number | null {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return null
    if (numeric <= 1) return Math.max(0, Math.min(100, numeric * 100))
    return Math.max(0, Math.min(100, numeric))
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .map((item) => {
            if (typeof item === 'string') return item.trim()
            if (item && typeof item === 'object') {
                const obj = item as Record<string, unknown>
                return asText(obj.title || obj.name || obj.label || obj.text || obj.description)
            }
            return ''
        })
        .filter(Boolean)
}

function extractConfidenceMap(payload: RawExtractionPayload): Record<string, number> {
    const raw = (payload.extractionConfidence || {}) as any
    const rawFields = raw?.fields || raw?.fieldConfidence || {}
    const result: Record<string, number> = {}

    for (const key of CONFIDENCE_FIELDS) {
        const normalized = normalizeConfidenceValue(rawFields?.[key])
        if (normalized !== null) {
            result[key] = normalized
        }
    }

    return result
}

export function normalizePremiumFrequency(value: unknown): PremiumFrequency | null {
    const text = asText(value).toLowerCase()
    if (!text) return null
    if (/^(annual|yearly|ετήσι|ετησ)/.test(text) || text === 'year') return 'annual'
    if (/^(semiannual|semi-annual|semi annual|biannual|εξαμην|εξάμην)/.test(text)) return 'semiannual'
    if (/^(quarterly|τριμην|τρίμην)/.test(text)) return 'quarterly'
    if (/^(monthly|μηνια|μηνιά)/.test(text) || text === 'month') return 'monthly'
    if (/^(one_off|one-off|one off|single|lump|εφάπαξ|εφαπαξ)/.test(text)) return 'one_off'
    return null
}

function getMissingCriticalFields(payload: RawExtractionPayload): string[] {
    return CRITICAL_FIELDS.filter((key) => {
        const value = payload[key]
        if (key === 'premiumAmount') {
            return !Number.isFinite(Number(value))
        }
        return !asText(value)
    })
}

export function enrichExtractionPayload(
    payload: RawExtractionPayload,
    existingAcordData?: any,
    provider: string = 'gemini'
): EnrichedExtraction {
    const fieldConfidence = extractConfidenceMap(payload)
    const missingCriticalFields = getMissingCriticalFields(payload)
    const explicitOverall = normalizeConfidenceValue((payload.extractionConfidence as any)?.overall)
    const inferredOverall = Object.values(fieldConfidence).length > 0
        ? Object.values(fieldConfidence).reduce((a, b) => a + b, 0) / Object.values(fieldConfidence).length
        : (missingCriticalFields.length > 0 ? 65 : 85)
    const overallConfidence = explicitOverall ?? inferredOverall

    const explicitRequiresReview = (payload.extractionConfidence as any)?.requiresReview
    const requiresReview = typeof explicitRequiresReview === 'boolean'
        ? explicitRequiresReview
        : overallConfidence < 80 || missingCriticalFields.length > 0

    const exclusions = Array.from(new Set([
        ...toStringArray(payload.exclusions),
        ...toStringArray(payload?.acordData?.exclusions),
        ...toStringArray(existingAcordData?.exclusions),
    ])).slice(0, 12)

    const baseAcord = {
        ...(existingAcordData || {}),
        ...(payload.acordData || {}),
    }
    const customerFirst = asText(payload.customerName)
    const customerLast = asText(payload.customerSurname)
    const customerFullName = [customerFirst, customerLast].filter(Boolean).join(' ').trim()
    const customerEmail = asText(payload.customerEmail)
    const customerPhone = asText(payload.customerPhone)
    const customerTaxId = normalizeTaxId(asText(payload.customerTaxId))

    const extractionSources = sanitizeExtractionSources(payload.extractionSources)

    const acordData = {
        ...baseAcord,
        exclusions,
        extraction: {
            ...(baseAcord?.extraction || {}),
            source: provider,
            extractedAt: new Date().toISOString(),
            confidence: {
                overall: Math.round(overallConfidence),
                fields: fieldConfidence,
            },
            // Per-field document citations — a fresh extraction replaces the
            // previous set; re-analysis without citations keeps the old ones.
            ...(extractionSources
                ? { sources: extractionSources }
                : baseAcord?.extraction?.sources
                    ? { sources: baseAcord.extraction.sources }
                    : {}),
            missingCriticalFields,
            requiresReview,
            reviewState: (baseAcord?.extraction?.reviewState as string) || 'unconfirmed',
        },
        policy: {
            ...(baseAcord?.policy || {}),
            insurerName: asText(payload.insurerName) || baseAcord?.policy?.insurerName || null,
            policyNumber: asText(payload.policyNumber) || baseAcord?.policy?.policyNumber || null,
            lineOfBusiness: asText(payload.lineOfBusiness) || baseAcord?.policy?.lineOfBusiness || null,
            // Dates normalize to ISO when parseable (prompts emit yyyy-MM-dd;
            // legacy runs emitted DD-MM-YYYY and documents write Greek month
            // names); an unparseable raw string is kept verbatim so the
            // review screen can show and flag it.
            effectiveDate: asDateText(payload.startDate) || baseAcord?.policy?.effectiveDate || null,
            expirationDate: asDateText(payload.endDate) || baseAcord?.policy?.expirationDate || null,
            issueDate: asDateText(payload.issueDate) || baseAcord?.policy?.issueDate || null,
            renewalDate: asDateText(payload.renewalDate) || baseAcord?.policy?.renewalDate || null,
            premiumFrequency: normalizePremiumFrequency(payload.premiumFrequency)
                || baseAcord?.policy?.premiumFrequency || null,
            premium: {
                ...(baseAcord?.policy?.premium || {}),
                amount: Number.isFinite(Number(payload.premiumAmount))
                    ? Number(payload.premiumAmount)
                    : (baseAcord?.policy?.premium?.amount ?? null),
            }
        },
        policyholder: {
            ...(baseAcord?.policyholder || {}),
            name: customerFullName || baseAcord?.policyholder?.name || null,
            email: customerEmail || baseAcord?.policyholder?.email || null,
            phone: customerPhone || baseAcord?.policyholder?.phone || null,
            taxId: customerTaxId || baseAcord?.policyholder?.taxId || null,
        },
        insured: {
            ...(baseAcord?.insured || {}),
            name: customerFullName || baseAcord?.insured?.name || null,
            email: customerEmail || baseAcord?.insured?.email || null,
            phone: customerPhone || baseAcord?.insured?.phone || null,
            taxId: customerTaxId || baseAcord?.insured?.taxId || null,
        }
    }

    return {
        acordData,
        exclusions,
        extractionMeta: {
            overallConfidence: Math.round(overallConfidence),
            fieldConfidence,
            missingCriticalFields,
            requiresReview,
        }
    }
}
