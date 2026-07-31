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

// The advice-language ban is shared with the admin prompt-content policy so
// the two can never drift: lib/services/ai/prompt-policy.ts is the single
// source; this scorer re-exports the same array instance.
export { ADVICE_LANGUAGE } from "@/lib/services/ai/prompt-policy"
import { ADVICE_LANGUAGE } from "@/lib/services/ai/prompt-policy"

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
