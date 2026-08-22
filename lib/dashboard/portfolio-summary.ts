/**
 * What the dashboard says instead of a verdict.
 *
 * The protection score is a weighted average over six risk CATEGORIES — it
 * measures the BREADTH of a person's cover, which is what its own methodology
 * copy says. Measured per portfolio state
 * (docs/evidence/dashboard-mobile/BASELINE.md, D1), it renders a verdict word
 * in every state except an empty wallet, including three where its inputs
 * cannot support one:
 *
 *   · one policy, never analysed          → «Καλή κάλυψη»
 *   · nothing in the wallet ever analysed → «Χρειάζεται προσοχή»
 *   · every policy expired (no cover)     → «Χρειάζεται βελτίωση»
 *
 * The last is the clearest: a customer with no cover at all is told their
 * protection "needs improvement", which describes a portfolio that needs work
 * rather than one that does not exist.
 *
 * This module replaces the verdict with the thing a customer actually opened
 * the page to learn — «12 ασφαλιστήρια · 3 λήγουν σύντομα · 2 δεν έχουν
 * αναλυθεί» — which answers three of the four ten-second questions directly and
 * cannot be wrong, because every part of it is a count of something the wallet
 * contains.
 *
 * PURE. It decides nothing about coverage: detection and severity remain the
 * deterministic engine's (`lib/gap-detection.ts`), and the score ARITHMETIC is
 * untouched (`lib/services/gap-engine/protection-score.ts`). All this decides
 * is what may be SAID about a number that already exists.
 */

export interface PortfolioFactsInput {
    /** Total policies in the wallet, whatever their state. */
    total: number
    /** Cover has lapsed — resolvePolicyLifecycle status "expired". */
    expired: number
    /** In force, inside the 30-day renewal window. */
    expiringSoon: number
    /** Never deep-analysed: no lastAnalyzedAt. */
    neverAnalysed: number
    /** Analysed, but the latest run failed. */
    analysisFailed: number
}

export interface PortfolioFact {
    kind: "total" | "expired" | "expiringSoon" | "neverAnalysed" | "analysisFailed"
    count: number
}

/**
 * The facts worth stating, in the order a customer needs them.
 *
 * `total` always leads — "what do I have". Then anything that means they are
 * NOT covered, then anything time-critical, then anything we could not read.
 * Zero-valued facts are omitted: "0 expired" is noise, and their absence is
 * not a claim (the caller states "nothing needs attention" separately, which
 * is a different sentence with a different warrant).
 */
export function portfolioFacts(input: PortfolioFactsInput): PortfolioFact[] {
    const facts: PortfolioFact[] = [{ kind: "total", count: input.total }]
    if (input.expired > 0) facts.push({ kind: "expired", count: input.expired })
    if (input.expiringSoon > 0) facts.push({ kind: "expiringSoon", count: input.expiringSoon })
    if (input.neverAnalysed > 0) facts.push({ kind: "neverAnalysed", count: input.neverAnalysed })
    if (input.analysisFailed > 0) facts.push({ kind: "analysisFailed", count: input.analysisFailed })
    return facts
}

export type ScoreSupport =
    | { supported: true }
    | { supported: false; reason: "no_policies" | "nothing_analysed" | "no_active_cover" }

/**
 * May a score render at all?
 *
 * The score is a subtraction from a full picture, so an ABSENT picture and a
 * COMPLETE one produce numbers that look alike. Three states cannot support
 * any figure:
 *
 *   `no_policies`      — nothing to score. (Already handled by the hero's
 *                        `empty` state; included so the rule is stated in one
 *                        place rather than split across two.)
 *   `nothing_analysed` — no policy in the wallet has ever been read, so the
 *                        number describes what we failed to look at.
 *   `no_active_cover`  — every policy has expired. Breadth of cover is not a
 *                        meaningful measure of a wallet that provides none, and
 *                        any number here reads as a grade on protection the
 *                        customer does not have.
 *
 * A wallet where SOME policies are unanalysed still scores — the figure is
 * about the lines held, and the unanalysed count is stated as its own fact so
 * the reader can see what the number did not include.
 */
export function scoreSupport(input: PortfolioFactsInput): ScoreSupport {
    if (input.total === 0) return { supported: false, reason: "no_policies" }
    if (input.neverAnalysed >= input.total) return { supported: false, reason: "nothing_analysed" }
    if (input.expired >= input.total) return { supported: false, reason: "no_active_cover" }
    return { supported: true }
}
