/**
 * Does this renewal document actually belong to this policy?
 *
 * The customer chooses the policy and then attaches an ανανεωτήριο to it, so
 * the pairing is asserted by a person, not derived. People attach the wrong
 * file. Before a renewal is allowed to move a policy's period — the one thing
 * it is trusted to do — the policy number it names is compared with the one on
 * record.
 *
 * WHY THIS IS A COMPARISON AND NOT A HARD RULE ABOUT EQUALITY: a Greek renewal
 * legitimately may carry a NEW number. Insurers reissue on renewal, and
 * docs/planning/RENEWAL_DOCUMENTS.md records that as the very reason automatic
 * renewal detection misses these documents today. So a mismatch is reported to
 * the customer as something to confirm, and the renewal is not applied — it is
 * never grounds for discarding the upload. The document stays; the wallet says
 * what it found and what it expected. (KEEP-AND-INFORM, the same rule quota and
 * consent blocks follow.)
 *
 * Silence is not a mismatch. A notice that does not state a number, or a policy
 * still carrying an extraction placeholder, gives nothing to compare — and an
 * unprovable mismatch must not block a renewal that may be perfectly good.
 */
import { isPlaceholderPolicyNumber } from "@/lib/wallet/policy-identity"

export type RenewalMatch =
    | { matches: true }
    | { matches: false; reason: "policy_number_mismatch"; expected: string; found: string }
    | { matches: true; reason: "not_comparable" }

/**
 * Compare two policy numbers as an insurer would print them, not as strings.
 *
 * Real documents vary the same number by punctuation and spacing — "1651622",
 * "165-1622", "165 1622" — and Greek schedules mix Greek and Latin capitals that
 * look identical (Α/A, Ε/E, Ρ/P). Comparing raw would report a mismatch on a
 * document that names exactly the right policy, which is the worse failure here:
 * it blocks a legitimate renewal and tells the customer their own paperwork is
 * wrong.
 */
const GREEK_TO_LATIN: Record<string, string> = {
    Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K", Μ: "M",
    Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Υ: "Y", Χ: "X",
}

export function normalizePolicyNumber(value: string | null | undefined): string {
    return String(value ?? "")
        .toUpperCase()
        .replace(/[Α-Ω]/g, (c) => GREEK_TO_LATIN[c] ?? c)
        // Punctuation and whitespace are presentation, not identity.
        .replace(/[\s\-_./\\]/g, "")
        .trim()
}

export function assessRenewalMatch(input: {
    /** The number already on the policy. */
    storedPolicyNumber: string | null | undefined
    /** The number the renewal document states. */
    extractedPolicyNumber: string | null | undefined
}): RenewalMatch {
    const stored = normalizePolicyNumber(input.storedPolicyNumber)
    const found = normalizePolicyNumber(input.extractedPolicyNumber)

    // Nothing to compare. Never block on an absence — the extractor is silent
    // about most fields, and a placeholder is a failed read, not a wrong policy.
    if (!stored || !found) return { matches: true, reason: "not_comparable" }
    if (isPlaceholderPolicyNumber(input.storedPolicyNumber)) return { matches: true, reason: "not_comparable" }
    if (isPlaceholderPolicyNumber(input.extractedPolicyNumber)) return { matches: true, reason: "not_comparable" }

    if (stored === found) return { matches: true }

    return {
        matches: false,
        reason: "policy_number_mismatch",
        // The ORIGINALS, not the normalised forms: the customer has to be able
        // to find these two numbers on two pieces of paper.
        expected: String(input.storedPolicyNumber ?? "").trim(),
        found: String(input.extractedPolicyNumber ?? "").trim(),
    }
}
