import { RiskIntelligenceView } from "@/components/risk-dna/RiskIntelligenceView"
import { RiskGraphPanel } from "@/components/coverage/RiskGraphPanel"
import { QuickStart } from "@/components/onboarding/QuickStart"
import type { QuickStartQuestion, QuickStartAnswers, FirstInsight } from "@/lib/services/onboarding/quick-start"
import type { RiskIntelligence } from "@/lib/services/risk-dna/service"

interface ProtectionRiskLensProps {
    language: "en" | "el"
    intelligence: RiskIntelligence
    /**
     * The three-question opener, for a profile we know too little about to say
     * anything true (same gate as the source surface: the opener's OWN
     * questions, never the health index). Null once answered.
     */
    quickStart: {
        questions: QuickStartQuestion[]
        onSubmit: (answers: QuickStartAnswers) => Promise<{ insight: FirstInsight | null }>
    } | null
    /**
     * Where health.nextAction sends a new customer. On /protection the wizard
     * is on the SAME page, so this stays an in-page anchor.
     */
    wizardHref: string
}

/**
 * The «ανά κίνδυνο» lens of /protection — /insights/risk-profile, absorbed
 * (§4.2, ledger rows R-01…R-08). The view and the graph panel are the source
 * surface's own components, unchanged: the completeness metric (health.index /
 * BAND_TONE) is the subject of open halt H-005 and is ported as-is — no
 * extension, no verdict added.
 */
export function ProtectionRiskLens({
    language,
    intelligence,
    quickStart,
    wizardHref,
}: ProtectionRiskLensProps) {
    return (
        <div className="space-y-6">
            {quickStart && (
                <QuickStart
                    questions={quickStart.questions}
                    language={language}
                    onSubmit={quickStart.onSubmit}
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
                wizardHref={wizardHref}
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
    )
}
