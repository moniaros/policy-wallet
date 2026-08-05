import { db } from "@/lib/db"
import { createApiResponse, createApiError } from "@/lib/api-utils"
import { ensureOwnership } from "@/lib/security"
import { requireApiUser } from "@/lib/api-auth"
import { z } from "zod"
import {
    mapAnswersToProfile,
    mergeAnsweredFields,
    type MappableQuestion,
} from "@/lib/services/questionnaire/profile-mapping"
import type { QuestionnaireAnswers } from "@/types/questionnaire"

const questionnaireAnswersSchema = z.object({
    answers: z.record(z.string(), z.any()),
})

/**
 * `QuestionnaireTemplate.questions` is a Json column holding an ARRAY. This route
 * used to `JSON.parse(... as string)` it, which throws on every normally-stored
 * template — so the GET 500'd rather than returning questions. Tolerate both the
 * array and a legacy stringified value.
 */
function parseQuestions(raw: unknown): MappableQuestion[] {
    if (Array.isArray(raw)) return raw as MappableQuestion[]
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? (parsed as MappableQuestion[]) : []
        } catch {
            return []
        }
    }
    return []
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    const ownership = await ensureOwnership(db.questionnaireInstance, id, authResult.dbUser.id, "sentToUserId")
    if (!ownership.success) return ownership.error!

    try {
        const questionnaire = await db.questionnaireInstance.findUnique({
            where: { id },
            include: {
                template: true,
                sender: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        if (!questionnaire) return createApiError("NOT_FOUND", "Questionnaire not found", 404)

        return createApiResponse({
            ...questionnaire,
            questions: parseQuestions(questionnaire.template.questions),
        })
    } catch (error) {
        console.error(error)
        return createApiError("INTERNAL_ERROR", "Server error", 500)
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireApiUser()
    if ("error" in authCheck) return authCheck.error
    const authResult = authCheck.auth

    const { id } = await params

    const ownership = await ensureOwnership(db.questionnaireInstance, id, authResult.dbUser.id, "sentToUserId")
    if (!ownership.success) return ownership.error!

    try {
        const { answers } = questionnaireAnswersSchema.parse(await req.json())

        const instance = await db.questionnaireInstance.findUnique({
            where: { id },
            select: { template: { select: { questions: true } } },
        })

        // Map onto the risk profile the Protection Score reads. ensureOwnership
        // above guarantees the submitter is the recipient, so these are the
        // client's own declarations. Same contract as the server-action path.
        const { updates: profileUpdates, applied } = mapAnswersToProfile(
            parseQuestions(instance?.template?.questions),
            answers as unknown as QuestionnaireAnswers
        )

        const response = await db.$transaction(async (tx) => {
            const created = await tx.questionnaireResponse.create({
                data: {
                    instanceId: id,
                    userId: authResult.dbUser.id,
                    // Store the OBJECT, not JSON.stringify(...). The column is
                    // Json and every reader casts it to an object; the string
                    // form made the agent's answer view iterate characters.
                    answers: answers as any,
                },
            })
            await tx.questionnaireInstance.update({
                where: { id },
                data: { status: "completed", completedAt: new Date() },
            })
            if (applied.length > 0) {
                // Record that these questions were ASKED, not just what they
                // answered — a "no" is indistinguishable from a default value.
                const existing = await tx.policyholderProfile.findUnique({
                    where: { userId: authResult.dbUser.id },
                    select: { answeredFields: true },
                })
                const answeredFields = mergeAnsweredFields(existing?.answeredFields, applied)
                await tx.policyholderProfile.upsert({
                    where: { userId: authResult.dbUser.id },
                    create: { userId: authResult.dbUser.id, ...profileUpdates, answeredFields },
                    update: { ...profileUpdates, answeredFields },
                })
            }
            return created
        })

        if (applied.length > 0) {
            // Awaited, for the same reason as the risk-profile route: the client
            // reloads on success and reads the persisted recommendations, so a
            // background re-run races it and the answers appear to have changed
            // nothing. Still non-fatal — the submission has already succeeded and
            // must not be reported as failed because the re-run did.
            await import("@/lib/services/gap-engine")
                .then(({ refreshProtectionScore }) => refreshProtectionScore(authResult.dbUser.id))
                .catch((err) => {
                    console.error("Post-questionnaire engine run failed:", err)
                })
        }

        return createApiResponse(response)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return createApiError("VALIDATION_ERROR", "Invalid answers payload", 400, error.issues)
        }
        console.error(error)
        return createApiError("BAD_REQUEST", "Failed to submit questionnaire", 400)
    }
}
