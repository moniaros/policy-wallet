export const runtime = "nodejs"

import type { Metadata } from "next"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTimeline } from "@/lib/services/timeline/service"
import { HistorySection } from "@/components/settings/sections/HistorySection"

export const metadata: Metadata = { title: "Activity history · Settings" }

export default async function HistorySettingsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const language = (dbUser.preferredLanguage || "el") as "en" | "el"

    // Failing soft at the page level too: every individual source already
    // degrades on its own, so reaching here means something structural went
    // wrong, and an empty history is a better answer than an error page.
    const entries = await getTimeline(dbUser.id).catch((err) => {
        console.error("Activity history unavailable:", err)
        return []
    })

    return (
        <HistorySection
            entries={entries.map((entry) => ({
                ...entry,
                at: entry.at.toISOString(),
            }))}
            language={language}
        />
    )
}
