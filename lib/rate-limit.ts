import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import * as Sentry from "@sentry/nextjs"
import { env } from "./env"

// 1. Initialize Redis (Distributed Cache)
let redis: Redis | null = null
let ratelimit: Ratelimit | null = null

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })

    ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        analytics: true,
        prefix: "@upstash/ratelimit",
    })
}

// 2. Local Fallback Cache for Dev
const localCache = new Map<string, { count: number; expires: number }>()

/**
 * Distributed Rate Limiter
 */
export async function rateLimit(ip: string, limit: number = 10, durationMs: number = 60000) {
    if (ratelimit) {
        try {
            // Use Global Redis Ratelimiter
            const { success, limit: totalLimit, remaining, reset } = await ratelimit.limit(ip)

            if (!success) {
                return {
                    success: false,
                    limit: totalLimit,
                    remaining,
                    error: NextResponse.json(
                        {
                            error: {
                                code: "TOO_MANY_REQUESTS",
                                message: "Rate limit exceeded. Please try again later.",
                                status: 429
                            }
                        },
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': totalLimit.toString(),
                                'X-RateLimit-Remaining': remaining.toString(),
                                'X-RateLimit-Reset': reset.toString(),
                            }
                        }
                    )
                }
            }
            return { success: true, count: totalLimit - remaining, limit: totalLimit }
        } catch (error) {
            // Redis unreachable → per-instance in-memory limiting only. This is a
            // security degradation (the distributed limit no longer holds across
            // instances), so surface it loudly rather than failing open silently.
            console.warn("Upstash Redis ratelimit failed, falling back to local memory:", error)
            Sentry.captureMessage("rate-limit: Upstash unreachable, degraded to in-memory", {
                level: "warning",
                extra: { error: error instanceof Error ? error.message : String(error) },
            })
            // Fall through to local cache
        }
    }

    // Fallback Code (In-Memory for Dev)
    const now = Date.now()
    const record = localCache.get(ip)

    if (!record || now > record.expires) {
        localCache.set(ip, { count: 1, expires: now + durationMs })
        return { success: true, count: 1, limit }
    }

    record.count++
    if (record.count > limit) {
        return {
            success: false,
            count: record.count,
            limit,
            error: NextResponse.json(
                { error: { code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded (Local Dev).", status: 429 } },
                { status: 429 }
            )
        }
    }

    return { success: true, count: record.count, limit }
}
