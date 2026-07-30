/**
 * In-process provider circuit breaker.
 *
 * A lightweight health tracker for the AI providers, consulted when ordering the
 * single-shot fallback ladder so a provider that just failed hard isn't tried
 * first on the very next call. It reuses the same failure classes the analysis
 * remediation ladder uses (transient/auth are the ones worth tripping on).
 *
 * SERVERLESS CAVEAT: state is per-instance, exactly like the incident-dispatcher
 * cooldown and the in-memory rate-limit fallback. On Vercel each instance keeps
 * its own view, so the breaker smooths repeated failures within one warm
 * instance rather than coordinating a fleet. A distributed breaker would need
 * Redis (the standing Upstash owner action); this is the code-side best effort.
 */

export type ProviderId = "gemini" | "openai" | "anthropic" | "mock"

/** Failure classes worth tripping the breaker (from the failure classifier). */
export type TrippingFailureClass = "transient" | "auth"

const OPEN_AFTER_CONSECUTIVE = 3
const COOLDOWN_MS = 60_000

interface BreakerState {
    consecutiveFailures: number
    openedAt: number | null
}

const states = new Map<ProviderId, BreakerState>()

// Injectable clock so tests are deterministic (Date.now() is banned in some
// runtimes and makes time-based logic hard to pin).
let now: () => number = () => Date.now()

function stateFor(provider: ProviderId): BreakerState {
    let s = states.get(provider)
    if (!s) {
        s = { consecutiveFailures: 0, openedAt: null }
        states.set(provider, s)
    }
    return s
}

/** Record a failed call. Trips the breaker open after N consecutive failures. */
export function recordFailure(provider: ProviderId, failureClass: TrippingFailureClass): void {
    const s = stateFor(provider)
    // Only transient/auth failures count toward tripping; a document/token/schema
    // failure is the request's fault, not the provider's health.
    if (failureClass !== "transient" && failureClass !== "auth") return
    s.consecutiveFailures += 1
    if (s.consecutiveFailures >= OPEN_AFTER_CONSECUTIVE && s.openedAt === null) {
        s.openedAt = now()
    }
}

/** Record a successful call. Closes the breaker and resets the failure count. */
export function recordSuccess(provider: ProviderId): void {
    const s = stateFor(provider)
    s.consecutiveFailures = 0
    s.openedAt = null
}

/**
 * Is the provider healthy enough to try first? Open breakers report unhealthy
 * until the cooldown elapses, after which they go half-open (healthy for one
 * probe) — the next recordFailure re-opens, recordSuccess closes.
 */
export function isHealthy(provider: ProviderId): boolean {
    const s = states.get(provider)
    if (!s || s.openedAt === null) return true
    if (now() - s.openedAt >= COOLDOWN_MS) {
        // Half-open: allow a probe. Clear openedAt so a subsequent success fully
        // closes and a failure re-trips from the current count.
        s.openedAt = null
        return true
    }
    return false
}

/**
 * Stable sort of a provider order that pushes currently-unhealthy providers to
 * the back without ever dropping them — the ladder must always have somewhere
 * to fall.
 */
export function healthyFirst(order: ProviderId[]): ProviderId[] {
    return [...order].sort((a, b) => Number(isHealthy(b)) - Number(isHealthy(a)))
}

/** Test seam. */
export function __setClock(fn: () => number): void {
    now = fn
}
export function __reset(): void {
    states.clear()
    now = () => Date.now()
}
