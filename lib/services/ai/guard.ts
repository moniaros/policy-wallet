/**
 * Zero-cost AI input guard.
 *
 * The single deterministic chokepoint that runs BEFORE any provider call, so a
 * blocked request costs zero tokens. Three jobs:
 *
 *  1. guardUserText   — length cap + character sanitation + injection scoring
 *                       for free-text a user typed (Q&A questions, agent notes).
 *  2. sanitizeStructuredContext — strip forged spotlight delimiters out of
 *                       extracted policy data before it is re-interpolated into
 *                       later prompts (the poisoned-PDF indirect-injection
 *                       channel: extraction output becomes prompt text on every
 *                       subsequent Q&A / gap / clarity call).
 *  3. enforceBillableCallPolicy — a Redis rate limit paired with an
 *                       instance-independent DB-backed backstop (the MEDIC
 *                       pattern), so every billable path is capped even when
 *                       production runs without Upstash (RATELIMIT_ALLOW_LOCAL).
 *
 * Detection is regex/phrase only — see guard-patterns.ts. No model is ever
 * called on the blocking path.
 */

import {
    HIGH_CONFIDENCE_PATTERNS,
    MEDIUM_SIGNAL_PATTERNS,
    BLOCK_THRESHOLD,
    FLAG_THRESHOLD,
} from "./guard-patterns"

// sanitizeStructuredContext is the pure spotlight-delimiter stripper, kept in
// its own dependency-free module so prompt builders can use it too. Re-exported
// here so guard.ts stays the single import surface for callers.
export { sanitizeStructuredContext, stripSpotlightDelimiters } from "./spotlight"

/** Reject codes surfaced to callers (mapped to i18n user messages upstream). */
export type GuardRejectCode = "INPUT_TOO_LONG" | "INPUT_REJECTED"

export type GuardVerdict =
    | { ok: true; sanitized: string; flags: string[]; score: number }
    | { ok: false; code: GuardRejectCode; reason: string; score: number; flags: string[] }

// Character classes use \u escapes so the source stays ASCII (UTF-8/mojibake
// clean) while matching the intended invisibles at runtime.
//  - CONTROL_CHARS: C0/C1 controls except tab, LF, CR.
//  - ZERO_WIDTH_CHARS: ZWSP/ZWNJ/ZWJ, word joiner, invisible separators, BOM.
//  - BIDI_CHARS: bidirectional overrides and isolates (the Trojan-Source class).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g
const BIDI_CHARS = /[\u202A-\u202E\u2066-\u2069]/g

/**
 * Strip characters that don't belong in a typed question and can be used to
 * smuggle instructions or spoof formatting. Text is NFC-normalized first so
 * Greek composed/decomposed forms collapse before scoring.
 */
export function sanitizeText(input: string): string {
    return input
        .normalize("NFC")
        .replace(CONTROL_CHARS, "")
        .replace(ZERO_WIDTH_CHARS, "")
        .replace(BIDI_CHARS, "")
}

/**
 * Sum injection-pattern weights over the (already sanitized, lower-cased) text.
 * Exported so unit tests can pin individual patterns and thresholds.
 */
export function scoreInjection(text: string): { score: number; patternIds: string[] } {
    let score = 0
    const patternIds: string[] = []
    for (const pattern of [...HIGH_CONFIDENCE_PATTERNS, ...MEDIUM_SIGNAL_PATTERNS]) {
        if (pattern.test.test(text)) {
            score += pattern.weight
            patternIds.push(pattern.id)
        }
    }
    return { score, patternIds }
}

/**
 * Guard a piece of user-supplied free text.
 *
 * Order: length cap (cheapest, blocks first) -> sanitize -> injection score.
 * A blocked verdict carries the matched pattern ids + score so the caller can
 * write an audit row WITHOUT ever persisting the raw text (GDPR: metadata only).
 */
export function guardUserText(
    text: string,
    opts: { maxChars: number; field: string }
): GuardVerdict {
    const raw = text ?? ""
    if (raw.length > opts.maxChars) {
        return {
            ok: false,
            code: "INPUT_TOO_LONG",
            reason: `${opts.field} exceeds ${opts.maxChars} characters`,
            score: 0,
            flags: [],
        }
    }

    const sanitized = sanitizeText(raw)
    const { score, patternIds } = scoreInjection(sanitized.toLowerCase())

    if (score >= BLOCK_THRESHOLD) {
        return { ok: false, code: "INPUT_REJECTED", reason: "injection_patterns", score, flags: patternIds }
    }

    // Flag (log-only) band: allow the call but surface the signal.
    const flags = score >= FLAG_THRESHOLD ? patternIds : []
    return { ok: true, sanitized, flags, score }
}

export interface BillablePolicyResult {
    allowed: boolean
    code?: "RATE_LIMITED"
}

/**
 * Rate limit + instance-independent DB backstop for a billable AI entry point.
 *
 * The Redis limiter (lib/rate-limit) is per-instance in production today
 * (RATELIMIT_ALLOW_LOCAL=1, no Upstash), so it is only the first line. The
 * durable cap is a count of the caller's own audit rows on the indexed
 * (adminUserId, actionType, timestamp) tuple — the exact pattern proven on the
 * MEDIC suggest path. The caller writes the matching audit row itself (with its
 * own targetUserId/metadata); this function only READS.
 *
 * Fail-open policy: a Redis 429 or a DB count over the cap blocks. A DB *error*
 * (transient outage) logs and allows — the whole app is unusable during a DB
 * outage anyway, and the Redis limit still applies, so a hiccup must not hard-
 * lock a paying user out of the feature.
 */
export async function enforceBillableCallPolicy(params: {
    userId: string
    actionType: string
    redisBucket: string
    redisLimit: number
    redisWindowMs: number
    dbLimit: number
    dbWindowMs: number
}): Promise<BillablePolicyResult> {
    // Server deps are imported lazily so the pure guard functions above stay
    // free of rate-limit/db/env — importing guardUserText must not drag Upstash,
    // Prisma, or env validation into a caller (or a unit test).
    const { rateLimit } = await import("@/lib/rate-limit")
    const redis = await rateLimit(params.userId, params.redisLimit, params.redisWindowMs, params.redisBucket)
    if (!redis.success) {
        return { allowed: false, code: "RATE_LIMITED" }
    }

    try {
        const { db } = await import("@/lib/db")
        const since = new Date(Date.now() - params.dbWindowMs)
        const recent = await db.activityLog.count({
            where: {
                adminUserId: params.userId,
                actionType: params.actionType,
                timestamp: { gte: since },
            },
        })
        if (recent >= params.dbLimit) {
            return { allowed: false, code: "RATE_LIMITED" }
        }
    } catch (error) {
        const { logger } = await import("@/lib/logger")
        logger("warn", "enforceBillableCallPolicy DB backstop failed - allowing on Redis result only", {
            actionType: params.actionType,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return { allowed: true }
}
