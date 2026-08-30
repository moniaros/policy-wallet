"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { appFlag } from "@/lib/app/flags"
import { loadFindingsContext } from "@/lib/app/home-model"

const Input = z.object({
    hash: z.string().min(8).max(128),
    reason: z.enum(["chosen", "renewed", "not_relevant"]),
})

export type DismissResult = { ok: true } | { ok: false; error: "unavailable" | "not_found" | "invalid" }

/**
 * «Δεν το θέλω» (§8.2): remember the choice on the Finding row. The subject is
 * the session's user — never a parameter. The finding is re-derived server
 * side from the same composition /see renders, so a client cannot dismiss a
 * hash that is not theirs or store a sentence of its own making.
 */
export async function dismissFinding(input: { hash: string; reason: string }): Promise<DismissResult> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = Input.safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    if (!(await appFlag("app.findings"))) return { ok: false, error: "unavailable" }

    const ctx = await loadFindingsContext(dbUser.id, "el")
    const finding = ctx.findings.find((f) => f.hash === parsed.data.hash)
    if (!finding) return { ok: false, error: "not_found" }

    const now = new Date()
    try {
        await db.finding.upsert({
            where: { userId_hash: { userId: dbUser.id, hash: finding.hash } },
            create: {
                userId: dbUser.id,
                policyId: finding.object.policyId,
                hash: finding.hash,
                kind: finding.kind,
                tier: finding.tier,
                objectJson: finding.object,
                sourceJson: finding.source,
                sentenceJson: finding.sentence,
                whyYouJson: finding.whyYou ?? undefined,
                ruleId: finding.ruleId,
                engineVersion: finding.engineVersion ?? null,
                daysUntilExpiry: finding.daysUntilExpiry ?? null,
                firstSeenAt: now,
                lastSeenAt: now,
                dismissedReason: parsed.data.reason,
                dismissedAt: now,
            },
            update: { dismissedReason: parsed.data.reason, dismissedAt: now, reopenedAt: null, lastSeenAt: now, tier: finding.tier },
        })
    } catch (error) {
        logger("warn", "[see] dismissal not stored", { message: error instanceof Error ? error.message : String(error) })
        return { ok: false, error: "unavailable" }
    }
    revalidatePath("/see")
    revalidatePath("/home")
    return { ok: true }
}
