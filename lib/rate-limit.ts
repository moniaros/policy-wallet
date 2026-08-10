import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import * as Sentry from "@sentry/nextjs"
import { env } from "./env"

// 1. Initialize Redis (Distributed Cache)
let redis: Redis | null = null

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })
}

// A single fixed limiter used to be built here, so every route's declared
// `limit`/`durationMs` was silently ignored and everything ran at 10/60s. Build
// (and memoize) one limiter per distinct (limit, window) instead, namespacing
// the Redis prefix by the config so counters for different windows never share
// a key. This makes per-route limits — including the sensitive ones like
// bulk-import — actually enforce what they declare.
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(limit: number, durationMs: number): Ratelimit | null {
    if (!redis) return null
    const cacheKey = `${limit}:${durationMs}`
    let limiter = limiterCache.get(cacheKey)
    if (!limiter) {
        limiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${durationMs} ms`),
            analytics: true,
            prefix: `@pw/rl:${cacheKey}`,
        })
        limiterCache.set(cacheKey, limiter)
    }
    return limiter
}

// 2. Local fallback cache.
//
// Named "for Dev" originally, but it is a PRODUCTION path in two situations:
// Upstash unconfigured (see `warnedUnconfigured` below) and Upstash unreachable
// (the catch in `rateLimit`). Fluid Compute reuses a function instance across
// requests, so this module scope outlives the request that created it — and
// public routes key on IP, so a bot sweep mints one entry per source address.
//
// Unbounded, that is a memory leak on precisely the path that engages when Redis
// is ALREADY down: the degraded mode would then take the instance out entirely.
// So it is bounded two ways — a periodic sweep of expired entries, and a hard
// cap that evicts the soonest-to-expire when the sweep cannot keep up.
const localCache = new Map<string, { count: number; expires: number }>()

/** Entries retained before eviction. ~100 bytes each: a few MB at the ceiling. */
const LOCAL_CACHE_MAX = 20_000
/** Sweeping on every call would be O(n) per request; once a minute is enough. */
const LOCAL_SWEEP_INTERVAL_MS = 60_000
let lastSweep = 0

/**
 * Entry count, for the test that proves the cache stays bounded.
 *
 * The alternative is asserting on process memory, which is flaky and would not
 * fail for the right reason.
 */
export function __localCacheSize(): number {
    return localCache.size
}

function pruneLocalCache(now: number) {
    if (now - lastSweep > LOCAL_SWEEP_INTERVAL_MS) {
        lastSweep = now
        for (const [key, record] of localCache) {
            if (now > record.expires) localCache.delete(key)
        }
    }

    if (localCache.size <= LOCAL_CACHE_MAX) return

    // Still over after sweeping: an active flood of live keys. Evict the ones
    // closest to expiring — they are the entries whose loss costs the least
    // enforcement, since they were about to reset anyway.
    const byExpiry = [...localCache.entries()].sort((a, b) => a[1].expires - b[1].expires)
    for (let i = 0; i < byExpiry.length - LOCAL_CACHE_MAX; i += 1) {
        localCache.delete(byExpiry[i][0])
    }
}

/**
 * Distributed Rate Limiter
 *
 * `bucket` namespaces the counter. Without it every caller keys on the bare IP,
 * which means proxy.ts's global /api limit and a route's own limit drain the SAME
 * counter — a visitor who merely browses the site can get 429'd out of submitting
 * a form. Pass a bucket (e.g. `contact:${ip}`) to get an independent allowance.
 */
// One-time signal: running production WITHOUT Upstash configured means every
// limit is per-instance in-memory only — silently useless across serverless
// instances. Failing open without a trace hid exactly that in prod.
let warnedUnconfigured = false

export async function rateLimit(ip: string, limit: number = 10, durationMs: number = 60000, bucket?: string) {
    const key = bucket || ip

    const limiter = getLimiter(limit, durationMs)
    if (!limiter && process.env.NODE_ENV === "production" && !warnedUnconfigured) {
        warnedUnconfigured = true
        console.warn("rate-limit: Upstash not configured — per-instance in-memory limiting only")
        Sentry.captureMessage("rate-limit: Upstash not configured in production", { level: "warning" })
    }
    if (limiter) {
        try {
            // Use Global Redis Ratelimiter (per (limit, window) instance)
            const { success, limit: totalLimit, remaining, reset } = await limiter.limit(key)

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

    // Fallback: per-instance in-memory limiting.
    const now = Date.now()
    pruneLocalCache(now)
    const record = localCache.get(key)

    if (!record || now > record.expires) {
        localCache.set(key, { count: 1, expires: now + durationMs })
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
