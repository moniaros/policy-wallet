"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"
import { DeletePolicyDialog } from "@/components/wallet/DeletePolicy"
import { MergeRequestBanner } from "@/components/wallet/MergeRequestBanner"
import { PolicyHeaderMenu } from "@/components/wallet/policy-detail/PolicyHeaderMenu"
import { AnalysisCard } from "@/app/(protected)/wallet/[id]/AnalysisCard"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { CoverageTabView } from "@/components/wallet/coverage-details/CoverageTabView"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { PolicySection } from "@/components/wallet/policy-detail/PolicySection"
import { PolicyHead } from "@/components/wallet/policy-detail/PolicyHead"
import { SummaryCard } from "@/components/wallet/policy-detail/SummaryCard"
import { RenewalOutlookCard } from "@/components/wallet/policy-detail/RenewalOutlookCard"
import { KeyDatesCard } from "@/components/wallet/policy-detail/KeyDatesCard"
import { ExclusionsCard } from "@/components/wallet/policy-detail/ExclusionsCard"
import { PerksCard } from "@/components/wallet/policy-detail/PerksCard"
import { ClaimsGuidanceCard } from "@/components/wallet/policy-detail/ClaimsGuidanceCard"
import { BranchGuideCard } from "@/components/wallet/policy-detail/BranchGuideCard"
import { BranchActionsCard, type BranchActionItem } from "@/components/wallet/policy-detail/BranchActionsCard"
import { PolicyQaPrefillProvider } from "@/components/wallet/policy-detail/PolicyQaPrefillContext"
import { DocumentsCard } from "@/components/wallet/policy-detail/DocumentsCard"
import { InsuredPeopleCard } from "@/components/wallet/policy-detail/InsuredPeopleCard"
import { getBranchContent } from "@/lib/insurance/content"
import { resolveBranchAction } from "@/lib/insurance/content/action-resolvers"
import { getSelfTaskSpec } from "@/lib/insurance/content/self-tasks"
import {
    calculatePolicyHealthScore,
    deriveClaimDeadlines,
    derivePolicyMeta,
    extractPolicySections,
    hasAutoRenewal,
    normalizeRenewalHistory,
    parsePolicyDate,
    resolveCoverageAbsenceCopy,
    type PolicyRenewalEntry,
} from "@/lib/wallet/policy-detail"
import { AlertTriangle, CalendarDays, ClipboardList, Crown, FileDown, FileWarning, FolderOpen, LifeBuoy, Lock, RefreshCw, Share2, ShieldCheck, Trash2, Users } from "lucide-react"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { PremiumInsightCards } from "@/components/monetization/PremiumInsightCards"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import {
    displayPolicyNumber as safePolicyNumber,
    isPlaceholderInsurerName,
    isPlaceholderPolicyNumber,
} from "@/lib/wallet/policy-identity"
import { FREE_GAP_PREVIEW_COUNT, type GapReportItem } from "@/lib/wallet/gap-report"
import { derivePolicyBriefCoverage } from "@/lib/wallet/policy-brief"
import { resolveStoredSummary } from "@/lib/wallet/summary-language"
import { branchFamilyId } from "@/lib/insurance/taxonomy"
import { resolveAttention, resolvePrimaryAction } from "@/lib/wallet/policy-attention"
import { deriveRenewalChecklist, upcomingReminderMilestones } from "@/lib/wallet/renewal-outlook"
import { complianceObligations } from "@/lib/insurance/policy-conditions"

import type { GlossaryHintData } from "@/components/insurance/GlossaryHint"
import type { PolicyGlossaryHints } from "@/lib/glossary/hints"
import { coverageSectionKeys } from "@/lib/wallet/coverage-sections"
import { resolveClaimsContact } from "@/lib/wallet/claims-contact"
import { deriveInsuredNames } from "@/lib/wallet/insured-people"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
// Trigger J: savings-report export (Pro). Bilingual copy kept as a pair map
// so the changed-file i18n lint stays clean.
const EXPORT_COPY = {
    title: { el: "Αναφορά εξοικονόμησης", en: "Savings report" },
    subtitle: {
        el: "Κατεβάστε μια καθαρή σύνοψη καλύψεων, κενών και πιθανής εξοικονόμησης για αυτό το ασφαλιστήριο.",
        en: "Download a clean summary of coverages, gaps and potential savings for this policy.",
    },
    exportCta: { el: "Εξαγωγή αναφοράς", en: "Export report" },
    unlockCta: { el: "Ξεκλείδωμα εξαγωγής αναφοράς", en: "Unlock report export" },
} as const

function pickCopy(pair: { el: string; en: string }, lang: "el" | "en") {
    return pair[lang]
}

interface PolicyDetailsClientProps {
    policy: any
    /** Inline "Εξαίρεση" definition, resolved on the server so the glossary
        module never reaches the client bundle. */
    exclusionHint?: GlossaryHintData | null
    /** Resolved server-side; see resolvePolicyGlossaryHints. */
    glossaryHints?: PolicyGlossaryHints | null
    serializedShares: any[]
    aiUsageStats: {
        count: number
        limit: number | null
        remaining?: number | null
        creditBalance?: number
    }
    statusLabel: string
    statusColor: any
    statusColorOnDark: any
    /**
     * Days to expiry on the ATHENS CALENDAR, from the server's
     * resolvePolicyLifecycle — the same call that produced `statusLabel`.
     * `null` when no trustworthy end date exists (no fabricated countdown).
     */
    daysLeft: number | null
    /**
     * The resolved end date (renewal history → extracted envelope → column) as
     * ISO, from that same call. Rendering this instead of re-resolving it is
     * what keeps the expiry date, the status chip and the day count from
     * disagreeing — see the B4 note in lib/policy-status.ts.
     */
    resolvedEndDate?: string | null
    isOwner: boolean
    relationshipId?: string | null
    t: any
    tier?: 'free' | 'plus' | 'pro'
    tierLimits?: {
        interactiveQA: boolean
        advancedAnalytics: boolean
        agentCollaboration: boolean
        analysisComparison: boolean
        notifications: boolean
        [key: string]: any
    }
    relatedRecommendations?: any[]
    renewals?: PolicyRenewalEntry[]
    /** Free-tier owners: is the complimentary deep analysis still unused? (null = n/a) */
    trialAnalysisAvailable?: boolean | null
    /** Free-tier owners: complimentary lifetime AI questions left (null = n/a). */
    freeQuestionsRemaining?: number | null
    gapReportItems?: GapReportItem[]
    reportUnlocked?: boolean
    /** Pending "same policy uploaded twice" merge awaiting this viewer's consent. */
    mergeRequest?: { id: string; requestedByLabel: string; policyLabel: string } | null
    /** Agent-only: viewer may open the extraction review for this policy. */
    canReviewExtraction?: boolean
    /** Same-subject duplicate found by the engine's own rule (owner only). */
    overlapFinding?: { partnerLabel: string } | null
    /** True when this policy has a checkable insured subject (plate/address). */
    overlapChecked?: boolean
}

export function PolicyDetailsClient({
    policy,
    serializedShares,
    aiUsageStats,
    statusLabel,
    statusColor,
    statusColorOnDark,
    daysLeft,
    resolvedEndDate = null,
    isOwner,
    relationshipId,
    t,
    tier = 'free',
    tierLimits,
    relatedRecommendations = [],
    renewals = [],
    trialAnalysisAvailable = null,
    freeQuestionsRemaining = null,
    gapReportItems = [],
    reportUnlocked = true,
    mergeRequest = null,
    canReviewExtraction = false,
    overlapFinding = null,
    overlapChecked = false,
    exclusionHint = null,
    glossaryHints = null,
}: PolicyDetailsClientProps) {
    const locale = t.common?.locale || "en-GB"
    const lang: "el" | "en" = locale.startsWith("el") ? "el" : "en"
    const detailsCopy = t.wallet.policyDetailsPage

    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [exportUpgradeOpen, setExportUpgradeOpen] = useState(false)
    const [isRequestingQuote, setIsRequestingQuote] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    /**
     * The persistent AI affordance is a disclosure, not a permanent panel.
     *
     * It starts OPEN when the reader arrived from a branch page's suggested
     * question (`/wallet/<id>?q=…#policy-qa`) — PolicyQA prefills from that
     * param, and prefilling a panel nobody can see would strand the deep link
     * on a closed row.
     */
    const [askAiOpen, setAskAiOpen] = useState(false)
    /** Section forced open by the head's one action (see handlePrimaryAction). */
    const [forcedOpen, setForcedOpen] = useState<string | null>(null)

    useEffect(() => {
        if (searchParams?.get("q")) setAskAiOpen(true)
    }, [searchParams])

    const handleRequestQuote = async () => {
        if (isRequestingQuote) return
        setIsRequestingQuote(true)
        try {
            const { requestRenewalQuote } = await import("@/app/(protected)/wallet/actions")
            const result = await requestRenewalQuote(policy.id)
            if (result.error) {
                toast.error(detailsCopy.quoteRequestFailed)
            } else {
                toast.success(result.agentNotified ? detailsCopy.quoteRequestedAgent : detailsCopy.quoteRequested)
            }
        } catch {
            toast.error(detailsCopy.quoteRequestFailed)
        } finally {
            setIsRequestingQuote(false)
        }
    }

    const canUseCollaboration = tierLimits?.agentCollaboration !== false
    const canShowCollaborationPanel = (isOwner || (serializedShares?.length ?? 0) > 0) && canUseCollaboration
    const isFreeTier = tier === 'free'
    const canShowCollaborationTimeline = Boolean(relationshipId) && canUseCollaboration && !isFreeTier

    // Raw extracted value — pending-placeholder checks run against THIS;
    // display goes through the insurer registry (canonical Greek-market name).
    const getInsurerName = () => policy.acordData?.policy?.insurerName || policy.insurerName
    const getPolicyNumber = () => policy.acordData?.policy?.policyNumber || policy.policyNumber
    const getCoverageType = () => policy.acordData?.policy?.lineOfBusiness || policy.lineOfBusiness
    const getPremiumAmount = () => {
        const extractedPremium = policy.acordData?.policy?.premium?.amount
        if (extractedPremium) return Number(extractedPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }
    const getPremiumCurrency = () => policy.acordData?.policy?.premium?.currency || policy.premiumCurrency || "EUR"

    // Newest-first past policy periods recorded by re-uploads; the latest
    // renewal's end date supersedes the originally extracted expiration.
    const renewalHistory = useMemo(() => normalizeRenewalHistory(policy?.acordData), [policy])
    const latestRenewalEnd = parsePolicyDate(renewalHistory[0]?.endDate)
    const { renewalDate, premiumFrequency } = derivePolicyMeta(policy?.acordData)

    const getStartDate = () => policy.acordData?.policy?.effectiveDate || policy.startDate
    /**
     * ONE end date for the whole page.
     *
     * `resolvedEndDate` is the server's `resolvePolicyLifecycle` output — the
     * same call that produced `statusLabel` and `daysLeft`, applying the same
     * resolution order (renewal history → extracted envelope → endDate column).
     * The local fallback exists only for a caller that has not been updated to
     * pass it; it reproduces that order rather than inventing another one.
     */
    const getEndDate = () => {
        if (resolvedEndDate) return resolvedEndDate
        if (latestRenewalEnd) return latestRenewalEnd.toISOString()
        return policy.acordData?.policy?.expirationDate || policy.endDate
    }

    /**
     * The day count is the SERVER's, not a re-computation.
     *
     * This used to be `Math.floor((end - Date.now()) / 86_400_000)` — raw UTC
     * millisecond arithmetic, the exact pattern lib/policy-status.ts documents
     * as the recurring defect. The status chip beside it comes from
     * `calendarDaysUntil`, which counts ATHENS CALENDAR days, so between Athens
     * midnight and ~03:00 the two disagreed by one: «Ληγμένο» over a countdown
     * still showing a day left, or «Ενεργό» beside «λήγει σε 0 ημέρες». Three
     * numbers that disagree destroy trust in every other number on the page.
     *
     * Status, expiry and countdown now all derive from one call.
     */
    const computedDaysLeft: number | null = daysLeft ?? null
    const isExpiredPolicy = computedDaysLeft !== null && computedDaysLeft < 0

    // The stored summary, gated on language. `resolveStoredSummary` reads the
    // tag the extraction wrote (acordData.extraction.summaryLanguage) and falls
    // back to script inspection for rows written before the tag existed — which
    // is every row in the book today. See lib/wallet/summary-language.ts.
    const storedSummary = useMemo(
        () => resolveStoredSummary({
            summary: policy.coverageSummary,
            acordData: policy.acordData,
            viewLanguage: lang,
        }),
        [policy.coverageSummary, policy.acordData, lang]
    )

    const insuredNames = useMemo(() => deriveInsuredNames(policy?.acordData), [policy])

    // `acordData.policy.insurerContact` was in no schema — always undefined, so
    // this button never rendered and the claims card always said "no number
    // found" while the extracted line sat unused in the same envelope.
    const claimsContact = resolveClaimsContact(policy.acordData, getCoverageType())
    const insurerPhone = claimsContact?.phone || ""
    const claimsPhoneLabel =
        claimsContact?.kind === "accident_declaration" ? t.coverageDetails.motor.accidentDeclaration
            : claimsContact?.kind === "roadside" ? t.coverageDetails.motor.roadsideAssistance
                : claimsContact?.kind === "technical_assistance" ? t.coverageDetails.home.technicalAssistance
                    : claimsContact?.kind === "coordination_centre" ? t.coverageDetails.health.coordinationCentre
                        : detailsCopy.contactInsurer
    // The AUTHORIZED endpoint, not the stored object URL.
    //
    // This used to be `policy.documents[0].fileUrl` — a getPublicUrl() link into
    // the PRIVATE 'policies' bucket. Opening it directly returns 400 from
    // storage, so the primary "open my policy document" action on this page
    // could never have worked, and it put a raw storage URL in the markup on the
    // way to failing. The documents card below has always used this endpoint;
    // this button simply did not.
    const firstDocumentId = policy.documents?.[0]?.id
    const firstDocumentHref = firstDocumentId
        ? `/api/v1/policies/${policy.id}/documents/${firstDocumentId}`
        : null

    // ── Extracted section data (perks / exclusions / conditions / fine print) ──
    const { exclusions, notableConditions, finePrintClauses: finePrint, perks } = useMemo(
        () => extractPolicySections(policy?.acordData),
        [policy]
    )
    const claimDeadlines = deriveClaimDeadlines(notableConditions)
    const autoRenewal = hasAutoRenewal(notableConditions)
    const coverageCount = Array.isArray(policy.acordData?.coverages) ? policy.acordData.coverages.length : 0
    const conditionsCount = notableConditions.length + finePrint.length

    // Deduped count — must agree with the summary band and the tab badge.
    /** The newest run — its status decides whether any score may be shown. */
    const lastRun = policy.analysisRuns?.[0]

    const health = calculatePolicyHealthScore({
        // A score is a subtraction from 100, so "no findings because the run
        // failed" and "no findings because the policy is sound" produce the
        // same number. Only one of them is a fact. See A1 in
        // docs/evidence/policy-detail-mobile/.
        analysisComplete:
            Boolean(policy.lastAnalyzedAt) &&
            !policy.acordData?.processingError &&
            lastRun?.status !== "failed",
        gapCount: gapReportItems.length,
        // Not the raw exclusion count — see calculatePolicyHealthScore. Only the
        // clauses the analysis itself flagged as able to cost the holder.
        criticalClauseCount: finePrint.filter((c) => c.riskLevel === "critical").length,
        warningClauseCount: finePrint.filter((c) => c.riskLevel === "warning").length,
        verified: Boolean(policy.verified),
    })

    const hasCoverageDetails = (() => {
        const sectionKeys = coverageSectionKeys(getCoverageType())
        const hasTypeData = Boolean(
            sectionKeys?.some((key) => policy.acordData?.[key] && Object.keys(policy.acordData[key]).length > 0)
        )
        const hasCoverageOrExclusion = (policy.acordData?.coverages?.length > 0) || (policy.acordData?.exclusions?.length > 0)
        return hasTypeData || hasCoverageOrExclusion
    })()

    const shouldShowReanalyzeHint = (() => {
        return coverageSectionKeys(getCoverageType()) !== null && !hasCoverageDetails
    })()

    /**
     * Why there are no coverage details. All three used to render "re-analyse",
     * which is right for one of them, hides a problem in the second, and in the
     * third tells the reader to spend metered analysis on a run that will
     * produce the same nothing.
     */
    // `completed_with_warnings` used to collapse into "empty" — the state whose
    // copy tells the reader "re-analysing the same file will most likely give the
    // same result". True for a CLEAN run that found nothing: the document simply
    // has no structured coverage. False for a degraded one, where steps failed
    // and sections are missing, and where retrying is precisely the right move
    // because the cause is often transient. The AnalysisCard on this same route
    // already knew the run was degraded and listed the missing sections, so the
    // two halves of one page disagreed about whether retrying was worth it.
    // A "blocked" run is GATED, not failed — the deep AI analysis is a Plus
    // feature, or the owner has not granted AI-processing consent. Lumping it into
    // "failed" told the reader the analysis broke and to re-analyse or upload a
    // clearer copy: all three wrong (it did not fail, retrying reproduces the
    // block, the document is fine). It gets its own state, pointing at the real
    // resolution — upgrade or consent — read from the run's blockedReason.
    const absenceCopy = resolveCoverageAbsenceCopy(lastRun?.status, lastRun?.blockedReason, detailsCopy)

    // ── AI Policy Brief: seven one-liners, every count with its evidence
    //    boundary in the string. Coverage-status arithmetic is pure
    //    (derivePolicyBriefCoverage); the honesty branching lives here where
    //    absenceCopy and the analysis state are in hand.
    const briefCoverage = useMemo(() => derivePolicyBriefCoverage(policy?.acordData), [policy])
    const analyzed = Boolean(policy.lastAnalyzedAt)
    const flaggedClauseCount = finePrint.filter(
        (c) => c.riskLevel === "critical" || c.riskLevel === "warning"
    ).length

    // ── Renewal outlook: recorded facts only, shared derivation with the
    //    dashboard's "points to check" chips.
    const renewalObligations = complianceObligations(policy.acordData?.conditions).filter(
        (o) => o.severity === "critical" || o.severity === "high"
    )
    const renewalChecklist = deriveRenewalChecklist({
        openGapCount: gapReportItems.length,
        deadlineConditionCount: claimDeadlines.length,
        obligationCount: renewalObligations.length,
        hasAutoRenewal: autoRenewal,
        lastAnalyzedAt: policy.lastAnalyzedAt ?? null,
        documentCount: policy.documents?.length ?? 0,
    })
    const renewalChecklistLabels = renewalChecklist.map((item) => {
        switch (item.kind) {
            case "gaps":
                return item.count === 1
                    ? detailsCopy.renewalOutlookCheckGapsOne
                    : detailsCopy.renewalOutlookCheckGaps.replace("{count}", String(item.count))
            case "deadline":
                return item.count === 1
                    ? detailsCopy.renewalOutlookCheckDeadlineOne
                    : detailsCopy.renewalOutlookCheckDeadline.replace("{count}", String(item.count))
            case "obligation":
                return item.count === 1
                    ? detailsCopy.renewalOutlookCheckObligationOne
                    : detailsCopy.renewalOutlookCheckObligation.replace("{count}", String(item.count))
            case "auto_renewal":
                return detailsCopy.renewalOutlookCheckAutoRenewal
            case "not_analyzed":
                return detailsCopy.renewalOutlookCheckNotAnalyzed
            case "no_document":
                return detailsCopy.renewalOutlookCheckNoDocument
        }
    })
    const renewalHeadline =
        computedDaysLeft === null
            ? detailsCopy.renewalOutlookNoEndDate
            : computedDaysLeft < 0
                ? detailsCopy.renewalOutlookExpired
                : computedDaysLeft === 0
                    ? detailsCopy.renewalOutlookToday
                    : computedDaysLeft === 1
                        ? detailsCopy.renewalOutlookTomorrow
                        : detailsCopy.renewalOutlookInDays.replace("{days}", String(computedDaysLeft))
    const renewalHeadlineTone: "critical" | "warning" | "neutral" =
        computedDaysLeft === null
            ? "neutral"
            : computedDaysLeft < 0
                ? "critical"
                : computedDaysLeft <= 30
                    ? "warning"
                    : "neutral"
    const sentMilestones = (renewals[0]?.remindersSent ?? []).map((m) => m.milestone)
    const upcomingMilestones = upcomingReminderMilestones(
        computedDaysLeft,
        sentMilestones,
        tierLimits?.notifications === true
    )
    const renewalReminderLine =
        upcomingMilestones.length > 0
            ? detailsCopy.renewalOutlookReminders.replace("{days}", upcomingMilestones.join(", "))
            : null
    const renewalPastPeriodsLine =
        renewalHistory.length === 0
            ? null
            : renewalHistory.length === 1
                ? detailsCopy.renewalOutlookPastPeriodsOne
                : detailsCopy.renewalOutlookPastPeriods.replace("{count}", String(renewalHistory.length))

    // Mirrors `showRecommendations` below — the brief row can only anchor to a
    // section that will actually render.
    const showRecommendationsForBrief = isOwner && relatedRecommendations.length > 0

    // The seven-row brief is gone. Its rows restated facts the sections own
    // (coverage counts, the countdown, the gap count) and were the single
    // largest source of duplicate facts on the page. The one thing only it
    // said — what matters most right now — is the head's attention line.

    const gapsForAnalysis = (policy.gapInstances || []).map((gap: any) => ({
        id: gap.id,
        aiExplanation: gap.aiExplanation || null,
        aiExplanationEl: gap.aiExplanationEl || null,
        aiSuggestion: gap.aiSuggestion || null,
        aiSuggestionEl: gap.aiSuggestionEl || null,
        definition: {
            title: gap.definition?.title || t.analysis.unknownGap,
            severity: gap.definition?.severity || "medium",
        },
    }))

    const handleShare = async () => {
        const shareUrl = window.location.href
        // The sanitized values (`displayInsurer`, `displayPolicyNumber`) are
        // computed below; this handler runs on click, after render, so the
        // consts are initialized. The raw getters can return an extraction
        // sentinel ("__PENDING_EXTRACTION__", "PENDING-…"), and the share
        // sheet is customer-visible output like any other.
        const shareData = {
            title: displayInsurer,
            text: displayPolicyNumber ? `${t.wallet.policyNumber}: ${displayPolicyNumber}` : displayInsurer,
            url: shareUrl,
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
                return
            } catch {
                toast.message(detailsCopy.shareCanceled)
                return
            }
        }

        if (!navigator.clipboard) {
            toast.error(detailsCopy.shareUnavailable)
            return
        }

        try {
            await navigator.clipboard.writeText(shareUrl)
            toast.success(detailsCopy.linkCopied)
        } catch {
            toast.error(detailsCopy.copyFailed)
        }
    }

    const handleCallInsurer = () => {
        if (!insurerPhone) {
            toast.error(detailsCopy.noInsurerPhone)
            return
        }
        window.location.href = `tel:${insurerPhone}`
    }

    const handleDownloadPrimaryDoc = () => {
        if (!firstDocumentHref) {
            toast.error(t.wallet.noDocuments)
            return
        }
        window.open(firstDocumentHref, "_blank", "noopener,noreferrer")
    }

    const coverageType = getCoverageType()
    const localizedType = t.policyTypes[coverageType as keyof typeof t.policyTypes] || coverageType
    const policyNumber = getPolicyNumber()

    // Detect placeholder data that should not be shown to the user
    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = isPlaceholderInsurerName(getInsurerName())
    const isPendingPolicyNumber = isPlaceholderPolicyNumber(policyNumber)
    const insurerDisplay = resolveInsurerDisplay(getInsurerName())
    const displayInsurer = insurerDisplay.displayName || localizedType
    const displayPolicyNumber = safePolicyNumber(policyNumber)

    const showRecommendations = isOwner && relatedRecommendations.length > 0
    const showAgentSection = Boolean(relationshipId)

    // ── Per-branch editorial content (lib/insurance/content) ──────────────
    // Resolved once per line of business; child branches fall back to their
    // parent's bundle and unknown lines to a generic one, so this is always
    // defined. Strings are picked to one language here — the cards are
    // presentational and carry no copy of their own.
    const branchContent = useMemo(() => getBranchContent(coverageType), [coverageType])

    /**
     * Rule ids the gap engine actually flagged for this user, used to badge the
     * editorial commonGaps. Two sources, because the policy page (unlike the
     * branch page, which only has recommendations) carries both:
     *  - relatedRecommendations[].ruleId — same field as the branch page
     *  - gapInstances[].definition.ruleId / .slug — GapDefinition carries both,
     *    and editorial relatedRuleIds reference engine rule ids AND seeded slugs.
     */
    const detectedRuleIds = useMemo(() => {
        const ids = new Set<string>()
        for (const rec of relatedRecommendations) {
            const ruleId = (rec as any)?.ruleId
            if (typeof ruleId === "string" && ruleId) ids.add(ruleId)
        }
        for (const gap of policy.gapInstances || []) {
            const definition = gap?.definition
            if (typeof definition?.ruleId === "string" && definition.ruleId) ids.add(definition.ruleId)
            if (typeof definition?.slug === "string" && definition.slug) ids.add(definition.slug)
        }
        return ids
    }, [relatedRecommendations, policy])

    const branchGuideGaps = useMemo(
        () =>
            branchContent.commonGaps.map((gap) => ({
                id: gap.id,
                title: gap.title[lang],
                description: gap.description[lang],
                detected: Boolean(gap.relatedRuleId && detectedRuleIds.has(gap.relatedRuleId)),
            })),
        [branchContent, detectedRuleIds, lang]
    )

    // Per-branch recommended actions, data-backed where acordData already holds
    // the answer. resolveBranchAction asserts positives only (the honesty law
    // in lib/insurance/content/action-resolvers.ts) — anything unknown stays an
    // ask-the-AI CTA rather than claiming an absence we cannot observe.
    const branchActionItems: BranchActionItem[] = useMemo(
        () =>
            branchContent.recommendedActions
                .map((action): BranchActionItem | null => {
                    const resolved = resolveBranchAction(action, policy.acordData)
                    // `requiresPhone` actions (the "save the emergency line"
                    // task) are dropped when this policy yielded no number —
                    // saving a reminder that dials nothing is worse than not
                    // offering it, and we may not invent one (the D7 honesty
                    // law in action-resolvers.ts).
                    if (action.requiresPhone && !resolved.phone) return null
                    return {
                        id: action.id,
                        label: action.label[lang],
                        ctaType: action.ctaType,
                        href: action.href,
                        question: action.question?.[lang],
                        resolved: {
                            status: resolved.status,
                            value: resolved.value?.[lang],
                            phone: resolved.phone,
                        },
                    }
                })
                .filter((item): item is BranchActionItem => item !== null),
        [branchContent, policy.acordData, lang]
    )

    // Agent-thread + self-task handlers for the branch action card.
    const [pendingActionId, setPendingActionId] = useState<string | null>(null)
    const [branchAgentUpgradeOpen, setBranchAgentUpgradeOpen] = useState(false)

    const handleAskAgentAction = async (item: BranchActionItem) => {
        if (pendingActionId) return
        // Free tier: the button rendered with a lock chip, so the click is a
        // conversion moment rather than a failure. Never call the server.
        if (!canUseCollaboration) {
            setBranchAgentUpgradeOpen(true)
            return
        }
        setPendingActionId(item.id)
        try {
            const { startBranchActionThread } = await import("@/app/(protected)/wallet/collaborationActions")
            const result = await startBranchActionThread(policy.id, item.id)
            if ("error" in result) {
                if (result.error === "UPGRADE_REQUIRED") setBranchAgentUpgradeOpen(true)
                else if (result.error === "NO_AGENT") toast.error(detailsCopy.actionsNoAgent)
                else toast.error(detailsCopy.actionsAgentFailed)
                return
            }
            toast.success(detailsCopy.actionsAgentSent)
        } catch {
            toast.error(detailsCopy.actionsAgentFailed)
        } finally {
            setPendingActionId(null)
        }
    }

    const handleCreateTaskAction = async (item: BranchActionItem) => {
        if (pendingActionId) return
        const spec = getSelfTaskSpec(item.id)
        if (!spec) return
        const actionUrl =
            spec.target === "phone"
                ? item.resolved.phone
                    ? `tel:${item.resolved.phone.replace(/\s+/g, "")}`
                    : null
                : `/wallet/${policy.id}`
        if (!actionUrl) return
        setPendingActionId(item.id)
        try {
            const { createSelfTask } = await import("@/app/(protected)/tasks/taskActions")
            const result = await createSelfTask({
                title: spec.title[lang],
                description: spec.description[lang],
                type: spec.type,
                priority: spec.priority,
                actionUrl,
                actionLabel: spec.actionLabel[lang],
            })
            if (!result.success) {
                toast.error(detailsCopy.actionsTaskFailed)
                return
            }
            toast.success(detailsCopy.actionsTaskSaved)
        } catch {
            toast.error(detailsCopy.actionsTaskFailed)
        } finally {
            setPendingActionId(null)
        }
    }

    // ── Section navigation (only sections that actually render) ──
    // ── GOAL 2: the head's two decisions, and the sections' open state ──
    //
    // Both are PURE (lib/wallet/policy-attention.ts) and both are decided ONCE.
    // The page used to render every state simultaneously — expired banner,
    // renewal outlook, failed-run banner, gap count, unverified note, three
    // quote CTAs — and leave the reader to rank them.
    const attention = resolveAttention({
        daysLeft: computedDaysLeft,
        analysisFailed: Boolean(policy.acordData?.processingError) || lastRun?.status === "failed",
        reviewItemCount: gapReportItems.length,
        unverified: policy.reviewState === "unconfirmed" || policy.reviewState === "flagged",
        unknownDuration: computedDaysLeft === null,
    })
    const primaryAction = resolvePrimaryAction({ attention, hasDocument: Boolean(firstDocumentHref) })

    // The section the head points at opens itself, so the one action in the
    // head lands on content rather than on another closed row.
    // The head's action opens its target; before any action, the section the
    // attention line names is the one already open, so the page arrives showing
    // what it just said matters.
    const openSection = forcedOpen ?? attention.target

    // "What is insured?" — the object for motor, the person otherwise.
    const insuredSubject = branchFamilyId(coverageType) === "motor"
        ? { label: detailsCopy.headInsuredVehicle, value: policy.acordData?.vehicle?.plateNumber ?? null }
        : { label: detailsCopy.headInsuredPerson, value: insuredNames[0] ?? null }

    const handlePrimaryAction = (action: typeof primaryAction) => {
        if (action.kind === "download") return handleDownloadPrimaryDoc()
        if (action.kind === "share") return handleShare()
        if (action.kind === "renew" && isOwner) return handleRequestQuote()
        // review / retry_analysis are navigational: open the section they name.
        const target = action.target
        if (target) {
            setForcedOpen(target)
            document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }


    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6 lg:max-w-5xl lg:px-8">
                <nav className="mb-4 flex items-center gap-2 text-sm">
                    <Link
                        href="/wallet"
                        // `pw-inline-action`: the design system's marker for a text
                        // link with no chrome. It is also what the mobile tap-target
                        // guard reads to apply the WCAG inline exception — a
                        // breadcrumb padded to 44px would push the crumbs apart.
                        className="pw-inline-action font-semibold text-primary transition-colors hover:text-primary-hover dark:text-mint dark:hover:text-mint/80"
                    >
                        {t.wallet.title}
                    </Link>
                    <span className="text-black/35 dark:text-white/60">/</span>
                    <span className="font-semibold text-black dark:text-white">{displayPolicyNumber || localizedType}</span>
                </nav>

                {/* Extraction review banner — agent-only verification step. The
                    policyholder's equivalent is no longer a banner: "these details
                    were read automatically" is one of the states the head's
                    attention line reports, so it competes with nothing. */}
                {canReviewExtraction && (policy.reviewState === 'unconfirmed' || policy.reviewState === 'flagged') && (
                    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#92400E] dark:text-amber-400" />
                        <p className="min-w-0 flex-1 text-sm font-medium text-[#92400E] dark:text-amber-400">
                            {t.wallet.review.agentBannerCta}
                        </p>
                        <Link
                            href={`/wallet/${policy.id}/review?returnTo=${encodeURIComponent(`/wallet/${policy.id}`)}`}
                            className="flex-shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                        >
                            {t.wallet.review.reviewNow}
                        </Link>
                    </div>
                )}

                {mergeRequest && (
                    <MergeRequestBanner
                        requestId={mergeRequest.id}
                        requestedByLabel={mergeRequest.requestedByLabel}
                        policyLabel={mergeRequest.policyLabel}
                        copy={{
                            title: detailsCopy.mergeRequestTitle,
                            body: detailsCopy.mergeRequestBody,
                            approve: detailsCopy.mergeApprove,
                            reject: detailsCopy.mergeReject,
                            approved: detailsCopy.mergeApproved,
                            rejected: detailsCopy.mergeRejected,
                            failed: detailsCopy.mergeFailed,
                        }}
                    />
                )}

                <PolicyQaPrefillProvider>
                {/* ── HEAD — the four questions, each answered once ───────── */}
                <PolicyHead
                    displayInsurer={displayInsurer}
                    localizedType={localizedType}
                    displayPolicyNumber={displayPolicyNumber}
                    insuredSubject={insuredSubject}
                    endDate={getEndDate()}
                    statusLabel={statusLabel}
                    statusColor={statusColor}
                    daysLeft={computedDaysLeft}
                    isAnalyzing={isAnalyzing}
                    attention={attention}
                    primaryAction={primaryAction}
                    documentHref={firstDocumentHref}
                    locale={locale}
                    onPrimaryAction={handlePrimaryAction}
                    copy={{
                        policyId: t.wallet.policyId,
                        plateNumber: t.wallet.plateNumber,
                        valueUnreadable: detailsCopy.valueUnreadable,
                        valueUnreadableCta: detailsCopy.valueUnreadableCta,
                        inForceUntil: detailsCopy.headInForceUntil,
                        expiredOn: detailsCopy.headExpiredOn,
                        unknownDuration: detailsCopy.headUnknownDuration,
                        attentionTitle: detailsCopy.headAttentionTitle,
                        attention: detailsCopy.headAttention,
                        action: detailsCopy.headAction,
                        analyzing: t.policyStatus.analyzing,
                    }}
                    /* The PERSISTENT AI affordance — one of the two entry points
                       this page keeps (the other is the point-of-use label inside
                       the sections). It replaces the hero CTA, the standalone Q&A
                       card, the suggested-question pills and the claims ask-AI
                       button, which were four doors to one room. Rendered INSIDE
                       the head card since 2026-08-26: standing alone it was a
                       ninth top-level grouping on a page budgeted for eight
                       (LEDGER: P5-detail-goal2-01). */
                    askAi={{ label: detailsCopy.headAskAi, onOpen: () => setAskAiOpen((v) => !v) }}
                />

                {askAiOpen && (
                    <div id="policy-qa" className="mt-3 scroll-mt-20">
                        <PolicyQA
                            policyId={policy.id}
                            tier={tier}
                            lineOfBusiness={coverageType}
                            freeQuestionsRemaining={freeQuestionsRemaining}
                        />
                    </div>
                )}

                {/* ── The plain-language summary sits with the head: it is the
                       prose answer to "what is this policy", not a section of
                       its own. Health score handling is Goal 3's. ─────────── */}
                <div className="mt-4">
                    <SummaryCard
                        summary={
                            storedSummary.state === "ok"
                                ? storedSummary.text
                                : storedSummary.state === "absent"
                                    ? t.wallet.summaryFallback
                                    : null
                        }
                        summaryState={storedSummary.state}
                        health={health}
                        isAnalyzing={isAnalyzing}
                        copy={{
                            summaryTitle: detailsCopy.summaryTitle,
                            summaryAiChip: detailsCopy.summaryAiChip,
                            healthTitle: t.wallet.healthScore.title,
                            healthScale: detailsCopy.healthScale,
                            summaryLanguageMismatch: detailsCopy.summaryLanguageMismatch,
                            summaryLanguageMismatchCta: detailsCopy.summaryLanguageMismatchCta,
                            summaryHasUnreadable: detailsCopy.summaryHasUnreadable,
                            valueUnreadableCta: detailsCopy.valueUnreadableCta,
                        }}
                        documentHref={firstDocumentHref}
                        // The owner is told the data is unchecked — never offered
                        // the agent's confirm action (that stays behind
                        // canReviewExtraction). Someone "confirming" an
                        // extraction they have not read against the document
                        // would launder a guess into a verification.
                        unverified={!canReviewExtraction && (policy.reviewState === 'unconfirmed' || policy.reviewState === 'flagged')}
                        unverifiedNote={t.wallet.review.ownerUnverifiedNote}
                        methodology={{
                            title: t.wallet.healthScore.methodologyTitle,
                            body: t.wallet.healthScore.methodologyBody,
                            limits: t.wallet.healthScore.methodologyLimits,
                            notAdvice: t.dashboard.home.scoreMethodologyNotAdvice,
                        }}
                    />
                </div>

                {/* ── SIX SECTIONS — the page's ONE navigation system ─────── */}
                <div className="mt-6 border-t border-black/10 dark:border-white/12">

                    {/* 1 ── Cover: what is and is not covered ─────────────── */}
                    <PolicySection
                        id="coverage"
                        title={detailsCopy.sectionCoverage}
                        summary={detailsCopy.sectionCoverageSummary}
                        icon={<ShieldCheck className="h-5 w-5" />}
                        forceOpen={openSection === "coverage"}
                    >
                        <div className="space-y-6">
                            {hasCoverageDetails ? (
                                <CoverageTabView
                                    hints={glossaryHints}
                                    acordData={policy.acordData}
                                    lineOfBusiness={coverageType}
                                    language={lang}
                                    layout="stacked"
                                />
                            ) : shouldShowReanalyzeHint ? (
                                <div className="flex items-start gap-3 rounded-2xl border border-amber-300/45 bg-amber-50 px-4 py-4 dark:bg-amber-950/20">
                                    <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{absenceCopy.title}</p>
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90">{absenceCopy.hint}</p>
                                    </div>
                                </div>
                            ) : null}

                            {/* Perks are things this policy already gives you —
                                part of the cover answer, not a section of their own. */}
                            {!isAnalyzing && (
                                <PerksCard
                                    perks={perks}
                                    lang={lang}
                                    // P-08: a perk is a claim the product makes about your
                                    // contract; this is how the reader checks it.
                                    sourceDocumentHref={firstDocumentHref}
                                    copy={{
                                        perksTitle: detailsCopy.perksTitle,
                                        perksSubtitle: detailsCopy.perksSubtitle,
                                        usageLimitLabel: detailsCopy.usageLimitLabel,
                                        callServiceCta: detailsCopy.callServiceCta,
                                        visitSiteCta: detailsCopy.visitSiteCta,
                                        dontForgetChip: detailsCopy.dontForgetChip,
                                        noPerksDetected: detailsCopy.noPerksDetected,
                                        exclusionsReanalyzeHint: detailsCopy.exclusionsReanalyzeHint,
                                        perksSourceLink: detailsCopy.perksSourceLink,
                                        perksSourceMissing: detailsCopy.perksSourceMissing,
                                        perkTypes: detailsCopy.perkTypes,
                                    }}
                                />
                            )}

                            {/* Branch editorial — generic to the line, not to this
                                policy, so it stays collapsed inside the section it
                                explains rather than occupying one of the six. */}
                            {!isAnalyzing && (
                                <BranchGuideCard
                                    tagline={branchContent.tagline[lang]}
                                    shortDescription={branchContent.shortDescription[lang]}
                                    whyItMatters={branchContent.whyItMatters.map((item) => item[lang])}
                                    whatWeAnalyze={branchContent.whatWeAnalyze.map((item) => item[lang])}
                                    howToUseBetter={branchContent.howToUseBetter.map((item) => item[lang])}
                                    commonGaps={branchGuideGaps}
                                    copy={{
                                        guideTitle: detailsCopy.guideTitle,
                                        guideWhyItMatters: detailsCopy.guideWhyItMatters,
                                        guideWhatWeAnalyze: detailsCopy.guideWhatWeAnalyze,
                                        guideHowToUseBetter: detailsCopy.guideHowToUseBetter,
                                        guideCommonGaps: detailsCopy.guideCommonGaps,
                                        guideDetectedChip: detailsCopy.guideDetectedChip,
                                        guideExpand: detailsCopy.guideExpand,
                                        guideCollapse: detailsCopy.guideCollapse,
                                    }}
                                />
                            )}
                        </div>
                    </PolicySection>

                    {/* 2 ── Terms that can affect a claim ─────────────────── */}
                    {!isAnalyzing && (
                        <PolicySection
                            id="terms"
                            title={detailsCopy.sectionTerms}
                            summary={detailsCopy.sectionTermsSummary}
                            icon={<FileWarning className="h-5 w-5" />}
                            forceOpen={openSection === "terms"}
                        >
                            <ExclusionsCard
                                exclusions={exclusions}
                                conditions={notableConditions}
                                finePrint={finePrint}
                                lang={lang}
                                copy={{
                                    exclusionsTitle: detailsCopy.exclusionsTitle,
                                    exclusionsSubtitle: detailsCopy.exclusionsSubtitle,
                                    exclusionsListTitle: detailsCopy.exclusionsListTitle,
                                    notableConditionsTitle: detailsCopy.notableConditionsTitle,
                                    finePrintTitle: detailsCopy.finePrintTitle,
                                    actionRequiredChip: detailsCopy.actionRequiredChip,
                                    noExclusionsDetected: detailsCopy.noExclusionsDetected,
                                    exclusionsReanalyzeHint: detailsCopy.exclusionsReanalyzeHint,
                                    showMoreFinePrint: detailsCopy.showMoreFinePrint,
                                    showLessFinePrint: detailsCopy.showLessFinePrint,
                                    showAllExclusions: detailsCopy.showAllExclusions,
                                    showFewerExclusions: detailsCopy.showFewerExclusions,
                                    conditionTypes: detailsCopy.conditionTypes,
                                    riskLevels: detailsCopy.riskLevels,
                                }}
                                disclaimer={t.coverageDetails.exclusionsDisclaimer}
                                termHint={exclusionHint}
                                conditionHints={{
                                    sub_limit: glossaryHints?.sublimit ?? null,
                                    co_payment: glossaryHints?.copayment ?? null,
                                }}
                            />
                        </PolicySection>
                    )}

                    {/* 3 ── Items for review ──────────────────────────────── */}
                    <PolicySection
                        id="review"
                        title={detailsCopy.sectionReview}
                        summary={detailsCopy.sectionReviewSummary}
                        icon={<ClipboardList className="h-5 w-5" />}
                        forceOpen={openSection === "review"}
                    >
                        <div className="space-y-6">
                            <AnalysisCard
                                policyId={policy.id}
                                gaps={gapsForAnalysis}
                                policyStatus={policy.status}
                                processingError={policy.acordData?.processingError || null}
                                analysisPipeline={policy.acordData?.analysis?.pipeline || null}
                                report={{ items: gapReportItems, reportUnlocked }}
                                tier={tier}
                                trialAnalysisAvailable={trialAnalysisAvailable}
                            />

                            {/* The "worth checking" half of the branch actions —
                                the answered half is a coverage fact and lives in
                                the cover section's data. */}
                            {!isAnalyzing && branchActionItems.length > 0 && (
                                <BranchActionsCard
                                    actions={branchActionItems}
                                    profileHref="/questionnaires"
                                    uploadHref="/wallet/add"
                                    onRequestQuote={isOwner ? handleRequestQuote : undefined}
                                    isRequestingQuote={isRequestingQuote}
                                    onAskAgent={isOwner ? handleAskAgentAction : undefined}
                                    onCreateTask={isOwner ? handleCreateTaskAction : undefined}
                                    agentActionsLocked={!canUseCollaboration}
                                    pendingActionId={pendingActionId}
                                    copy={{
                                        actionsTitle: detailsCopy.actionsTitle,
                                        actionsAnsweredHeading: detailsCopy.actionsAnsweredHeading,
                                        actionsTodoHeading: detailsCopy.actionsTodoHeading,
                                        actionsCall: detailsCopy.actionsCall,
                                        actionsShowAll: detailsCopy.actionsShowAll,
                                        actionsShowLess: detailsCopy.actionsShowLess,
                                        actionsLocked: detailsCopy.actionsLocked,
                                        actionsWorking: detailsCopy.actionsWorking,
                                    }}
                                />
                            )}

                            {showRecommendations && (
                                <div id="recommendations" className="scroll-mt-20">
                                    <RecommendationCards
                                        recommendations={relatedRecommendations}
                                        language={lang}
                                        tier={tier}
                                    />
                                </div>
                            )}

                            {/* The standalone upsell that used to sit here moved to
                                the ONE persistent slot in #documents. A card
                                advertising unrelated paid features, wedged between
                                a customer's coverage findings, competes with the
                                findings for the attention the page exists to
                                direct. What stays in place is the opposite kind of
                                thing: a lock ON the capability the reader just
                                reached for (the €3 report unlock below, the
                                PDF-preview lock, the advisor section) — those are
                                the feature's locked STATE, not an advertisement. */}
                        </div>
                    </PolicySection>

                    {/* 4 ── Dates & renewal — stated ONCE ─────────────────── */}
                    {!isAnalyzing && (
                        <PolicySection
                            id="dates"
                            title={detailsCopy.sectionDates}
                            summary={detailsCopy.sectionDatesSummary}
                            icon={<CalendarDays className="h-5 w-5" />}
                            forceOpen={openSection === "dates"}
                        >
                            <div className="space-y-4">
                                <KeyDatesCard
                                    startDate={getStartDate()}
                                    endDate={getEndDate()}
                                    renewalDate={renewalDate}
                                    renewalHint={glossaryHints?.renewal ?? null}
                                    lapseHint={glossaryHints?.lapse ?? null}
                                    daysLeft={computedDaysLeft}
                                    statusLabel={statusLabel}
                                    statusColor={statusColor}
                                    hasAutoRenewal={autoRenewal}
                                    renewalHistory={renewalHistory}
                                    renewals={renewals}
                                    locale={locale}
                                    premiumAmount={getPremiumAmount()}
                                    premiumCurrency={getPremiumCurrency()}
                                    premiumFrequency={premiumFrequency}
                                    // The head owns status, expiry and the countdown.
                                    // This card renders the PERIOD and what is paid.
                                    suppressStatusAndCountdown
                                    onRequestQuote={isOwner ? handleRequestQuote : undefined}
                                    isRequestingQuote={isRequestingQuote}
                                    dateSources={{
                                        endDate: policy.acordData?.extraction?.sources?.endDate,
                                        renewalDate: policy.acordData?.extraction?.sources?.renewalDate,
                                    }}
                                    sourceLabels={{
                                        fromDocument: t.wallet.review.sourceFromDocument,
                                        pageAbbrev: t.wallet.review.sourcePageAbbrev,
                                    }}
                                    renewalNote={branchContent.renewalNote[lang]}
                                    copy={{
                                        keyDatesTitle: detailsCopy.keyDatesTitle,
                                        startedOn: detailsCopy.startedOn,
                                        expiresOn: detailsCopy.expiresOn,
                                        expiredOn: detailsCopy.expiredOn,
                                        renewalDateLabel: detailsCopy.renewalDateLabel,
                                        renewalStatusLabel: detailsCopy.renewalStatusLabel,
                                        periodProgress: detailsCopy.periodProgress,
                                        autoRenewalNote: detailsCopy.autoRenewalNote,
                                        renewalHistory: detailsCopy.renewalHistory,
                                        noRenewalHistory: detailsCopy.noRenewalHistory,
                                        expiresIn: t.wallet.expiresIn,
                                        days: t.wallet.days,
                                        requestQuote: detailsCopy.requestQuote,
                                        requestingQuote: detailsCopy.requestingQuote,
                                        reminders: detailsCopy.renewalReminders,
                                        premiumLabel: detailsCopy.premiumLabel,
                                        premiumFrequencies: detailsCopy.premiumFrequency,
                                        annualPremium: t.wallet.annualPremium,
                                    }}
                                />

                                {/* Renewal outlook: the checklist and reminder trail
                                    only. Its headline duplicated the head's countdown
                                    and its quote button duplicated KeyDates'. */}
                                <RenewalOutlookCard
                                    headline={null}
                                    headlineTone="neutral"
                                    checklist={renewalChecklistLabels}
                                    reminderLine={renewalReminderLine}
                                    pastPeriodsLine={renewalPastPeriodsLine}
                                    expired={isExpiredPolicy}
                                    copy={{
                                        title: detailsCopy.renewalOutlookTitle,
                                        checkTitle: detailsCopy.renewalOutlookCheckTitle,
                                        checklistEmpty: detailsCopy.renewalOutlookChecklistEmpty,
                                        requestQuote: detailsCopy.requestQuote,
                                        requestingQuote: detailsCopy.requestingQuote,
                                    }}
                                />

                                {/* Renewal-reminder upsell relocated to the single
                                    persistent slot — see #documents. */}
                            </div>
                        </PolicySection>
                    )}

                    {/* 5 ── Making a claim ────────────────────────────────── */}
                    <PolicySection
                        id="claims"
                        title={detailsCopy.sectionClaims}
                        summary={detailsCopy.sectionClaimsSummary}
                        icon={<LifeBuoy className="h-5 w-5" />}
                        forceOpen={openSection === "claims"}
                    >
                        <ClaimsGuidanceCard
                            lang={lang}
                            insurerName={displayInsurer}
                            policyNumber={displayPolicyNumber}
                            insurerPhone={insurerPhone}
                            deadlines={claimDeadlines}
                            hasAgent={showAgentSection}
                            branchSteps={branchContent.claimsSteps.map((step) => step[lang])}
                            copy={{
                                claimsTitle: detailsCopy.claimsTitle,
                                claimsSubtitle: detailsCopy.claimsSubtitle,
                                claimStep1Title: detailsCopy.claimStep1Title,
                                claimStep1Desc: detailsCopy.claimStep1Desc,
                                claimStep2Title: detailsCopy.claimStep2Title,
                                claimStep2Desc: detailsCopy.claimStep2Desc,
                                claimStep3Title: detailsCopy.claimStep3Title,
                                claimStep3Desc: detailsCopy.claimStep3Desc,
                                claimStep4Title: detailsCopy.claimStep4Title,
                                claimStep4Desc: detailsCopy.claimStep4Desc,
                                claimNoDeadlines: detailsCopy.claimNoDeadlines,
                                claimWhatYouNeedTitle: detailsCopy.claimWhatYouNeedTitle,
                                claimDeadlinesTitle: detailsCopy.claimDeadlinesTitle,
                                claimNeedHelp: detailsCopy.claimNeedHelp,
                                claimAskAiCta: detailsCopy.claimAskAiCta,
                                claimAskAgentCta: detailsCopy.claimAskAgentCta,
                                claimFindAgentCta: detailsCopy.claimFindAgentCta,
                                claimsDisclaimer: detailsCopy.claimsDisclaimer,
                                contactInsurer: claimsPhoneLabel,
                                claimsPhoneUnknown: detailsCopy.claimsPhoneUnknown,
                                policyNumberLabel: t.wallet.policyNumber,
                            }}
                            onCallInsurer={handleCallInsurer}
                        />
                    </PolicySection>

                    {/* 6 ── Documents, notes & sharing ────────────────────── */}
                    <PolicySection
                        id="documents"
                        title={detailsCopy.sectionDocuments}
                        summary={detailsCopy.sectionDocumentsSummary}
                        icon={<FolderOpen className="h-5 w-5" />}
                        forceOpen={openSection === "documents"}
                    >
                        <div className="space-y-6">
                            <DocumentsCard
                                policyId={policy.id}
                                documents={policy.documents}
                                locale={lang}
                                isFreeTier={isFreeTier}
                                copy={{
                                    documentsArea: detailsCopy.documentsArea,
                                    noDocuments: t.wallet.noDocuments,
                                    documentKindLabels: t.wallet.documentKindLabels,
                                    documentFormatPdf: t.wallet.documentFormatPdf,
                                    documentFormatImage: t.wallet.documentFormatImage,
                                    documentFormatOther: t.wallet.documentFormatOther,
                                    preview: t.wallet.preview,
                                    upgradeToPlusPreview: t.wallet.upgradeToPlusPreview,
                                    previewLabels: t.wallet.documentPreview,
                                }}
                            />

                            {/* Share and download: the head keeps ONE primary
                                action, so the secondary ones live with the file
                                they act on. */}
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleShare} className="pw-secondary-button min-h-[44px]">
                                    <Share2 className="h-4 w-4" />
                                    {detailsCopy.sharePolicy}
                                </button>
                                {firstDocumentHref && (
                                    <button onClick={handleDownloadPrimaryDoc} className="pw-secondary-button min-h-[44px]">
                                        <FileDown className="h-4 w-4" />
                                        {t.wallet.downloadContract}
                                    </button>
                                )}
                            </div>

                            {(insuredNames.length > 0 || !isAnalyzing) && (
                                <InsuredPeopleCard
                                    names={insuredNames}
                                    copy={{
                                        insuredPeople: detailsCopy.insuredPeople,
                                        noInsuredPeople: detailsCopy.noInsuredPeople,
                                    }}
                                />
                            )}

                            {isOwner && (
                                <div className="pw-card pw-pad">
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                        <FileDown className="h-4 w-4 text-primary dark:text-mint" />
                                        {pickCopy(EXPORT_COPY.title, lang)}
                                    </h3>
                                    <p className="mb-4 text-xs leading-relaxed text-black/60 dark:text-white/65">
                                        {pickCopy(EXPORT_COPY.subtitle, lang)}
                                    </p>
                                    {tier === "pro" ? (
                                        <a
                                            href={`/api/v1/policies/${policy.id}/savings-report`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                                        >
                                            <FileDown className="h-4 w-4" />
                                            {pickCopy(EXPORT_COPY.exportCta, lang)}
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                trackJourneyEvent("upgrade_trigger_clicked", {
                                                    trigger_source: "savings_report_export",
                                                    feature_requested: "export_report",
                                                })
                                                setExportUpgradeOpen(true)
                                            }}
                                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary-soft px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:bg-primary/10 dark:text-mint"
                                        >
                                            <Crown className="h-4 w-4" />
                                            {pickCopy(EXPORT_COPY.unlockCta, lang)}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* H-006/H-007, answered 2026-08-25: a screen showing
                                model-written prose says what it is. This page renders the
                                AI coverage summary («Το ασφαλιστήριό σας σε απλά ελληνικά»)
                                and AI gap explanations, and carried no disclosure anywhere in
                                its ancestry — the most-read AI prose in the product. Once per
                                page, not beside every paragraph: a disclosure repeated into
                                wallpaper stops being read. */}
                            <AiDisclaimer variant="inline" />

                            {/* Advisor notes & collaboration — the same subject as
                                sharing: who else can see and act on this policy. */}
                            {showAgentSection && (
                                <div id="agent" className="scroll-mt-20">
                                    {canShowCollaborationTimeline ? (
                                        <div className="space-y-4">
                                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                                <Users className="h-4 w-4 text-primary dark:text-mint" />
                                                {detailsCopy.agentSectionTitle}
                                            </h3>
                                            <CollaborationTimeline
                                                policyId={policy.id}
                                                relationshipId={relationshipId || null}
                                                viewerRole={isOwner ? "policyholder" : "agent"}
                                            />
                                        </div>
                                    ) : (
                                        <div className="pw-card pw-pad">
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                                                <Lock className="h-4 w-4 text-primary dark:text-mint" />
                                                {detailsCopy.agentSectionTitle}
                                            </h3>
                                            <p className="mb-4 text-sm text-black/65 dark:text-white/70">{detailsCopy.agentLockedHint}</p>
                                            <a
                                                href="/upgrade"
                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white dark:text-[#1A2420] transition-colors hover:bg-primary-hover"
                                            >
                                                <Crown className="h-4 w-4" />
                                                {t.wallet.upgradePlan}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {canShowCollaborationPanel && (
                                <CollaborationPanel
                                    policyId={policy.id}
                                    policyNumber={policyNumber}
                                    initialShares={serializedShares || []}
                                    isOwner={isOwner}
                                />
                            )}

                            {/* THE ONE PERSISTENT UPGRADE SLOT.
                                
                                The page carried five standalone upsells plus the
                                in-place locks — one in five capabilities on the
                                ledger asked for money, on a page whose job is
                                answering four questions in ten seconds. They are
                                consolidated here, beside the plan and account
                                surface where a purchase decision actually belongs,
                                and the scattered ones are gone rather than moved
                                twice. Contextual locks stay with their capability;
                                this is the only place that ADVERTISES. */}
                            {isOwner && tier !== 'pro' && (
                                <PremiumInsightCards
                                    triggerSource="policy_detail_plan_slot"
                                    returnTo={`/wallet/${policy.id}#documents`}
                                    className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/5 p-6"
                                />
                            )}

                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-red-300/60 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/25"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t.wallet.deletePolicyModal.deletePolicy}
                                </button>
                            )}
                        </div>
                    </PolicySection>

                </div>
                </PolicyQaPrefillProvider>
            </div>

            <UpgradeModal
                isOpen={exportUpgradeOpen}
                onClose={() => setExportUpgradeOpen(false)}
                featureKey="export_report"
                triggerSource="savings_report_export"
                returnTo={pathname || undefined}
            />

            {/* Free-tier click on a locked askAgent branch action. */}
            <UpgradeModal
                isOpen={branchAgentUpgradeOpen}
                onClose={() => setBranchAgentUpgradeOpen(false)}
                featureKey="agent_collaboration"
                triggerSource="policy_branch_action"
                returnTo={pathname || undefined}
            />

            {isOwner && (
                <DeletePolicyDialog
                    policyId={policy.id}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            )}
        </div>
    )
}
