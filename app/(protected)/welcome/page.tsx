export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { firstRunDone } from "@/lib/app/first-run"
import { WelcomeScreen } from "./WelcomeScreen"

/** /welcome (§8.11) — first run only: no policies AND the existing onboardingCompletedAt still null. */
export default async function WelcomePage() {
    const { dbUser } = await getAuthenticatedUser()
    const [profile, policies] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id }, select: { preferences: true } }),
        db.policy.count({ where: { ownerUserId: dbUser.id, status: { not: "deleted" } } }),
    ])
    if (firstRunDone(profile?.preferences) || policies > 0) redirect("/")
    return <WelcomeScreen />
}
