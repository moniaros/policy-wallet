export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { firstRunDone } from "@/lib/app/first-run"
import { loadHomeModel } from "@/lib/app/home-model"
import { HomeScreen } from "./HomeScreen"

/**
 * / — «Η προστασία σας» (§8.1). Served at `/` for a signed-in policyholder by
 * the proxy rewrite (`/` stays the static marketing homepage for everyone
 * else); a direct visit to /home is 301'd to `/`. The page reads; HomeScreen
 * renders.
 */
import { redirect } from "next/navigation"

export default async function HomePage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadHomeModel(dbUser.id, lang)
    // First run (§8.11): nothing to show and never welcomed — /welcome introduces the analyst first.
    if (model.policyCount === 0) {
        const profile = await db.policyholderProfile.findUnique({ where: { userId: dbUser.id }, select: { preferences: true } })
        if (!firstRunDone(profile?.preferences)) redirect("/welcome")
    }
    return <HomeScreen model={model} />
}
