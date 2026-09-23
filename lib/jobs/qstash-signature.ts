import { Receiver } from "@upstash/qstash"
import { createApiError } from "@/lib/api-utils"

/**
 * withApiGuard `verify` for a QStash consumer: the Upstash signature over the
 * raw body. Shared by the execute-analysis consumer and its failure callback
 * so the two cannot drift.
 */
export async function verifyQstashSignature({ req }: { req: Request }) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY
    if (!currentSigningKey) {
        return createApiError("SERVICE_UNAVAILABLE", "Queue consumer not configured", 503)
    }
    const signature = req.headers.get("upstash-signature")
    if (!signature) {
        return createApiError("UNAUTHORIZED", "Missing signature", 401)
    }
    // Read a clone so the handler can still parse the original request body.
    const rawBody = await req.clone().text()
    const receiver = new Receiver({ currentSigningKey, nextSigningKey })
    let valid = false
    try {
        valid = await receiver.verify({ signature, body: rawBody })
    } catch {
        valid = false
    }
    return valid ? null : createApiError("UNAUTHORIZED", "Invalid signature", 401)
}
