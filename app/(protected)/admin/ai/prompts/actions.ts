"use server"

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { parseAiPromptForm, computeAiPromptDiff } from "@/lib/admin/ai-prompt-update"
import { AI_PROMPT_OVERRIDES_CACHE_TAG } from "@/lib/services/ai/prompt-overrides"

function invalidatePromptOverrides() {
    // 'max' marks tagged cache entries stale immediately; the 300s TTL is only
    // the backstop. The next AI call reads the new guidance.
    revalidateTag(AI_PROMPT_OVERRIDES_CACHE_TAG, "max")
    revalidatePath("/admin/ai/prompts")
    revalidatePath("/admin/ai")
}

/**
 * Create one operator-guidance override. Identity (operation + line of
 * business) is chosen at create time and frozen afterwards — the editor only
 * changes guidance/isActive.
 */
export async function createAiPromptOverride(formData: FormData) {
    const admin = await verifyAdminRole()
    const input = parseAiPromptForm(formData)

    let overrideId: string
    try {
        const row = await db.$transaction(async (tx) => {
            const created = await tx.aiPromptOverride.create({
                data: {
                    operation: input.operation,
                    lineOfBusiness: input.lineOfBusiness,
                    guidance: input.guidance,
                    isActive: input.isActive,
                    version: 1,
                    changedBy: admin.id,
                },
            })
            await tx.aiPromptOverrideRevision.create({
                data: {
                    overrideId: created.id,
                    version: 1,
                    snapshot: {
                        operation: input.operation,
                        lineOfBusiness: input.lineOfBusiness,
                        guidance: input.guidance,
                        isActive: input.isActive,
                        version: 1,
                    },
                    changes: computeAiPromptDiff(null, input) as unknown as object,
                    changedBy: admin.id,
                    changedByEmail: admin.email ?? "unknown",
                },
            })
            return created
        })
        overrideId = row.id
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new Error(
                `An override for ${input.operation} / ${input.lineOfBusiness} already exists — edit it instead of creating a duplicate.`
            )
        }
        throw error
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CREATE_AI_PROMPT_OVERRIDE",
        `Operator guidance created for ${input.operation} (${input.lineOfBusiness})`,
        { overrideId, operation: input.operation, lineOfBusiness: input.lineOfBusiness }
    )

    invalidatePromptOverrides()
    redirect(`/admin/ai/prompts?saved=1`)
}

/** Update guidance/isActive on an existing override (identity frozen). */
export async function updateAiPromptOverride(formData: FormData) {
    const admin = await verifyAdminRole()

    const overrideId = String(formData.get("overrideId") ?? "")
    if (!overrideId) throw new Error("Missing override id")

    const existing = await db.aiPromptOverride.findUnique({ where: { id: overrideId } })
    if (!existing) throw new Error("Prompt override not found")

    // Re-parse with the FROZEN identity — the form's hidden fields could be
    // tampered with, so operation/LoB come from the DB row, not the form.
    const form = new FormData()
    form.set("operation", existing.operation)
    form.set("lineOfBusiness", existing.lineOfBusiness)
    form.set("guidance", String(formData.get("guidance") ?? ""))
    if (formData.get("isActive") === "on") form.set("isActive", "on")
    const input = parseAiPromptForm(form)

    const diff = computeAiPromptDiff(
        { guidance: existing.guidance, isActive: existing.isActive },
        { guidance: input.guidance, isActive: input.isActive }
    )
    if (diff.length === 0) {
        redirect(`/admin/ai/prompts/${overrideId}?saved=unchanged`)
    }

    const nextVersion = existing.version + 1
    await db.$transaction(async (tx) => {
        await tx.aiPromptOverride.update({
            where: { id: overrideId },
            data: {
                guidance: input.guidance,
                isActive: input.isActive,
                version: nextVersion,
                changedBy: admin.id,
            },
        })
        await tx.aiPromptOverrideRevision.create({
            data: {
                overrideId,
                version: nextVersion,
                snapshot: {
                    operation: existing.operation,
                    lineOfBusiness: existing.lineOfBusiness,
                    guidance: input.guidance,
                    isActive: input.isActive,
                    version: nextVersion,
                },
                changes: diff as unknown as object,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_AI_PROMPT_OVERRIDE",
        `Operator guidance v${nextVersion} for ${existing.operation} (${existing.lineOfBusiness}): ${diff.map((d) => d.field).join(", ")} changed`,
        { overrideId, operation: existing.operation, lineOfBusiness: existing.lineOfBusiness, changes: diff.map((d) => d.field) }
    )

    invalidatePromptOverrides()
    redirect(`/admin/ai/prompts/${overrideId}?saved=1`)
}
