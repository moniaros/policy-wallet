/**
 * Push channel.
 *
 * Fans out to every device the user has registered, which is the point of
 * `push_devices`: `User.pushToken` held one token, so registering a laptop
 * evicted the phone and the customer could only ever be reached on whichever
 * they opted in from last.
 *
 * The honesty rule lives here. If a user has no device, this returns `skipped`
 * with a reason — it does NOT return `sent`. The previous implementation
 * checked `channel === 'push' && user.pushToken` in an `else if` and, when the
 * token was null (which it always was, because nothing ever registered one),
 * simply fell through and recorded the row as sent.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { sendWebPush } from "@/lib/push/web-push"
import { notificationActionPath } from "@/lib/notifications/links"
import type { ChannelAdapter, DeliveryOutcome, DeliveryPayload } from "./index"

export const pushAdapter: ChannelAdapter = {
    configured: () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),

    async send(payload: DeliveryPayload): Promise<DeliveryOutcome> {
        const devices = await db.pushDevice.findMany({
            where: { userId: payload.userId },
            select: { id: true, endpoint: true, p256dh: true, auth: true },
        })

        if (devices.length === 0) {
            return { status: "skipped", reason: "no_device" }
        }

        const url =
            notificationActionPath(payload.relatedObjectType ?? undefined, payload.relatedObjectId ?? undefined) ||
            "/home"

        const results = await Promise.all(
            devices.map((device) =>
                sendWebPush(device, { title: payload.title, body: payload.message, url }).then(
                    (result) => ({ device, result })
                )
            )
        )

        const dead = results.filter((r) => !r.result.ok && "gone" in r.result && r.result.gone)
        if (dead.length > 0) {
            // Delete rather than count: a 404/410 is permanent, and a dead
            // endpoint retried forever is how a push queue silently rots.
            await db.pushDevice
                .deleteMany({ where: { id: { in: dead.map((d) => d.device.id) } } })
                .catch((error) =>
                    logger("warn", "[push] failed to prune dead subscriptions", { error: String(error) })
                )
        }

        const delivered = results.filter((r) => r.result.ok)
        if (delivered.length > 0) {
            await db.pushDevice
                .updateMany({
                    where: { id: { in: delivered.map((d) => d.device.id) } },
                    data: { lastSuccessAt: new Date(), failureCount: 0 },
                })
                .catch(() => undefined)

            // One device reached is a delivered notification. The customer got it.
            return { status: "sent" }
        }

        // Every device was pruned as gone: the user has no live subscription, so
        // this is "nobody to send to", not "sending broke".
        if (dead.length === results.length) {
            return { status: "skipped", reason: "no_device" }
        }

        const soft = results.filter((r) => !r.result.ok)
        await db.pushDevice
            .updateMany({
                where: { id: { in: soft.map((d) => d.device.id) } },
                data: { failureCount: { increment: 1 } },
            })
            .catch(() => undefined)

        const firstError = soft[0]?.result
        return {
            status: "failed",
            error: firstError && !firstError.ok ? firstError.error : "push delivery failed",
        }
    },
}
