import { NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { getAdminTokenStats, getDailyUsageTrends } from '@/lib/token-tracking'

export async function GET(req: Request) {
    const authResult = await getAuthenticatedUserOrNull()

    // Check if user is admin
    if (!authResult?.dbUser || !authResult.dbUser.roles?.includes('admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined
    const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined
    const userId = searchParams.get('userId') || undefined
    const days = searchParams.get('days')
        ? parseInt(searchParams.get('days')!)
        : 30

    try {
        const [stats, trends] = await Promise.all([
            getAdminTokenStats({ startDate, endDate, userId }),
            getDailyUsageTrends(days),
        ])

        return NextResponse.json({
            stats,
            trends,
        })
    } catch (error) {
        console.error('Error fetching token analytics:', error)
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        )
    }
}
