/**
 * Pure parsing, validation and diffing for the /admin/notifications editors.
 *
 * Mirrors lib/admin/ai-prompt-update.ts: the server-action files stay thin
 * transaction wrappers, and everything with a rule in it lives here where it
 * can be unit-tested without a database or a request.
 *
 * SERVER-SAFE but dependency-free — no db, no next/headers.
 */

import {
    NOTIFICATION_EVENTS,
    type NotificationChannel,
    type NotificationEventDefinition,
} from "@/lib/notifications/registry"
import { TEMPLATE_CHANNELS, TEMPLATE_LOCALES } from "@/lib/notifications/templates"
import { validateSetting } from "@/lib/notifications/settings"

// ── Rule overrides ───────────────────────────────────────────────────────────

export interface RuleOverrideInput {
    eventType: string
    enabled: boolean | null
    priority: string | null
    channels: string[] | null
    retryAttempts: number | null
    retryBackoff: string | null
    retryBaseDelayMinutes: number | null
    escalationAfterFailures: number | null
    escalationAfterUnreadHours: number | null
    expiresAfterHours: number | null
    notes: string | null
}

export const PRIORITY_CHOICES = ["critical", "high", "normal", "low"] as const
export const BACKOFF_CHOICES = ["none", "linear", "exponential"] as const

/** Blank / "inherit" reads as null, which is what makes an override a delta. */
function optionalString(formData: FormData, field: string): string | null {
    const raw = formData.get(field)
    if (typeof raw !== "string") return null
    const trimmed = raw.trim()
    if (!trimmed || trimmed === "inherit") return null
    return trimmed
}

function optionalInt(formData: FormData, field: string): number | null {
    const raw = optionalString(formData, field)
    if (raw === null) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return null
    return parsed
}

export function parseRuleOverrideForm(formData: FormData): RuleOverrideInput {
    const eventType = String(formData.get("eventType") ?? "").trim()
    const def = NOTIFICATION_EVENTS[eventType]
    if (!def) throw new Error(`Unknown event "${eventType}"`)

    // Tri-state: "inherit" | "on" | "off". A plain checkbox cannot express
    // "inherit", and conflating "unset" with "off" would silently disable every
    // event an operator saved for an unrelated reason.
    const enabledRaw = optionalString(formData, "enabled")
    const enabled = enabledRaw === null ? null : enabledRaw === "on"

    const channelsRaw = formData.getAll("channels").map(String).filter(Boolean)
    // Only channels the event declares. The UI offers no others, but the form
    // is a POST body and must not be trusted to have obeyed it.
    const declared = new Set<string>(def.channels)
    const channels = channelsRaw.filter((c) => declared.has(c))

    return {
        eventType,
        enabled,
        priority: optionalString(formData, "priority"),
        // All-selected is the same as inheriting, and storing it as an override
        // would freeze the event against a future registry change.
        channels:
            channels.length === 0 || channels.length === def.channels.length ? null : channels,
        retryAttempts: optionalInt(formData, "retryAttempts"),
        retryBackoff: optionalString(formData, "retryBackoff"),
        retryBaseDelayMinutes: optionalInt(formData, "retryBaseDelayMinutes"),
        escalationAfterFailures: optionalInt(formData, "escalationAfterFailures"),
        escalationAfterUnreadHours: optionalInt(formData, "escalationAfterUnreadHours"),
        expiresAfterHours: optionalInt(formData, "expiresAfterHours"),
        notes: optionalString(formData, "notes"),
    }
}

export interface RuleValidationError {
    field: string
    message: string
}

/**
 * Reject an override that would produce an incoherent rule.
 *
 * These are the same invariants the registry guard test enforces on the code
 * defaults. An operator must not be able to reach, through a form, a state the
 * codebase forbids in source.
 */
export function validateRuleOverride(
    input: RuleOverrideInput,
    def: NotificationEventDefinition
): RuleValidationError[] {
    const errors: RuleValidationError[] = []

    if (input.priority && !PRIORITY_CHOICES.includes(input.priority as never)) {
        errors.push({ field: "priority", message: "Unknown priority" })
    }
    if (input.retryBackoff && !BACKOFF_CHOICES.includes(input.retryBackoff as never)) {
        errors.push({ field: "retryBackoff", message: "Unknown backoff strategy" })
    }
    if (input.retryAttempts !== null && (input.retryAttempts < 1 || input.retryAttempts > 20)) {
        errors.push({ field: "retryAttempts", message: "Attempts must be between 1 and 20" })
    }
    if (
        input.retryBaseDelayMinutes !== null &&
        (input.retryBaseDelayMinutes < 0 || input.retryBaseDelayMinutes > 1440)
    ) {
        errors.push({ field: "retryBaseDelayMinutes", message: "Delay must be 0–1440 minutes" })
    }
    if (
        input.expiresAfterHours !== null &&
        (input.expiresAfterHours < 1 || input.expiresAfterHours > 24 * 365)
    ) {
        errors.push({ field: "expiresAfterHours", message: "Expiry must be 1 hour to 1 year" })
    }

    // The one an operator would not think of: a retry schedule that outlives the
    // message it is retrying. The same rule the registry test enforces.
    const attempts = input.retryAttempts ?? def.retry.attempts
    const backoff = (input.retryBackoff ?? def.retry.backoff) as "none" | "linear" | "exponential"
    const baseDelay = input.retryBaseDelayMinutes ?? def.retry.baseDelayMinutes
    const expiry = input.expiresAfterHours ?? def.expiresAfterHours
    if (expiry !== null && attempts > 1 && backoff !== "none") {
        let total = 0
        for (let attempt = 1; attempt < attempts; attempt++) {
            total += backoff === "linear" ? baseDelay * attempt : baseDelay * Math.pow(2, attempt - 1)
        }
        if (total / 60 > expiry) {
            errors.push({
                field: "retryAttempts",
                message: `This schedule would still be retrying ~${Math.round(total / 60)}h after the notification expires at ${expiry}h. A message that arrives after it stopped being true is worse than one that never came.`,
            })
        }
    }

    // Disabling a transactional event through the trigger switch. `transactional`
    // itself is not editable, but `enabled: false` would achieve the same thing —
    // silencing a password-change or payment-failure alert.
    if (input.enabled === false && def.transactional) {
        errors.push({
            field: "enabled",
            message: `"${def.businessEvent}" is transactional and cannot be switched off. A customer never agreed to stop being told about this, and it is not an operator's to withdraw.`,
        })
    }

    return errors
}

export type FieldDiff = Record<string, { from: unknown; to: unknown }>

/** What changed, for the revision record. Only fields that actually moved. */
export function computeRuleDiff(
    previous: Partial<RuleOverrideInput> | null,
    next: RuleOverrideInput
): FieldDiff {
    const diff: FieldDiff = {}
    const fields: (keyof RuleOverrideInput)[] = [
        "enabled",
        "priority",
        "channels",
        "retryAttempts",
        "retryBackoff",
        "retryBaseDelayMinutes",
        "escalationAfterFailures",
        "escalationAfterUnreadHours",
        "expiresAfterHours",
        "notes",
    ]
    for (const field of fields) {
        const from = previous ? (previous[field] ?? null) : null
        const to = next[field] ?? null
        if (JSON.stringify(from) !== JSON.stringify(to)) diff[field] = { from, to }
    }
    return diff
}

// ── Templates ────────────────────────────────────────────────────────────────

export interface TemplateInput {
    eventType: string
    channel: string
    locale: string
    subject: string | null
    title: string
    body: string
    isActive: boolean
}

export const MAX_TEMPLATE_TITLE = 200
export const MAX_TEMPLATE_BODY = 4000

export function parseTemplateForm(formData: FormData): TemplateInput {
    const eventType = String(formData.get("eventType") ?? "").trim()
    const channel = String(formData.get("channel") ?? "").trim()
    const locale = String(formData.get("locale") ?? "").trim()

    if (!NOTIFICATION_EVENTS[eventType]) throw new Error(`Unknown event "${eventType}"`)
    if (!TEMPLATE_CHANNELS.includes(channel as never)) throw new Error(`Unknown channel "${channel}"`)
    if (!TEMPLATE_LOCALES.includes(locale as never)) throw new Error(`Unknown locale "${locale}"`)

    return {
        eventType,
        channel,
        locale,
        subject: optionalString(formData, "subject"),
        title: String(formData.get("title") ?? "").trim(),
        body: String(formData.get("body") ?? "").trim(),
        isActive: formData.get("isActive") === "on",
    }
}

export function validateTemplateInput(input: TemplateInput): RuleValidationError[] {
    const errors: RuleValidationError[] = []
    if (!input.title) errors.push({ field: "title", message: "A title is required" })
    if (!input.body) errors.push({ field: "body", message: "A body is required" })
    if (input.title.length > MAX_TEMPLATE_TITLE) {
        errors.push({ field: "title", message: `Title must be ${MAX_TEMPLATE_TITLE} characters or fewer` })
    }
    if (input.body.length > MAX_TEMPLATE_BODY) {
        errors.push({ field: "body", message: `Body must be ${MAX_TEMPLATE_BODY} characters or fewer` })
    }
    // A push notification is truncated by the operating system, not by us. A
    // 300-character push body is not a long notification, it is a clipped one.
    if (input.channel === "push" && input.body.length > 180) {
        errors.push({
            field: "body",
            message: "Push bodies are truncated by the device at around 180 characters — the rest is not shown.",
        })
    }
    return errors
}

export function computeTemplateDiff(
    previous: Partial<TemplateInput> | null,
    next: TemplateInput
): FieldDiff {
    const diff: FieldDiff = {}
    for (const field of ["subject", "title", "body", "isActive"] as const) {
        const from = previous ? (previous[field] ?? null) : null
        const to = next[field] ?? null
        if (JSON.stringify(from) !== JSON.stringify(to)) diff[field] = { from, to }
    }
    return diff
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface ParsedSetting {
    key: string
    value: boolean | number
}

/**
 * Read the settings form.
 *
 * Booleans come from checkboxes, so an ABSENT key means false — but only for
 * keys the form actually rendered, which is why the caller passes the list.
 * Reading absence as false across all keys would silently disable every setting
 * on a form that happened to render a subset.
 */
export function parseSettingsForm(
    formData: FormData,
    renderedKeys: string[]
): { values: ParsedSetting[]; errors: RuleValidationError[] } {
    const values: ParsedSetting[] = []
    const errors: RuleValidationError[] = []

    for (const key of renderedKeys) {
        const raw = formData.get(`setting.${key}`)
        const asBoolean = raw === "on" || raw === "true"
        const candidate =
            raw === null ? false : typeof raw === "string" && /^-?\d+$/.test(raw) ? Number(raw) : asBoolean

        const check = validateSetting(key, candidate)
        if (!check.ok) {
            errors.push({ field: key, message: check.error ?? "Invalid value" })
            continue
        }
        values.push({ key, value: check.value! })
    }

    return { values, errors }
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function channelLabel(channel: NotificationChannel | string): string {
    switch (channel) {
        case "in_app":
            return "In-app"
        case "email":
            return "Email"
        case "push":
            return "Push"
        case "analytics":
            return "Analytics (not delivered)"
        default:
            return channel
    }
}

export function describeExpiry(hours: number | null): string {
    if (hours === null) return "never"
    if (hours < 24) return `${hours}h`
    return `${Math.round(hours / 24)}d`
}

export function describeRetry(policy: { attempts: number; backoff: string; baseDelayMinutes: number }): string {
    if (policy.attempts <= 1) return "no retry"
    return `${policy.attempts}× ${policy.backoff} from ${policy.baseDelayMinutes}m`
}
