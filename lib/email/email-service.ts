import * as Sentry from "@sentry/nextjs"

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
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
    const apiKey = process.env.BREVO_API_KEY

    if (!apiKey) {
        if (process.env.NODE_ENV !== "production") {
            // Local development fallback keeps UX flows testable without external calls.
            console.log("[email:dev] BREVO_API_KEY missing - email not sent")
            console.log(`[email:dev] To: ${options.to}`)
            console.log(`[email:dev] Subject: ${options.subject}`)
            return { success: true, messageId: "dev-no-brevo-key" }
        }

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
            Sentry.captureMessage(errorMessage, {
                level: "error",
                tags: {
                    email_to: options.to,
                    email_subject: options.subject.slice(0, 100),
                },
            })
            return { success: false, error: errorMessage }
        }

        const result = (await response.json()) as { messageId?: string }
        return { success: true, messageId: result.messageId || "brevo-accepted" }
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                email_to: options.to,
                email_subject: options.subject.slice(0, 100),
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
        })
        return response.ok
    } catch (error) {
        Sentry.captureException(error)
        return false
    }
}
