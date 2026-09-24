"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getPolicyAccess } from "@/lib/policy-access"

const bodySchema = z.string().max(2000)

/**
 * Spec v2 §10.3: the viewer's private note on a policy. One row per
 * (policy, viewer); an empty body deletes it. The subject is the SESSION —
 * never a parameter — and the policy is reachable only through getPolicyAccess.
 */
export async function savePolicyNote(policyId: string, rawBody: string): Promise<{ ok: true } | { error: string }> {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) return { error: "UNAUTHORIZED" }
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) return { error: "TOO_LONG" }
    const access = await getPolicyAccess(policyId, { id: auth.dbUser.id, roles: auth.dbUser.roles })
    if (!access.exists || !access.canRead) return { error: "NOT_FOUND" }

    const body = parsed.data.trim()
    const where = { policyId_userId: { policyId, userId: auth.dbUser.id } }
    if (body.length === 0) {
        await db.policyNote.deleteMany({ where: { policyId, userId: auth.dbUser.id } })
    } else {
        await db.policyNote.upsert({ where, create: { policyId, userId: auth.dbUser.id, body }, update: { body } })
    }
    revalidatePath(`/wallet/${policyId}`)
    return { ok: true }
}
