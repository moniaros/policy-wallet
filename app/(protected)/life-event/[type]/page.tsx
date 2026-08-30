export const runtime = "nodejs"

import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { LIFE_EVENT_CHIPS, type LifeEventChipId } from "@/lib/app/lifeEvents"
import { magnitudePrompt } from "@/lib/services/life-events/registry"
import { LifeEventScreen } from "./LifeEventScreen"

/** /life-event/[type] (§8.10) — the ten chips of §8.10 only; anything else is a 404, never a guess. */
export default async function LifeEventPage({ params }: { params: Promise<{ type: string }> }) {
    const { type } = await params
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    if (!LIFE_EVENT_CHIPS.some((c) => c.id === type)) notFound()
    const prompt = magnitudePrompt(type)
    return <LifeEventScreen type={type as LifeEventChipId} magnitudeLabel={prompt ? prompt[lang] : null} />
}
