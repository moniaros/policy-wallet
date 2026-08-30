export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadMoneyModel } from "@/lib/app/money-model"
import { MoneyScreen } from "./MoneyScreen"

/** /money — «Τα χρήματά σας» (§8.5). */
export default async function MoneyPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadMoneyModel(dbUser.id, lang)
    return <MoneyScreen model={model} />
}
