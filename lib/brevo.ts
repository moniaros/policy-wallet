
import { logger } from "@/lib/logger"

const BREVO_API_URL = "https://api.brevo.com/v3/contacts"

type BrevoContact = {
    email: string
    attributes?: Record<string, string | number | boolean>
    listIds?: number[]
    updateEnabled?: boolean
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
