import { db } from "./db"
import { stripe } from "./stripe"

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
 * Create a real Stripe Checkout Session
 */
export async function createCheckoutSession(userId: string, planId: string) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    const plan = await db.plan.findUnique({ where: { id: planId } })

    if (!plan || !user) throw new Error("Plan or User not found")

    const price = Number(plan.price)
    const vat = calculateVAT(price)

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: plan.name,
                        description: `PolicyWallet ${plan.name} Subscription`,
                    },
                    unit_amount: Math.round(vat.totalWithVat * 100), // Stripe expects cents
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
        },
    })

    return {
        id: session.id,
        url: session.url!,
        amount: price,
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
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
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
