import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db as prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createApiError } from '@/lib/api-utils'
import { withApiGuard } from '@/lib/api-guard'
import { withLegacyBillingDeprecationHeaders } from '@/lib/api-deprecation'
import { claimWebhookEvent, markWebhookEventProcessed, releaseWebhookEventClaim } from '@/lib/services/billing/webhook-idempotency'

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

            const claimed = await claimWebhookEvent({
                provider: "stripe",
                eventId: event.id,
                sourceRoute: "/api/stripe/webhook",
            })
            if (!claimed) {
                return deprecated(NextResponse.json({ received: true, duplicate: true }))
            }

            try {
            // Handle the event
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session
                    await handleCheckoutCompleted(session)
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

            } catch (handlerError) {
                // Release the claim so Stripe's retry is not swallowed as a duplicate.
                await releaseWebhookEventClaim("stripe", event.id).catch(() => {})
                throw handlerError
            }

            await markWebhookEventProcessed({
                provider: "stripe",
                eventId: event.id,
                sourceRoute: "/api/stripe/webhook",
                status: "processed",
                result: { eventType: event.type },
            })

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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId
    if (!userId) {
        console.error('No userId in session metadata', session.id)
        return
    }

    // One-off €3 gap-report unlock (mode: payment) — no subscription follows.
    if (session.metadata?.type === 'report_unlock' && session.metadata?.policyId) {
        const { fulfillReportUnlockSession } = await import('@/lib/billing')
        await fulfillReportUnlockSession(session.id, userId, session.metadata.policyId)
        return
    }

    const { extractStripeCustomerId, handleSubscriptionSuccess, persistStripeCustomerId } =
        await import('@/lib/billing')

    const stripeCustomerId = extractStripeCustomerId(session.customer)
    await persistStripeCustomerId(userId, stripeCustomerId)

    const stripeSubscriptionId = session.subscription as string | null
    if (!stripeSubscriptionId) return

    // Unpaid sessions must not grant entitlement (trials report no_payment_required).
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
        logger('warn', 'Legacy checkout webhook: session completed without payment, skipping', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
        })
        return
    }

    const planId = session.metadata?.planId
    if (!planId) {
        // The old fallback here invented 'ph-plus', which is not a real plan row.
        logger('error', 'Legacy checkout webhook: no planId in session metadata, cannot grant', {
            sessionId: session.id,
            stripeSubscriptionId,
        })
        return
    }

    // Canonical grant path (same as /api/v1/billing/webhook): idempotent by
    // stripeSubscriptionId, creates the replacement BEFORE expiring priors, and
    // mirrors Stripe's real billing period. The previous inline version demoted
    // every active subscription to past_due before creating the new row — a
    // throw in between left the payer unentitled.
    await handleSubscriptionSuccess(userId, planId, stripeSubscriptionId, stripeCustomerId)
}

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
