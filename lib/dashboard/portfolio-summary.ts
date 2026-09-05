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

import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { partitionByAssessment } from "@/lib/gaps/assessment-coverage"

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
    /** In a branch with NO authored check — nothing can be assessed (B1.5). */
    unassessed: number
    /** Analysed AND in an authored branch — the only policies a roll-up may call assessed. */
    assessed: number
}

/** The rows derivePortfolioCounts needs — a subset of a Policy row. */
export interface PortfolioCountPolicy {
    status?: string | null
    policyNumber?: string | null
    insurerName?: string | null
    endDate?: Date | string | null
    acordData?: unknown
    lastAnalyzedAt?: Date | string | null
    lineOfBusiness?: string | null
}

/**
 * THE portfolio counts, derived once.
 *
 * These used to be five inline `.filter()` calls in PolicyholderHome — which a
 * unit test could not reach, so nothing could assert that the dashboard's
 * «5 έχουν λήξει» and the risk watch's «5 ασφαλιστήρια έχουν ήδη λήξει» count
 * the same thing. Now both derive from `resolvePolicyLifecycle` through
 * importable code, and the count-consistency guard exercises this function
 * directly (tests/unit/count-instrumentation-registry.test.tsx).
 *
 * A soft-deleted row (status 'deleted') is not a policy the owner holds: it
 * neither renders nor counts, on any surface. The API's DELETE path writes
 * that status, and an unfiltered fetch was quietly counting the corpses.
 *
 * NOTE these five facts are NOT a partition: `neverAnalysed` and
 * `analysisFailed` are the ANALYSIS dimension and overlap the lifecycle
 * subsets freely. `total − expired − expiringSoon − neverAnalysed` is not a
 * count of anything — see §2.8 (the wallet's «18» versus a reviewer's
 * subtracted «17»).
 */
export function derivePortfolioCounts(
    policies: PortfolioCountPolicy[],
    now: Date = new Date()
): PortfolioFactsInput {
    const held = policies.filter(
        (policy) => String(policy.status || "").toLowerCase() !== "deleted"
    )
    const lifecycles = held.map((policy) => resolvePolicyLifecycle(policy, now).status)
    const assessment = partitionByAssessment(held)
    return {
        unassessed: assessment.unauthored.length,
        assessed: assessment.assessed.length,
        total: held.length,
        expired: lifecycles.filter((status) => status === "expired").length,
        expiringSoon: lifecycles.filter((status) => status === "expiring_soon").length,
        neverAnalysed: held.filter((policy) => !policy.lastAnalyzedAt).length,
        analysisFailed: held.filter((policy) =>
            Boolean((policy.acordData as { processingError?: unknown } | null)?.processingError)
        ).length,
    }
}

export interface PortfolioFact {
    kind: "total" | "expired" | "expiringSoon" | "neverAnalysed" | "analysisFailed" | "unassessed"
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
    if (input.unassessed > 0) facts.push({ kind: "unassessed", count: input.unassessed })
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
