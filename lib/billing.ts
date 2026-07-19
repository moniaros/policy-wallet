import { db } from "./db"
import { stripe } from "./stripe"
import { daysFromNow, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/constants/time"
import { TOKEN_PACKAGES, type TokenPackageKey } from "@/lib/billing/token-packages"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { logger } from "@/lib/logger"
import { getSiteOrigin } from "@/lib/seo/site"
import { TRIAL_DAYS_BY_PLAN } from "@/lib/billing/trial-plans"
import { vatInclusiveBreakdown, type VATBreakdown } from "@/lib/billing/vat"
// Only same-origin app paths may be used as post-checkout return targets —
// shared open-redirect guard (re-exported for existing callers).
import { sanitizeReturnPath } from "@/lib/navigation/return-to"

export { vatInclusiveBreakdown, type VATBreakdown, sanitizeReturnPath }

/**
 * Annual price fallback.
 * The LIVE annual price is the plan row's annual_price column (admin-managed
 * via /admin/plans); this table only covers rows that predate the column.
 * If neither exists, fall back to 12 × monthly (no discount). Values must
 * match the public pricing page so the amount charged equals what the visitor
 * was offered.
 */
import { DEFAULT_ANNUAL_PRICE_BY_PLAN } from "@/lib/pricing/plan-defaults"
export const ANNUAL_PRICE_BY_PLAN: Record<string, number> = DEFAULT_ANNUAL_PRICE_BY_PLAN


/**
 * Create a real Stripe Checkout Session.
 *
 * `returnTo` preserves the feature context the user upgraded from: success
 * lands on /upgrade/success (which verifies the session and deep-links back),
 * cancel returns straight to the origin surface instead of a dead route.
 */
export async function createCheckoutSession(
    userId: string,
    planId: string,
    billingPeriod: "monthly" | "annual" = "monthly",
    returnTo?: string | null,
    /** Feature the user upgraded from — makes the success page copy specific. */
    feature?: string | null
) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    const plan = await db.plan.findUnique({ where: { id: planId } })

    if (!plan || !user) throw new Error("Plan or User not found")

    // Deactivated plans take no NEW checkouts (existing subscriptions keep
    // billing — they own their Stripe price). `=== false` so legacy rows /
    // mocks without the column pass through.
    if (plan.isActive === false) throw new Error("Plan is not purchasable")

    const monthlyPrice = Number(plan.price)
    const isAnnual = billingPeriod === "annual"
    // Advertised prices are VAT-inclusive, so periodPrice IS the amount charged.
    // Annual: the admin-managed annual_price column wins; the code fallback
    // covers rows that predate it. NOTE: a price edit affects NEW checkouts
    // only — live Stripe subscriptions keep their original inline price.
    const annualPrice = plan.annualPrice != null
        ? Number(plan.annualPrice)
        : (ANNUAL_PRICE_BY_PLAN[planId] ?? monthlyPrice * 12)
    const periodPrice = isAnnual ? annualPrice : monthlyPrice
    const vat = vatInclusiveBreakdown(periodPrice)

    // Return targets must land on the canonical public site (policywallet.gr),
    // NOT NEXTAUTH_URL — that resolves to the raw Vercel deployment domain in
    // prod, so checkout used to bounce users to *.vercel.app after paying.
    const base = getSiteOrigin()
    const safeReturn = sanitizeReturnPath(returnTo)
    const successUrl =
        `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}` +
        (safeReturn ? `&return=${encodeURIComponent(safeReturn)}` : "") +
        (feature ? `&feature=${encodeURIComponent(feature)}` : "")
    const cancelUrl = `${base}${safeReturn || "/account"}`
    // The admin-managed trial_days column wins; the code map only covers rows
    // that predate it (`?? undefined` keeps mocks without the column working).
    // An admin setting 0 genuinely removes the trial.
    const trialDays = plan.trialDays ?? TRIAL_DAYS_BY_PLAN[planId]

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "eur",
                    product_data: {
                        // Human-facing plan name (e.g. "Agent Starter"), never the
                        // machine `name` ("agent_starter") which leaked onto the
                        // Stripe checkout page.
                        name: plan.displayName,
                        description: `PolicyWallet ${isAnnual ? "annual" : "monthly"} subscription`,
                    },
                    // Charge the advertised (VAT-inclusive) price as-is — never
                    // ×1.24, which double-charged VAT (€49.99 shown → €61.99 taken).
                    unit_amount: Math.round(periodPrice * 100), // Stripe expects cents
                    recurring: {
                        interval: isAnnual ? "year" : "month",
                    },
                },
                quantity: 1,
            },
        ],
        mode: "subscription",
        subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email!,
        metadata: {
            userId,
            planId,
            billingPeriod,
            ...(feature ? { feature } : {}),
        },
    })

    return {
        id: session.id,
        url: session.url!,
        amount: vat.net,        // ex-VAT portion
        vatAmount: vat.vat,     // VAT contained in the price
        total: periodPrice,     // VAT-inclusive total = what's charged
    }
}

/**
 * One-off Stripe Checkout for a token pack (mode: "payment").
 *
 * A pending TokenPurchase row keyed by the session id is created up front;
 * fulfillTokenPurchaseSession() (webhook or /upgrade/success) flips it to
 * completed and credits the balance, idempotently.
 */
export async function createTokenCheckoutSession(
    userId: string,
    packageKey: TokenPackageKey,
    returnTo?: string | null
) {
    const pkg = TOKEN_PACKAGES[packageKey]
    if (!pkg) throw new Error("Unknown token package")

    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user) throw new Error("User not found")

    // Return targets must land on the canonical public site (policywallet.gr),
    // NOT NEXTAUTH_URL — that resolves to the raw Vercel deployment domain in
    // prod, so checkout used to bounce users to *.vercel.app after paying.
    const base = getSiteOrigin()
    const safeReturn = sanitizeReturnPath(returnTo)
    const successUrl =
        `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}` +
        (safeReturn ? `&return=${encodeURIComponent(safeReturn)}` : "")
    const cancelUrl = `${base}${safeReturn || "/account"}`

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: `PolicyWallet AI tokens — ${pkg.label}`,
                    },
                    unit_amount: Math.round(pkg.priceEur * 100),
                },
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email!,
        metadata: {
            userId,
            tokenPackage: packageKey,
            tokensPurchased: String(pkg.tokens),
            priceEur: String(pkg.priceEur),
        },
    })

    await db.tokenPurchase.create({
        data: {
            userId,
            tokensPurchased: BigInt(pkg.tokens),
            amountEur: pkg.priceEur,
            stripeSessionId: session.id,
            status: "pending",
        },
    })

    return { id: session.id, url: session.url!, amountEur: pkg.priceEur, tokens: pkg.tokens }
}

/**
 * Complete a Checkout-based token purchase: flip the pending row and credit
 * the balance. Idempotent — the webhook and the success page may both call
 * this; only a still-pending row is fulfilled.
 */
export async function fulfillTokenPurchaseSession(sessionId: string, userId: string, tokensPurchased: number) {
    if (!sessionId || !userId || !tokensPurchased) return false

    let credited = false
    await db.$transaction(async (tx) => {
        const updated = await tx.tokenPurchase.updateMany({
            where: { userId, stripeSessionId: sessionId, status: "pending" },
            data: { status: "completed" },
        })
        if (updated.count === 0) return

        await tx.tokenBalance.upsert({
            where: { userId },
            create: {
                userId,
                purchasedTokens: BigInt(tokensPurchased),
                usedTokens: BigInt(0),
                lastPurchaseAt: new Date(),
            },
            update: {
                purchasedTokens: { increment: BigInt(tokensPurchased) },
                lastPurchaseAt: new Date(),
            },
        })
        credited = true
    })

    if (credited) {
        await recordConversionEvent(userId, "checkout_completed", { source: "token_topup", tokens: tokensPurchased })
    }

    return credited
}

/**
 * One-off €3 unlock of a single policy's full gap report (mode: "payment",
 * inline price_data — no pre-created Stripe product). Free tier is the
 * intended buyer; the price is flat and VAT-inclusive like token packs.
 */
export const REPORT_UNLOCK_PRICE_EUR = 3

export async function createReportUnlockCheckoutSession(
    userId: string,
    policyId: string,
    returnTo?: string | null
) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user) throw new Error("User not found")

    // Return targets must land on the canonical public site (policywallet.gr),
    // NOT NEXTAUTH_URL — that resolves to the raw Vercel deployment domain in
    // prod, so checkout used to bounce users to *.vercel.app after paying.
    const base = getSiteOrigin()
    const safeReturn = sanitizeReturnPath(returnTo) || `/wallet/${policyId}`
    const successUrl =
        `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}` +
        `&return=${encodeURIComponent(safeReturn)}`
    const cancelUrl = `${base}${safeReturn}`

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: "PolicyWallet — Πλήρης αναφορά κενών κάλυψης",
                    },
                    unit_amount: REPORT_UNLOCK_PRICE_EUR * 100,
                },
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email!,
        metadata: {
            userId,
            policyId,
            type: "report_unlock",
        },
    })

    await db.reportUnlockPurchase.create({
        data: {
            userId,
            policyId,
            amountEur: REPORT_UNLOCK_PRICE_EUR,
            stripeSessionId: session.id,
            status: "pending",
        },
    })

    return { id: session.id, url: session.url!, amountEur: REPORT_UNLOCK_PRICE_EUR }
}

/**
 * Complete a report unlock: flip the pending purchase row and stamp the
 * policy. Idempotent — the webhooks and the success page all race here;
 * only a still-pending row fulfills, and only the owner's policy is stamped.
 */
export async function fulfillReportUnlockSession(
    sessionId: string,
    userId: string,
    policyId: string
): Promise<boolean> {
    if (!sessionId || !userId || !policyId) return false

    let unlocked = false
    await db.$transaction(async (tx) => {
        const updated = await tx.reportUnlockPurchase.updateMany({
            where: { userId, policyId, stripeSessionId: sessionId, status: "pending" },
            data: { status: "completed" },
        })
        if (updated.count === 0) return

        await tx.policy.updateMany({
            where: { id: policyId, ownerUserId: userId, reportUnlockedAt: null },
            data: { reportUnlockedAt: new Date() },
        })
        unlocked = true
    })

    if (unlocked) {
        await recordConversionEvent(userId, "checkout_completed", {
            source: "report_unlock",
            policyId,
        })
    }

    return unlocked
}

/**
 * Billing-period bounds tolerant of Stripe API-version drift: on our pinned
 * 2024-12-18.acacia they are top-level subscription fields; from API version
 * 2025-03-31 (SDK v18+ types) they live on the subscription items instead.
 */
export function extractSubscriptionPeriod(sub: unknown): { start: Date | null; end: Date | null } {
    const s = sub as {
        current_period_start?: number
        current_period_end?: number
        items?: { data?: Array<{ current_period_start?: number; current_period_end?: number }> }
    }
    const start = s.current_period_start ?? s.items?.data?.[0]?.current_period_start
    const end = s.current_period_end ?? s.items?.data?.[0]?.current_period_end
    return {
        start: typeof start === "number" ? new Date(start * 1000) : null,
        end: typeof end === "number" ? new Date(end * 1000) : null,
    }
}

/** Stripe returns `customer` as an id, an expanded object, or null. */
export function extractStripeCustomerId(customer: unknown): string | null {
    if (typeof customer === "string") return customer || null
    if (customer && typeof customer === "object" && "id" in customer) {
        const id = (customer as { id?: unknown }).id
        return typeof id === "string" ? id : null
    }
    return null
}

/**
 * Persist the Stripe customer id on the user when first seen (or changed).
 * The active checkout flow never stored it, so the billing portal had no
 * customer to open for any v1-flow subscriber. Bookkeeping must never break
 * fulfillment, so failures are logged and swallowed.
 */
export async function persistStripeCustomerId(
    userId: string,
    stripeCustomerId: string | null | undefined
) {
    if (!userId || !stripeCustomerId) return
    try {
        await db.user.updateMany({
            where: { id: userId, NOT: { stripeCustomerId } },
            data: { stripeCustomerId },
        })
    } catch (error) {
        logger("warn", "Failed to persist stripeCustomerId", {
            userId,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * Handle Webhook logic
 */
export async function handleSubscriptionSuccess(
    userId: string,
    planId: string,
    stripeSubscriptionId: string,
    stripeCustomerId?: string | null
) {
    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return

    // Idempotent: the webhook AND the /upgrade/success page both call this —
    // whichever runs first wins, the other is a no-op.
    if (stripeSubscriptionId) {
        const existing = await db.subscription.findUnique({
            where: { stripeSubscriptionId },
            select: { id: true },
        })
        if (existing) return
    }

    // Mirror Stripe's real billing period. The old hardcoded +30 days gave
    // annual buyers a 30-day local period and diverged from Pro trials; the
    // fallback below only applies when Stripe can't be reached (or the sub
    // has no Stripe id at all, e.g. grandfathered rows).
    let currentPeriodStart = new Date()
    let currentPeriodEnd = daysFromNow(SUBSCRIPTION_PERIOD_DAYS)
    let autoRenew = true
    if (stripeSubscriptionId) {
        try {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
            const period = extractSubscriptionPeriod(stripeSub)
            if (period.start) currentPeriodStart = period.start
            if (period.end) currentPeriodEnd = period.end
            autoRenew = !stripeSub.cancel_at_period_end
            if (!stripeCustomerId) {
                stripeCustomerId = extractStripeCustomerId(stripeSub.customer)
            }
        } catch (error) {
            logger("warn", "Stripe subscription retrieve failed; using 30-day fallback period", {
                stripeSubscriptionId,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    await persistStripeCustomerId(userId, stripeCustomerId)

    // Replace, don't stack: a new plan of the same type supersedes any prior
    // active subscription of that type. Without this, a monthly→annual switch
    // (or any re-purchase) left BOTH Stripe subscriptions billing.
    const priors = await db.subscription.findMany({
        where: {
            userId,
            status: "active",
            plan: { planType: plan.planType },
            ...(stripeSubscriptionId ? { NOT: { stripeSubscriptionId } } : {}),
        },
        select: { id: true, stripeSubscriptionId: true },
    })
    for (const prior of priors) {
        if (prior.stripeSubscriptionId) {
            try {
                await stripe.subscriptions.cancel(prior.stripeSubscriptionId)
            } catch (error) {
                // Already canceled / gone on Stripe's side — expire locally anyway
                logger("warn", "Prior Stripe subscription cancel failed", {
                    stripeSubscriptionId: prior.stripeSubscriptionId,
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }
        await db.subscription.update({
            where: { id: prior.id },
            data: { status: "expired", autoRenew: false },
        })
    }

    await db.subscription.create({
        data: {
            userId,
            planId,
            status: 'active',
            stripeSubscriptionId: stripeSubscriptionId || null,
            currentPeriodStart,
            currentPeriodEnd,
            autoRenew,
        }
    })

    // Log Activity
    await (db.activityLog as any).create({
        data: {
            adminUserId: userId,
            adminEmail: 'system',
            actionType: 'SUBSCRIPTION_CREATED',
            description: `Subscription started for plan ${plan.name}`,
        }
    })

    await recordConversionEvent(userId, "checkout_completed", { plan: planId })
}
