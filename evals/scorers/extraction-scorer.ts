/**
 * Field-level extraction accuracy scorer (pure).
 *
 * Compares an extraction result against an expected record on the structured
 * fields that matter for downstream analysis. Enums/ids/dates are matched
 * exactly (after light normalization); monetary amounts within a relative
 * tolerance (OCR/rounding noise is not an extraction error). Free-text fields
 * (coverageSummary) are checked for presence only — exact-matching prose would
 * measure phrasing, not correctness.
 */

export interface FieldScore {
    field: string
    expected: unknown
    actual: unknown
    pass: boolean
}

export interface ExtractionScore {
    fields: FieldScore[]
    passed: number
    total: number
    accuracyPct: number
}

export interface ExpectedExtraction {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
    /** Whether a non-empty coverage summary is expected. */
    hasCoverageSummary?: boolean
}

export interface ActualExtraction {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
    coverageSummary?: string
}

/** Case/whitespace-insensitive string compare. */
function strEq(a: unknown, b: unknown): boolean {
    return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase()
}

/** Relative tolerance for amounts (default 1%). */
function amountEq(expected: number | undefined, actual: number | undefined, tolerance = 0.01): boolean {
    if (expected == null || actual == null) return expected === actual
    if (expected === 0) return actual === 0
    return Math.abs(actual - expected) / Math.abs(expected) <= tolerance
}

export function scoreExtraction(
    expected: ExpectedExtraction,
    actual: ActualExtraction,
    opts: { amountTolerance?: number } = {}
): ExtractionScore {
    const fields: FieldScore[] = []
    const add = (field: string, exp: unknown, act: unknown, pass: boolean) =>
        fields.push({ field, expected: exp, actual: act, pass })

    if (expected.insurerName !== undefined) add("insurerName", expected.insurerName, actual.insurerName, strEq(expected.insurerName, actual.insurerName))
    if (expected.policyNumber !== undefined) add("policyNumber", expected.policyNumber, actual.policyNumber, strEq(expected.policyNumber, actual.policyNumber))
    if (expected.lineOfBusiness !== undefined) add("lineOfBusiness", expected.lineOfBusiness, actual.lineOfBusiness, strEq(expected.lineOfBusiness, actual.lineOfBusiness))
    if (expected.startDate !== undefined) add("startDate", expected.startDate, actual.startDate, strEq(expected.startDate, actual.startDate))
    if (expected.endDate !== undefined) add("endDate", expected.endDate, actual.endDate, strEq(expected.endDate, actual.endDate))
    if (expected.premiumAmount !== undefined) add("premiumAmount", expected.premiumAmount, actual.premiumAmount, amountEq(expected.premiumAmount, actual.premiumAmount, opts.amountTolerance))
    if (expected.hasCoverageSummary) add("coverageSummary", "non-empty", actual.coverageSummary, Boolean(actual.coverageSummary && actual.coverageSummary.trim().length > 0))

    const passed = fields.filter((f) => f.pass).length
    const total = fields.length
    return { fields, passed, total, accuracyPct: total === 0 ? 0 : Math.round((passed / total) * 100) }
}
