import { requireApiUser } from "@/lib/api-auth"
import { rateLimit } from "@/lib/rate-limit"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { z } from "zod"

const FeedbackSchema = z.object({
    type: z.enum(["nps", "article_feedback"]),
    score: z.number().min(0).max(10).optional(),
    comment: z.string().max(2000).optional(),
    articleId: z.string().optional(),
    articleTitle: z.string().optional(),
    helpful: z.boolean().optional(),
})

export async function POST(req: Request) {
    const authResult = await requireApiUser()
    if ("error" in authResult) return authResult.error

    // Free-text user content — unbounded submission is an abuse and storage vector.
    const rl = await rateLimit(String(authResult.auth.dbUser.id), 20, 3600000, `feedback:${authResult.auth.dbUser.id}`)
    if (!rl.success) return rl.error!
    const { auth } = authResult
    const user = auth.dbUser

    try {
        const body = await req.json()
        const parsed = FeedbackSchema.safeParse(body)

        if (!parsed.success) {
            return createApiError("VALIDATION_ERROR", "Invalid feedback data", 400)
        }

        const { type, score, comment, articleId, articleTitle, helpful } = parsed.data

        // Store feedback as a notification event for now (lightweight, no schema migration needed)
        await db.notificationEvent.create({
            data: {
                userId: user.id,
                eventType: type === "nps" ? "feedback_nps" : "feedback_article",
                channel: "in_app",
                title: type === "nps"
                    ? `NPS Score: ${score}`
                    : `Article feedback: ${articleTitle || articleId}`,
                message: type === "nps"
                    ? `Score: ${score}${comment ? ` — ${comment}` : ""}`
                    : `${helpful ? "👍 Helpful" : "👎 Not helpful"}${comment ? ` — ${comment}` : ""}`,
                relatedObjectType: type,
                relatedObjectId: type === "nps" ? String(score) : articleId || "unknown",
                status: "sent",
                sentAt: new Date(),
            },
        })

        return createApiResponse({
            success: true,
            message: "Feedback received",
        })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to save feedback", 500, String(error))
    }
}
