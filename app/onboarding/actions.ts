"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyService } from "@/lib/services/policy.service"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function completeOnboardingStep(step: number, data?: any) {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id

    // Get or create policyholder profile
    let profile = await db.policyholderProfile.findUnique({
        where: { userId }
    })

    if (!profile) {
        profile = await db.policyholderProfile.create({
            data: {
                userId,
                preferences: {}
            }
        })
    }

    const currentPreferences = (profile.preferences as Record<string, any>) || {}
    const updatedPreferences = {
        ...currentPreferences,
        onboardingStep: step,
        ...data // Merge any step-specific data (e.g., insuranceTypes)
    }

    if (step === 5) { // Step 5 is completion
        updatedPreferences.onboardingCompleted = true
        updatedPreferences.onboardingCompletedAt = new Date().toISOString()
        updatedPreferences.showTour = true
    }

    await db.policyholderProfile.update({
        where: { userId },
        data: {
            preferences: updatedPreferences
        }
    })

    revalidatePath("/onboarding")

    if (step === 5) {
        redirect("/wallet")
    }
}

export async function uploadOnboardingPolicy(formData: FormData) {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id

    const file = formData.get("file") as File

    if (!file) {
        return { success: false, error: "No file provided" }
    }

    const policyService = new PolicyService(db)

    try {
        const result = await policyService.uploadAndParse(userId, file, dbUser.preferredLanguage as "en" | "el")

        // Trigger background analysis if not already handled by service (service usually returns 'analyzing' status)
        // The service method uploadAndParse creates a record with 'analyzing' status.
        // We should trigger the background job. In a real app, this would be a queue.
        // Here we might just call it async without awaiting, or rely on a separate worker.
        // For this implementation, we'll let the client poll or show "Analyzing..."

        // Simulating the trigger of background analysis (fire and forget pattern in server actions is tricky, 
        // usually we'd use a queue, but here we can try to call it)
        // However, Vercel server functions might kill execution if we don't await.
        // For onboarding speed, we might not want to wait for full analysis.
        // The service logic:
        /*
        policyService.runBackgroundAnalysis(result.policyId, userId, dbUser.preferredLanguage as "en" | "el")
            .catch(err => console.error("Background analysis error:", err))
        */

        // Instead of fire-and-forget which is unreliable in serverless, we return success 
        // and let the client know it's analyzing.

        // Just ensuring policyholder profile exists
        await db.policyholderProfile.upsert({
            where: { userId },
            create: { userId, preferences: {} },
            update: {}
        })

        return { success: true, policyId: result.policyId }
    } catch (error) {
        console.error("Upload error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" }
    }
}

export async function getOnboardingState() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })

    if (!profile || !profile.preferences) return {
        step: 1,
        completed: false,
        name: dbUser.name?.split(" ")[0] || "there"
    }

    const prefs = profile.preferences as any
    return {
        step: prefs.onboardingStep || 1,
        completed: prefs.onboardingCompleted || false,
        name: dbUser.name?.split(" ")[0] || "there"
    }
}

export async function dismissTour() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })

    if (!profile) return

    await db.policyholderProfile.update({
        where: { userId: dbUser.id },
        data: {
            preferences: {
                ...(profile.preferences as any),
                showTour: false
            }
        }
    })

    revalidatePath("/wallet")
}
