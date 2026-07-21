
import { logger } from "@/lib/logger"

const BREVO_API_URL = "https://api.brevo.com/v3/contacts"

type BrevoContact = {
    email: string
    attributes?: Record<string, string | number | boolean>
    listIds?: number[]
    updateEnabled?: boolean
}

/**
 * GDPR erasure propagation: remove the contact from Brevo entirely (lists,
 * attributes, tracking). Unlike createBrevoContact this THROWS on real
 * failures — the erasure engine must retry until the processor copy is gone.
 * Unconfigured key or an already-absent contact are clean no-ops.
 */
export async function deleteBrevoContact(email: string): Promise<boolean> {
    if (!process.env.BREVO_API_KEY) {
        return false
    }

    const response = await fetch(`${BREVO_API_URL}/${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "accept": "application/json",
        },
        // A hung Brevo connection must not eat the serverless budget.
        signal: AbortSignal.timeout(15_000),
    })

    if (response.status === 404) {
        return false // never synced or already deleted — the outcome we want
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => "")
        throw new Error(`Brevo contact deletion failed (${response.status}): ${detail.slice(0, 200)}`)
    }

    logger("info", "Brevo contact deleted", { email })
    return true
}

export async function createBrevoContact(contact: BrevoContact) {
    if (!process.env.BREVO_API_KEY) {
        logger("warn", "BREVO_API_KEY missing, skipping contact sync", { contact })
        return
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            signal: AbortSignal.timeout(15_000),
            body: JSON.stringify({
                email: contact.email,
                attributes: contact.attributes,
                listIds: contact.listIds,
                updateEnabled: contact.updateEnabled ?? true // Default to update if exists
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            // Ignore if contact already exists (error code duplicate_parameter)
            if (error.code !== "duplicate_parameter") {
                logger("error", "Brevo sync failed", { error })
            }
        } else {
            logger("info", "Brevo contact synced", { email: contact.email })
        }
    } catch (error) {
        logger("error", "Brevo network error", { error })
    }
}
