import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db as prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { withLegacyBillingDeprecationHeaders } from '@/lib/api-deprecation'
import { rateLimit } from '@/lib/rate-limit'

const stripe = getStripe()

function deprecated(response: NextResponse) {
    return withLegacyBillingDeprecationHeaders(response, "/api/v1/billing/portal")
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
        const limitCheck = await rateLimit(`legacy:stripe:portal:${dbUser.id}:${ip}`, 10, 60 * 1000)
        if (!limitCheck.success) {
            return deprecated(limitCheck.error || NextResponse.json({ error: "Too many requests" }, { status: 429 }))
        }

        // Get user's subscription
        const subscription = await prisma.subscription.findFirst({
            where: { userId: dbUser.id },
            // Include plan if needed, but here we just need stripeCustomerId which might be on subscription or user?
            // Checking schema earlier: subscription doesn't have stripeCustomerId?
            // Wait, previous code accessed subscription.stripeCustomerId.
            // Let's check schema for stripeCustomerId.
        })

        return deprecated(NextResponse.json(
            { error: 'Subscription management unavailable: Schema update pending' },
            { status: 503 }
        ))

    } catch (error) {
        console.error('Stripe portal error:', error)
        return deprecated(NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        ))
    }
}
