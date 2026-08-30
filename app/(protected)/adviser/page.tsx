export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadAdviserModel } from "@/lib/app/adviser-model"
import { AdviserScreen } from "./AdviserScreen"

/** /adviser — «Ο σύμβουλός σας» (§8.7). /agent (exact) 301s here for policyholders. */
export default async function AdviserPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadAdviserModel(dbUser.id, lang)
    return <AdviserScreen model={model} />
}
