import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

/**
 * Server-side conversion-event mirror. GA/Vercel Analytics only see what the
 * browser sends; these rows (NotificationEvent, eventType "conv_*" — the
 * zero-migration store the feedback route also uses) make the admin funnel
 * measurable without any client analytics. Never throws: analytics must not
 * break a money path.
 */

export type ConversionEventType =
    | "checkout_started"
    | "checkout_completed"
    | "checkout_cancelled"
    | "limit_hit"
    // Paid Aha Loop v1 — server-side AI-call funnel (client can't see these).
    | "free_ai_call_blocked"
    | "paid_ai_call_started"
    | "paid_ai_call_completed"

export interface ConversionEventDetails {
    /** Trigger surface, e.g. "upgrade_modal", "carried_plan", "token_topup". */
    source?: string
    plan?: string
    billingPeriod?: string
    /** For limit_hit / *_ai_call_*: which operation, e.g. "gap_analysis", "ai_question". */
    kind?: string
    /** Feature gate the checkout was started from (FEATURE_GATES key). */
    feature?: string
    tokens?: number
    /** For report_unlock: which policy's report was purchased. */
    policyId?: string
    /** For *_ai_call_* events: the feature the user attempted. */
    feature?: string
}

export async function recordConversionEvent(
    userId: string,
    type: ConversionEventType,
    details: ConversionEventDetails = {}
) {
    try {
        await db.notificationEvent.create({
            data: {
                userId,
                eventType: `conv_${type}`,
                channel: "in_app",
                status: "sent",
                sentAt: new Date(),
                title: `conv_${type}`,
                message: JSON.stringify(details),
                relatedObjectType: details.source || details.kind || null,
                relatedObjectId: details.plan || (details.tokens ? String(details.tokens) : null),
            },
        })
    } catch (error) {
        logger("warn", "Failed to record conversion event", {
            userId,
            type,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}
