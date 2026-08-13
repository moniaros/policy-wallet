/**
 * The effective notification configuration: registry defaults, with admin
 * overrides merged on top.
 *
 * Mirrors lib/services/ai/prompt-overrides.ts — `unstable_cache` under a tag
 * with a TTL backstop, and admin writes call `revalidateTag(TAG, "max")` so an
 * edit lands on the next request.
 *
 * **The loader NEVER throws.** A database error resolves to the registry
 * defaults, i.e. exactly the behaviour the code shipped with. A notification
 * must never fail to send because its configuration was unreadable — the whole
 * point of an override layer is that it is optional.
 *
 * ## What an override may and may not do
 *
 * An override adjusts OPERATIONAL parameters: whether the trigger fires, its
 * priority, which of its declared channels it uses, retry, escalation, expiry.
 *
 * It cannot change `transactional`, `category` or `recipients`. Making
 * `transactional` editable would let an administrator silence a password-change
 * or payment-failure alert for a customer who never agreed to that. A rule the
 * operator can bend must never be the rule protecting the customer FROM the
 * operator.
 *
 * Channels can only be NARROWED to a subset of what the registry declares.
 * Widening would let an operator route an in-app-only event to email — a
 * product decision about what an event IS, not an operational setting.
 */

import { withCache } from "@/lib/cache/tagged-cache"
import { logger } from "@/lib/logger"
import {
    NOTIFICATION_EVENTS,
    type NotificationChannel,
    type NotificationEventDefinition,
    type NotificationPriority,
    type RetryPolicy,
} from "./registry"
import {
    defaultSettings,
    settingValue,
    type SettingsMap,
} from "./settings"
import { templateKey, type TemplateMap } from "./templates"

export const NOTIFICATION_CONFIG_CACHE_TAG = "notification-config"

const PRIORITIES: NotificationPriority[] = ["critical", "high", "normal", "low"]
const BACKOFFS: RetryPolicy["backoff"][] = ["none", "linear", "exponential"]

/** One event's rules after the override has been applied. */
export interface EffectiveEventConfig extends NotificationEventDefinition {
    /** False when an administrator has switched this trigger off. */
    enabled: boolean
    /** True when any field differs from the registry default. */
    overridden: boolean
    /** Which fields an operator has taken control of. */
    overriddenFields: string[]
    /** The operator's stated reason, when they gave one. */
    notes: string | null
}

export interface NotificationConfig {
    events: Record<string, EffectiveEventConfig>
    settings: SettingsMap
    /** True when the config below is the code default because the DB was unreadable. */
    degraded: boolean
}

/** Registry-only configuration — the behaviour with no overrides at all. */
export function baseConfig(): NotificationConfig {
    const events: Record<string, EffectiveEventConfig> = {}
    for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
        events[key] = { ...def, enabled: true, overridden: false, overriddenFields: [], notes: null }
    }
    return { events, settings: defaultSettings(), degraded: false }
}

export interface RuleOverrideRow {
    eventType: string
    enabled: boolean | null
    priority: string | null
    channels: unknown
    retryAttempts: number | null
    retryBackoff: string | null
    retryBaseDelayMinutes: number | null
    escalationAfterFailures: number | null
    escalationAfterUnreadHours: number | null
    expiresAfterHours: number | null
    notes: string | null
}

/**
 * Apply one override row to one registry definition.
 *
 * Pure, and exported, so the precedence rules are unit-testable without a
 * database — these are the rules that decide what a customer receives.
 */
export function applyOverride(
    def: NotificationEventDefinition,
    row: RuleOverrideRow | null
): EffectiveEventConfig {
    const base: EffectiveEventConfig = {
        ...def,
        enabled: true,
        overridden: false,
        overriddenFields: [],
        notes: null,
    }
    if (!row) return base

    const touched: string[] = []

    if (row.enabled !== null && row.enabled !== undefined) {
        base.enabled = row.enabled
        if (!row.enabled) touched.push("enabled")
    }

    // Unknown values are IGNORED, not coerced: a priority of "urgent" written by
    // some future migration must leave the event on its declared priority
    // rather than silently landing on "low".
    if (row.priority && PRIORITIES.includes(row.priority as NotificationPriority)) {
        if (row.priority !== def.priority) {
            base.priority = row.priority as NotificationPriority
            touched.push("priority")
        }
    }

    if (Array.isArray(row.channels)) {
        const declared = new Set(def.channels)
        // Narrow only. An override naming a channel the event does not declare
        // is dropped, so an operator cannot turn an in-app-only event into email.
        const narrowed = (row.channels as string[]).filter((c) =>
            declared.has(c as NotificationChannel)
        ) as NotificationChannel[]
        // An empty result would silently mute the event through a field that
        // does not say "off" — `enabled` is where muting belongs.
        if (narrowed.length > 0 && narrowed.length !== def.channels.length) {
            base.channels = narrowed
            touched.push("channels")
        }
    }

    const retry: RetryPolicy = { ...def.retry }
    let retryTouched = false
    if (typeof row.retryAttempts === "number" && row.retryAttempts >= 1) {
        retry.attempts = row.retryAttempts
        retryTouched = true
    }
    if (row.retryBackoff && BACKOFFS.includes(row.retryBackoff as RetryPolicy["backoff"])) {
        retry.backoff = row.retryBackoff as RetryPolicy["backoff"]
        retryTouched = true
    }
    if (typeof row.retryBaseDelayMinutes === "number" && row.retryBaseDelayMinutes >= 0) {
        retry.baseDelayMinutes = row.retryBaseDelayMinutes
        retryTouched = true
    }
    if (retryTouched) {
        base.retry = retry
        touched.push("retry")
    }

    if (
        typeof row.escalationAfterFailures === "number" ||
        typeof row.escalationAfterUnreadHours === "number"
    ) {
        // Only adjustable where the registry already declared an escalation:
        // inventing a target event here would emit something undeclared.
        if (def.escalation) {
            base.escalation = {
                ...def.escalation,
                ...(typeof row.escalationAfterFailures === "number"
                    ? { afterFailures: row.escalationAfterFailures }
                    : {}),
                ...(typeof row.escalationAfterUnreadHours === "number"
                    ? { afterUnreadHours: row.escalationAfterUnreadHours }
                    : {}),
            }
            touched.push("escalation")
        }
    }

    if (typeof row.expiresAfterHours === "number" && row.expiresAfterHours > 0) {
        base.expiresAfterHours = row.expiresAfterHours
        touched.push("expiresAfterHours")
    }

    base.notes = row.notes ?? null
    base.overridden = touched.length > 0
    base.overriddenFields = touched
    return base
}

/** Exported for tests — the uncached loader with the never-throw contract. */
export async function loadNotificationConfigUncached(): Promise<NotificationConfig> {
    const config = baseConfig()

    try {
        const { db } = await import("@/lib/db")
        const [overrides, settings] = await Promise.all([
            db.notificationRuleOverride.findMany(),
            db.notificationSetting.findMany(),
        ])

        for (const row of overrides) {
            const def = NOTIFICATION_EVENTS[row.eventType]
            // An override for an event that no longer exists is stale config,
            // not a crash: the event was renamed or retired, and the row is
            // simply inert until someone tidies it.
            if (!def) continue
            config.events[row.eventType] = applyOverride(def, row as RuleOverrideRow)
        }

        for (const row of settings) {
            const value = row.value as unknown
            if (typeof value === "boolean" || typeof value === "number") {
                config.settings[row.key] = value
            }
        }
    } catch (error) {
        logger("error", "Notification config load failed — serving registry defaults", {
            error: error instanceof Error ? error.message : String(error),
        })
        return { ...baseConfig(), degraded: true }
    }

    return config
}

/**
 * Cached accessor. The TTL is a backstop only — admin saves revalidate the tag,
 * so an edit lands on the next request rather than up to 60 seconds later.
 */
export const getNotificationConfig = withCache(
    loadNotificationConfigUncached,
    NOTIFICATION_CONFIG_CACHE_TAG,
    60
)

// ── Convenience readers ──────────────────────────────────────────────────────

export function isAutomationPaused(config: NotificationConfig): boolean {
    return settingValue<boolean>(config.settings, "automation.paused")
}

export function isChannelEnabled(config: NotificationConfig, channel: NotificationChannel): boolean {
    // Only the three real delivery channels have a switch; `analytics` is a
    // server-side mirror and must never be silenced by a channel toggle, or the
    // funnel would quietly stop recording.
    if (channel === "analytics") return true
    const key = `channel.${channel}.enabled`
    if (!(key in config.settings)) return true
    return settingValue<boolean>(config.settings, key)
}

export function scoreMateriality(config: NotificationConfig): number {
    return settingValue<number>(config.settings, "threshold.scoreMateriality")
}

// ── Templates ────────────────────────────────────────────────────────────────

export const NOTIFICATION_TEMPLATES_CACHE_TAG = "notification-templates"

/** Exported for tests — the uncached loader with the never-throw contract. */
export async function loadTemplatesUncached(): Promise<TemplateMap> {
    try {
        const { db } = await import("@/lib/db")
        const rows = await db.notificationTemplate.findMany({
            where: { isActive: true },
            select: { eventType: true, channel: true, locale: true, subject: true, title: true, body: true },
        })
        const map: TemplateMap = {}
        for (const row of rows) {
            map[templateKey(row.eventType, row.channel, row.locale)] = {
                subject: row.subject,
                title: row.title,
                body: row.body,
            }
        }
        return map
    } catch (error) {
        // No templates = the caller's own copy, i.e. the behaviour before
        // templates existed. Never a failed notification.
        logger("error", "Notification templates load failed — using caller copy", {
            error: error instanceof Error ? error.message : String(error),
        })
        return {}
    }
}

export const getNotificationTemplates = withCache(
    loadTemplatesUncached,
    NOTIFICATION_TEMPLATES_CACHE_TAG,
    60
)
