import { z } from "zod"
import {
    CHILDREN_COUNT_VALUES,
    COMMITMENT_VALUES,
    CONFIDENCE_LEVELS,
    FUTURE_CONSIDERATIONS,
    GUIDANCE_PREFERENCES,
    HOME_VALUES,
    INCOME_VALUES,
    INTENT_VALUES,
    LIFE_CHANGE_IDS,
    MOBILITY_VALUES,
    PEOPLE_VALUES,
    RISK_CONCERNS,
    UNCERTAINTY_REASONS,
} from "@/lib/services/protection-profile/vocabulary"

/**
 * The zod boundary of the first-stage onboarding: one object per screen,
 * discriminated on `step`. Enum ids only — there is no free text anywhere in
 * the flow, and there is deliberately no field for a health fact, an amount,
 * or a date of birth: those belong to the consented /protection wizard.
 *
 * `unsure: true` is a first-class answer where the screen offers it. It writes
 * no fact column and marks the step in `unsureSteps`, which is what the map
 * later reports as «Χρειάζονται περισσότερα στοιχεία».
 */
const unsure = z.literal(true).optional()

export const ProtectionProfileStepSchema = z.discriminatedUnion("step", [
    z.object({ step: z.literal("intent"), intent: z.enum(INTENT_VALUES) }),
    z.object({ step: z.literal("orientation") }),
    z.object({
        step: z.literal("people"),
        people: z.array(z.enum(PEOPLE_VALUES)).max(PEOPLE_VALUES.length).default([]),
        childrenCount: z.enum(CHILDREN_COUNT_VALUES).optional(),
        unsure,
    }),
    z.object({ step: z.literal("home"), home: z.enum(HOME_VALUES) }),
    z.object({ step: z.literal("income"), income: z.enum(INCOME_VALUES) }),
    z.object({
        step: z.literal("obligations"),
        commitments: z.array(z.enum(COMMITMENT_VALUES)).max(COMMITMENT_VALUES.length).default([]),
        unsure,
    }),
    z.object({ step: z.literal("mobility"), vehicles: z.enum(MOBILITY_VALUES) }),
    z.object({
        step: z.literal("hurt_most"),
        /** In the order chosen: the first is the primary concern. Max two. */
        concerns: z.array(z.enum(RISK_CONCERNS)).max(2).default([]),
        unsure,
    }),
    z.object({
        step: z.literal("changes"),
        changes: z.array(z.enum(LIFE_CHANGE_IDS)).max(LIFE_CHANGE_IDS.length).default([]),
        /** «Έρχεται κάτι σύντομα» — opens the plans screen. */
        somethingComing: z.boolean().default(false),
    }),
    z.object({
        step: z.literal("plans"),
        plans: z.array(z.enum(FUTURE_CONSIDERATIONS)).max(FUTURE_CONSIDERATIONS.length).default([]),
    }),
    z.object({ step: z.literal("confidence"), confidence: z.enum(CONFIDENCE_LEVELS) }),
    z.object({
        step: z.literal("uncertainty_reason"),
        reasons: z.array(z.enum(UNCERTAINTY_REASONS)).max(UNCERTAINTY_REASONS.length).default([]),
    }),
    z.object({
        step: z.literal("guidance"),
        /** null = «Θα το αποφασίσω αργότερα»; the default is derived later. */
        guidance: z.enum(GUIDANCE_PREFERENCES).nullable(),
    }),
])

export type ProtectionProfileStepInput = z.infer<typeof ProtectionProfileStepSchema>
export type ProtectionProfileStepOf<S extends ProtectionProfileStepInput["step"]> = Extract<
    ProtectionProfileStepInput,
    { step: S }
>

/** The answers as stored: stepId → the validated input minus its `step` tag. */
export type ProtectionAnswers = Partial<{
    [S in ProtectionProfileStepInput["step"]]: Omit<ProtectionProfileStepOf<S>, "step">
}>
