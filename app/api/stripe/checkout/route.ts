import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'

const stripe = getStripe()

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
        const body = await req.json()
        const tier = body.tier as 'plus' | 'pro'

        let priceId = ''
        if (tier === 'pro') {
            priceId = process.env.STRIPE_PREMIUM_PRICE_ID || '' // 9.99
        } else if (tier === 'plus') {
            priceId = process.env.STRIPE_PLUS_PRICE_ID || '' // 2.99
        }

        if (!priceId) {
            return NextResponse.json(
                { error: 'Invalid Price configuration' },
                { status: 400 }
            )
        }

        // Check if user is eligible for trial (Use trial once)
        // Logic: If user has ANY subscription history that is NOT the default free plan, no trial.
        const hasPriorSubscription = await db.subscription.count({
            where: {
                userId: dbUser.id,
                planId: { not: 'ph-free' }
            }
        })

        const subscription_data: any = {
            metadata: {
                userId: dbUser.id,
                tier: tier
            }
        }

        if (hasPriorSubscription === 0) {
            subscription_data.trial_period_days = 14
        }

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            customer_email: dbUser.email,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
            metadata: {
                userId: dbUser.id,
                tier: tier
            },
            subscription_data: subscription_data,
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
