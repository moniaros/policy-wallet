import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { emit } from "@/lib/notifications/dispatch"
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
    const { auth } = authResult
    const user = auth.dbUser

    try {
        const body = await req.json()
        const parsed = FeedbackSchema.safeParse(body)

        if (!parsed.success) {
            return createApiError("VALIDATION_ERROR", "Invalid feedback data", 400)
        }

        const { type, score, comment, articleId, articleTitle, helpful } = parsed.data

        // Recorded on the `analytics` channel: this is the customer's own
        // feedback coming back at us, not a notification to them. It used to be
        // written as `channel: 'in_app'`, so submitting an NPS score put "NPS
        // Score: 7" in your own notification centre.
        await emit({
            event: type === "nps" ? "feedback_nps" : "feedback_article",
            userId: user.id,
            // Worded to be distinguishable from the pre-cutover English-only
            // composer ("NPS Score: 7", "Score: 7 — ..."), which the
            // stored-content presenter treats as legacy internal prose.
            title: type === "nps"
                ? { el: `Η βαθμολογία σας: ${score}/10`, en: `Your rating: ${score}/10` }
                : {
                      el: `Η αξιολόγησή σας: ${articleTitle || articleId}`,
                      en: `Your feedback on: ${articleTitle || articleId}`,
                  },
            message: type === "nps"
                ? {
                      el: `Ευχαριστούμε — καταγράψαμε βαθμολογία ${score}/10${comment ? ` και το σχόλιό σας: ${comment}` : ""}.`,
                      en: `Thank you — we recorded a rating of ${score}/10${comment ? ` and your comment: ${comment}` : ""}.`,
                  }
                : {
                      el: `${helpful ? "Βρήκατε το άρθρο χρήσιμο" : "Δεν βρήκατε το άρθρο χρήσιμο"}${comment ? ` — ${comment}` : ""}.`,
                      en: `${helpful ? "You found the article helpful" : "You did not find the article helpful"}${comment ? ` — ${comment}` : ""}.`,
                  },
            relatedObjectType: "feedback",
            relatedObjectId: type === "nps" ? String(score) : articleId || "unknown",
        })

        return createApiResponse({
            success: true,
            message: "Feedback received",
        })
    } catch (error) {
        return createApiError("INTERNAL_ERROR", "Failed to save feedback", 500, String(error))
    }
}
