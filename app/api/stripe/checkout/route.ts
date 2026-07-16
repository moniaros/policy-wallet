import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { withLegacyBillingDeprecationHeaders } from '@/lib/api-deprecation'
import { rateLimit } from '@/lib/rate-limit'
import { getSiteOrigin } from '@/lib/seo/site'

const stripe = getStripe()

function deprecated(response: NextResponse) {
    return withLegacyBillingDeprecationHeaders(response, "/api/v1/billing/checkout")
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUserOrNull()

        if (!user) {
            return deprecated(NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            ))
        }

        const { dbUser } = user
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
        const limitCheck = await rateLimit(`legacy:stripe:checkout:${dbUser.id}:${ip}`, 10, 60 * 1000)
        if (!limitCheck.success) {
            return deprecated(limitCheck.error || NextResponse.json({ error: "Too many requests" }, { status: 429 }))
        }
        const body = await req.json()
        const tier = body.tier as 'plus' | 'pro'

        let priceId = ''
        if (tier === 'pro') {
            priceId = process.env.STRIPE_PREMIUM_PRICE_ID || '' // 9.99
        } else if (tier === 'plus') {
            priceId = process.env.STRIPE_PLUS_PRICE_ID || '' // 2.99
        }

        if (!priceId) {
            return deprecated(NextResponse.json(
                { error: 'Invalid Price configuration' },
                { status: 400 }
            ))
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
            success_url: `${getSiteOrigin()}/account?success=true`,
            cancel_url: `${getSiteOrigin()}/pricing?canceled=true`,
            metadata: {
                userId: dbUser.id,
                tier: tier
            },
            subscription_data: subscription_data,
        })

        return deprecated(NextResponse.json({ url: checkoutSession.url }))
    } catch (error) {
        console.error('Stripe checkout error:', error)
        return deprecated(NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        ))
    }
}
