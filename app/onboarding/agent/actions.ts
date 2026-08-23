"use server"

import { db } from "@/lib/db"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { daysFromNow, INVITE_EXPIRY_DAYS } from "@/lib/constants/time"
import { uploadFile, deleteFile } from "@/lib/storage"
import { sanitizeDisplayName, validateUploadFile, REJECTION_MESSAGES } from "@/lib/security/file-upload"
import { sendPolicyInviteEmail } from "@/lib/email/invite-emails"
import { displayPersonName } from "@/lib/wallet/policy-identity"

const AgentProfileSchema = z.object({
    agencyName: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    brandColor: z.string().optional(),
    // logoUrl would be handled separately after upload
})

/**
 * Resolve the caller from the session and require the `agent` role.
 * Throws (caught by each action and returned as { success: false, error })
 * so identity is NEVER taken from a caller-supplied argument.
 */
async function requireAgent() {
    const auth = await getAuthenticatedUserOrNull()
    if (!auth) throw new Error("Unauthorized")
    if (!auth.dbUser.roles.includes("agent")) throw new Error("Forbidden: agent role required")
    return auth.dbUser
}

export async function updateAgentProfile(data: z.infer<typeof AgentProfileSchema>) {
    try {
        const dbUser = await requireAgent()
        await db.agentProfile.update({
            where: { userId: dbUser.id },
            data: {
                ...data,
                // If agencyName is updated, we might want to sync it to other places if needed
            }
        })
        return { success: true }
    } catch (error) {
        console.error("Failed to update agent profile:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" }
    }
}

export async function completeOnboarding() {
    try {
        const dbUser = await requireAgent()
        await db.agentProfile.update({
            where: { userId: dbUser.id },
            data: {
                onboardingCompletedAt: new Date(),
                verificationStatus: "pending" // Or 'verified' if auto-verified
            }
        })

        // Also update User role/status if needed?
        // Logic depends on requirements. For now, just marking profile as complete.

        revalidatePath('/agent')
        return { success: true }
    } catch (error) {
        console.error("Failed to complete onboarding:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to complete onboarding" }
    }
}

export async function uploadAgentAsset(formData: FormData) {
    const file = formData.get('file')
    const type = formData.get('type')?.toString() // 'logo' or 'license'

    if (!(file instanceof File)) return { success: false, error: "No file provided" }
    // Constrain the type — it flows into the storage path prefix, so it must
    // not be caller-controlled free text.
    if (type !== 'logo' && type !== 'license') {
        return { success: false, error: "Invalid asset type" }
    }

    try {
        const dbUser = await requireAgent()

        // Per-surface allowlist: a logo must be a browser-renderable image; a
        // license may also be a PDF. uploadFile re-validates centrally (broader
        // 'document' category) as the defense-in-depth backstop.
        const validation = await validateUploadFile(file, {
            category: type === 'logo' ? 'image' : 'policy',
        })
        if (!validation.ok) {
            return { success: false, error: REJECTION_MESSAGES[validation.reason], errorCode: validation.reason }
        }

        const publicUrl = await uploadFile(file, `agent/${dbUser.id}/${type}`)

        try {
            if (type === 'logo') {
                await db.agentProfile.update({
                    where: { userId: dbUser.id },
                    data: { logoUrl: publicUrl }
                })
            } else if (type === 'license') {
                // Append to documents JSON
                // This is a simplified update, concurrent updates might overwrite
                const profile = await db.agentProfile.findUnique({ where: { userId: dbUser.id }, select: { documents: true } })
                const docs = (profile?.documents as any[]) || []
                docs.push({ type: 'license', url: publicUrl, name: sanitizeDisplayName(file.name), uploadedAt: new Date() })

                await db.agentProfile.update({
                    where: { userId: dbUser.id },
                    data: { documents: docs }
                })
            }
        } catch (dbError) {
            // Profile write failed — remove the just-stored object rather than
            // orphaning it in the bucket.
            await deleteFile(publicUrl).catch(() => {})
            throw dbError
        }

        return { success: true, url: publicUrl }
    } catch (error) {
        console.error("Failed to save asset:", error)
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" }
    }
}

export async function sendClientInvite(clientEmail: string) {
    const normalizedEmail = clientEmail?.trim().toLowerCase()
    if (!normalizedEmail) {
        return { success: false, error: "Invalid email" }
    }

    try {
        const dbUser = await requireAgent()

        // Sends an email — cap per agent to prevent email-bombing an address.
        const { rateLimit } = await import("@/lib/rate-limit")
        const inviteLimit = await rateLimit(dbUser.id, 20, 60 * 60 * 1000, `agent-invite:${dbUser.id}`)
        if (!inviteLimit.success) {
            return { success: false, error: "Too many invites sent. Please wait a bit and try again." }
        }

        const invite = await db.invite.create({
            data: {
                inviterUserId: dbUser.id,
                inviteeEmail: normalizedEmail,
                token: crypto.randomUUID().replace(/-/g, ""),
                inviteType: "signup",
                relationshipType: "agent_client",
                expiresAt: daysFromNow(INVITE_EXPIRY_DAYS),
            },
        })

        const emailResult = await sendPolicyInviteEmail({
            to: normalizedEmail,
            token: invite.token,
            inviterName: displayPersonName(dbUser.name) || dbUser.email || "PolicyWallet advisor",
            language: (dbUser.preferredLanguage as "el" | "en") || "en",
        })

        return { success: true, inviteId: invite.id, token: invite.token, emailQueued: emailResult.success }
    } catch (error) {
        console.error("Failed to create client invite:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to send invite" }
    }
}

