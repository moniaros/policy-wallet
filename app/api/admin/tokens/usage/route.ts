import { NextResponse } from 'next/server'
import { getAuthenticatedUserOrNull } from '@/lib/auth-helpers'
import { db as prisma } from '@/lib/db'

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
    const operationType = searchParams.get('operationType') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
    }

    if (userId) where.userId = userId
    if (operationType) where.operationType = operationType

    try {
        const [usage, total] = await Promise.all([
            prisma.tokenUsage.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.tokenUsage.count({ where }),
        ])

        return NextResponse.json({
            usage: usage.map((u) => ({
                id: u.id,
                user: u.user,
                operationType: u.operationType,
                policyId: u.policyId,
                inputTokens: u.inputTokens,
                outputTokens: u.outputTokens,
                totalTokens: u.totalTokens,
                costEur: Number(u.costEur),
                model: u.model,
                createdAt: u.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching token usage:', error)
        return NextResponse.json(
            { error: 'Failed to fetch usage data' },
            { status: 500 }
        )
    }
}
