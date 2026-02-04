import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
})

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUserOrNull()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { dbUser } = user

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer_email: dbUser.email,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PREMIUM_PRICE_ID!,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
            metadata: {
                userId: dbUser.id,
            },
            subscription_data: {
                metadata: {
                    userId: dbUser.id,
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
