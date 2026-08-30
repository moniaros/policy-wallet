export const runtime = "nodejs"

import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { loadPolicyDetailModel } from "@/lib/app/policy-detail-model"
import { PolicyDetailScreen } from "./PolicyDetailScreen"

/** /policies/[id] (§8.4). /wallet/[id] 301s here; /wallet/[id]/edit and /review stay where they are. */
export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const model = await loadPolicyDetailModel(id, { id: dbUser.id, roles: dbUser.roles }, lang)
    if (!model) notFound()
    return <PolicyDetailScreen model={model} />
}
