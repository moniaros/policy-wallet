/**
 * Deterministic Savings Detection
 *
 * Rules-based savings opportunities that need zero AI tokens.
 * These are merged with AI-generated savings in the orchestrator
 * to provide a richer set of actionable recommendations.
 *
 * Each rule checks ACORD data fields and/or policy metadata
 * to detect obvious premium-saving opportunities.
 */

import type { AcordData } from "@/lib/schemas/acord-data"
import type { ClaritySavingsOpportunity } from "../ai/ai-service.interface"

interface DeterministicSavingsInput {
    acordData: AcordData | null | undefined
    lineOfBusiness: string
    premiumAmount: number | null
    startDate: Date
    /** Number of policies by same owner with the same insurer */
    sameInsurerPolicyCount?: number
}

/**
 * Run all deterministic savings rules and return matching opportunities.
 * Confidence is set to 0.7-0.85 for rule-based detections (below AI's typical 0.8-0.95).
 */
export function detectDeterministicSavings(
    input: DeterministicSavingsInput
): ClaritySavingsOpportunity[] {
    const results: ClaritySavingsOpportunity[] = []

    results.push(...checkMinimumDeductible(input))
    results.push(...checkMultiPolicyBundle(input))
    results.push(...checkStalePolicy(input))
    results.push(...checkAnnualPaymentSwitch(input))

    return results
}

// ── Rule: Minimum deductible → suggest raising ─────────────────────────

function checkMinimumDeductible(
    input: DeterministicSavingsInput
): ClaritySavingsOpportunity[] {
    const acord = input.acordData
    if (!acord || !input.premiumAmount) return []

    const deductible =
        acord.vehicle?.deductible ??
        acord.health?.deductiblePerClaim ??
        null

    // If deductible is very low (≤50€) and premium is significant (>300€/year), suggest raising
    if (deductible !== null && deductible !== undefined && deductible <= 50 && input.premiumAmount > 300) {
        const estimatedSaving = Math.round(input.premiumAmount * 0.08) // ~8% saving from doubling deductible
        return [
            {
                action: {
                    en: "Consider raising your deductible to reduce premium",
                    el: "Εξετάστε την αύξηση της απαλλαγής για μείωση ασφαλίστρου",
                },
                rationale: {
                    en: `Your deductible is €${deductible}, which is at the minimum level. Raising it to €100-150 typically reduces premiums by 5-10%.`,
                    el: `Η απαλλαγή σας είναι €${deductible}, στο ελάχιστο επίπεδο. Αυξάνοντάς την σε €100-150 μειώνετε συνήθως το ασφάλιστρο κατά 5-10%.`,
                },
                estimatedAnnualSavingsEur: estimatedSaving,
                confidence: 0.75,
            },
        ]
    }

    return []
}

// ── Rule: Multiple policies with same insurer → bundle discount ────────

function checkMultiPolicyBundle(
    input: DeterministicSavingsInput
): ClaritySavingsOpportunity[] {
    if (!input.sameInsurerPolicyCount || input.sameInsurerPolicyCount < 2) return []
    if (!input.premiumAmount) return []

    const estimatedSaving = Math.round(input.premiumAmount * 0.10) // ~10% bundle discount

    return [
        {
            action: {
                en: "Ask your insurer about a multi-policy bundle discount",
                el: "Ρωτήστε τον ασφαλιστή σας για έκπτωση πολλαπλών συμβολαίων",
            },
            rationale: {
                en: `You have ${input.sameInsurerPolicyCount} policies with the same insurer. Most insurers offer 5-15% bundle discounts when combining policies.`,
                el: `Έχετε ${input.sameInsurerPolicyCount} συμβόλαια με τον ίδιο ασφαλιστή. Οι περισσότεροι ασφαλιστές προσφέρουν 5-15% έκπτωση ομαδοποίησης.`,
            },
            estimatedAnnualSavingsEur: estimatedSaving,
            confidence: 0.80,
        },
    ]
}

// ── Rule: Policy > 3 years without rate review → suggest comparison ────

function checkStalePolicy(
    input: DeterministicSavingsInput
): ClaritySavingsOpportunity[] {
    if (!input.premiumAmount) return []

    const policyAgeYears =
        (Date.now() - input.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

    if (policyAgeYears < 3) return []

    const estimatedSaving = Math.round(input.premiumAmount * 0.12) // ~12% from market comparison

    return [
        {
            action: {
                en: "Request a market comparison — your policy is over 3 years old",
                el: "Ζητήστε σύγκριση αγοράς — το συμβόλαιό σας είναι πάνω από 3 ετών",
            },
            rationale: {
                en: `This policy has been active for ${Math.floor(policyAgeYears)} years without a rate review. Insurance markets change frequently and a fresh comparison could reveal better rates.`,
                el: `Αυτό το συμβόλαιο είναι ενεργό εδώ και ${Math.floor(policyAgeYears)} χρόνια χωρίς επανέλεγχο τιμών. Η αγορά αλλάζει συχνά και μια νέα σύγκριση μπορεί να αποκαλύψει καλύτερες τιμές.`,
            },
            estimatedAnnualSavingsEur: estimatedSaving,
            confidence: 0.70,
        },
    ]
}

// ── Rule: Non-annual payment frequency → suggest annual ────────────────

function checkAnnualPaymentSwitch(
    input: DeterministicSavingsInput
): ClaritySavingsOpportunity[] {
    const acord = input.acordData
    if (!acord || !input.premiumAmount) return []

    // Check the ACORD extraction for payment frequency hints
    // The AI extraction may populate this in coverages or as metadata.
    // For now, check if the premium is suspiciously low for the LoB
    // (indicating monthly/quarterly quoting), or if line-of-business
    // is motor/home where annual vs monthly is common.
    // This is a conservative heuristic — we only flag when evidence exists.

    // We don't have a direct "paymentFrequency" field yet in ACORD,
    // so this rule is a placeholder that can be activated once the field is added.
    // The gap-detection rule `payment_frequency_check` already handles the
    // detection logic via the evaluateSingleRule engine.

    return []
}
