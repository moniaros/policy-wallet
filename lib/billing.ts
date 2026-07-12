import { db } from "./db"
import { stripe } from "./stripe"
import { daysFromNow, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/constants/time"
import { TOKEN_PACKAGES, type TokenPackageKey } from "@/lib/billing/token-packages"
import { recordConversionEvent } from "@/lib/journey/conversion-events"

export interface VATInfo {
    rate: number
    amount: number
    totalWithVat: number
}

/**
 * Calculate VAT for Greek market (Default 24%)
 */
export function calculateVAT(netAmount: number, countryCode: string = 'GR'): VATInfo {
    const rate = countryCode === 'GR' ? 0.24 : 0
    const amount = netAmount * rate
    return {
        rate,
        amount: Math.round(amount * 100) / 100,
        totalWithVat: Math.round((netAmount + amount) * 100) / 100
    }
}

/**
 * Annual price lookup.
 * These must match the prices shown on the public pricing page so that the
 * amount charged equals what the visitor was offered.  If a plan has no
 * explicit annual price, fall back to 12 × monthly (no discount).
 */
const ANNUAL_PRICE_BY_PLAN: Record<string, number> = {
    "ph-plus": 29,        // UI: €29/yr  (monthly €2.99 × 12 = €35.88)
    "ph-pro": 99,         // UI: €99/yr  (monthly €9.99 × 12 = €119.88)
    "agent-starter": 199, // UI: €199/yr (monthly €19.99 × 12 = €239.88)
    "agent-pro": 499,     // UI: €499/yr (monthly €49.99 × 12 = €599.88)
    "agent-agency": 999,  // UI: €999/yr (monthly €99.99 × 12 = €1199.88)
}

/**
 * Only same-origin app paths may be used as post-checkout return targets —
 * never absolute URLs (open-redirect guard).
 */
export function sanitizeReturnPath(returnTo: string | null | undefined): string | null {
    if (!returnTo) return null
    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null
    return returnTo
}

/** Plans whose Stripe subscription starts with a free trial. */
const TRIAL_DAYS_BY_PLAN: Record<string, number> = {
    "ph-pro": 14,
}

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
    returnTo?: string | null
) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    const plan = await db.plan.findUnique({ where: { id: planId } })

    if (!plan || !user) throw new Error("Plan or User not found")

    const monthlyPrice = Number(plan.price)
    const isAnnual = billingPeriod === "annual"
    const periodPrice = isAnnual
        ? (ANNUAL_PRICE_BY_PLAN[planId] ?? monthlyPrice * 12)
        : monthlyPrice
    const vat = calculateVAT(periodPrice)

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const safeReturn = sanitizeReturnPath(returnTo)
    const successUrl =
        `${base}/upgrade/success?session_id={CHECKOUT_SESSION_ID}` +
        (safeReturn ? `&return=${encodeURIComponent(safeReturn)}` : "")
    const cancelUrl = `${base}${safeReturn || "/account"}`
    const trialDays = TRIAL_DAYS_BY_PLAN[planId]

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: plan.name,
                        description: `PolicyWallet ${plan.name} Subscription (${isAnnual ? "Annual" : "Monthly"})`,
                    },
                    unit_amount: Math.round(vat.totalWithVat * 100), // Stripe expects cents
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
        },
    })

    return {
        id: session.id,
        url: session.url!,
        amount: periodPrice,
        vatAmount: vat.amount,
        total: vat.totalWithVat
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

    const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
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
 * Handle Webhook logic
 */
export async function handleSubscriptionSuccess(userId: string, planId: string, stripeSubscriptionId: string) {
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

    await db.subscription.create({
        data: {
            userId,
            planId,
            status: 'active',
            stripeSubscriptionId: stripeSubscriptionId || null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: daysFromNow(SUBSCRIPTION_PERIOD_DAYS), // +30 days
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
