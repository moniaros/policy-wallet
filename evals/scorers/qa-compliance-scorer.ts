/**
 * Q&A compliance scorer (pure, deterministic).
 *
 * Mirrors the regulatory guardrails the prompt-compliance unit tests enforce at
 * the prompt level, but scores an actual ANSWER: it must not read as licensed
 * insurance advice ("you should buy/cancel/claim"), and it may be required to
 * carry specific framing. All checks are case-insensitive substring/regex —
 * no model call.
 */

export interface QaComplianceRules {
    /** Substrings/regexes the answer MUST contain (all required). */
    mustContain?: (string | RegExp)[]
    /** Substrings/regexes the answer must NOT contain (any match fails). */
    mustNotContain?: (string | RegExp)[]
}

export interface QaComplianceCheck {
    label: string
    kind: "mustContain" | "mustNotContain"
    pattern: string
    pass: boolean
}

export interface QaComplianceScore {
    checks: QaComplianceCheck[]
    passed: number
    total: number
    pass: boolean
}

/** Advice-language patterns that should never appear in an informational answer. */
export const ADVICE_LANGUAGE: RegExp[] = [
    /\byou should (buy|purchase|get|cancel|switch|claim|drop|add)\b/i,
    /\bwe recommend\b/i,
    /\bI recommend\b/i,
    /\byou (ought|need) to (buy|cancel|claim)\b/i,
    // Greek: "you should / I suggest you [buy|cancel|change|claim]". The `u`
    // flag gives correct Greek case folding; the gap allows an intervening "να".
    /(θα πρέπει να|σου προτείνω|σας προτείνω|προτείν\w* να)[^.]{0,20}(αγοράσ|αγορά|ακυρώσ|αλλάξ|κάνεις αίτηση)/iu,
]

function matches(text: string, pattern: string | RegExp): boolean {
    return typeof pattern === "string"
        ? text.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(text)
}

export function scoreQaCompliance(answer: string, rules: QaComplianceRules = {}): QaComplianceScore {
    const checks: QaComplianceCheck[] = []

    for (const p of rules.mustContain ?? []) {
        checks.push({ label: `contains ${String(p)}`, kind: "mustContain", pattern: String(p), pass: matches(answer, p) })
    }
    // The advice-language ban is always applied, plus any dataset-specific bans.
    const bans = [...ADVICE_LANGUAGE, ...(rules.mustNotContain ?? [])]
    for (const p of bans) {
        checks.push({ label: `absent ${String(p)}`, kind: "mustNotContain", pattern: String(p), pass: !matches(answer, p) })
    }

    const passed = checks.filter((c) => c.pass).length
    const total = checks.length
    return { checks, passed, total, pass: passed === total }
}
