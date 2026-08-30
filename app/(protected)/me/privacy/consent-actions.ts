"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { appFlag } from "@/lib/app/flags"
import { getPolicyAccess } from "@/lib/policy-access"

/**
 * Withdraw AI consent for ONE document (the revocability `common.aiConsentBody`
 * promises). An upsert: pre-feature documents get a row born revoked, so the
 * withdrawal binds even where no grant row was ever written (A-30). The
 * orchestrator blocks the document from the next run on.
 */
export async function revokeDocumentConsent(input: { documentId: string }): Promise<{ ok: boolean }> {
    const { dbUser } = await getAuthenticatedUser()
    if (!(await appFlag("app.document_consent"))) return { ok: false }
    const parsed = z.object({ documentId: z.string().min(1).max(64) }).safeParse(input)
    if (!parsed.success) return { ok: false }
    // The one authorization path (lib/policy-access): resolve the document's
    // policy, then require ownership — only the owner withdraws consent.
    const doc = await db.policyDocument.findUnique({ where: { id: parsed.data.documentId }, select: { id: true, policyId: true } })
    if (!doc) return { ok: false }
    const access = await getPolicyAccess(doc.policyId, { id: dbUser.id, roles: dbUser.roles })
    if (!access.isOwner) return { ok: false }
    try {
        await db.documentAiConsent.upsert({
            where: { documentId: doc.id },
            create: { documentId: doc.id, userId: dbUser.id, textKey: "common.aiConsentBody", version: "2026-08-30", revokedAt: new Date() },
            update: { revokedAt: new Date() },
        })
    } catch {
        return { ok: false }
    }
    revalidatePath("/me/privacy")
    return { ok: true }
}
