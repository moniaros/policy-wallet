import type { ComponentProps } from "react"

import { CoverageInsightsClient } from "@/components/coverage/CoverageInsightsClient"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { LifeEventsPanel, type LifeEventOption, type RecordedEvent } from "@/components/coverage/LifeEventsPanel"
import { RiskProfileWizard } from "@/components/coverage/RiskProfileWizard"
import { RefreshAnalysisButton } from "@/components/coverage/RefreshAnalysisButton"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { ProtectionLensTabs, type ProtectionLens } from "./ProtectionLensTabs"
import { ProtectionBranchLens, type BranchLensLabels } from "./ProtectionBranchLens"
import { ProtectionRiskLens } from "./ProtectionRiskLens"
import type { BranchPolicyFacts } from "@/lib/insurance/branch-page"

type CoverageInsightsClientProps = ComponentProps<typeof CoverageInsightsClient>
type RecommendationCardsProps = ComponentProps<typeof RecommendationCards>
type RiskProfileWizardProps = ComponentProps<typeof RiskProfileWizard>
type ProtectionRiskLensProps = ComponentProps<typeof ProtectionRiskLens>

export interface ProtectionSurfaceProps {
    language: "en" | "el"
    lens: ProtectionLens
    labels: {
        title: string
        subtitle: string
        lens: { aria: string; byBranch: string; byRisk: string }
        refresh: { refresh: string; refreshing: string; failed: string }
        /** «Πλήρες προφίλ» — the wizard's heading as the secondary path below the areas. */
        fullProfile: { title: string; lead: string }
    }
    /** «Ανά κλάδο» lens data — required when lens === "branch". */
    branchLens: {
        policies: BranchPolicyFacts[]
        expectedLines: string[]
        labels: BranchLensLabels
    } | null
    /** «Ανά κίνδυνο» lens data — required when lens === "risk". */
    riskLens: {
        intelligence: ProtectionRiskLensProps["intelligence"]
        attention: ProtectionRiskLensProps["attention"]
        quickStart: ProtectionRiskLensProps["quickStart"]
    } | null
    /**
     * The gap-engine snapshot's surviving surface (ledger A-05…A-09). Null when
     * the snapshot failed — the lenses still render; the engine-derived
     * sections are absent rather than pretending (same guard as the source
     * surface: no snapshot, no recommendations, no wizard, no upgrade pitch).
     */
    engine: {
        recommendations: RecommendationCardsProps["recommendations"]
        smartContent: RecommendationCardsProps["smartContent"]
        profileIncomplete: boolean
        /**
         * «There are still unknown factors» — an area's composition still
         * lists a fact the engine lacks (PERSONAL_RISK_PROFILE.md §K 2b).
         * Was profileCompleteness < 80.
         */
        showWizard: boolean
        wizardInitialData: RiskProfileWizardProps["initialData"]
        /** free tier with ≥1 recommendation — same gate as the source surface. */
        showUpgradeTrigger: boolean
    } | null
    tier: "free" | "plus" | "pro"
    hasPolicies: boolean
    lifeEvents: { options: LifeEventOption[]; recent: RecordedEvent[] }
    /**
     * A-10…A-21 — the carried findings surface: the reviewed-findings list,
     * severity tally, the «Εξαιρέθηκαν» / «Τι ελέγξαμε και είναι εντάξει»
     * honesty notices, next steps, and the four states (never-analysed, empty
     * wallet, all-good, free-tier lite). The same component mounted on
     * /coverage-insights until V2-P2-03 removed that route — this surface is
     * its only mount now. `tier`, `userLanguage` and `hasPolicies` are
     * injected from this surface's own props — one fact, one source.
     */
    findings: Omit<CoverageInsightsClientProps, "embedded" | "tier" | "userLanguage" | "hasPolicies">
}

/**
 * «Η προστασία μου» — the §4.2 consolidated surface at /protection.
 *
 * One route absorbing three: /branches (ανά κλάδο lens, B-01…B-06),
 * /insights/risk-profile (ανά κίνδυνο lens, R-01…R-08) and /coverage-insights'
 * surviving content (A-05…A-21 — the engine sections and, since V2-P2-01b,
 * the findings surface itself). Ordering follows the source surface's
 * rationale: what to DO leads (recommendations), the lens answers "what do I
 * have / what am I exposed to", and the profile-improving actions (wizard,
 * life events) follow. The protection score is gone from the product (H-001)
 * and is not reintroduced here in any form.
 *
 * Composed from data props so the whole tree renders in jsdom — the ledger
 * guard (tests/unit/protection-surface-ledger.test.tsx) renders THIS component
 * and asserts every KEEP capability on rendered output.
 */
export function ProtectionSurface({
    language,
    lens,
    labels,
    branchLens,
    riskLens,
    engine,
    tier,
    hasPolicies,
    lifeEvents,
    findings,
}: ProtectionSurfaceProps) {
    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen IS, plus the one explicit action (A-08). */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">{labels.title}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {labels.subtitle}
                        </p>
                    </div>
                    <RefreshAnalysisButton labels={labels.refresh} />
                </div>

                {/* A-05 — what to DO leads. */}
                {engine && (
                    <RecommendationCards
                        recommendations={engine.recommendations}
                        countKey="recommendation.openCount"
                        language={language}
                        profileIncomplete={engine.profileIncomplete}
                        smartContent={engine.smartContent}
                        tier={tier}
                        hasPolicies={hasPolicies}
                    />
                )}

                {/* A-10…A-21 — the reviewed findings, carried whole and in the
                    source surface's own order (right after what-to-DO). */}
                <CoverageInsightsClient
                    embedded
                    tier={tier}
                    userLanguage={language}
                    hasPolicies={hasPolicies}
                    {...findings}
                />

                {/* The lens switcher, then exactly ONE lens per request. */}
                <ProtectionLensTabs active={lens} labels={labels.lens} />

                {lens === "branch" && branchLens && (
                    <ProtectionBranchLens
                        policies={branchLens.policies}
                        expectedLines={branchLens.expectedLines}
                        language={language}
                        labels={branchLens.labels}
                    />
                )}

                {lens === "risk" && riskLens && (
                    <ProtectionRiskLens
                        language={language}
                        intelligence={riskLens.intelligence}
                        attention={riskLens.attention}
                        quickStart={riskLens.quickStart}
                        wizardHref="#risk-profile-wizard"
                    />
                )}

                {/* A-07 / PA-08 — the long form as the secondary «Πλήρες προφίλ»
                    path: below the areas, gated on unknown factors, never the
                    first thing (§7.5). */}
                {engine?.showWizard && (
                    <div id="risk-profile-wizard" className="scroll-mt-20">
                        <p className="pw-kicker">{labels.fullProfile.title}</p>
                        <p className="mt-1 mb-3 text-caption leading-relaxed text-muted-foreground">{labels.fullProfile.lead}</p>
                        <RiskProfileWizard initialData={engine.wizardInitialData} language={language} />
                    </div>
                )}

                {/* A-09 — below the value, never above it (source-surface rule). */}
                {engine?.showUpgradeTrigger && (
                    <UpgradeTriggerCard
                        featureKey="advanced_gap_detection"
                        triggerSource="protection_page"
                        returnTo="/protection"
                        dismissible
                    />
                )}

                {/* A-06 — the id anchors the dashboard's LifeEventPromptCard. */}
                <div id="life-events" className="scroll-mt-20">
                    <LifeEventsPanel
                        options={lifeEvents.options}
                        recent={lifeEvents.recent}
                        language={language}
                    />
                </div>
            </div>
        </div>
    )
}
