export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadUpdatesModel } from "@/lib/app/updates-model"
import { UpdatesScreen } from "./UpdatesScreen"

/** /updates — «Ενημερώσεις» (§8.6). /notifications 301s here for policyholders. */
export default async function UpdatesPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadUpdatesModel(dbUser.id, lang)
    return <UpdatesScreen model={model} />
}
