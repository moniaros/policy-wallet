/**
 * The notification bus. One way in, N channels out.
 *
 * Every business event enters here and nowhere else. The bus reads the event's
 * declaration from the registry, resolves the recipient and their language,
 * decides which channels apply, and hands the same resolved content to each
 * channel adapter. Adapters are transport: they take a title, a body and a
 * link, and they deliver it. They contain no business logic, which is what
 * makes "never duplicate business logic across channels" true by construction
 * rather than by convention.
 *
 * Three properties this file is responsible for:
 *
 * 1. **It never throws.** A notification is a consequence of an action, never a
 *    precondition of it. A failure here must not roll back the upload, the
 *    payment or the message that caused it. Call it AFTER the transaction that
 *    performed the action has committed.
 *
 * 2. **It records honestly.** A channel that was not attempted is `skipped`
 *    with a reason, not `sent`. The old code recorded `sent` for pushes it
 *    never tried (there was no device token, and the `else if` simply fell
 *    through), which turned the delivery log into fiction.
 *
 * 3. **It is idempotent when asked.** A cron that recomputes the same finding
 *    tomorrow passes the same `dedupeKey` and sends nothing.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
    getEventDefinition,
    retryDelayMinutes,
    type NotificationChannel,
    type NotificationEventDefinition,
} from "./registry"
import {
    getNotificationConfig,
    getNotificationTemplates,
    isAutomationPaused,
    isChannelEnabled,
} from "./config"
import { redactPolicyPlaceholders } from "@/lib/wallet/policy-identity"
import { renderTemplate, type TemplateVars } from "./templates"
import { settingValue } from "./settings"
import { deliver, isTransportConfigured, type ChannelContent, type DeliveryOutcome } from "./channels"

export type { ChannelContent }

/**
 * Notification content is bilingual BY TYPE. This used to admit a bare
 * `string`, which is how internal English documentation ("AI extraction
 * finished and the policy is readable") ended up stored verbatim in
 * customer-visible columns and rendered identically in both languages. The
 * bus resolves the recipient's language exactly once, at the store/deliver
 * seam — so the caller's job is to supply both arms, never to pre-resolve.
 */
export type LocalizedText = { el: string; en: string }

import type { RelatedObjectType } from "./links"
export type { RelatedObjectType }

export interface EmitParams {
    /** Registry key. An event not in the registry is a programming error. */
    event: string
    /** The resolved recipient. The registry says WHO in the abstract; the caller resolves it. */
    userId: string
    title: LocalizedText
    message: LocalizedText
    relatedObjectType?: RelatedObjectType
    relatedObjectId?: string
    /**
     * Idempotency key, scoped to the user. Pass one from any repeating source —
     * a cron, a webhook, a retryable job — built from the thing itself
     * (`renewal:${policyId}:${milestone}`), never from the clock.
     */
    dedupeKey?: string
    /**
     * Narrow the registry's channels for this occurrence. Cannot widen them: an
     * event that is in-app only stays in-app only however it is called, which is
     * the point of declaring it centrally.
     */
    only?: NotificationChannel[]
    /**
     * Pre-rendered content for a channel that can carry more than a title and a
     * sentence. Presentation only — the registry still owns who, whether and
     * when. See `ChannelContent`.
     */
    content?: ChannelContent
    /**
     * Values an admin-authored template may interpolate, from the event's
     * declared allowlist. Optional: with no template, or no variables, the
     * caller's own title and message are used unchanged.
     */
    vars?: TemplateVars
    /**
     * Deliver no earlier than this. Set by the orchestrator when a notification
     * is DEFERRED — most often by quiet hours.
     *
     * The row is written immediately with `status: "queued"` so the deferral is
     * visible and auditable, and the sweep sends it when its hour comes.
     * Deferring is not dropping: a policy about timing must never become a
     * policy about existence.
     */
    scheduledFor?: Date
}

export interface EmitResult {
    /** Rows written, one per attempted channel. */
    written: number
    delivered: NotificationChannel[]
    /** Recorded now, to be delivered later — quiet hours, or an explicit schedule. */
    deferred: NotificationChannel[]
    skipped: { channel: NotificationChannel; reason: string }[]
    failed: NotificationChannel[]
    /** True when a dedupeKey matched an existing row and nothing was sent. */
    deduped: boolean
}

const EMPTY: EmitResult = { written: 0, delivered: [], deferred: [], skipped: [], failed: [], deduped: false }

function resolveLocalized(text: LocalizedText, lang: "el" | "en"): string {
    // The `string` arm no longer exists in the type; the runtime branch stays
    // as a backstop for an untyped caller, so a cast cannot crash delivery.
    return typeof text === "string" ? text : text[lang]
}

/**
 * Channels the user has switched off for this event.
 *
 * Transactional events skip this entirely — a failed payment or a password
 * change is not something anyone consents away from. `isSuppressible` in the
 * registry is the single answer to "can this be turned off", so the settings
 * screen and the dispatcher cannot disagree about it.
 */
async function suppressedChannels(
    userId: string,
    eventType: string,
    def: NotificationEventDefinition
): Promise<Set<NotificationChannel>> {
    if (def.transactional) return new Set()
    const prefs = await db.notificationPreference.findMany({
        where: { userId, eventType },
        select: { channel: true, enabled: true },
    })
    const off = new Set<NotificationChannel>()
    for (const p of prefs) {
        // Absent preference = on. A user who has never touched the settings
        // screen receives the stream; only an explicit `false` silences it.
        if (!p.enabled) off.add(p.channel as NotificationChannel)
    }
    return off
}

/**
 * Has the user switched this channel off for this event?
 *
 * Exported so a batch job can skip the expensive data-gathering for someone who
 * has opted out, WITHOUT writing a second copy of the rule. The weekly digest
 * used to inline its own `notificationPreference.findUnique`, the drip had
 * another via `isEmailEnabled`, and the dispatcher a third — three
 * implementations of one question is three chances to answer it differently.
 * This is a pre-filter; `emit` remains authoritative.
 */
export async function isChannelSuppressed(
    userId: string,
    eventType: string,
    channel: NotificationChannel
): Promise<boolean> {
    const def = getEventDefinition(eventType)
    if (!def) return false
    const off = await suppressedChannels(userId, eventType, def)
    return off.has(channel)
}

/**
 * Emit a business event.
 *
 * Returns a summary rather than throwing, so a caller that wants to log the
 * outcome can, and a caller that does not care can ignore it safely.
 */
export async function emit(params: EmitParams): Promise<EmitResult> {
    try {
        const def = getEventDefinition(params.event)
        if (!def) {
            // Loud in development, survivable in production: an unknown event is
            // a bug, but dropping a notification is better than 500ing the
            // action that produced it.
            const message = `[notifications] unknown event "${params.event}" — declare it in lib/notifications/registry.ts`
            if (process.env.NODE_ENV !== "production") throw new Error(message)
            logger("error", message, { event: params.event })
            return EMPTY
        }

        if (def.status === "planned") {
            logger("warn", "[notifications] emit for a planned (unwired) event", { event: params.event })
            return EMPTY
        }

        // Admin overrides on top of the registry. `getNotificationConfig` never
        // throws — a DB error resolves to the registry defaults, so an
        // unreadable settings table degrades to shipped behaviour rather than
        // to silence.
        const config = await getNotificationConfig()
        const effective = config.events[params.event] ?? {
            ...def,
            enabled: true,
            overridden: false,
            overriddenFields: [],
            notes: null,
        }

        // Idempotency first: cheaper than resolving the recipient, and a cron
        // re-run is the common case for anything carrying a dedupe key.
        if (params.dedupeKey) {
            const existing = await db.notificationEvent.findFirst({
                where: { userId: params.userId, dedupeKey: params.dedupeKey },
                select: { id: true },
            })
            if (existing) return { ...EMPTY, deduped: true }
        }

        const user = await db.user.findUnique({
            where: { id: params.userId },
            select: { email: true, preferredLanguage: true },
        })
        if (!user) return EMPTY

        // Resolved ONCE, next to the user lookup, and handed to every channel.
        // Localising per channel is how an email and a push notification end up
        // saying different things about the same event.
        const language: "el" | "en" = user.preferredLanguage === "el" ? "el" : "en"
        // Backstop, not the primary defence: callers name a policy with
        // `policyLabel()`. But every notification in the product funnels through
        // here, so this is the one place that can guarantee a pre-extraction
        // placeholder ("__PENDING_EXTRACTION__", "PENDING-1786…") never reaches
        // a customer's bell, inbox or lock screen — whatever a future caller
        // interpolates.
        const title = redactPolicyPlaceholders(resolveLocalized(params.title, language))
        const message = redactPolicyPlaceholders(resolveLocalized(params.message, language))

        const off = await suppressedChannels(params.userId, params.event, effective)

        // An administrator switching a trigger off, or pausing all automations,
        // is recorded as a `skipped` row rather than vanishing. "We deliberately
        // did not send this, and here is why" is exactly what an audit needs —
        // and it is the difference between a paused system and a broken one when
        // somebody asks why a customer heard nothing.
        const suppressedGlobally = isAutomationPaused(config)
            ? "automations_paused"
            : !effective.enabled
              ? "trigger_disabled"
              : null

        // Admin-authored copy, when there is any. Loaded once and resolved PER
        // CHANNEL below, because an email, a push notification and a bell entry
        // want different lengths of the same sentence — that is presentation,
        // and it is the one thing a channel legitimately varies.
        //
        // Falls back to the caller's own title and message for every event with
        // no template, which is all of them until somebody writes one.
        const templates = settingValue<boolean>(config.settings, "flag.templatesEnabled")
            ? await getNotificationTemplates()
            : {}

        const result: EmitResult = { written: 0, delivered: [], deferred: [], skipped: [], failed: [], deduped: false }
        const expiresAt = effective.expiresAfterHours
            ? new Date(Date.now() + effective.expiresAfterHours * 3600_000)
            : null

        for (const channel of effective.channels) {
            if (params.only && !params.only.includes(channel)) continue

            // A channel whose transport does not exist yet writes NO row. You
            // cannot audit a delivery the system was never capable of making,
            // and a `skipped: transport_not_configured` row per future channel
            // per notification would quadruple the table to say nothing.
            if (!isTransportConfigured(channel)) continue

            // Per-channel copy: template if one exists for (event, channel,
            // language), else exactly what the caller passed.
            const rendered = renderTemplate(templates, params.event, channel, language, params.vars ?? {})
            // Same backstop as above — an admin-authored template interpolates
            // `vars`, which can carry a not-yet-extracted policy identity.
            const channelTitle = rendered?.title ? redactPolicyPlaceholders(rendered.title) : title
            const channelMessage = rendered?.body ? redactPolicyPlaceholders(rendered.body) : message
            const channelContent =
                rendered?.subject && channel === "email"
                    ? {
                          ...params.content,
                          email: params.content?.email ?? {
                              subject: redactPolicyPlaceholders(rendered.subject),
                              html: channelMessage,
                          },
                      }
                    : params.content

            // Deferred: record the intent now and let the sweep deliver it.
            // The row exists from the moment the decision is made, so "why has
            // this customer heard nothing" has an answer before the send.
            const deferred =
                params.scheduledFor && params.scheduledFor.getTime() > Date.now()
                    ? params.scheduledFor
                    : null

            let outcome: DeliveryOutcome
            if (deferred) {
                outcome = { status: "skipped", reason: "scheduled" }
            } else if (suppressedGlobally) {
                outcome = { status: "skipped", reason: suppressedGlobally }
            } else if (!isChannelEnabled(config, channel)) {
                // A channel an operator has switched off globally. Distinct from
                // `transport_not_configured`, which means it was never built.
                outcome = { status: "skipped", reason: "channel_disabled" }
            } else if (off.has(channel)) {
                // This one DOES get a row. Honouring a choice is worth recording:
                // it is the evidence that the preference works.
                outcome = { status: "skipped", reason: "preference_off" }
            } else {
                outcome = await deliver(channel, {
                    userId: params.userId,
                    email: user.email,
                    title: channelTitle,
                    message: channelMessage,
                    language,
                    relatedObjectType: params.relatedObjectType ?? null,
                    relatedObjectId: params.relatedObjectId ?? null,
                    content: channelContent,
                })
            }

            const now = new Date()
            await db.notificationEvent.create({
                data: {
                    userId: params.userId,
                    eventType: params.event,
                    channel,
                    // A deferral is `queued`, not `skipped`: it WILL be
                    // delivered. `skipped` means we decided not to.
                    status: deferred ? "queued" : outcome.status,
                    scheduledFor: deferred,
                    priority: effective.priority,
                    // The row records what was actually SENT, template and all —
                    // a delivery log showing copy the recipient never saw would
                    // be useless for the one job it has.
                    title: channelTitle,
                    message: channelMessage,
                    relatedObjectType: params.relatedObjectType ?? null,
                    relatedObjectId: params.relatedObjectId ?? null,
                    dedupeKey: params.dedupeKey ?? null,
                    // Nothing was attempted for a skip, so the attempt count is 0
                    // and the retry worker will never pick it up.
                    attempts: outcome.status === "skipped" ? 0 : 1,
                    nextAttemptAt:
                        outcome.status === "failed"
                            ? new Date(now.getTime() + retryDelayMinutes(effective.retry, 1) * 60_000)
                            : null,
                    expiresAt,
                    sentAt: outcome.status === "sent" ? now : null,
                    failureReason: outcome.status === "failed" ? outcome.error.slice(0, 500) : null,
                    skipReason: deferred ? null : outcome.status === "skipped" ? outcome.reason : null,
                },
            })

            result.written++
            if (deferred) result.deferred.push(channel)
            else if (outcome.status === "sent") result.delivered.push(channel)
            else if (outcome.status === "failed") result.failed.push(channel)
            else result.skipped.push({ channel, reason: outcome.reason })
        }

        return result
    } catch (error) {
        // The dedupe unique index can also land here under a genuine race: two
        // workers emitting the same keyed event at once. That is the index doing
        // its job, and the loser has nothing to report.
        logger("error", "[notifications] emit failed", {
            event: params.event,
            userId: params.userId,
            error: error instanceof Error ? error.message : String(error),
        })
        return EMPTY
    }
}

/**
 * Emit the same event to several recipients.
 *
 * Sequential on purpose: these are tens of recipients at most (a household, a
 * team, the admins), and a parallel fan-out here would multiply straight into
 * the mail provider's rate limit during a cron batch that is already looping.
 */
export async function emitToMany(
    userIds: string[],
    params: Omit<EmitParams, "userId">
): Promise<EmitResult[]> {
    const results: EmitResult[] = []
    for (const userId of new Set(userIds)) {
        results.push(await emit({ ...params, userId }))
    }
    return results
}
