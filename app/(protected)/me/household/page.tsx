export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadHouseholdModel } from "@/lib/app/household-model"
import { HouseholdScreen } from "./HouseholdScreen"

/** /me/household — «Το νοικοκυριό σας» (§8.9). */
export default async function HouseholdPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadHouseholdModel(dbUser.id, lang)
    return <HouseholdScreen model={model} />
}
