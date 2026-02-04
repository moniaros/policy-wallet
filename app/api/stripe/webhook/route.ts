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
    if (!userId) return

    const subscriptionId = session.subscription as string
    // const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // TODO: Update DB once Schema includes stripe fields
    console.warn('Skipping DB update for checkout.session.completed: Schema mismatch (missing stripe fields)')
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription as string
    if (!subscriptionId) return

    // TODO: Update DB once Schema includes stripe fields
    console.warn('Skipping DB update for invoice.paid: Schema mismatch')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription as string
    if (!subscriptionId) return
    console.warn('Skipping DB update for invoice.payment_failed: Schema mismatch')
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    console.warn('Skipping DB update for customer.subscription.updated: Schema mismatch')
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    console.warn('Skipping DB update for customer.subscription.deleted: Schema mismatch')
}
