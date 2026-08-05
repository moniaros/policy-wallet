export const runtime = "nodejs"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getRiskIntelligence } from "@/lib/services/risk-dna/service"
import { RiskIntelligenceView } from "@/components/risk-dna/RiskIntelligenceView"
import { RiskGraphPanel } from "@/components/coverage/RiskGraphPanel"
import { QuickStart } from "@/components/onboarding/QuickStart"
import { QUICK_START_QUESTIONS, quickStartComplete } from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { db } from "@/lib/db"
import { submitQuickStart } from "./actions"

export default async function RiskProfilePage() {
    const { dbUser } = await getAuthenticatedUser()
    const language = (dbUser.preferredLanguage || "en") as "en" | "el"
    const intelligence = await getRiskIntelligence(dbUser.id)

    // Three questions before anything else, for someone we know too little
    // about to say anything true. The alternative — and what the product did —
    // is a page of empty scaffolding and a link to a twenty-two-field form,
    // which is the wrong first thirty seconds for a product whose whole claim
    // is that it understands your life rather than your paperwork.
    // Gated on the opener's OWN questions, not on the health index: three
    // answers out of twenty-four factors is about a fifth of the picture, and
    // the index refuses to report below a third — so gating on it meant the
    // banner never went away and the customer was asked the same three
    // questions every time they returned.
    const profile = await db.policyholderProfile.findUnique({ where: { userId: dbUser.id } })
    const needsQuickStart = !quickStartComplete(toLifeContext(profile))

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-6 px-4 pb-10 pt-7 sm:px-6 lg:px-8 lg:pt-10">
                {needsQuickStart && (
                    <QuickStart
                        questions={QUICK_START_QUESTIONS}
                        language={language}
                        onSubmit={submitQuickStart}
                    />
                )}

                <RiskIntelligenceView
                    language={language}
                    health={intelligence.health}
                    household={intelligence.household}
                    dimensions={intelligence.dimensions}
                    trends={intelligence.trends}
                    watch={intelligence.watch}
                    predictions={intelligence.predictions}
                    graphPanel={
                        <RiskGraphPanel
                            risks={intelligence.graph.views}
                            summary={{
                                nodeCount: intelligence.graph.summary.nodeCount,
                                assets: intelligence.graph.summary.assets,
                                obligations: intelligence.graph.summary.obligations,
                                dependants: intelligence.graph.summary.dependants,
                            }}
                            language={language}
                        />
                    }
                />
            </div>
        </div>
    )
}
