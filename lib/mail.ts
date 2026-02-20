import { sendEmail } from "@/lib/email/email-service"

/**
 * Legacy compatibility wrapper.
 * New code should import `sendEmail` from `@/lib/email/email-service`.
 */
export async function sendMail({
    to,
    subject,
    html,
}: {
    to: string
    subject: string
    html: string
}) {
    const result = await sendEmail({ to, subject, html })
    if (!result.success) {
        throw new Error(result.error || "Failed to send email")
    }
    return { success: true, messageId: result.messageId }
}
