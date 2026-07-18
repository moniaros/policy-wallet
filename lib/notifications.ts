import { db } from "./db"
import { sendEmail } from "./email/email-service"
import { buildNotificationEmail } from "./mail-templates"
import { sendPushNotification } from "./services/push.service"

export type NotificationChannel = 'email' | 'push' | 'whatsapp' | 'viber'
export type NotificationStatus = 'queued' | 'sent' | 'failed'

export type RelatedObjectType = 'policy' | 'customer' | 'questionnaire' | 'thread'

interface SendNotificationParams {
    userId: string
    eventType: string
    title: string
    message: string
    channels?: NotificationChannel[]
    relatedObjectType?: RelatedObjectType
    relatedObjectId?: string
}

/**
 * Core notification service.
 * Creates local event records and (in a real app) triggers external delivery.
 */
export async function sendNotification({
    userId,
    eventType,
    title,
    message,
    channels = ['email'],
    relatedObjectType,
    relatedObjectId
}: SendNotificationParams) {

    // 1. Check user preferences
    // For System Confirmations, we bypass checks (as per spec)
    const isSystemConfirmation = [
        'policy_added',
        'policy_shared',
        'payment_processed',
        'subscription_changed'
    ].includes(eventType)

    // 2. Resolve final channels based on preferences
    let finalChannels = channels

    if (!isSystemConfirmation) {
        const preferences = await db.notificationPreference.findMany({
            where: { userId, eventType }
        })

        // If no preference found, default to system default (usually enabled)
        // If found, filter channels that are specifically enabled
        finalChannels = channels.filter(channel => {
            const pref = preferences.find(p => p.channel === channel)
            return pref ? pref.enabled : true
        })
    }

    if (finalChannels.length === 0) return []

    // 3. Create Event Records & 4. Trigger Actual Delivery
    const user = await (db.user.findUnique as any)({ where: { id: userId }, select: { email: true, pushToken: true, preferredLanguage: true } })
    if (!user) return []

    const eventPromises = finalChannels.map(async (channel) => {
        let status: NotificationStatus = 'sent'
        let failureReason: string | null = null

        try {
            if (channel === 'email' && user.email) {
                const language = user.preferredLanguage === 'el' ? 'el' : 'en'
                // Every notification email goes through the shared branded shell
                // (title + message + deep-link CTA), replacing the old plain-text
                // fallback and the per-event templates that rendered `undefined`.
                const { subject: emailSubject, html: emailHtml } = buildNotificationEmail({
                    title,
                    message,
                    relatedObjectType,
                    relatedObjectId,
                    language,
                })

                const result = await sendEmail({
                    to: user.email,
                    subject: emailSubject || title,
                    html: emailHtml || message,
                })
                if (!result.success) {
                    throw new Error(result.error || "Email delivery failed")
                }
            } else if (channel === 'push' && user.pushToken) {
                const pushResult = await sendPushNotification({
                    token: user.pushToken,
                    title,
                    body: message,
                    url: relatedObjectId ? `/wallet/${relatedObjectId}` : '/home',
                })
                if (!pushResult.success) {
                    throw new Error(pushResult.error || 'Push delivery failed')
                }
            }
        } catch (error: any) {
            status = 'failed'
            failureReason = error.message
        }

        return db.notificationEvent.create({
            data: {
                userId,
                eventType,
                channel,
                status,
                title,
                message,
                relatedObjectType,
                relatedObjectId,
                sentAt: status === 'sent' ? new Date() : null,
                failureReason
            }
        })
    })

    const events = await Promise.all(eventPromises)
    return events
}

type LocalizedText = string | { el: string; en: string }

function resolveLocalized(text: LocalizedText, lang: 'el' | 'en'): string {
    return typeof text === 'string' ? text : text[lang]
}

export interface NotifyCounterpartyParams {
    /** Recipient user id (the counterparty of a cross-side collaboration action). */
    userId: string
    eventType: string
    /** Pass `{ el, en }` to localise per the recipient's preferred language. */
    title: LocalizedText
    message: LocalizedText
    relatedObjectType?: RelatedObjectType
    relatedObjectId?: string
    /** Also send email (default true). The in-app bell event is always written. */
    email?: boolean
}

/**
 * Notify the counterparty of a cross-side collaboration action: always writes an
 * in-app notificationEvent (the bell) and, by default, also emails through
 * sendNotification (which honours the recipient's per-event preferences). Content
 * is resolved to the *recipient's* preferred language. Mirrors the pattern in
 * collaboration.service.ts.
 *
 * Never throws — a notification failure must not roll back (or surface as a
 * failure of) the action that triggered it. Call this AFTER the DB transaction
 * that performed the action has committed.
 */
export async function notifyCounterparty(params: NotifyCounterpartyParams): Promise<void> {
    try {
        const recipient = await (db.user.findUnique as any)({
            where: { id: params.userId },
            select: { preferredLanguage: true },
        })
        const lang: 'el' | 'en' = recipient?.preferredLanguage === 'el' ? 'el' : 'en'
        const title = resolveLocalized(params.title, lang)
        const message = resolveLocalized(params.message, lang)

        if (params.email !== false) {
            await sendNotification({
                userId: params.userId,
                eventType: params.eventType,
                title,
                message,
                channels: ['email'],
                relatedObjectType: params.relatedObjectType,
                relatedObjectId: params.relatedObjectId,
            })
        }

        await db.notificationEvent.create({
            data: {
                userId: params.userId,
                eventType: params.eventType,
                channel: 'in_app',
                title,
                message,
                relatedObjectType: params.relatedObjectType ?? null,
                relatedObjectId: params.relatedObjectId ?? null,
            },
        })
    } catch (err) {
        // Swallow: a broken notification must never break the underlying action.
        console.error('[notifyCounterparty] failed', params.eventType, err)
    }
}
