import { db } from "./db"
import { stripe } from "./stripe"
import { daysFromNow, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/constants/time"

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
 * Create a real Stripe Checkout Session
 */
export async function createCheckoutSession(userId: string, planId: string, billingPeriod: "monthly" | "annual" = "monthly") {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    const plan = await db.plan.findUnique({ where: { id: planId } })

    if (!plan || !user) throw new Error("Plan or User not found")

    const monthlyPrice = Number(plan.price)
    const isAnnual = billingPeriod === "annual"
    const periodPrice = isAnnual
        ? (ANNUAL_PRICE_BY_PLAN[planId] ?? monthlyPrice * 12)
        : monthlyPrice
    const vat = calculateVAT(periodPrice)

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
        success_url: `${process.env.NEXTAUTH_URL}/wallet?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
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
 * Handle Webhook logic
 */
export async function handleSubscriptionSuccess(userId: string, planId: string, stripeSubscriptionId: string) {
    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return

    // Create or update subscription
    await db.subscription.create({
        data: {
            userId,
            planId,
            status: 'active',
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
}
