/**
 * The effective feature-flag state: registry defaults, environment variables,
 * and administrator overrides, in that order of increasing precedence.
 *
 * Mirrors lib/notifications/config.ts — `withCache` under a tag with a TTL
 * backstop, and admin writes call `revalidateTag(TAG, "max")` so a flip lands on
 * the next request rather than up to a minute later.
 *
 * **The loader NEVER throws.** A database error resolves to environment
 * variables, i.e. exactly the behaviour this product had before the flags table
 * existed. A feature flag is a control for when things are going wrong; it must
 * not be the thing that goes wrong.
 *
 * ## Precedence, and why NULL is not "off"
 *
 * For each flag: DB row → environment variable → `defaultValue` from the
 * registry.
 *
 * The DB columns are nullable, and NULL means "no opinion, fall through" —
 * deliberately distinct from `false`. Collapsing the two would mean that
 * clearing an override silently disabled the feature, which is the opposite of
 * what "clear" should do and exactly the kind of trap an operator discovers at
 * the worst possible moment.
 *
 * ## What an override may not do
 *
 * It cannot bring a flag into existence. A row whose key is not in the registry
 * is ignored on read: flags are declared in code next to the call site that
 * reads them, and merely tuned here.
 */

import { withCache } from "@/lib/cache/tagged-cache"
import { logger } from "@/lib/logger"
import {
    FEATURE_FLAGS,
    isRolloutMode,
    type FlagDefinition,
    type RolloutMode,
} from "./registry"

export const FEATURE_FLAGS_CACHE_TAG = "feature-flags"

/** One flag's state after the environment and any override are applied. */
export interface EffectiveFlag {
    key: string
    definition: FlagDefinition
    /** Resolved on/off. For a canary flag this is `rollout !== "off"`. */
    enabled: boolean
    /** Resolved audience. Always "off" or "100" for a boolean flag. */
    rollout: RolloutMode
    /** Where the resolved value came from. Drives the console's provenance column. */
    source: "override" | "env" | "default"
    /** The operator's stated reason, when they gave one. */
    notes: string | null
    /** True when a database row is taking control of this flag. */
    overridden: boolean
}

export interface FlagState {
    flags: Record<string, EffectiveFlag>
    /** True when the state below ignores the database because it was unreadable. */
    degraded: boolean
}

/** Accepts the same spellings the existing env-var readers accept. */
export function parseBooleanEnv(value: string | undefined): boolean | undefined {
    if (value === undefined || value === null || value.trim() === "") return undefined
    const normalized = value.trim().toLowerCase()
    if (["1", "true", "yes", "on"].includes(normalized)) return true
    if (["0", "false", "no", "off"].includes(normalized)) return false
    // An unparseable value is NOT coerced to false — that would silently
    // disable a feature because of a typo. Fall through to the code default.
    return undefined
}

export interface FlagOverrideRow {
    key: string
    enabled: boolean | null
    rollout: string | null
    notes: string | null
}

/**
 * Resolve one flag from its definition, the environment, and an optional row.
 *
 * Pure, and exported, so the precedence rules are unit-testable without a
 * database or a live environment. These rules decide whether a customer's
 * analysis is allowed to fail over to another AI provider, so they are worth
 * pinning down in tests rather than reasoning about.
 */
export function resolveFlag(
    def: FlagDefinition,
    envValue: string | undefined,
    row: FlagOverrideRow | null
): EffectiveFlag {
    const base: EffectiveFlag = {
        key: def.key,
        definition: def,
        enabled: false,
        rollout: "off",
        source: "default",
        notes: row?.notes ?? null,
        overridden: false,
    }

    // An env-only flag is listed for visibility but not controlled from here.
    // Honouring a row would be worse than ignoring it: the console would report
    // a value the call site does not actually read.
    if (def.envOnly) row = null

    if (def.kind === "canary") {
        // Precedence for the audience: row → env → declared default.
        if (row && isRolloutMode(row.rollout)) {
            base.rollout = row.rollout
            base.source = "override"
            base.overridden = true
        } else if (isRolloutMode(envValue)) {
            base.rollout = envValue
            base.source = "env"
        } else {
            base.rollout = isRolloutMode(def.defaultValue) ? def.defaultValue : "off"
            base.source = "default"
        }
        base.enabled = base.rollout !== "off"
        return base
    }

    // Boolean flag. `enabled === null` on the row means "no opinion".
    let value: boolean
    if (row && row.enabled !== null && row.enabled !== undefined) {
        value = row.enabled
        base.source = "override"
        base.overridden = true
    } else {
        const fromEnv = parseBooleanEnv(envValue)
        if (fromEnv !== undefined) {
            value = fromEnv
            base.source = "env"
        } else {
            value = def.defaultValue === true
            base.source = "default"
        }
    }

    base.enabled = value
    // A boolean flag has no audience of its own; expressing it in the same
    // vocabulary keeps every consumer on one shape.
    base.rollout = value ? "100" : "off"
    return base
}

/** The state with no database at all — environment and code defaults only. */
export function baseFlagState(): FlagState {
    const flags: Record<string, EffectiveFlag> = {}
    for (const def of Object.values(FEATURE_FLAGS)) {
        flags[def.key] = resolveFlag(def, process.env[def.envVar], null)
    }
    return { flags, degraded: false }
}

/**
 * Causes already reported this process.
 *
 * The first sweep after this shipped produced thirteen identical console
 * errors, one per protected page render, all saying the flags table did not
 * exist yet — which is the state this design deliberately tolerates. Logging a
 * DESIGNED degradation at error level on every request is not observability, it
 * is noise that buries the failures worth reading, and in production it would
 * have filled Sentry for the length of the migration window.
 *
 * Reported once per cause per process instead: still discoverable, no longer a
 * drumbeat.
 */
const reportedCauses = new Set<string>()

/** "Not migrated yet" is a deploy state; anything else is a real fault. */
export function classifyLoadFailure(message: string): { cause: string; expected: boolean } {
    if (/does not exist in the current database|P2021/i.test(message)) {
        return { cause: "table-missing", expected: true }
    }
    return { cause: "unreadable", expected: false }
}

/** Exported for tests — resets the once-per-process log guard. */
export function resetFlagLogGuard(): void {
    reportedCauses.clear()
}

/** Exported for tests — the uncached loader with the never-throw contract. */
export async function loadFlagsUncached(): Promise<FlagState> {
    const state = baseFlagState()

    try {
        const { db } = await import("@/lib/db")
        const rows = await db.featureFlag.findMany({
            select: { key: true, enabled: true, rollout: true, notes: true },
        })

        for (const row of rows) {
            const def = FEATURE_FLAGS[row.key]
            // A row for a flag that is no longer declared is stale config, not
            // a crash: the flag was retired and the row is inert until someone
            // tidies it.
            if (!def) continue
            state.flags[row.key] = resolveFlag(def, process.env[def.envVar], row)
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const { cause, expected } = classifyLoadFailure(message)
        if (!reportedCauses.has(cause)) {
            reportedCauses.add(cause)
            logger(
                expected ? "warn" : "error",
                expected
                    ? "Feature flags table not present yet — serving environment defaults. Expected between deploying this code and applying 20260813210000_feature_flags; overrides are inert until then."
                    : "Feature flag load failed — serving environment defaults",
                { error: message }
            )
        }
        return { ...baseFlagState(), degraded: true }
    }

    return state
}

/**
 * Cached accessor. The TTL is a backstop only — admin saves revalidate the tag,
 * so a flip lands on the next request rather than up to 30 seconds later.
 *
 * 30s rather than the notification config's 60s: a flag is reached for when
 * something is actively wrong, and the worst case wait to see it take effect
 * should be short enough that an operator does not start doubting the control.
 */
export const getFlags = withCache(loadFlagsUncached, FEATURE_FLAGS_CACHE_TAG, 30)

// ── Readers ──────────────────────────────────────────────────────────────────

/** Stable bucket for percentage rollouts. Matches remediation-policy.ts. */
export function hashUserToPercent(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) % 10000
    }
    return hash % 100
}

function isInternalUser(roles: string | undefined): boolean {
    if (!roles) return false
    return roles
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .some((r) => r === "admin" || r === "internal")
}

/**
 * Does this flag apply to this user?
 *
 * Percentage buckets are keyed on user id so a given customer gets a stable
 * answer across requests — a rollout that reshuffles on every call is not a
 * rollout, it is a coin toss per page load.
 */
export function flagAppliesTo(
    state: FlagState,
    key: string,
    userId: string,
    roles: string | undefined
): boolean {
    const flag = state.flags[key]
    if (!flag || !flag.enabled) return false
    switch (flag.rollout) {
        case "off":
            return false
        case "internal":
            return isInternalUser(roles)
        case "100":
            return true
        case "10":
            return hashUserToPercent(userId) < 10
        case "50":
            return hashUserToPercent(userId) < 50
        default:
            return false
    }
}

/** Global on/off, for flags with no per-user dimension. */
export function flagEnabled(state: FlagState, key: string): boolean {
    return state.flags[key]?.enabled ?? false
}
