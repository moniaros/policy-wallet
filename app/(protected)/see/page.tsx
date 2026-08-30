export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadSeeModel } from "@/lib/app/see-model"
import { SeeScreen, type SeeFilter } from "./SeeScreen"

const FILTERS: ReadonlySet<string> = new Set(["gap", "review", "expiry"])

/** /see — «Να δείτε» (§8.2). `?state=gap|review|expiry` narrows to one kind (the verdict tiles link here). */
export default async function SeePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const { state } = await searchParams
    const filter: SeeFilter = state && FILTERS.has(state) ? (state as SeeFilter) : "all"
    const model = await loadSeeModel(dbUser.id, lang)
    return <SeeScreen model={model} filter={filter} />
}
