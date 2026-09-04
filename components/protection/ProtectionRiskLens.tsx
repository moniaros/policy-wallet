import { RiskIntelligenceView } from "@/components/risk-dna/RiskIntelligenceView"
import { RiskGraphPanel } from "@/components/coverage/RiskGraphPanel"
import { QuickStart } from "@/components/onboarding/QuickStart"
import { AttentionAreasCard, type AttentionAreasCardProps } from "@/components/protection/AttentionAreasCard"
import { UnknownFactorsCard } from "@/components/protection/UnknownFactorsCard"
import type { UnknownFactorItemView } from "@/components/protection/area-detail-model"
import type { QuickStartQuestion, QuickStartAnswers, FirstInsight } from "@/lib/services/onboarding/quick-start"
import type { RiskIntelligence } from "@/lib/services/risk-dna/service"

/**
 * The attention areas (docs/planning/PERSONAL_RISK_PROFILE.md §D) as the
 * page composed them from the read seam: the rows, the counts of words, and
 * the factors the engine still needs — plus the dictionary slice they speak.
 */
export interface AttentionLensData {
    items: AttentionAreasCardProps["items"]
    summary: AttentionAreasCardProps["summary"]
    unknownFactors: UnknownFactorItemView[]
    copy: AttentionAreasCardProps["copy"]
}

interface ProtectionRiskLensProps {
    language: "en" | "el"
    intelligence: RiskIntelligence
    /** The areas of attention and «Τι χρειάζεται ακόμη να καταλάβουμε». */
    attention: AttentionLensData
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
    attention,
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

            {/* The areas of attention, then what the engine still needs from
                the person — each noun a link into the area that asks it. */}
            <AttentionAreasCard items={attention.items} summary={attention.summary} copy={attention.copy} />
            <UnknownFactorsCard items={attention.unknownFactors} copy={attention.copy.needs} />

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
                    // `key`: this element is created HERE, in a server component,
                    // and rendered by the client view among its siblings. Flight
                    // hands the client a frozen element that jsx cannot mark as
                    // validated, so React 19 warned «a child from
                    // ProtectionRiskLens» has no key on every render of the risk
                    // lens. A key says the placement is deliberate.
                    <RiskGraphPanel
                        key="risk-graph"
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
