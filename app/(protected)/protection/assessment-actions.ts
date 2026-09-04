"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { AREA_IDS, type AttentionAreaId } from "@/lib/protection/domains"
import { FACTOR_QUESTIONS, questionForFactor, type AssessmentFactorKey } from "@/lib/protection/factor-questions"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { applyFactWrites, existingFacts, profileFactData } from "@/lib/services/protection-profile/fact-writes"
import { areaQuestions } from "@/components/protection/area-detail-model"
import { factWritesForAnswer, valueSchemaFor } from "@/components/protection/assessment-answer"

/**
 * One answer to one assessment question, on the area detail
 * (/protection/areas/[area]) — docs/planning/PERSONAL_RISK_PROFILE.md §C
 * Layer 3, §F.
 *
 * The subject is the session, never a parameter: a `"use server"` export is a
 * public endpoint and an action that accepted a user id would let any
 * signed-in caller write another person's profile. The factor must be one
 * the question table knows, the value is validated against that question's
 * own input type and options, and the write goes through `applyFactWrites`
 * with `source: assessment` — so an exact answer replaces a coarse floor and a
 * floor never replaces a figure, the same rule every other profile writer
 * obeys (tests/unit/profile-writes-single-path.test.ts).
 *
 * Art. 9: the health factor is written only with an explicit `healthConsent`
 * — the server half of the gate the area detail renders before the question.
 * The UI cannot be trusted to have shown it; a request without the flag is
 * refused before the body is read for a value.
 *
 * Two deliberate departures from «exact»:
 *   - `age` asks a YEAR (the prompt says so), and a year is a bucket, so its
 *     date of birth is written `coarse`: a full date the wizard holds is never
 *     overwritten by it, and a later full date replaces it.
 *   - a `multi` answer of «none» is an empty list — a real «no», recorded as
 *     answered, never an erasure.
 *
 * The response names the NEXT question from the recomposed area, so the
 * client never asks a factor the write just settled — or one another surface
 * settled meanwhile.
 */

const FACTOR_KEYS = FACTOR_QUESTIONS.map((q) => q.factor) as [AssessmentFactorKey, ...AssessmentFactorKey[]]

const AnswerInput = z.object({
    area: z.enum(AREA_IDS),
    factor: z.enum(FACTOR_KEYS),
    value: z.unknown(),
    /** Only meaningful for the Art. 9 factor; must be literally `true`. */
    healthConsent: z.literal(true).optional(),
})

export type AnswerAssessmentError = "INVALID_INPUT" | "NOT_IN_AREA" | "CONSENT_REQUIRED" | "SAVE_FAILED"

export type AnswerAssessmentResult =
    | {
          ok: true
          /** The next question the area still has, or null when it has none. */
          next: AssessmentFactorKey | null
          /** Factors the area still lacks after this write — `remaining_unknown`. */
          remainingUnknown: number
          /** Columns the precedence rule refused, with the reason. Never silent. */
          skipped: Array<{ column: string; reason: string }>
      }
    | { ok: false; error: AnswerAssessmentError }

export async function answerAssessmentFactor(input: unknown): Promise<AnswerAssessmentResult> {
    const { dbUser } = await getAuthenticatedUser()
    const language: "el" | "en" = dbUser.preferredLanguage === "en" ? "en" : "el"

    const parsed = AnswerInput.safeParse(input)
    if (!parsed.success) return { ok: false, error: "INVALID_INPUT" }
    const { area, factor } = parsed.data

    const question = questionForFactor(factor)
    if (!question) return { ok: false, error: "INVALID_INPUT" }
    // A factor is asked only inside an area whose risks need it — and the
    // special-category factor only inside its own (health) area.
    if (!question.area.includes(area) || (question.specialCategory && area !== "health")) {
        return { ok: false, error: "NOT_IN_AREA" }
    }
    if (question.specialCategory && parsed.data.healthConsent !== true) {
        return { ok: false, error: "CONSENT_REQUIRED" }
    }

    const now = new Date()
    const value = valueSchemaFor(question, now).safeParse(parsed.data.value)
    if (!value.success) return { ok: false, error: "INVALID_INPUT" }

    try {
        const existing = await db.policyholderProfile.findUnique({ where: { userId: dbUser.id } })
        const applied = applyFactWrites({
            existing: existingFacts(existing as Record<string, unknown> | null),
            writes: factWritesForAnswer(question, value.data),
            now,
        })
        const facts = profileFactData(applied)
        await db.policyholderProfile.upsert({
            where: { userId: dbUser.id },
            update: { ...facts },
            create: { userId: dbUser.id, ...facts },
        })

        // The same engine refresh the quick start runs, awaited for the same
        // reason: the detail re-renders from the persisted assessment.
        await refreshProtectionScore(dbUser.id, "profile_update").catch((err) => {
            console.error("Assessment engine run failed:", err)
        })

        revalidatePath("/protection")
        revalidatePath(`/protection/areas/${area}`)

        const bundle = await loadAttentionAreas({ userId: dbUser.id, language, now })
        const view = bundle.areas.find((a) => a.area === (area as AttentionAreaId))
        const remaining = view ? areaQuestions(view, bundle.ctx, bundle.provenance, language, now) : []
        return {
            ok: true,
            next: remaining[0]?.factor ?? null,
            remainingUnknown: view?.unknownFactors.length ?? 0,
            skipped: applied.skipped,
        }
    } catch (error) {
        console.error("answerAssessmentFactor failed:", error)
        return { ok: false, error: "SAVE_FAILED" }
    }
}
