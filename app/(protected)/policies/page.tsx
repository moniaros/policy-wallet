export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadPoliciesModel } from "@/lib/app/policies-model"
import { PoliciesScreen } from "./PoliciesScreen"

/** /policies — «Ο φάκελός σας» (§8.3). /wallet 301s here. */
export default async function PoliciesPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadPoliciesModel(dbUser.id, lang)
    return <PoliciesScreen model={model} />
}
