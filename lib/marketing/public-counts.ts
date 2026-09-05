import { FREE_POLICY_LIMIT, PLUS_POLICY_LIMIT, PRO_POLICY_LIMIT } from "@/lib/monetization/feature-gates"
import { BATCH_UPLOAD_MAX_FILES } from "@/lib/constants/time"
import { DEFAULT_AGENT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"
import { productCategories } from "@/lib/product/catalog"

/**
 * The ONE verified source for a count the public site may state about the
 * product itself.
 *
 * A marketing surface used to carry "10k+ active users", "50k+ policies",
 * "98% accuracy" and two testimonials from people who do not exist
 * (lib/landing/content.ts records their removal). The remaining public counts
 * are all facts the product ENFORCES or DERIVES — a plan cap, an upload cap,
 * the size of the product catalogue — and each of those already has a
 * canonical constant somewhere in the code. This module points at those
 * constants rather than retyping their values, so a public sentence cannot
 * drift from what the product does, and a stat tile cannot hold a number
 * nobody can trace.
 *
 * Rules, enforced by tests/unit/no-fabricated-public-count.test.ts
 * (PW-TRANSPARENCY-02 amendment 01, A1.3):
 *   - a stat tile's value is an interpolation of one of these entries, never
 *     a numeric literal;
 *   - a count in marketing copy («Δωρεάν για 3 ασφαλιστήρια», «έως 10 αρχεία»)
 *     must equal one of these values;
 *   - a scale or accuracy claim (N+ users, N% accuracy) appears nowhere unless
 *     it is a MARKET number with a dated primary source in
 *     lib/marketing/market-numbers.ts.
 *
 * Market statistics about Greece (premium indices, tax discounts) are NOT
 * here — they are external facts and live in market-numbers.ts with their
 * sources. Nothing about usage, customers or accuracy may be added here: the
 * product does not measure those in a way it can publish.
 */
export type PublicCountBasis =
    /** A tier cap the product enforces. */
    | "plan_limit"
    /** A constant the product enforces at a boundary (an upload cap). */
    | "product_constant"
    /** Computed from repository data (the product catalogue). */
    | "derived_from_catalogue"
    /** A business rule stated by the company, not a measurement. */
    | "business_model"

export interface PublicCount {
    readonly id: string
    readonly value: number
    readonly basis: PublicCountBasis
    /** Where the value is enforced or defined — a file and symbol, never a number retyped here. */
    readonly source: string
}

function enforced(value: number | null | undefined, what: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`public count "${what}" has no finite enforced value; do not publish it`)
    }
    return value
}

export const PUBLIC_COUNTS = {
    freePolicies: {
        id: "free-policies",
        value: FREE_POLICY_LIMIT,
        basis: "plan_limit",
        source: "lib/monetization/feature-gates.ts FREE_POLICY_LIMIT (parity-tested against lib/pricing/plan-defaults.ts free.policies)",
    },
    plusPolicies: {
        id: "plus-policies",
        value: PLUS_POLICY_LIMIT,
        basis: "plan_limit",
        source: "lib/monetization/feature-gates.ts PLUS_POLICY_LIMIT",
    },
    familyPolicies: {
        id: "family-policies",
        value: PRO_POLICY_LIMIT,
        basis: "plan_limit",
        source: "lib/monetization/feature-gates.ts PRO_POLICY_LIMIT",
    },
    batchUploadMaxFiles: {
        id: "batch-upload-max-files",
        value: BATCH_UPLOAD_MAX_FILES,
        basis: "product_constant",
        source: "lib/constants/time.ts BATCH_UPLOAD_MAX_FILES — enforced by components/wallet/BatchUploadModal.tsx and app/api/policies/batch-create/route.ts",
    },
    agentStarterCustomers: {
        id: "agent-starter-customers",
        value: enforced(DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_starter.maxCustomers, "agent_starter.maxCustomers"),
        basis: "plan_limit",
        source: "lib/pricing/plan-defaults.ts DEFAULT_AGENT_ENTITLEMENT_LIMITS.agent_starter.maxCustomers",
    },
    insuranceKinds: {
        id: "insurance-kinds",
        value: productCategories.length,
        basis: "derived_from_catalogue",
        source: "lib/product/catalog.tsx productCategories.length",
    },
    insurerCommissions: {
        id: "insurer-commissions",
        value: 0,
        basis: "business_model",
        source: "lib/marketing/positioning.ts — the no-commission promise; a business rule, not a measurement",
    },
} as const satisfies Record<string, PublicCount>

/** Every value the public site may state as a count. */
export const PUBLIC_COUNT_VALUES: ReadonlySet<number> = new Set(
    Object.values(PUBLIC_COUNTS).map((count) => count.value)
)
