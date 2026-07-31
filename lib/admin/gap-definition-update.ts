/**
 * Pure parsing/validation for the /admin/gaps editor.
 *
 * Kept out of the "use server" action file so it unit-tests without server
 * mocks (the lib/admin/plan-update.ts convention). The checkCriteria text is
 * PROMPT CONTENT — it is rendered verbatim into buildGapAnalysisPrompt for
 * every analysis of that line of business — so it passes through the same
 * prompt-content policy as operator-guidance overrides.
 */

import { z } from "zod"
import { validateOperatorGuidance } from "@/lib/services/ai/prompt-policy"

export const MAX_CHECK_CRITERIA_CHARS = 2000

const GapDefinitionFormSchema = z.object({
    gapDefinitionId: z.string().min(1, "Missing gap definition id"),
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().min(1, "Description is required").max(2000),
    checkCriteria: z.string().trim().min(1, "Check criteria is required").max(MAX_CHECK_CRITERIA_CHARS),
    isActive: z.boolean(),
})

export interface GapDefinitionUpdateInput {
    gapDefinitionId: string
    name: string
    description: string
    checkCriteria: string
    isActive: boolean
}

/** Throws Error with a readable message on any violation. */
export function parseGapDefinitionForm(formData: FormData): GapDefinitionUpdateInput {
    const parsed = GapDefinitionFormSchema.safeParse({
        gapDefinitionId: String(formData.get("gapDefinitionId") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        checkCriteria: String(formData.get("checkCriteria") ?? ""),
        isActive: formData.get("isActive") === "on",
    })
    if (!parsed.success) {
        const first = parsed.error.issues[0]
        throw new Error(`Invalid ${first.path.join(".") || "form"}: ${first.message}`)
    }

    // checkCriteria is prompt content: same policy as operator guidance
    // (advice language, persona overrides, delimiters, injection patterns).
    const policy = validateOperatorGuidance(parsed.data.checkCriteria, {
        maxChars: MAX_CHECK_CRITERIA_CHARS,
    })
    if (!policy.ok) {
        throw new Error(`Check criteria rejected: ${policy.errors.join(" ")}`)
    }

    return parsed.data
}
