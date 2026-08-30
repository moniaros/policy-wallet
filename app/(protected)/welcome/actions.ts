"use server"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

/** First run is over — recorded where policyholder onboarding has always lived: the profile's preferences JSON (no new User column, A-16). */
export async function completeWelcome(): Promise<void> {
    const { dbUser } = await getAuthenticatedUser()
    const existing = await db.policyholderProfile.findUnique({ where: { userId: dbUser.id }, select: { preferences: true } })
    const preferences = { ...((existing?.preferences as Record<string, unknown> | null) ?? {}), onboardingCompleted: true, onboardingCompletedAt: new Date().toISOString() }
    await db.policyholderProfile.upsert({ where: { userId: dbUser.id }, create: { userId: dbUser.id, preferences }, update: { preferences } })
    redirect("/add")
}
