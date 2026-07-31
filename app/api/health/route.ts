import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActiveAIProvider } from '@/lib/services/ai/ai-service.factory'

export const dynamic = 'force-dynamic'

/**
 * Health Check Endpoint
 * 
 * Returns the health status of the application and its dependencies.
 * Use this endpoint for monitoring and load balancer health checks.
 * 
 * @returns {Object} Health status with timestamp and service status
 */
export async function GET() {
    const startTime = Date.now()

    try {
        // Test database connection
        await db.$queryRaw`SELECT 1`

        const responseTime = Date.now() - startTime

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                api: 'operational',
                // Whether analyses on this deployment cost real money.
                // Deliberately a boolean and not the provider's NAME: this
                // endpoint is public, and the load scenario that reads it
                // (scripts/load/authed-journey.js) needs to know only whether
                // enqueueing thousands of runs would bill a real vendor.
                // Naming the vendor would be disclosure with no added use.
                aiProviderIsMock: getActiveAIProvider() === 'mock'
            },
            performance: {
                responseTimeMs: responseTime
            },
            version: process.env.npm_package_version || 'unknown'
        })
    } catch (error) {
        const responseTime = Date.now() - startTime

        console.error('Health check failed:', error)

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'disconnected',
                api: 'operational'
            },
            performance: {
                responseTimeMs: responseTime
            },
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 503 })
    }
}
