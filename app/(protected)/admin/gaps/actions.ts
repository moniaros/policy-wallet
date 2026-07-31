"use server"

import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { parseGapDefinitionForm } from "@/lib/admin/gap-definition-update"
import { updateGapDefinition } from "../actions"

/**
 * FormData wrapper around the versioned updateGapDefinition action (which owns
 * verifyAdminRole, the version increment, the UPDATE_GAP_DEFINITION audit row,
 * and the /admin/gaps revalidation). This wrapper parses + policy-validates the
 * form and MERGES detectionLogic — the check text lives at detectionLogic.check
 * and replacing the whole JSON would clobber sibling rule keys.
 */
export async function updateGapDefinitionFromForm(formData: FormData) {
    const input = parseGapDefinitionForm(formData)

    const existing = await db.gapDefinition.findUnique({
        where: { id: input.gapDefinitionId },
        select: { detectionLogic: true },
    })
    if (!existing) throw new Error("Gap definition not found")

    const mergedDetectionLogic = {
        ...((existing.detectionLogic as Record<string, unknown>) ?? {}),
        check: input.checkCriteria,
    }

    await updateGapDefinition(input.gapDefinitionId, {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        detectionLogic: mergedDetectionLogic,
    })

    redirect(`/admin/gaps/${input.gapDefinitionId}?saved=1`)
}
