import type { ComponentProps } from "react"

import { ProtectionLensTabs, type ProtectionLens } from "./ProtectionLensTabs"
import { ProtectionRiskLens } from "./ProtectionRiskLens"
import { ProtectionNextStep } from "./ProtectionNextStep"
import { ProtectionSummary, type ProtectionSummaryCopy } from "./ProtectionSummary"
import { GapList, type GapListProps } from "./GapList"
import { CategoryList, type CategoryListCopy } from "./CategoryList"
import { LifeSection } from "./LifeSection"
import { ImproveSection, type ImproveSectionCopy } from "./ImproveSection"
import type { BranchCoverageStatus, CoverageStatusId, CoverageStatusSummary } from "@/lib/protection/coverage-status"
import type { FamilyFilterId } from "@/lib/protection/coverage-families"
import type { ProtectionNextStep as Step } from "@/lib/protection/next-step"

type ProtectionRiskLensProps = ComponentProps<typeof ProtectionRiskLens>
type LifeSectionProps = ComponentProps<typeof LifeSection>

/**
 * DESIGN CONTRACT — «Καλύψεις & κενά» (/protection), story rebuild 2026-09-07.
 *
 * MODE: Operate. Direction A inherited. STORY, top to bottom and the same on
 * a phone: the one next step → the picture at a glance (#summary) → what is
 * worth a look (#gaps) → the lens switch the owner kept: categories by family
 * (#categories) or the risks (the risk lens) → what the person can tell us
 * (#life) → how to improve (#improve). PRIMARY: exactly one `.pw-primary-button`
 * outside the life section — the next-step banner's; the life section's forms
 * (the wizard's save, the life-event record) keep their own submit, a
 * section's primary inside a form the reader opened. Every other control is a
 * door. MATERIALS:
 * pw-card, CardHead, pw-subcard, the one soft-tint accent on the banner,
 * amber only on a found gap, info blue for «not checked», no eyebrows, no
 * score. HONESTY: four status words the derivation can prove, each count over
 * a visible denominator, under review disclosed without a number, every
 * findings list dated to its run.
 */
export interface ProtectionSurfaceProps {
    language: "en" | "el"
    lens: ProtectionLens
    labels: {
        title: string
        subtitle: string
        lens: { aria: string; byBranch: string; byRisk: string }
        refresh: { refresh: string; refreshing: string; failed: string }
        fullProfile: { title: string; lead: string }
    }
    nextStep: { step: Step; title: string; body: string; cta: string }
    /** The engine snapshot failed: say so beside the header instead of dropping content silently. */
    engineUnavailable: boolean
    engineUnavailableText: string
    summary: { summary: CoverageStatusSummary; heldElsewhereLabels: string[]; copy: ProtectionSummaryCopy }
    gaps: GapListProps
    categories: { rows: BranchCoverageStatus[]; family: FamilyFilterId; status: CoverageStatusId | null; copy: CategoryListCopy }
    riskLens: {
        intelligence: ProtectionRiskLensProps["intelligence"]
        attention: ProtectionRiskLensProps["attention"]
        quickStart: ProtectionRiskLensProps["quickStart"]
    } | null
    life: { lifeEvents: LifeSectionProps["lifeEvents"]; wizard: LifeSectionProps["wizard"]; copy: { title: string; lead: string } }
    improve: { recommendationCount: number | null; showUpgradeTrigger: boolean; lastCheckedLabel: string; copy: ImproveSectionCopy }
}

export function ProtectionSurface({
    language,
    lens,
    labels,
    nextStep,
    engineUnavailable,
    engineUnavailableText,
    summary,
    gaps,
    categories,
    riskLens,
    life,
    improve,
}: ProtectionSurfaceProps) {
    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* The page opens like a story: what this is, in a sentence. No
                    control up here — the banner below carries the one primary,
                    and the refresh action moved to the foot where it belongs. */}
                <div className="min-w-0 max-w-2xl">
                    <h1 className="text-h2 font-semibold tracking-tight text-foreground">{labels.title}</h1>
                    <p className="mt-2 text-body leading-relaxed text-muted-foreground">{labels.subtitle}</p>
                </div>

                <ProtectionNextStep
                    step={nextStep.step}
                    copy={{ title: nextStep.title, body: nextStep.body, cta: nextStep.cta, refresh: labels.refresh }}
                />

                {engineUnavailable && (
                    <p role="status" className="pw-subcard px-3.5 py-3 text-sm leading-relaxed text-muted-foreground" data-engine="unavailable">
                        {engineUnavailableText}
                    </p>
                )}

                {/* LEVEL 1 — the picture. */}
                <ProtectionSummary summary={summary.summary} heldElsewhereLabels={summary.heldElsewhereLabels} copy={summary.copy} />

                {/* LEVEL 2 — is there a problem, and what it means. */}
                <GapList {...gaps} />

                {/* The lens switch (kept): ONE lens per request, so only one
                    lens's counts are ever in the DOM. */}
                <ProtectionLensTabs active={lens} labels={labels.lens} />

                {lens === "branch" && (
                    <CategoryList rows={categories.rows} family={categories.family} status={categories.status} language={language} copy={categories.copy} />
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

                {/* LEVEL 4 — what the person can tell us. */}
                <LifeSection lifeEvents={life.lifeEvents} wizard={life.wizard} language={language} copy={{ ...life.copy, fullProfile: labels.fullProfile }} />

                {/* LEVEL 5 — how to improve, and the administrative tail. */}
                <ImproveSection
                    recommendationCount={improve.recommendationCount}
                    showUpgradeTrigger={improve.showUpgradeTrigger}
                    lastCheckedLabel={improve.lastCheckedLabel}
                    language={language}
                    copy={improve.copy}
                />
            </div>
        </div>
    )
}
