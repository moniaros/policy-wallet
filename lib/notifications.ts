import { db } from "./db"
import { sendEmail } from "./email/email-service"
import { templates } from "./mail-templates"
import { sendPushNotification } from "./services/push.service"

export type NotificationChannel = 'email' | 'push' | 'whatsapp' | 'viber'
export type NotificationStatus = 'queued' | 'sent' | 'failed'

interface SendNotificationParams {
    userId: string
    eventType: string
    title: string
    message: string
    channels?: NotificationChannel[]
    relatedObjectType?: 'policy' | 'customer' | 'questionnaire'
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
                const template = (templates as any)[eventType.toUpperCase()]
                const emailSubject = template ? template({ id: relatedObjectId, language }).subject : title
                const emailHtml = template ? template({ id: relatedObjectId, language }).html : message

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
