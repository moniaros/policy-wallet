/**
 * Email channel.
 *
 * Wraps the existing branded shell (`buildNotificationEmail`) and mail service.
 * The only decision it makes is the one email genuinely has to make: it cannot
 * deliver without an address.
 */

import { sendEmail } from "@/lib/email/email-service"
import { isSyntheticNoEmailAddress } from "@/lib/identity/synthetic-email"
import { buildNotificationEmail } from "@/lib/mail-templates"
import type { ChannelAdapter, DeliveryOutcome, DeliveryPayload } from "./index"

export const emailAdapter: ChannelAdapter = {
    configured: () => true,

    async send(payload: DeliveryPayload): Promise<DeliveryOutcome> {
        // A customer with NO email carries a synthetic, non-deliverable
        // address (User.contactEmailMissing). `sendEmail` refuses it anyway;
        // recording "no address" here keeps the delivery log honest and
        // stops the retry loop from re-attempting a send that can never land.
        if (!payload.email || isSyntheticNoEmailAddress(payload.email)) {
            // Recorded, not silently dropped: "we have no address for you" is a
            // real and fixable reason a notification never arrived.
            return { status: "skipped", reason: "no_address" }
        }

        // A pre-rendered email (digest, drip, churn) wins; everything else gets
        // the shared branded shell.
        const { subject, html } = payload.content?.email ?? buildNotificationEmail({
            title: payload.title,
            message: payload.message,
            relatedObjectType: payload.relatedObjectType ?? undefined,
            relatedObjectId: payload.relatedObjectId ?? undefined,
            language: payload.language,
        })

        const result = await sendEmail({
            to: payload.email,
            subject: subject || payload.title,
            html: html || payload.message,
        })

        if (!result.success) {
            return { status: "failed", error: result.error || "Email delivery failed" }
        }
        return { status: "sent" }
    },
}
