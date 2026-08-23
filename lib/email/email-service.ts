import * as Sentry from "@sentry/nextjs"
import { emailDomain, emailFingerprint, redactEmails } from "@/lib/observability/pii"
import { outboundDispatchAllowed } from "@/lib/outbound/dispatch-guard"

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
    /** Where replies go. Lets an admin alert reply straight to the form submitter. */
    replyTo?: string
}

export interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email"
const BREVO_ACCOUNT_API_URL = "https://api.brevo.com/v3/account"

function resolveSender(fromOverride?: string): { email: string; name: string } {
    if (fromOverride) {
        const trimmed = fromOverride.trim()
        const match = trimmed.match(/^"?([^"<]+)"?\s*<([^>]+)>$/)
        if (match) {
            return { name: match[1].trim(), email: match[2].trim() }
        }
        return { name: "PolicyWallet", email: trimmed }
    }

    return {
        name: process.env.SENDER_NAME || "PolicyWallet",
        email: process.env.SENDER_EMAIL || "noreply@policywallet.gr",
    }
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Single outbound email transport for the platform.
 * All transactional and operational emails must go through Brevo.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
    // ENVIRONMENT decides whether mail leaves this process — not whether a
    // credential happens to be present. The previous guard was `if (!apiKey)`,
    // and BREVO_API_KEY is set in `.env.local`, so it never fired locally: this
    // function reached Brevo and mailed real people from a developer's machine
    // and from any test that walked a send path. See lib/outbound/dispatch-guard.ts.
    const dispatch = outboundDispatchAllowed("email", emailFingerprint(options.to))
    if (!dispatch.allowed) {
        console.log(`[email:dev] not sent - ${dispatch.reason}`)
        console.log(`[email:dev] To: ${redactEmails(options.to)}`)
        console.log(`[email:dev] Subject: ${options.subject}`)
        return { success: true, messageId: "dev-outbound-blocked" }
    }

    const apiKey = process.env.BREVO_API_KEY

    if (!apiKey) {
        const errorMessage = "BREVO_API_KEY is missing in production environment."
        Sentry.captureMessage(errorMessage, { level: "error" })
        return { success: false, error: errorMessage }
    }

    const sender = resolveSender(options.from)
    const payload = {
        sender,
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || stripHtml(options.html),
        ...(options.replyTo ? { replyTo: { email: options.replyTo } } : {}),
    }

    try {
        const response = await fetch(BREVO_EMAIL_API_URL, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
            // A hung Brevo connection must not eat the serverless budget.
            signal: AbortSignal.timeout(15_000),
        })

        if (!response.ok) {
            const rawBody = await response.text()
            let parsedMessage = rawBody
            try {
                const parsed = JSON.parse(rawBody)
                parsedMessage = parsed?.message || parsed?.code || rawBody
            } catch {
                // keep raw body
            }

            const errorMessage = `Brevo send failed (${response.status}): ${parsedMessage}`
            // Brevo quotes the rejected address back at us, so the provider's own
            // message is redacted too — not just the fields we chose.
            Sentry.captureMessage(redactEmails(errorMessage), {
                level: "error",
                tags: {
                    email_domain: emailDomain(options.to),
                    email_recipient: emailFingerprint(options.to),
                    brevo_status: String(response.status),
                },
            })
            return { success: false, error: errorMessage }
        }

        const result = (await response.json()) as { messageId?: string }
        return { success: true, messageId: result.messageId || "brevo-accepted" }
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                email_domain: emailDomain(options.to),
                email_recipient: emailFingerprint(options.to),
            },
        })
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown Brevo delivery error",
        }
    }
}

export async function verifyEmailConfig(): Promise<boolean> {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
        return process.env.NODE_ENV !== "production"
    }

    try {
        const response = await fetch(BREVO_ACCOUNT_API_URL, {
            headers: {
                "api-key": apiKey,
                Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
        })
        return response.ok
    } catch (error) {
        Sentry.captureException(error)
        return false
    }
}
