/**
 * Pure scoring for the extraction eval harness (tests/eval).
 *
 * Grades a single extraction against hand-labeled truth so a prompt change can
 * be measured instead of merged blind. Kept dependency-free and side-effect-
 * free so the scorer itself is unit-tested in the fast suite while the harness
 * that calls a real model stays opt-in.
 */

/** Hand-labeled truth for one fixture. All fields optional — score only what you label. */
export interface ExtractionExpected {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    /** ISO YYYY-MM-DD. */
    startDate?: string
    /** ISO YYYY-MM-DD. */
    endDate?: string
    premiumAmount?: number
    premiumFrequency?: string
    /** The extraction must find AT LEAST this many exclusions. */
    minExclusions?: number
    /** The extraction must find AT LEAST this many fine-print clauses (in acordData). */
    minFinePrintClauses?: number
    /** Optional per-fixture floor the harness asserts against (default 0 = measure only). */
    minAccuracyPct?: number
}

/** The subset of an extraction response the scorer reads. */
export interface ExtractionActual {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
    premiumFrequency?: string
    exclusions?: unknown[]
    acordData?: { finePrintClauses?: unknown[] } | null
}

export interface FieldScore {
    field: string
    expected: unknown
    actual: unknown
    passed: boolean
    note?: string
}

export interface ExtractionScore {
    fields: FieldScore[]
    passed: number
    total: number
    accuracyPct: number
}

/** Lowercase, strip Greek/Latin accents, collapse whitespace — for lenient string compare. */
export function normalizeForCompare(value: unknown): string {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
}

/** Two strings match if one normalized form contains the other (both non-empty). */
function stringMatches(expected: unknown, actual: unknown): boolean {
    const e = normalizeForCompare(expected)
    const a = normalizeForCompare(actual)
    if (!e || !a) return false
    return a.includes(e) || e.includes(a)
}

/** First 10 chars of an ISO datetime, so "2024-05-22" and "2024-05-22T00:00:00Z" compare equal. */
function isoDay(value: unknown): string {
    return String(value ?? "").trim().slice(0, 10)
}

export function scoreExtraction(
    expected: ExtractionExpected,
    actual: ExtractionActual
): ExtractionScore {
    const fields: FieldScore[] = []
    const add = (field: string, exp: unknown, act: unknown, passed: boolean, note?: string) =>
        fields.push({ field, expected: exp, actual: act, passed, note })

    if (expected.insurerName !== undefined) {
        add("insurerName", expected.insurerName, actual.insurerName,
            stringMatches(expected.insurerName, actual.insurerName))
    }
    if (expected.policyNumber !== undefined) {
        // Policy numbers: exact after stripping spaces/case (formatting varies).
        const e = normalizeForCompare(expected.policyNumber).replace(/\s/g, "")
        const a = normalizeForCompare(actual.policyNumber).replace(/\s/g, "")
        add("policyNumber", expected.policyNumber, actual.policyNumber, !!e && e === a)
    }
    if (expected.lineOfBusiness !== undefined) {
        add("lineOfBusiness", expected.lineOfBusiness, actual.lineOfBusiness,
            normalizeForCompare(expected.lineOfBusiness) === normalizeForCompare(actual.lineOfBusiness))
    }
    if (expected.startDate !== undefined) {
        add("startDate", expected.startDate, actual.startDate,
            !!isoDay(expected.startDate) && isoDay(expected.startDate) === isoDay(actual.startDate))
    }
    if (expected.endDate !== undefined) {
        add("endDate", expected.endDate, actual.endDate,
            !!isoDay(expected.endDate) && isoDay(expected.endDate) === isoDay(actual.endDate))
    }
    if (expected.premiumAmount !== undefined) {
        const act = typeof actual.premiumAmount === "number" ? actual.premiumAmount : NaN
        add("premiumAmount", expected.premiumAmount, actual.premiumAmount,
            Math.abs(act - expected.premiumAmount) < 0.5)
    }
    if (expected.premiumFrequency !== undefined) {
        add("premiumFrequency", expected.premiumFrequency, actual.premiumFrequency,
            normalizeForCompare(expected.premiumFrequency) === normalizeForCompare(actual.premiumFrequency))
    }
    if (expected.minExclusions !== undefined) {
        const count = Array.isArray(actual.exclusions) ? actual.exclusions.length : 0
        add("exclusions", `>= ${expected.minExclusions}`, count, count >= expected.minExclusions)
    }
    if (expected.minFinePrintClauses !== undefined) {
        const count = Array.isArray(actual.acordData?.finePrintClauses)
            ? actual.acordData!.finePrintClauses!.length
            : 0
        add("finePrintClauses", `>= ${expected.minFinePrintClauses}`, count,
            count >= expected.minFinePrintClauses)
    }

    const total = fields.length
    const passed = fields.filter((f) => f.passed).length
    const accuracyPct = total === 0 ? 0 : Math.round((passed / total) * 100)
    return { fields, passed, total, accuracyPct }
}
