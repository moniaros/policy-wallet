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
