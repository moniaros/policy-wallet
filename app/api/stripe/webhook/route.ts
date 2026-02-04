import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
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
    if (!userId) return

    const subscriptionId = session.subscription as string
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Create or update subscription record
    await prisma.subscription.upsert({
        where: { userId },
        create: {
            userId,
            tier: 'premium',
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: subscription.items.data[0].price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
            tier: 'premium',
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: subscription.items.data[0].price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    })

    // Log the event
    await prisma.securityEvent.create({
        data: {
            userId,
            eventType: 'subscription_created',
            eventData: { tier: 'premium', subscriptionId },
            ipAddress: '',
            userAgent: '',
        },
    })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string
    if (!subscriptionId) return

    const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
    })

    if (!subscription) return

    // Create invoice record
    await prisma.invoice.create({
        data: {
            userId: subscription.userId,
            amount: invoice.amount_paid / 100, // Convert from cents
            currency: invoice.currency.toUpperCase(),
            status: 'paid',
            stripeInvoiceId: invoice.id,
            invoiceUrl: invoice.hosted_invoice_url,
            pdfUrl: invoice.invoice_pdf,
        },
    })

    // Update subscription period
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            status: 'active',
        },
    })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string
    if (!subscriptionId) return

    const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
    })

    if (!subscription) return

    // Update subscription status
    await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
    })

    // Log the event
    await prisma.securityEvent.create({
        data: {
            userId: subscription.userId,
            eventType: 'payment_failed',
            eventData: { invoiceId: invoice.id },
            ipAddress: '',
            userAgent: '',
        },
    })

    // TODO: Send email notification to user
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubscription.id },
    })

    if (!subscription) return

    await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            status: stripeSubscription.status === 'active' ? 'active' : 'canceled',
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
    })
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubscription.id },
    })

    if (!subscription) return

    // Update to free tier
    await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            tier: 'free',
            status: 'canceled',
            canceledAt: new Date(),
        },
    })

    // Log the event
    await prisma.securityEvent.create({
        data: {
            userId: subscription.userId,
            eventType: 'subscription_canceled',
            eventData: { tier: 'free' },
            ipAddress: '',
            userAgent: '',
        },
    })
}
