"use server"

import { db } from "@/lib/db"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { daysFromNow, INVITE_EXPIRY_DAYS } from "@/lib/constants/time"

const AgentProfileSchema = z.object({
    agencyName: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    brandColor: z.string().optional(),
    // logoUrl would be handled separately after upload
})

export async function updateAgentProfile(userId: string, data: z.infer<typeof AgentProfileSchema>) {
    const supabase = await createClient();
    void supabase;
    try {
        await db.agentProfile.update({
            where: { userId },
            data: {
                ...data,
                // If agencyName is updated, we might want to sync it to other places if needed
            }
        })
        return { success: true }
    } catch (error) {
        console.error("Failed to update agent profile:", error)
        return { success: false, error: "Failed to update profile" }
    }
}

export async function completeOnboarding(userId: string) {
    try {
        await db.agentProfile.update({
            where: { userId },
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
        return { success: false, error: "Failed to complete onboarding" }
    }
}


import { uploadFile } from "@/lib/storage"
import { sendPolicyInviteEmail } from "@/lib/email/invite-emails"

// ...

export async function uploadAgentAsset(userId: string, formData: FormData) {
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'logo' or 'license'

    if (!file) return { success: false, error: "No file provided" }

    try {
        const publicUrl = await uploadFile(file, `agent/${userId}/${type}`)

        if (type === 'logo') {
            await db.agentProfile.update({
                where: { userId },
                data: { logoUrl: publicUrl }
            })
        } else if (type === 'license') {
            // Append to documents JSON
            // This is a simplified update, concurrent updates might overwrite
            const profile = await db.agentProfile.findUnique({ where: { userId }, select: { documents: true } })
            const docs = (profile?.documents as any[]) || []
            docs.push({ type: 'license', url: publicUrl, name: file.name, uploadedAt: new Date() })

            await db.agentProfile.update({
                where: { userId },
                data: { documents: docs }
            })
        }

        return { success: true, url: publicUrl }
    } catch (error) {
        console.error("Failed to save asset:", error)
        return { success: false, error: "Upload failed" }
    }
}

export async function sendClientInvite(agentUserId: string, clientEmail: string) {
    if (!agentUserId || !clientEmail) {
        return { success: false, error: "Missing agent or client email" }
    }

    const normalizedEmail = clientEmail.trim().toLowerCase()
    if (!normalizedEmail) {
        return { success: false, error: "Invalid email" }
    }

    try {
        const invite = await db.invite.create({
            data: {
                inviterUserId: agentUserId,
                inviteeEmail: normalizedEmail,
                token: crypto.randomUUID().replace(/-/g, ""),
                inviteType: "signup",
                expiresAt: daysFromNow(INVITE_EXPIRY_DAYS),
            },
        })

        const inviter = await db.user.findUnique({
            where: { id: agentUserId },
            select: { name: true, email: true, preferredLanguage: true },
        })

        const emailResult = await sendPolicyInviteEmail({
            to: normalizedEmail,
            token: invite.token,
            inviterName: inviter?.name || inviter?.email || "PolicyWallet advisor",
            language: (inviter?.preferredLanguage as "el" | "en") || "en",
        })

        return { success: true, inviteId: invite.id, token: invite.token, emailQueued: emailResult.success }
    } catch (error) {
        console.error("Failed to create client invite:", error)
        return { success: false, error: "Failed to send invite" }
    }
}

export async function generateDemoProposal(file: File) {
    // 1. Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 2. In a real scenario, we would:
    //    a. Upload file to temp storage
    //    b. Call GapAnalysisService.analyzePolicy() (or a new analyzeDocument() method)
    //    c. Generate a proposal based on gaps

    // Demo data — clearly marked so UI can show disclaimer
    return {
        success: true,
        isDemoData: true,
        data: {
            policySummary: {
                insurer: "Allianz",
                type: "Home Insurance",
                premium: "€350/year",
                coverage: "Building & Content"
            },
            gaps: [
                {
                    title: "Missing Earthquake Coverage",
                    severity: "high",
                    description: "Policy excludes earthquake damage which is critical for your zone."
                },
                {
                    title: "Low Liability Limit",
                    severity: "medium",
                    description: "Third-party liability is capped at €50k, recommended €100k."
                }
            ],
            proposalId: "prop_" + Math.random().toString(36).substr(2, 9)
        }
    }
}
