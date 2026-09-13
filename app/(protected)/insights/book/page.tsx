export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { parseRoles } from "@/lib/api-auth"
import { getAdvisorBook } from "@/lib/services/risk-dna/book"
import { AdvisorBookView } from "@/components/risk-dna/AdvisorBookView"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function AdvisorBookPage() {
    const { dbUser } = await getAuthenticatedUser()
    const roles = parseRoles(dbUser.roles)
    // Advisor surface. A policyholder reaching it would see other households.
    if (!roles.includes("agent") && !roles.includes("admin")) redirect("/dashboard")

    const language = resolveUserLanguage(dbUser.preferredLanguage)
    const book = await getAdvisorBook(dbUser.id)

    return (
        <div className="pw-page-shell">
            {/* Same shell rhythm as every Direction A page — the same top
                offset and gutter as /tasks and /renewals, so the book lines up
                with its neighbours. */}
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <AdvisorBookView
                    language={language}
                    overview={book.overview}
                    households={book.households.map((h) => ({
                        userId: h.userId,
                        name: h.name,
                        impact: h.impact.impact,
                        factors: h.impact.factors,
                        whatChanged: h.impact.whatChanged,
                        whyItMatters: h.impact.whyItMatters,
                        nextAction: h.impact.nextAction,
                        confidence: h.impact.confidence,
                        healthIndex: h.healthIndex,
                        dependantCount: h.dependantCount,
                    }))}
                    totalCustomers={book.totalCustomers}
                    truncated={book.truncated}
                />
            </div>
        </div>
    )
}
