/**
 * Gap-detection recall/precision scorer (pure).
 *
 * Given the slugs a policy SHOULD flag and the model's gapResults, compute
 * recall (did we catch the real gaps) and precision (were the flags real).
 * Recall is the metric that matters most for coverage-gap detection — a missed
 * gap is a customer under-protected.
 */

/**
 * RETIRED as an AI metric (Aug 2026).
 *
 * This scored whether the MODEL detected the right gaps. Detection is a rule
 * decision now (lib/gap-detection.ts) and `isDetected` no longer exists on an
 * AI response, so recall/precision over model output measures nothing the
 * product does. The equivalent measurement belongs to executable tests of the
 * rule evaluator; this type is kept only so the harness still compiles while
 * the gaps suite is disabled.
 */
export interface GapResultLike {
    slug: string
    isDetected?: boolean
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
    const detectedSlugs = actual.filter((r) => r.isDetected === true).map((r) => r.slug)
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
