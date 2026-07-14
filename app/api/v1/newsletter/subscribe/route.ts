import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { createBrevoContact } from "@/lib/brevo"
import { sendFormAdminAlert, sendNewsletterWelcome } from "@/lib/email/form-emails"

// PUBLIC_ENDPOINT_AUTH_STRATEGY: rate_limit + zod_payload_validation + honeypot + db_persist + brevo_list_sink

export const runtime = "nodejs"

const subscribeSchema = z.object({
    email: z.string().trim().email().max(180),
    locale: z.enum(["el", "en"]).optional().default("el"),
    source: z.string().trim().max(64).optional().default("footer_newsletter"),
    // Honeypot: hidden from humans; a filled value means a bot.
    company: z.string().max(200).optional().default(""),
})

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = await rateLimit(String(ip), 8, 10 * 60 * 1000, `newsletter:${ip}`)
    if (!limitCheck.success) return limitCheck.error!

    let requestBody: unknown
    try {
        requestBody = await req.json()
    } catch {
        return createApiError("VALIDATION_ERROR", "Invalid request body", 400)
    }

    const parsed = subscribeSchema.safeParse(requestBody)
    if (!parsed.success) {
        return createApiError("VALIDATION_ERROR", "Invalid subscription payload", 400, parsed.error.issues)
    }

    const { locale, source, company } = parsed.data
    const email = parsed.data.email.toLowerCase()

    // Bot: mirror the success envelope so it learns nothing, but store and send nothing.
    if (company.trim().length > 0) {
        return createApiResponse({ subscribed: true }, locale)
    }

    // Persist BEFORE any network call: a Brevo outage must never lose the subscriber.
    let submissionId: string
    try {
        const row = await db.formSubmission.create({
            data: {
                formType: "newsletter",
                email,
                locale,
                source,
                ipAddress: String(ip),
                userAgent: req.headers.get("user-agent"),
            },
        })
        submissionId = row.id
    } catch (error) {
        Sentry.captureException(error, { tags: { context: "newsletter_persist" } })
        return createApiError("PERSIST_FAILED", "Could not record the subscription", 500, undefined, locale)
    }

    // Add to the Brevo mailing list. createBrevoContact already swallows its own
    // errors (including duplicate_parameter for a repeat signup), so a re-subscribe
    // is idempotent and never surfaces as a failure to the visitor.
    const listId = Number(process.env.BREVO_LIST_ID_NEWSLETTER)
    await createBrevoContact({
        email,
        attributes: { SOURCE: source, LOCALE: locale },
        listIds: Number.isFinite(listId) && listId > 0 ? [listId] : undefined,
        updateEnabled: true,
    })

    const alert = await sendFormAdminAlert({ formType: "newsletter", submission: { email, source } })

    if (alert.success) {
        await db.formSubmission
            .update({ where: { id: submissionId }, data: { emailSent: true } })
            .catch((error) => Sentry.captureException(error, { tags: { context: "newsletter_mark_sent" } }))
    } else {
        Sentry.captureMessage(`Newsletter admin alert failed: ${alert.error}`, {
            level: "error",
            tags: { context: "newsletter_alert", submission_id: submissionId },
        })
    }

    const welcome = await sendNewsletterWelcome({ to: email, language: locale })
    if (!welcome.success) {
        Sentry.captureMessage(`Newsletter welcome email failed: ${welcome.error}`, {
            level: "warning",
            tags: { context: "newsletter_welcome", submission_id: submissionId },
        })
    }

    return createApiResponse({ subscribed: true }, locale)
}
