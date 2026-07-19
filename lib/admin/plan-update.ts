/**
 * Pure parsing/validation/diff logic for the /admin/plans edit form —
 * kept free of server imports so it unit-tests without mocking
 * (tests/unit/admin-plan-actions.test.ts). The server action in
 * app/(protected)/admin/plans/actions.ts stays a thin transaction wrapper.
 */

import { z } from "zod"
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
    entitlementFieldKinds,
} from "@/lib/pricing/entitlement-schema"
import type {
    AgentEntitlementLimits,
    EntitlementLimits,
} from "@/types/subscription-entitlements"

/** Scalar (non-entitlement) editable fields. tierKey/planType/id are
 *  deliberately absent — identity is frozen after creation. */
export const PlanScalarUpdateSchema = z.object({
    displayName: z.string().trim().min(1).max(60),
    /** VAT-inclusive advertised monthly price (EUR). */
    price: z.number().min(0).max(999),
    /** null = no explicit annual price → checkout falls back to 12× monthly. */
    annualPrice: z.number().min(0).max(9999).nullable(),
    trialDays: z.number().int().min(0).max(90),
    isActive: z.boolean(),
    isPublic: z.boolean(),
    sortOrder: z.number().int().min(0).max(99),
})

export type PlanScalarUpdate = z.infer<typeof PlanScalarUpdateSchema>

export interface ParsedPlanUpdate {
    scalars: PlanScalarUpdate
    entitlements: EntitlementLimits | AgentEntitlementLimits
}

/** Minimal FormData surface so tests can pass a plain Map. */
export interface FormValues {
    get(name: string): unknown
}

function num(raw: unknown): number {
    const value = typeof raw === "string" ? raw.trim() : raw
    if (value === "" || value == null) return NaN
    return Number(value)
}

function bool(raw: unknown): boolean {
    // Checkboxes: present ("on") = true, absent (null) = false.
    return raw != null && raw !== "false"
}

/**
 * Parse + validate the edit form for a plan of the given audience.
 * Throws with a readable message on any invalid field — the action surfaces
 * it as the error state, nothing is written.
 */
export function parsePlanUpdateForm(
    form: FormValues,
    planType: "policyholder" | "agent"
): ParsedPlanUpdate {
    const annualRaw = form.get("annualPrice")
    const hasAnnual = typeof annualRaw === "string" ? annualRaw.trim() !== "" : annualRaw != null

    const scalarsResult = PlanScalarUpdateSchema.safeParse({
        displayName: String(form.get("displayName") ?? ""),
        price: num(form.get("price")),
        annualPrice: hasAnnual ? num(annualRaw) : null,
        trialDays: num(form.get("trialDays")),
        isActive: bool(form.get("isActive")),
        isPublic: bool(form.get("isPublic")),
        sortOrder: num(form.get("sortOrder")),
    })
    if (!scalarsResult.success) {
        const issue = scalarsResult.error.issues[0]
        throw new Error(`Invalid ${issue.path.join(".")}: ${issue.message}`)
    }

    const raw: Record<string, unknown> = {}
    for (const { key, kind } of entitlementFieldKinds(planType)) {
        if (kind === "boolean") {
            raw[key] = bool(form.get(`ent_${key}`))
        } else if (bool(form.get(`ent_${key}_unlimited`))) {
            raw[key] = null
        } else {
            raw[key] = num(form.get(`ent_${key}`))
        }
    }
    const schema =
        planType === "agent" ? AgentEntitlementLimitsSchema : EntitlementLimitsSchema
    const entResult = schema.safeParse(raw)
    if (!entResult.success) {
        const issue = entResult.error.issues[0]
        throw new Error(`Invalid entitlement ${issue.path.join(".")}: ${issue.message}`)
    }

    return { scalars: scalarsResult.data, entitlements: entResult.data }
}

export type PlanDiff = Record<string, { from: unknown; to: unknown }>

/**
 * Field-level diff between the stored row and the parsed update.
 * Entitlement changes are keyed "entitlements.<field>". Empty diff = no-op
 * save (the action skips the write entirely).
 */
export function computePlanDiff(
    before: {
        displayName: string
        price: number
        annualPrice: number | null
        trialDays: number
        isActive: boolean
        isPublic: boolean
        sortOrder: number
        entitlements: Record<string, unknown>
    },
    update: ParsedPlanUpdate
): PlanDiff {
    const diff: PlanDiff = {}
    for (const key of Object.keys(PlanScalarUpdateSchema.shape) as Array<
        keyof PlanScalarUpdate
    >) {
        const from = before[key]
        const to = update.scalars[key]
        if (from !== to) diff[key] = { from, to }
    }
    const after = update.entitlements as unknown as Record<string, unknown>
    for (const key of Object.keys(after)) {
        const from = before.entitlements?.[key]
        const to = after[key]
        if (from !== to) diff[`entitlements.${key}`] = { from, to }
    }
    return diff
}
