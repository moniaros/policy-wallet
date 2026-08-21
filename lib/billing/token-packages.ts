/**
 * Single source of truth for on-demand AI token packages (policyholder tiers).
 *
 * Prices are set against the blended provider cost of ~€2.38 per 1M tokens on
 * the Gemini 2.5 Pro path (≈€1.4/M after Flash routing of language steps) to
 * hold a ≥40% floor margin — see docs/planning/TOKEN_ECONOMICS_2026-07.md.
 * Consumed by app/api/v1/tokens/purchase (authoritative) and the account UI.
 * Agent top-ups are priced separately in AGENT_PRICING
 * (lib/subscription-entitlements.ts).
 */
export const TOKEN_PACKAGES = {
    small: { tokens: 500_000, priceEur: 1.99, label: "500K tokens" },
    medium: { tokens: 1_000_000, priceEur: 3.99, label: "1M tokens", popular: true },
    large: { tokens: 5_000_000, priceEur: 16.99, label: "5M tokens" },
    xl: { tokens: 10_000_000, priceEur: 29.99, label: "10M tokens" },
} as const

export type TokenPackageKey = keyof typeof TOKEN_PACKAGES

// ── B2B analysis overage (pricing v2) ────────────────────────────────
//
// Agents buy ANALYSES, not tokens. "You have 1,600,000 tokens left" is a
// sentence no broker can act on; "you have 12 analyses left this month" is.
// So the overage is denominated and priced in analyses, and converted here —
// the token ledger underneath is unchanged, and these still settle through
// the same TokenPurchase rows.
//
// The conversion is the FLOOR of what the tiers fund, not an average. The
// approved B2B numbers do not fund at one uniform rate:
//
//   agent_starter  1,600,000 / 50  = 32,000
//   agent_pro      4,500,000 / 150 = 30,000
//   agency        12,000,000 / 400 = 30,000
//
// Taking the lowest (30,000) means an overage analysis never delivers LESS
// work than the same analysis inside any plan. Taking the average, or
// Starter's 32,000, would quietly short Pro and Agency customers — they would
// buy "an analysis" and get a smaller one than the plan gives them, with
// nothing on screen to reveal it because the customer sees analyses and the
// ledger sees tokens.
//
// tests/unit/analysis-overage-parity.test.ts asserts no tier funds below this.
export const TOKENS_PER_ANALYSIS = 30_000

export const ANALYSIS_OVERAGE_PACKAGES = {
    single: {
        analyses: 1,
        tokens: TOKENS_PER_ANALYSIS,
        priceEur: 0.49,
        label: { el: "1 επιπλέον ανάλυση", en: "1 extra analysis" },
    },
    pack50: {
        analyses: 50,
        tokens: 50 * TOKENS_PER_ANALYSIS,
        priceEur: 19,
        label: { el: "50 επιπλέον αναλύσεις", en: "50 extra analyses" },
    },
} as const

export type AnalysisOveragePackageKey = keyof typeof ANALYSIS_OVERAGE_PACKAGES
