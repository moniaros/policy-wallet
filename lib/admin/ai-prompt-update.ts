/**
 * Pure parsing/validation for the /admin/ai/prompts editor.
 *
 * Kept out of the "use server" action file so it unit-tests without server
 * mocks (the lib/admin/plan-update.ts convention). Guidance is PROMPT
 * CONTENT — it is appended verbatim (under the OPERATOR GUIDANCE label) to
 * every prompt of the chosen operation — so it must pass the shared
 * prompt-content policy: no advice language, no persona overrides, no
 * reserved delimiters, no injection patterns (validateOperatorGuidance).
 */

import { z } from "zod"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { validateOperatorGuidance, MAX_GUIDANCE_CHARS } from "@/lib/services/ai/prompt-policy"
import {
    GLOBAL_LINE_OF_BUSINESS,
    PROMPT_OPERATIONS,
    type PromptOperation,
} from "@/lib/services/ai/prompt-overrides"

export { MAX_GUIDANCE_CHARS }

/** Display labels for the admin UI (English-only admin pages). */
export const OPERATION_LABELS: Record<string, string> = {
    extractPolicyData: "Policy extraction",
    analyzeGaps: "Gap analysis",
    analyzePolicyClarity: "Clarity report",
    askQuestion: "Policy Q&A",
    analyzeRiskProfile: "Risk profile",
}

const VALID_LINES_OF_BUSINESS: ReadonlySet<string> = new Set([
    GLOBAL_LINE_OF_BUSINESS,
    ...WRITE_BRANCH_IDS,
])

const AiPromptFormSchema = z.object({
    operation: z.string().min(1, "Missing operation"),
    lineOfBusiness: z.string().min(1, "Missing line of business"),
    guidance: z.string(),
    isActive: z.boolean(),
})

export interface AiPromptOverrideInput {
    operation: PromptOperation
    lineOfBusiness: string
    guidance: string
    isActive: boolean
}

/** Throws Error with a readable message on any violation. */
export function parseAiPromptForm(formData: FormData): AiPromptOverrideInput {
    const parsed = AiPromptFormSchema.safeParse({
        operation: String(formData.get("operation") ?? ""),
        lineOfBusiness: String(formData.get("lineOfBusiness") ?? ""),
        guidance: String(formData.get("guidance") ?? ""),
        isActive: formData.get("isActive") === "on",
    })
    if (!parsed.success) {
        const first = parsed.error.issues[0]
        throw new Error(`Invalid ${first.path.join(".") || "form"}: ${first.message}`)
    }

    const { operation, lineOfBusiness, guidance, isActive } = parsed.data

    if (!(PROMPT_OPERATIONS as readonly string[]).includes(operation)) {
        throw new Error(
            `Invalid operation "${operation}" — must be one of: ${PROMPT_OPERATIONS.join(", ")}.`
        )
    }
    if (!VALID_LINES_OF_BUSINESS.has(lineOfBusiness)) {
        throw new Error(`Invalid lineOfBusiness "${lineOfBusiness}".`)
    }

    // Guidance is prompt content — the shared policy REJECTS advice language,
    // persona overrides, reserved delimiters and injection patterns on save.
    const policy = validateOperatorGuidance(guidance)
    if (!policy.ok) {
        throw new Error(`Guidance rejected: ${policy.errors.join(" ")}`)
    }

    return {
        operation: operation as PromptOperation,
        lineOfBusiness,
        guidance: guidance.trim(),
        isActive,
    }
}

export interface AiPromptFieldChange {
    field: "guidance" | "isActive"
    from: string | boolean | null
    to: string | boolean
}

/** Per-field {from,to} diff for the revision row; [] = no-op save. */
export function computeAiPromptDiff(
    before: { guidance: string; isActive: boolean } | null,
    after: { guidance: string; isActive: boolean }
): AiPromptFieldChange[] {
    const changes: AiPromptFieldChange[] = []
    if ((before?.guidance ?? null) !== after.guidance) {
        changes.push({ field: "guidance", from: before?.guidance ?? null, to: after.guidance })
    }
    if ((before?.isActive ?? null) !== after.isActive) {
        changes.push({ field: "isActive", from: before?.isActive ?? null, to: after.isActive })
    }
    return changes
}
