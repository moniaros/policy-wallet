export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadHomeModel } from "@/lib/app/home-model"
import { HomeScreen } from "./HomeScreen"

/**
 * / — «Η προστασία σας» (§8.1). Served at `/` for a signed-in policyholder by
 * the proxy rewrite (`/` stays the static marketing homepage for everyone
 * else); a direct visit to /home is 301'd to `/`. The page reads; HomeScreen
 * renders.
 */
export default async function HomePage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadHomeModel(dbUser.id, lang)
    return <HomeScreen model={model} />
}
