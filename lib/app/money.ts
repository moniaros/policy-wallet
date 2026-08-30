/**
 * The money line — three figures, each with its own warrant (§9).
 *
 *   paid          — what in-force policies cost per year (premium footprint,
 *                   the wallet's single definition of "in force")
 *   protectsUpTo  — the LARGEST SINGLE limit found on an active policy,
 *                   labelled as such. Never a sum: limits on different perils
 *                   do not add up to anything a person could claim.
 *   paidTwice     — the same cover type on two active policies for the SAME
 *                   insured subject (plate, address, pet, vessel — the engine's
 *                   rule, reused, never cross-person). An amount appears only
 *                   when an insurer tariff supplies it; otherwise the pair is
 *                   shown without a figure. No invented «≈».
 */
import { calculatePremiumFootprint, type PremiumPolicyLike } from "@/lib/wallet/premium-footprint"
import { findSameSubjectOverlap, type PortfolioPolicyFacts } from "@/lib/services/gap-engine/portfolio-rules"
import { coverageEngineStatus, isPolicyCoverageActive } from "@/lib/policy-status"

export interface LimitLike {
    amount?: number
    currency?: string
    unlimited?: boolean
    basis?: string
}

/** The subset of a policy row the money line reads — compatible with both engines it delegates to. */
export interface MoneyPolicy {
    id: string
    lineOfBusiness: string
    status?: string | null
    insurerName?: string | null
    policyNumber?: string | null
    startDate?: Date | string | null
    endDate?: Date | string | null
    premiumAmount?: unknown
    premiumCurrency?: string | null
    acordData?: unknown
    coverages?: ReadonlyArray<{ name: string; type?: string; limits?: ReadonlyArray<LimitLike> }>
}

const toDate = (d: Date | string | null | undefined): Date | null => (d ? new Date(d) : null)

/**
 * The engine's duplicate rule tests `status === "active"` — the RESOLVED
 * coverage status, never the stored ingestion string — so an expired policy
 * can never be half of a "paid twice" pair.
 */
function toFacts(p: MoneyPolicy): PortfolioPolicyFacts {
    return {
        id: p.id,
        lineOfBusiness: p.lineOfBusiness,
        status: coverageEngineStatus(p),
        insurerName: p.insurerName ?? null,
        policyNumber: p.policyNumber ?? null,
        startDate: toDate(p.startDate),
        endDate: toDate(p.endDate),
        acordData: p.acordData,
    }
}

export interface ProtectsUpTo {
    amount: number
    currency: string
    policyId: string
    coverName: string
}

export interface PaidTwicePair {
    policyId: string
    partnerPolicyId: string
    /** Only when a tariff supplied it — never estimated here. */
    amountPerYear?: number
}

export interface MoneyLine {
    paidPerYear: number
    protectsUpTo: ProtectsUpTo | null
    paidTwice: PaidTwicePair[]
}

/** The largest single limit across active policies, with where it came from. */
export function largestSingleLimit(policies: readonly MoneyPolicy[], now: Date = new Date()): ProtectsUpTo | null {
    let best: ProtectsUpTo | null = null
    for (const p of policies) {
        if (!isPolicyCoverageActive(p, now)) continue
        for (const c of p.coverages ?? []) {
            for (const l of c.limits ?? []) {
                if (l.unlimited || typeof l.amount !== "number" || !Number.isFinite(l.amount) || l.amount <= 0) continue
                const currency = l.currency ?? "EUR"
                if (currency !== "EUR") continue
                if (!best || l.amount > best.amount) best = { amount: l.amount, currency, policyId: p.id, coverName: c.name }
            }
        }
    }
    return best
}

/**
 * Same-subject overlaps, each pair once. `tariff` maps a policy id to the
 * yearly amount of the duplicated cover when an insurer tariff is known.
 */
export function paidTwicePairs(
    policies: readonly MoneyPolicy[],
    tariff: ReadonlyMap<string, number> = new Map()
): PaidTwicePair[] {
    const seen = new Set<string>()
    const pairs: PaidTwicePair[] = []
    const facts = policies.map(toFacts)
    for (const p of facts) {
        const overlap = findSameSubjectOverlap(p, facts)
        if (!overlap) continue
        const key = [p.id, overlap.partner.id].sort().join("|")
        if (seen.has(key)) continue
        seen.add(key)
        const amount = tariff.get(p.id) ?? tariff.get(overlap.partner.id)
        pairs.push({
            policyId: p.id,
            partnerPolicyId: overlap.partner.id,
            ...(typeof amount === "number" && amount > 0 ? { amountPerYear: amount } : {}),
        })
    }
    return pairs
}

export function computeMoneyLine(
    policies: readonly MoneyPolicy[],
    tariff: ReadonlyMap<string, number> = new Map(),
    now: Date = new Date()
): MoneyLine {
    return {
        paidPerYear: calculatePremiumFootprint([...policies] as PremiumPolicyLike[], now),
        protectsUpTo: largestSingleLimit(policies, now),
        paidTwice: paidTwicePairs(policies, tariff),
    }
}
