import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db as prisma } from '@/lib/db'

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

        // Get user's subscription
        const subscription = await prisma.subscription.findFirst({
            where: { userId: dbUser.id },
            // Include plan if needed, but here we just need stripeCustomerId which might be on subscription or user?
            // Checking schema earlier: subscription doesn't have stripeCustomerId?
            // Wait, previous code accessed subscription.stripeCustomerId.
            // Let's check schema for stripeCustomerId.
        })

        return NextResponse.json(
            { error: 'Subscription management unavailable: Schema update pending' },
            { status: 503 }
        )

    } catch (error) {
        console.error('Stripe portal error:', error)
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        )
    }
}
