import { db } from "./db"

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

    // 3. Create Event Records
    const eventPromises = finalChannels.map(channel =>
        db.notificationEvent.create({
            data: {
                userId,
                eventType,
                channel,
                status: 'sent', // Mocking immediate success
                title,
                message,
                relatedObjectType,
                relatedObjectId,
                sentAt: new Date()
            }
        })
    )

    const events = await Promise.all(eventPromises)

    // 4. Trigger Actual Delivery (Mocked)
    console.log(`[Notification Service] Sent ${eventType} to user ${userId} via ${finalChannels.join(', ')}`)

    return events
}
