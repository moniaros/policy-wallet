/**
 * Gap-detection recall/precision scorer (pure).
 *
 * Given the slugs a policy SHOULD flag and the model's gapResults, compute
 * recall (did we catch the real gaps) and precision (were the flags real).
 * Recall is the metric that matters most for coverage-gap detection — a missed
 * gap is a customer under-protected.
 */

export interface GapResultLike {
    slug: string
    isDetected: boolean
}

export interface GapScore {
    expectedSlugs: string[]
    detectedSlugs: string[]
    truePositives: string[]
    falseNegatives: string[]
    falsePositives: string[]
    recallPct: number
    precisionPct: number
}

export function scoreGaps(expectedDetectedSlugs: string[], actual: GapResultLike[]): GapScore {
    const expected = new Set(expectedDetectedSlugs)
    const detectedSlugs = actual.filter((r) => r.isDetected).map((r) => r.slug)
    const detected = new Set(detectedSlugs)

    const truePositives = [...expected].filter((s) => detected.has(s))
    const falseNegatives = [...expected].filter((s) => !detected.has(s))
    const falsePositives = [...detected].filter((s) => !expected.has(s))

    const recallPct = expected.size === 0 ? 100 : Math.round((truePositives.length / expected.size) * 100)
    const precisionPct = detected.size === 0 ? 100 : Math.round((truePositives.length / detected.size) * 100)

    return {
        expectedSlugs: [...expected],
        detectedSlugs,
        truePositives,
        falseNegatives,
        falsePositives,
        recallPct,
        precisionPct,
    }
}
