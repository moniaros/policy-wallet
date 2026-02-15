"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth" // Assuming auth helper exists
import { revalidatePath } from "next/cache"
import { z } from "zod"

const AgentProfileSchema = z.object({
    agencyName: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    brandColor: z.string().optional(),
    // logoUrl would be handled separately after upload
})

export async function updateAgentProfile(userId: string, data: z.infer<typeof AgentProfileSchema>) {
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


// Mock for file upload - in real app would upload to S3/Blob storage
export async function uploadAgentAsset(userId: string, formData: FormData) {
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'logo' or 'license'

    if (!file) return { success: false, error: "No file provided" }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockUrl = `https://fake-storage.com/${userId}/${type}/${file.name}`

    try {
        if (type === 'logo') {
            await db.agentProfile.update({
                where: { userId },
                data: { logoUrl: mockUrl }
            })
        } else if (type === 'license') {
            // Append to documents JSON
            // This is a simplified update, concurrent updates might overwrite
            const profile = await db.agentProfile.findUnique({ where: { userId }, select: { documents: true } })
            const docs = (profile?.documents as any[]) || []
            docs.push({ type: 'license', url: mockUrl, name: file.name, uploadedAt: new Date() })

            await db.agentProfile.update({
                where: { userId },
                data: { documents: docs }
            })
        }

        return { success: true, url: mockUrl }
    } catch (error) {
        console.error("Failed to save asset:", error)
        return { success: false, error: "Database update failed" }
    }
}

export async function sendClientInvite(agentUserId: string, clientEmail: string) {
    // Logic to create invite record and send email
    // ...
    // For now returning success
    return { success: true }
}
