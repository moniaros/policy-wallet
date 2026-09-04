"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"

import type { PolicyholderProfile } from "@prisma/client"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { AREA_IDS, type AttentionAreaId } from "@/lib/protection/domains"
import { FACTOR_QUESTIONS, INCOME_DEPENDENCY_FACTOR, questionForFactor, type AssessmentFactorKey } from "@/lib/protection/factor-questions"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
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
 * settled meanwhile. The recomposition is the read seam's (three reads and
 * pure assembly); the engine refresh, which reaches a model provider, runs
 * in `after()` once the response is out.
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
        // Before the write: was this factor one the engine still lacked? Income
        // dependency is not a catalogue factor (§E) and never settles an area.
        const wasDecidingFactUnknown =
            factor !== INCOME_DEPENDENCY_FACTOR && !toLifeContext(existing as PolicyholderProfile | null, now).known[factor]
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

        // The same engine refresh the quick start runs — but AFTER the
        // response, the way the onboarding's completion runs it: it reaches a
        // model provider and took 30–60 s in front of the customer, once per
        // question. Nothing the detail renders next depends on it: the next
        // question and the area's open facts come from the recomposition
        // below (three reads and pure assembly), and the persisted score is
        // read by the dashboard when it lands.
        after(async () => {
            await refreshProtectionScore(dbUser.id, "profile_update").catch((err) => {
                console.error("Assessment engine run failed:", err)
            })
        })

        revalidatePath("/protection")
        revalidatePath(`/protection/areas/${area}`)

        const bundle = await loadAttentionAreas({ userId: dbUser.id, language, now })
        const view = bundle.areas.find((a) => a.area === (area as AttentionAreaId))
        const remaining = view ? areaQuestions(view, bundle.ctx, bundle.provenance, language, now) : []
        const remainingUnknown = view?.unknownFactors.length ?? 0

        // The server mirror of the area's completion (§J): this answer took
        // the area's deciding facts from «one still missing» to «none» — so a
        // refining answer on an already-settled area, or a floor the rule
        // refused, never records a completion. `areas_completed` counts the
        // activated areas with no deciding fact left; `remaining_unknown` the
        // activated areas still waiting on one. Never throws (the recorder
        // swallows), never on the money path.
        if (wasDecidingFactUnknown && remainingUnknown === 0) {
            const activated = bundle.areas.filter((a) => a.activated)
            await recordConversionEvent(dbUser.id, "risk_assessment_completed", {
                source: `protection_area:${area}`,
                areas_completed: activated.filter((a) => a.unknownFactors.length === 0).length,
                remaining_unknown: activated.filter((a) => a.unknownFactors.length > 0).length,
            })
        }

        return {
            ok: true,
            next: remaining[0]?.factor ?? null,
            remainingUnknown,
            skipped: applied.skipped,
        }
    } catch (error) {
        console.error("answerAssessmentFactor failed:", error)
        return { ok: false, error: "SAVE_FAILED" }
    }
}
