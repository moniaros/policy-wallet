import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { db as prisma } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
    try {
        const body = await req.text()
        const headersList = await headers()
        const signature = headersList.get('stripe-signature')!

        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err) {
            console.error('Webhook signature verification failed:', err)
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            )
        }

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

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId
    if (!userId) {
        console.error('No userId in session metadata', session.id)
        return
    }

    const stripeCustomerId = session.customer as string
    const stripeSubscriptionId = session.subscription as string

    // Update user with stripe customer ID
    await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId }
    })

    if (stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        const priceId = subscription.items.data[0].price.id

        // Find plan by priceId (stored in metadata usually) or lookup
        // For now, we'll try to find a plan that matches this price if we had a mapping
        // Or just update the existing subscription record

        await prisma.subscription.updateMany({
            where: { userId, status: 'active' },
            data: { status: 'past_due' } // Deactivate old ones
        })

        // Create new subscription record
        await prisma.subscription.create({
            data: {
                userId,
                planId: session.metadata?.planId || 'ph-plus', // Fallback or from metadata
                stripeSubscriptionId,
                stripePriceId: priceId,
                stripeStatus: subscription.status,
                status: 'active',
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                autoRenew: !subscription.cancel_at_period_end
            }
        })
    }

    console.log(`Checkout completed for user ${userId}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = invoice.subscription as string
    if (!stripeSubscriptionId) return

    await prisma.subscription.update({
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

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const stripeSubscriptionId = invoice.subscription as string
    if (!stripeSubscriptionId) return

    await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: {
            status: 'past_due',
            stripeStatus: 'past_due'
        }
    })
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    await prisma.subscription.update({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
            stripeStatus: stripeSubscription.status,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            autoRenew: !stripeSubscription.cancel_at_period_end,
            stripePriceId: stripeSubscription.items.data[0].price.id
        }
    })
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    await prisma.subscription.update({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
            status: 'cancelled',
            stripeStatus: 'canceled',
            autoRenew: false
        }
    })
}
