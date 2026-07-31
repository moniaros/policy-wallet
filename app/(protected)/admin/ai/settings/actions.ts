"use server"

import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { parseAiConfigForm, computeAiConfigDiff } from "@/lib/admin/ai-config-update"
import { AI_RUNTIME_CONFIG_CACHE_TAG } from "@/lib/services/ai/runtime-config"
import { env } from "@/lib/env"

/**
 * Upsert one AI runtime-config row (per-operation model pin, or the sentinel
 * primary-provider row). The plans write-path shape: verifyAdminRole → pure
 * parse → diff (empty → ?saved=unchanged, no write) → $transaction(upsert
 * version+1 + revision row) → logAdminAction → revalidateTag("max") → redirect.
 */
export async function updateAiModelConfig(formData: FormData) {
    const admin = await verifyAdminRole()

    const input = parseAiConfigForm(formData, {
        gemini: Boolean(env.GEMINI_API_KEY),
        anthropic: Boolean(env.ANTHROPIC_API_KEY),
        openai: Boolean(env.OPENAI_API_KEY),
    })

    const existing = await db.aiRuntimeConfig.findUnique({
        where: { configKey: input.configKey },
    })

    const diff = computeAiConfigDiff(
        existing ? { provider: existing.provider, model: existing.model } : null,
        { provider: input.provider, model: input.model }
    )
    if (diff.length === 0) {
        redirect(`/admin/ai/settings?saved=unchanged`)
    }

    const nextVersion = (existing?.version ?? 0) + 1
    const snapshot = {
        configKey: input.configKey,
        provider: input.provider,
        model: input.model,
        isActive: true,
        version: nextVersion,
    }

    await db.$transaction(async (tx) => {
        const row = await tx.aiRuntimeConfig.upsert({
            where: { configKey: input.configKey },
            create: {
                configKey: input.configKey,
                provider: input.provider,
                model: input.model,
                isActive: true,
                version: 1,
                changedBy: admin.id,
            },
            update: {
                provider: input.provider,
                model: input.model,
                isActive: true,
                version: nextVersion,
                changedBy: admin.id,
            },
        })
        await tx.aiRuntimeConfigRevision.create({
            data: {
                configId: row.id,
                version: row.version,
                snapshot,
                changes: diff as unknown as object,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_AI_MODEL_CONFIG",
        `AI routing config ${input.configKey}: ${diff.map((d) => `${d.field} ${d.from ?? "auto"} → ${d.to ?? "auto"}`).join(", ")}`,
        { configKey: input.configKey, changes: diff, warnings: input.warnings }
    )

    // 'max' marks tagged cache entries stale immediately; the 300s TTL is only
    // the backstop. The next AI call reads the new config.
    revalidateTag(AI_RUNTIME_CONFIG_CACHE_TAG, "max")
    revalidatePath("/admin/ai/settings")
    revalidatePath("/admin/ai")

    const warn = input.warnings.length > 0 ? "&warn=unknown-model" : ""
    redirect(`/admin/ai/settings?saved=1${warn}`)
}
