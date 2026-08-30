"use server"

import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { publish } from "@/lib/events/publish"
import { collaborationService } from "@/lib/services/collaboration.service"
import { loadFindingsContext } from "@/lib/app/home-model"
import { resolveSentence, resolveSource } from "@/lib/app/render-copy"
import { disconnectFromAgent, inviteAdvisorByEmail } from "@/app/(protected)/agent/relationship-actions"
import { getPolicyAccess } from "@/lib/policy-access"

/** The customer's one active adviser, or null. The subject is always the session's user. */
async function activeAdviser(userId: string) {
    const rel = await db.customerRelationship.findFirst({
        where: { policyholderUserId: userId, status: "active" },
        select: { id: true, agentUserId: true, agent: { select: { name: true } } },
    })
    return rel
}

async function audit(userId: string, adviserUserId: string, action: "granted" | "revoked" | "help_sent", grantId: string | null, payload: Prisma.InputJsonValue) {
    // Best-effort on environments that predate the table (prod DDL owed) — the
    // grant/revoke itself must not fail because the trace cannot be written.
    await db.adviserShareAudit
        .create({ data: { userId, adviserUserId, grantId, action, payloadJson: payload } })
        .catch((error) => logger("warn", "[adviser] share audit not stored", { action, message: error instanceof Error ? error.message : String(error) }))
}

/**
 * The per-policy switch (§8.7): on = an active policy-scoped view grant for
 * the connected adviser, off = revoked. Every flip leaves an audit row.
 */
export async function setPolicyShared(input: { policyId: string; shared: boolean }): Promise<{ ok: boolean }> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ policyId: z.string().min(1).max(64), shared: z.boolean() }).safeParse(input)
    if (!parsed.success) return { ok: false }
    const rel = await activeAdviser(dbUser.id)
    if (!rel) return { ok: false }
    // The one authorization path (lib/policy-access) — only the OWNER shares a policy.
    const access = await getPolicyAccess(parsed.data.policyId, { id: dbUser.id, roles: dbUser.roles })
    if (!access.isOwner) return { ok: false }
    const scope = `policy:${parsed.data.policyId}`

    if (parsed.data.shared) {
        const existing = await db.accessGrant.findFirst({ where: { granterUserId: dbUser.id, granteeUserId: rel.agentUserId, scope, status: "active" }, select: { id: true } })
        if (!existing) {
            const grant = await db.accessGrant.create({ data: { granterUserId: dbUser.id, granteeUserId: rel.agentUserId, scope, permissions: "view", status: "active" } })
            await audit(dbUser.id, rel.agentUserId, "granted", grant.id, { policyIds: [parsed.data.policyId] })
        }
    } else {
        const grant = await db.accessGrant.findFirst({ where: { granterUserId: dbUser.id, granteeUserId: rel.agentUserId, scope, status: "active" }, select: { id: true } })
        if (grant) {
            await db.accessGrant.update({ where: { id: grant.id }, data: { status: "revoked", revokedAt: new Date() } })
            await audit(dbUser.id, rel.agentUserId, "revoked", grant.id, { policyIds: [parsed.data.policyId] })
        }
    }
    revalidatePath("/adviser")
    revalidatePath(`/policies/${parsed.data.policyId}`)
    return { ok: true }
}

/** Disconnect = the relationship ends and every grant dies with it (terminateRelationship revokes in the same transaction). */
export async function disconnectAdviser(input: { relationshipId: string }): Promise<{ ok: boolean }> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ relationshipId: z.string().min(1).max(64) }).safeParse(input)
    if (!parsed.success) return { ok: false }
    const rel = await db.customerRelationship.findFirst({ where: { id: parsed.data.relationshipId, policyholderUserId: dbUser.id }, select: { agentUserId: true } })
    const result = await disconnectFromAgent(parsed.data.relationshipId)
    if (result.success && rel) {
        await audit(dbUser.id, rel.agentUserId, "revoked", null, { reason: "disconnected", scope: "all" })
    }
    revalidatePath("/adviser")
    return { ok: result.success === true }
}

export async function inviteAdviser(input: { email: string }): Promise<{ ok: boolean }> {
    await getAuthenticatedUser() // identity first — every "use server" export is a public endpoint
    const parsed = z.object({ email: z.string().email().max(200) }).safeParse(input)
    if (!parsed.success) return { ok: false }
    const result = await inviteAdvisorByEmail(parsed.data.email)
    revalidatePath("/adviser")
    return { ok: result.success === true }
}

export type HelpResult = { ok: true } | { ok: false; error: "no_adviser" | "not_found" | "invalid" | "failed" }

/**
 * The consented help flow (§8.8): re-derives the finding from the same
 * composition /see renders (the client sends only a hash), shares exactly
 * what the sheet showed — the finding's policy, plus the others only when
 * the chip was switched on — writes AdviserShareAudit{help_sent}, opens one
 * collaboration thread, and publishes advisor.help_requested.
 */
export async function sendHelpRequest(input: { hash: string; includeOthers: boolean }): Promise<HelpResult> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ hash: z.string().min(8).max(128), includeOthers: z.boolean() }).safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    const rel = await activeAdviser(dbUser.id)
    if (!rel) return { ok: false, error: "no_adviser" }

    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const ctx = await loadFindingsContext(dbUser.id, lang)
    const finding = ctx.findings.find((f) => f.hash === parsed.data.hash)
    if (!finding) return { ok: false, error: "not_found" }

    const { getTranslations } = await import("@/lib/i18n")
    const t = getTranslations(lang)
    const sentence = resolveSentence(finding, lang, t)
    const source = resolveSource(finding, lang, t)

    const policyIds = [finding.object.policyId, ...(parsed.data.includeOthers ? ctx.composed.filter((p) => p.id !== finding.object.policyId && p.lifecycle !== "expired").map((p) => p.id) : [])].filter((id): id is string => Boolean(id))
    try {
        const grantIds: string[] = []
        for (const policyId of policyIds) {
            const scope = `policy:${policyId}`
            const existing = await db.accessGrant.findFirst({ where: { granterUserId: dbUser.id, granteeUserId: rel.agentUserId, scope, status: "active" }, select: { id: true } })
            if (existing) { grantIds.push(existing.id); continue }
            const grant = await db.accessGrant.create({ data: { granterUserId: dbUser.id, granteeUserId: rel.agentUserId, scope, permissions: "view", status: "active" } })
            grantIds.push(grant.id)
            await audit(dbUser.id, rel.agentUserId, "granted", grant.id, { policyIds: [policyId], via: "help_flow" })
        }

        await audit(dbUser.id, rel.agentUserId, "help_sent", grantIds[0] ?? null, {
            findingId: finding.id,
            findingHash: finding.hash,
            policyIds,
            profileFields: finding.whyYou ? [finding.whyYou.profileField] : [],
        })

        await collaborationService.ensureAutomationThread(dbUser.id, {
            relationshipId: rel.id,
            policyId: finding.object.policyId,
            subject: sentence.slice(0, 140),
            category: finding.kind === "gap" ? "coverage_gap" : "general",
            linkedGapInstanceId: finding.kind === "gap" && finding.id.startsWith("gap:") ? finding.id.slice(4) : null,
            priority: finding.tier === "now" ? "high" : "medium",
            initialMessage: `${sentence}\n${source}`,
        })

        await publish({
            name: "advisor.help_requested",
            aggregate: { type: "advisor", id: rel.agentUserId },
            subjectUserId: dbUser.id,
            actor: { type: "customer", id: dbUser.id },
            payload: {
                findingId: finding.id,
                advisorUserId: rel.agentUserId,
                policyIds,
                profileFields: finding.whyYou ? [finding.whyYou.profileField] : [],
            },
        })
    } catch (error) {
        logger("error", "[adviser] help request failed", { message: error instanceof Error ? error.message : String(error) })
        return { ok: false, error: "failed" }
    }
    revalidatePath("/adviser")
    return { ok: true }
}
