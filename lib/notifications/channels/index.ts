/**
 * Channel adapters.
 *
 * An adapter takes an already-resolved title, body and link and delivers it.
 * That is the whole contract. It does not read preferences, does not decide
 * priority, does not localise, and does not know what a policy is — all of that
 * happened once, in the dispatcher, against the registry. Adding WhatsApp later
 * means writing ~40 lines here and adding one string to a registry entry; it
 * must never mean touching a business rule.
 *
 * `configured()` is the honest answer to "can this channel deliver at all right
 * now". A channel that answers false is not attempted and writes no row, which
 * is how the future channels sit here declared but silent instead of filling
 * the table with `skipped` rows for transports nobody has built yet.
 */

import type { NotificationChannel } from "../registry"

export type DeliveryOutcome =
    | { status: "sent" }
    | { status: "failed"; error: string }
    | { status: "skipped"; reason: string }

/**
 * Richer, pre-rendered content for a channel that can carry it.
 *
 * This is presentation, not business logic. The weekly digest and the
 * engagement drip build elaborate HTML emails that the generic notification
 * shell cannot express; before the bus existed they sent those emails
 * themselves and then wrote a log row, which is how they ended up with their
 * own preference check and their own de-duplication, subtly different from
 * everyone else's. Now the bus still decides WHO, WHETHER and WHEN — the event
 * only supplies WHAT IT LOOKS LIKE on one channel.
 */
export interface ChannelContent {
    email?: { subject: string; html: string }
    push?: { title?: string; body?: string }
}

export interface DeliveryPayload {
    userId: string
    email: string | null
    title: string
    message: string
    language: "el" | "en"
    relatedObjectType: string | null
    relatedObjectId: string | null
    content?: ChannelContent
}

export interface ChannelAdapter {
    /** Can this channel deliver at all in this environment? */
    configured(): boolean
    send(payload: DeliveryPayload): Promise<DeliveryOutcome>
}

/**
 * A channel the architecture supports but the product has not built yet.
 *
 * Declared rather than omitted so that adding the transport is a one-file
 * change, and so the registry can honestly say which events would use it.
 */
function notBuilt(name: string): ChannelAdapter {
    return {
        configured: () => false,
        send: async () => ({ status: "skipped", reason: `transport_not_configured:${name}` }),
    }
}

/**
 * In-app delivery is the row itself.
 *
 * There is nothing to transmit: writing the NotificationEvent IS the delivery,
 * and the customer reads it when they next open the bell. Returning `sent`
 * here is therefore literally true, unlike the old push path which returned it
 * for a message that was never transmitted anywhere.
 */
const inAppAdapter: ChannelAdapter = {
    configured: () => true,
    send: async () => ({ status: "sent" }),
}

/**
 * Analytics is not delivery. The row is the whole point — these events share
 * the notification table as a server-side funnel mirror and must never surface
 * to a customer.
 */
const analyticsAdapter: ChannelAdapter = {
    configured: () => true,
    send: async () => ({ status: "sent" }),
}

const adapters: Record<NotificationChannel, () => Promise<ChannelAdapter> | ChannelAdapter> = {
    in_app: () => inAppAdapter,
    analytics: () => analyticsAdapter,
    // Dynamic imports keep nodemailer and the crypto push stack out of the
    // bundle for callers that only ever write in-app rows.
    email: async () => (await import("./email")).emailAdapter,
    push: async () => (await import("./push")).pushAdapter,
    sms: () => notBuilt("sms"),
    whatsapp: () => notBuilt("whatsapp"),
    webhook: () => notBuilt("webhook"),
    // Staff channels. Unlike the customer ones these need no per-user identity
    // — a Slack alert goes to a channel, not to a person — which is why they
    // are grouped with the future transports rather than with push.
    slack: () => notBuilt("slack"),
    teams: () => notBuilt("teams"),
}

/**
 * Channels with a real adapter behind them — what this product can deliver on
 * at all, as opposed to what happens to be configured in one environment.
 *
 * This is what user-facing copy is allowed to promise, and
 * `tests/unit/channel-claims.test.ts` reads it directly. The help centre once
 * offered SMS "(Premium only)" — a paid channel that has never existed — and
 * the guard that caught it worked by regex-matching `channel === 'sms'` inside
 * lib/notifications.ts, so it broke the moment delivery moved into adapters.
 * A list beats a regex over the file that happens to hold the switch today.
 */
export const IMPLEMENTED_CHANNELS: NotificationChannel[] = ["in_app", "email", "push"]

/**
 * Synchronous availability check, used by the dispatcher to decide whether to
 * attempt a channel at all. Deliberately does not load the adapter module.
 *
 * Implemented AND configured here: push has an adapter, but without VAPID keys
 * it cannot reach anyone, and attempting it would write failure rows for an
 * environment that was never going to deliver.
 */
export function isTransportConfigured(channel: NotificationChannel): boolean {
    switch (channel) {
        case "in_app":
        case "analytics":
            return true
        case "email":
            // The mail service falls back to a dev logger when unconfigured, so
            // email is always "available" — it either sends or reports why.
            return true
        case "push":
            return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
        case "sms":
        case "whatsapp":
        case "webhook":
        case "slack":
        case "teams":
            return false
        default:
            return false
    }
}

export async function deliver(
    channel: NotificationChannel,
    payload: DeliveryPayload
): Promise<DeliveryOutcome> {
    try {
        const factory = adapters[channel]
        if (!factory) return { status: "skipped", reason: "unknown_channel" }
        const adapter = await factory()
        if (!adapter.configured()) {
            return { status: "skipped", reason: `transport_not_configured:${channel}` }
        }
        return await adapter.send(payload)
    } catch (error) {
        return { status: "failed", error: error instanceof Error ? error.message : String(error) }
    }
}
