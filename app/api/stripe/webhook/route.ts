import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db as prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createApiError } from '@/lib/api-utils'
import { withApiGuard } from '@/lib/api-guard'
import { withLegacyBillingDeprecationHeaders } from '@/lib/api-deprecation'
import { processWebhookEventOnce } from '@/lib/services/billing/webhook-idempotency'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

function deprecated(response: NextResponse) {
    return withLegacyBillingDeprecationHeaders(response, "/api/v1/billing/webhook")
}

export const POST = withApiGuard(
    {
        auth: {
            mode: "webhook",
            verify: ({ req }) => {
                if (!webhookSecret) {
                    return createApiError("SERVICE_UNAVAILABLE", "Stripe webhook secret not configured", 503)
                }
                if (!req.headers.get('stripe-signature')) {
                    return createApiError("BAD_REQUEST", "Missing stripe-signature header", 400)
                }
                return null
            },
        },
        rateLimit: {
            limit: 180,
            windowMs: 60 * 1000,
            key: ({ ip }) => `webhook:stripe:legacy:${ip}`,
        },
    },
    async ({ req }) => {
        try {
            const body = await req.text()
            const signature = req.headers.get('stripe-signature')!

            let event: Stripe.Event
            try {
                event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
            } catch (err) {
                console.error('Webhook signature verification failed:', err)
                return deprecated(NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 400 }
                ))
            }

            const outcome = await processWebhookEventOnce(
                {
                    provider: "stripe",
                    eventId: event.id,
                    sourceRoute: "/api/stripe/webhook",
                },
                async () => {
                    switch (event.type) {
                        case 'checkout.session.completed':
                        case 'checkout.session.async_payment_succeeded': {
                            const session = event.data.object as Stripe.Checkout.Session
                            const { fulfillCheckoutSession } = await import('@/lib/billing')
                            await fulfillCheckoutSession(session)
                            break
                        }

                        case 'invoice.paid': {
                            const invoice = event.data.object as Stripe.Invoice
                            await handleInvoicePaid(invoice)
                            break
                        }

                        case 'invoice.payment_failed': {
                            const invoice = event.data.object as Stripe.Invoice
                            await handlePaymentFailed(invoice)
                            break
                        }

                        case 'customer.subscription.updated': {
                            const subscription = event.data.object as Stripe.Subscription
                            await handleSubscriptionUpdated(subscription)
                            break
                        }

                        case 'customer.subscription.deleted': {
                            const subscription = event.data.object as Stripe.Subscription
                            await handleSubscriptionDeleted(subscription)
                            break
                        }

                        case 'payment_intent.succeeded': {
                            const paymentIntent = event.data.object as Stripe.PaymentIntent
                            // Only handle token purchases (identified by tokensPurchased metadata)
                            if (paymentIntent.metadata?.tokensPurchased) {
                                await handleTokenPurchaseCompleted(paymentIntent)
                            }
                            break
                        }

                        default:
                            console.log(`Unhandled event type: ${event.type}`)
                    }
                    return { eventType: event.type }
                }
            )

            if (outcome === "duplicate") {
                return deprecated(NextResponse.json({ received: true, duplicate: true }))
            }
            return deprecated(NextResponse.json({ received: true }))
        } catch (error) {
            console.error('Webhook error:', error)
            return deprecated(NextResponse.json(
                { error: 'Webhook handler failed' },
                { status: 500 }
            ))
        }
    }
)

async function handleInvoicePaid(invoice: any) {
    const stripeSubscriptionId = invoice.subscription as string
    if (!stripeSubscriptionId) return

    await (prisma.subscription.update as any)({
        where: { stripeSubscriptionId },
        data: {
            status: 'active',
            stripeStatus: 'active',
            currentPeriodStart: new Date(invoice.period_start * 1000),
            currentPeriodEnd: new Date(invoice.period_end * 1000),
        }
    })

    // Also update invoice record if it exists
    if (invoice.number) {
        await prisma.invoice.updateMany({
            where: { invoiceNumber: invoice.number },
            data: {
                status: 'paid',
                paidAt: new Date()
            }
        })
    }
}

async function handlePaymentFailed(invoice: any) {
    const stripeSubscriptionId = invoice.subscription as string
    if (!stripeSubscriptionId) return

    await (prisma.subscription.update as any)({
        where: { stripeSubscriptionId },
        data: {
            status: 'past_due',
            stripeStatus: 'past_due'
        }
    })
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    await (prisma.subscription.update as any)({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
            stripeStatus: stripeSubscription.status,
            currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
            autoRenew: !stripeSubscription.cancel_at_period_end,
            stripePriceId: stripeSubscription.items.data[0].price.id
        }
    })
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    await (prisma.subscription.update as any)({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
            status: 'cancelled',
            stripeStatus: 'canceled',
            autoRenew: false
        }
    })
}

async function handleTokenPurchaseCompleted(paymentIntent: Stripe.PaymentIntent) {
    const userId = paymentIntent.metadata?.userId
    const tokensPurchased = parseInt(paymentIntent.metadata?.tokensPurchased || '0', 10)
    const priceEur = parseFloat(paymentIntent.metadata?.priceEur || '0')

    if (!userId || !tokensPurchased) {
        logger('warn', 'Token purchase webhook: missing metadata', {
            paymentIntentId: paymentIntent.id,
        })
        return
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Update existing pending purchase record
            await tx.tokenPurchase.updateMany({
                where: {
                    userId,
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'pending',
                },
                data: { status: 'completed' },
            })

            // Upsert token balance
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
        })

        logger('info', 'Token purchase completed and balance updated', {
            userId,
            tokensPurchased,
            priceEur,
            paymentIntentId: paymentIntent.id,
        })
    } catch (error) {
        logger('error', 'Failed to process token purchase webhook', {
            userId,
            paymentIntentId: paymentIntent.id,
            error: error instanceof Error ? error.message : String(error),
        })
        throw error
    }
}
