/**
 * setup-billing-catalog.ts — idempotent Stripe product/price catalog for PolicyWallet.
 *
 * ⚠️ DEPRECATED (2026-07): the live checkout (lib/billing.ts) builds inline
 * price_data from the DB plan row on every session and never reads the
 * pre-created Stripe prices or lib/billing-catalog.json this script emits.
 * Plan prices are admin-managed via /admin/plans. Kept only for reference /
 * a possible future move to managed Stripe Price ids — do not treat its
 * price table as a source of truth.
 *
 * Creates (or finds, via price lookup_keys) every product and price the app
 * sells, and writes the resulting price-ID map to lib/billing-catalog.json so
 * checkout code can reference stable IDs per environment.
 *
 * Usage:
 *   npx ts-node -P prisma/tsconfig.seed.json scripts/setup-billing-catalog.ts            # DRY RUN (prints plan)
 *   npx ts-node -P prisma/tsconfig.seed.json scripts/setup-billing-catalog.ts --apply    # creates in Stripe
 *
 * Requires STRIPE_SECRET_KEY. Safe to re-run: lookup_keys make prices
 * idempotent; products are matched by metadata.pw_key.
 *
 * RevenueCat mapping (configure in the RC dashboard; see
 * docs/operations/BILLING_CATALOG_SETUP.md): each subscription product below
 * maps 1:1 to an RC product; entitlements `plus`, `pro`, `agent_starter`,
 * `agent_pro`, `agency` attach to the matching products; offerings group the
 * policyholder pair and the agent trio.
 */
import { writeFileSync } from "node:fs"
import Stripe from "stripe"
import { TOKEN_PACKAGES } from "../lib/billing/token-packages"

type PlanDef = {
    pwKey: string
    name: string
    planType: "policyholder" | "agent"
    monthlyEur: number
    annualEur: number
    trialDays?: number
}

const PLANS: PlanDef[] = [
    { pwKey: "ph-plus", name: "PolicyWallet Plus", planType: "policyholder", monthlyEur: 2.99, annualEur: 29 },
    { pwKey: "ph-pro", name: "PolicyWallet Pro", planType: "policyholder", monthlyEur: 7.99, annualEur: 79, trialDays: 14 },
    { pwKey: "agent-starter", name: "PolicyWallet Agent Starter", planType: "agent", monthlyEur: 19.99, annualEur: 199 },
    { pwKey: "agent-pro", name: "PolicyWallet Agent Pro", planType: "agent", monthlyEur: 49.99, annualEur: 499 },
    { pwKey: "agent-agency", name: "PolicyWallet Agency", planType: "agent", monthlyEur: 99.99, annualEur: 999 },
]

const apply = process.argv.includes("--apply")

async function main() {
    const catalog: Record<string, string> = {}

    const plan = [
        ...PLANS.flatMap((p) => [
            { lookupKey: `${p.pwKey}_monthly`, desc: `${p.name} — €${p.monthlyEur}/mo (recurring)${p.trialDays ? ` [${p.trialDays}d trial]` : ""}` },
            { lookupKey: `${p.pwKey}_annual`, desc: `${p.name} — €${p.annualEur}/yr (recurring)` },
        ]),
        ...Object.entries(TOKEN_PACKAGES).map(([key, pkg]) => ({
            lookupKey: `tokens_${key}`,
            desc: `Token pack ${pkg.label} — €${pkg.priceEur} (one-time)`,
        })),
    ]

    if (!apply) {
        console.log("[dry-run] Would ensure the following Stripe prices exist:\n")
        for (const item of plan) console.log(`  ${item.lookupKey.padEnd(24)} ${item.desc}`)
        console.log("\nRun with --apply and STRIPE_SECRET_KEY set to create them.")
        return
    }

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is required for --apply")
    const stripe = new Stripe(key)

    async function ensureProduct(pwKey: string, name: string, metadata: Record<string, string>) {
        const existing = await stripe.products.search({ query: `metadata['pw_key']:'${pwKey}'` })
        if (existing.data[0]) return existing.data[0]
        return stripe.products.create({ name, metadata: { pw_key: pwKey, ...metadata } })
    }

    async function ensurePrice(params: Stripe.PriceCreateParams & { lookup_key: string }) {
        const existing = await stripe.prices.list({ lookup_keys: [params.lookup_key], limit: 1 })
        if (existing.data[0]) return existing.data[0]
        return stripe.prices.create(params)
    }

    for (const p of PLANS) {
        const product = await ensureProduct(p.pwKey, p.name, { plan_type: p.planType, ...(p.trialDays ? { trial_days: String(p.trialDays) } : {}) })
        const monthly = await ensurePrice({
            product: product.id,
            currency: "eur",
            unit_amount: Math.round(p.monthlyEur * 100),
            recurring: { interval: "month" },
            lookup_key: `${p.pwKey}_monthly`,
        })
        const annual = await ensurePrice({
            product: product.id,
            currency: "eur",
            unit_amount: Math.round(p.annualEur * 100),
            recurring: { interval: "year" },
            lookup_key: `${p.pwKey}_annual`,
        })
        catalog[`${p.pwKey}_monthly`] = monthly.id
        catalog[`${p.pwKey}_annual`] = annual.id
        console.log(`✓ ${p.name}: ${monthly.id} / ${annual.id}`)
    }

    const tokenProduct = await ensureProduct("tokens", "PolicyWallet AI Tokens", { plan_type: "token_pack" })
    for (const [pkgKey, pkg] of Object.entries(TOKEN_PACKAGES)) {
        const price = await ensurePrice({
            product: tokenProduct.id,
            currency: "eur",
            unit_amount: Math.round(pkg.priceEur * 100),
            lookup_key: `tokens_${pkgKey}`,
        })
        catalog[`tokens_${pkgKey}`] = price.id
        console.log(`✓ Tokens ${pkg.label}: ${price.id}`)
    }

    writeFileSync("lib/billing-catalog.json", JSON.stringify(catalog, null, 2) + "\n")
    console.log("\nWrote lib/billing-catalog.json")
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
