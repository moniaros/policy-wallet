import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
})

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer_email: session.user.email,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PREMIUM_PRICE_ID!,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXTAUTH_URL}/account?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
            metadata: {
                userId: session.user.id,
            },
            subscription_data: {
                metadata: {
                    userId: session.user.id,
                },
            },
        })

        return NextResponse.json({ url: checkoutSession.url })
    } catch (error) {
        console.error('Stripe checkout error:', error)
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        )
    }
}
