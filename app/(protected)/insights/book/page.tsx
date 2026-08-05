export const runtime = "nodejs"

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { parseRoles } from "@/lib/api-auth"
import { getAdvisorBook } from "@/lib/services/risk-dna/book"
import { AdvisorBookView } from "@/components/risk-dna/AdvisorBookView"

export default async function AdvisorBookPage() {
    const { dbUser } = await getAuthenticatedUser()
    const roles = parseRoles(dbUser.roles)
    // Advisor surface. A policyholder reaching it would see other households.
    if (!roles.includes("agent") && !roles.includes("admin")) redirect("/dashboard")

    const language = (dbUser.preferredLanguage || "en") as "en" | "el"
    const book = await getAdvisorBook(dbUser.id)

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-7 sm:px-6 lg:px-8 lg:pt-10">
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
                        howItImproves: h.impact.howItImproves,
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
