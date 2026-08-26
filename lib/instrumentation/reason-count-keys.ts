/**
 * Count keys for numbers embedded in COMPOSED prose.
 *
 * A recommendation's `personalReason` is written by the risk engine
 * (`whyItApplies`, lib/services/gap-engine/risk-catalog.ts) and arrives at the
 * render site as one pre-composed string — «2 άτομα εξαρτώνται από το εισόδημά
 * σας…». The render site cannot know which fact the leading numeral is, so the
 * mapping lives HERE, keyed on the risk that composed the sentence, and every
 * render site of `personalReason` (AttentionList on /dashboard,
 * RecommendationCards on /protection) resolves through this one map.
 *
 * The count-consistency collector extracts the FIRST number of an instrumented
 * element's text (tests/measure/count-collector.ts), so a risk may only appear
 * here if its `whyItApplies` LEADS with the mapped quantity in both languages.
 * A sentence whose first numeral is something else (a euro figure, a window)
 * must stay unmapped — labelling it would compare the wrong number under the
 * key and manufacture a false contradiction.
 *
 * Note on `life_dependents` → `household.dependantCount`: the prose arm derives
 * its number from the questionnaire profile (`totalDependents`), the risk-graph
 * stat (RiskIntelligenceView) from `graph.byType.dependent.length`. Two
 * derivations, one real-world quantity, one key ON PURPOSE — if they ever
 * disagree on a page, that is a §2.8 finding, not metric noise.
 *
 * Registry discipline: every value here must be registered in
 * lib/instrumentation/count-keys.ts (guard:
 * tests/unit/count-instrumentation-registry.test.tsx — the *_COUNT_KEY
 * identifier below is what makes these keys visible to its extractor).
 */

/** riskId → registered count key for the reason's LEADING numeral. */
export const REASON_COUNT_KEY_BY_RISK: Record<string, string> = {
    life_dependents: "household.dependantCount",
}

/**
 * Resolve the count key for one recommendation's `personalReason`, from
 * whichever identity field the surface has: `riskId` where the row carries it
 * (dashboard's ActiveRecommendation), else `ruleId`, where risk-assessment
 * rows are spelled `risk:<riskId>` (assessmentsToRecommendations).
 * Returns undefined for every unmapped reason — an undefined `data-count`
 * renders no attribute, which is the honest state for prose whose numerals
 * this vocabulary cannot vouch for.
 */
export function reasonCountKey(rec: { riskId?: string | null; ruleId?: string | null }): string | undefined {
    const riskId = rec.riskId || String(rec.ruleId || "").replace(/^risk:/, "")
    if (!riskId) return undefined
    return REASON_COUNT_KEY_BY_RISK[riskId]
}
