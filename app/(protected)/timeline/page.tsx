export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTimeline } from "@/lib/services/timeline/service"
import { LifeTimeline } from "@/components/timeline/LifeTimeline"

export default async function TimelinePage() {
    const { dbUser } = await getAuthenticatedUser()
    const language = (dbUser.preferredLanguage || "en") as "en" | "el"

    // Failing soft at the page level too: every individual source already
    // degrades on its own, so reaching here means something structural went
    // wrong, and an empty timeline is a better answer than an error page.
    const entries = await getTimeline(dbUser.id).catch((err) => {
        console.error("Timeline unavailable:", err)
        return []
    })

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-6 px-4 pb-10 pt-7 sm:px-6 lg:px-8 lg:pt-10">
                <LifeTimeline
                    entries={entries.map((entry) => ({
                        ...entry,
                        at: entry.at.toISOString(),
                    }))}
                    language={language}
                />
            </div>
        </div>
    )
}
