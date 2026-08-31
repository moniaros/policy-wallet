import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CalendarClock, CircleAlert, Gift, Lightbulb, MessageCircle, Search, Sparkles, Users } from "lucide-react"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { buttonClassName } from "@/src/design-system/primitives"
import { getBranch, getBranchFamily, normalizeBranch } from "@/lib/insurance/taxonomy"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { getBranchContent, type BranchAction } from "@/lib/insurance/content"
import { policiesInBranch, upcomingRenewals } from "@/lib/insurance/branch-page"
import { extractPolicySections, pickLang } from "@/lib/wallet/policy-detail"
import { displayInsurerName, displayPolicyNumber, policyAssetIdentifier, warnOnHomoglyphNearMisses } from "@/lib/wallet/policy-identity"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"
import { BranchEmptyState } from "@/components/branches/BranchEmptyState"
import { calendarDaysUntil, effectivePolicyStatus, resolvePolicyLifecycle } from "@/lib/policy-status"

/**
 * Calendar days until a date, in Athens — not a duration in 24-hour blocks.
 *
 * This drives the "expires in N days" badge a customer reads. Millisecond
 * division is off by one for anything ending near the Athens day boundary
 * (end dates are stored at midnight UTC, which is 03:00 Athens) and drifts a
 * whole day across the two clock changes a year.
 */
function daysUntil(date: Date): number {
    return calendarDaysUntil(date, new Date())
}

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    children: React.ReactNode
}) {
    return (
        <section className="rounded-g-card bg-surface-raised p-g-5 shadow-g-raised">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-g-control bg-surface-sunken text-fg-brand">
                    <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h2 className="text-g-app-body-sm font-bold text-fg-primary">{title}</h2>
            </div>
            {children}
        </section>
    )
}

function BulletList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-3">
            {items.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-g-app-body-sm leading-relaxed text-fg-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-action-primary-bg" aria-hidden />
                    {item}
                </li>
            ))}
        </ul>
    )
}

// Lifecycle status → t.policyStatus key (camelCase).
const STATUS_I18N_KEY: Record<string, string> = {
    active: "active",
    expiring_soon: "expiringSoon",
    expired: "expired",
    unknown_duration: "unknownDuration",
    action_needed: "actionNeeded",
    cancelled: "cancelled",
    analyzing: "analyzing",
}


/**
 * One line of business, in full — extracted verbatim from the legacy
 * /branches/[branch] page (V2-P2-01); since V2-P2-03 removed that route,
 * /protection/[branch] (the §4.2 home) is its only mount.
 */
export async function BranchDetail({ branchParam }: { branchParam: string }) {
    const branch = getBranch(branchParam)
    if (!branch) notFound()

    const { dbUser } = await getAuthenticatedUser()
    const lang: 'el' | 'en' = dbUser.preferredLanguage === 'en' ? 'en' : 'el'
    const t = getTranslations(lang)
    const content = getBranchContent(branch.id)
    const BranchIcon = getBranchIcon(branch.id)
    const policyTypeLabels = t.policyTypes as Record<string, string>
    const branchTitle = policyTypeLabels[branch.id] || branch.label[lang]

    const [allPolicies, relationship, entitlements] = await Promise.all([
        db.policy.findMany({
            // status ≠ deleted: a soft-deleted row neither renders nor counts
            // (same predicate as the wallet and the dashboard).
            where: { ownerUserId: dbUser.id, status: { not: "deleted" } },
            orderBy: { endDate: "asc" },
        }),
        db.customerRelationship.findFirst({
            where: { policyholderUserId: dbUser.id, status: "active" },
            include: { agent: { select: { name: true } } },
        }),
        resolveUserEntitlements(dbUser.id),
    ])

    const branchPolicies = policiesInBranch(allPolicies, branch.id)
    const firstPolicyId = branchPolicies[0]?.id ?? null
    const tier = entitlements.tier

    // A branch page concentrates same-line policies, which is exactly where a
    // Greek-plate/Latin-plate homoglyph pair («ΙΚΖ-4821» vs «IKZ-4821») is most
    // confusable. Logged, never resolved — see warnOnHomoglyphNearMisses.
    warnOnHomoglyphNearMisses(
        branchPolicies.map((policy) => policyAssetIdentifier(policy)),
        `/branches/${branch.id}`
    )

    // Persisted gap-engine output, branch-filtered. Read-only — the engine
    // is never re-run from a page render (coverage-insights lesson).
    let recommendations: any[] = []
    try {
        // Enriched, not raw — see the note in the wallet policy page.
        const { getEnrichedRecommendations } = await import("@/lib/services/gap-engine")
        const all = await getEnrichedRecommendations(dbUser.id)
        const family = new Set(getBranchFamily(branch.id))
        recommendations = all
            .filter((rec) => family.has(normalizeBranch(rec.lineOfBusiness).id))
            .map((rec) => ({ ...rec, createdAt: rec.createdAt.toISOString() }))
    } catch (error) {
        console.error("Failed to load branch recommendations:", error)
    }
    const detectedRuleIds = new Set(recommendations.map((rec) => rec.ruleId).filter(Boolean) as string[])

    // The LIFECYCLE's end date, never the stored column: the raw `endDate`
    // column is placeholder-prone, and feeding it to the window filter made
    // this page's «Λήγει σε N ημέρες» disagree with the dashboard's renewal
    // timeline for the same policy. Same derivation both sides now.
    const branchPoliciesWithLifecycle = branchPolicies.map((policy) => {
        const lifecycle = resolvePolicyLifecycle(policy)
        return { ...policy, endDate: lifecycle.endDate, daysUntilExpiry: lifecycle.daysUntilExpiry }
    })
    const renewals = upcomingRenewals(branchPoliciesWithLifecycle, new Date())
    const perkRows = branchPolicies.flatMap((policy) =>
        extractPolicySections(policy.acordData).perks.map((perk) => ({
            perk,
            policyId: policy.id,
            insurerName: displayInsurerName(policy.insurerName),
        }))
    )

    const questionHref = (question: { el: string; en: string }) =>
        firstPolicyId ? `/wallet/${firstPolicyId}?q=${encodeURIComponent(question[lang])}#policy-qa` : "/wallet/add"

    const actionTarget = (action: BranchAction): string | null => {
        if (action.ctaType === "askAi") {
            if (!firstPolicyId || !action.question) return null
            return questionHref(action.question)
        }
        // `task` actions are policy-scoped — they need the hotline extracted
        // from one specific document, or that policy's own page. They carry
        // `href: null` and are therefore skipped here by construction; this
        // listing has no single policy to bind them to.
        return action.href
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            {/* Header */}
            <nav className="mb-4 text-g-app-caption font-semibold text-fg-secondary">
                <Link
                    href="/protection"
                    className="hover:text-fg-brand"
                >
                    {t.protection.title}
                </Link>
                <span className="mx-2" aria-hidden>/</span>
                <span className="text-fg-secondary">{branchTitle}</span>
            </nav>
            <header className="mb-8 flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-g-card bg-surface-sunken text-fg-brand">
                    <BranchIcon className="h-7 w-7" aria-hidden />
                </div>
                <div>
                    <h1 className="text-g-title text-fg-primary">{branchTitle}</h1>
                    {/* The FULL tagline — the one-line promise the /protection card
                        clamps to two lines (ledger B-03). This header is the page that
                        card links to, and V2-P3-01 made it the tagline's full render:
                        before this line the cut half existed nowhere in the product.
                        Guarded on rendered DOM by clamped-text-reachability. */}
                    <p className="mt-2 max-w-2xl text-g-app-body-sm font-semibold leading-relaxed text-fg-primary">
                        {content.tagline[lang]}
                    </p>
                    <p className="mt-1.5 max-w-2xl text-g-app-body-sm leading-relaxed text-fg-secondary">
                        {content.shortDescription[lang]}
                    </p>
                </div>
            </header>

            <div className="space-y-6">
                {/* Policies in this branch / empty state */}
                {branchPolicies.length === 0 ? (
                    <BranchEmptyState
                        branchId={branch.id}
                        headline={content.emptyState.headline[lang]}
                        description={content.emptyState.description[lang]}
                        ctaLabel={content.emptyState.ctaLabel[lang]}
                    />
                ) : (
                    <SectionCard icon={Search} title={t.branches.policiesInBranch}>
                        <div className="space-y-2">
                            {branchPolicies.map((policy) => {
                                // Lifecycle status, not the stale stored string —
                                // an expired policy must never badge "Ενεργή".
                                const statusKey = STATUS_I18N_KEY[effectivePolicyStatus(policy)] || policy.status
                                const statusLabel = (t.policyStatus as Record<string, string>)[statusKey] || policy.status
                                // Every row on this page shares the branch by
                                // construction, so the asset identifier is the ONLY
                                // field that can tell two same-insurer rows apart.
                                // Same primitive as the wallet and the renewal
                                // timeline (P5-wallet-01); identifier when one
                                // exists, policy number otherwise — unchanged for
                                // lines that have none.
                                const assetLabel = policyAssetIdentifier(policy)
                                return (
                                    <Link
                                        key={policy.id}
                                        href={`/wallet/${policy.id}`}
                                        className="flex items-center justify-between gap-3 rounded-g-control border border-border-subtle bg-surface-raised px-4 py-3 transition-colors hover:border-border-focus"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-g-app-body-sm font-bold text-fg-primary" title={displayInsurerName(policy.insurerName) || undefined}>
                                                {displayInsurerName(policy.insurerName) || "—"}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground" title={assetLabel || displayPolicyNumber(policy.policyNumber) || undefined}>
                                                {assetLabel || displayPolicyNumber(policy.policyNumber) || "—"}
                                            </p>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-3">
                                            <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-g-app-caption font-semibold text-fg-secondary">
                                                {statusLabel}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </SectionCard>
                )}

                {/* Detected gaps / recommendations for this branch */}
                {recommendations.length > 0 && (
                    <SectionCard icon={CircleAlert} title={t.branches.detectedGaps}>
                        <RecommendationCards
                            recommendations={recommendations}
                            // A branch-filtered SUBSET — not recommendation.openCount.
                            // Its own subject-scoped key keeps «2 προτάσεις» here
                            // from reading as the full set disagreeing with the
                            // dashboard's «9».
                            countKey="branch.recommendationCount"
                            countSubject={branch.id}
                            language={lang}
                            tier={tier}
                        />
                    </SectionCard>
                )}

                {/* Why it matters */}
                <SectionCard icon={Lightbulb} title={t.branches.whyItMatters}>
                    <BulletList items={content.whyItMatters.map((item) => item[lang])} />
                </SectionCard>

                {/* What we analyze */}
                <SectionCard icon={Sparkles} title={t.branches.whatWeAnalyze}>
                    <BulletList items={content.whatWeAnalyze.map((item) => item[lang])} />
                </SectionCard>

                {/* Common gaps (editorial, engine-badged when detected) */}
                <SectionCard icon={CircleAlert} title={t.branches.commonGaps}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {content.commonGaps.map((gap) => {
                            const detected = gap.relatedRuleId ? detectedRuleIds.has(gap.relatedRuleId) : false
                            return (
                                <div
                                    key={gap.id}
                                    className="rounded-g-control border border-border-subtle bg-surface-raised p-4"
                                >
                                    {/* Column on phone: the chip's full label would crush the
                                        title to a one-character column beside it at 375px. */}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <h3 className="min-w-0 text-g-app-body-sm font-bold text-fg-primary sm:flex-1">{gap.title[lang]}</h3>
                                        {detected && (
                                            <span className="flex-shrink-0 self-start rounded-full bg-state-gap-fill px-2.5 py-1 text-g-app-caption font-semibold text-state-gap">
                                                {t.branches.detectedInPortfolio}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-g-app-caption leading-relaxed text-fg-secondary">
                                        {gap.description[lang]}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </SectionCard>

                {/* How to use it better */}
                <SectionCard icon={Gift} title={t.branches.howToUseBetter}>
                    <BulletList items={content.howToUseBetter.map((item) => item[lang])} />
                </SectionCard>

                {/* Perks aggregated from analyzed policies */}
                {perkRows.length > 0 && (
                    <SectionCard icon={Gift} title={t.branches.perksTitle}>
                        <div className="space-y-2">
                            {perkRows.slice(0, 6).map(({ perk, policyId, insurerName }, index) => (
                                <Link
                                    key={`${policyId}-${index}`}
                                    href={`/wallet/${policyId}#coverage`}
                                    className="block rounded-g-control border border-border-subtle bg-surface-raised px-4 py-3 transition-colors hover:border-border-focus"
                                >
                                    <p className="text-g-app-body-sm font-bold text-fg-primary">{pickLang(perk.name, lang)}</p>
                                    <p className="mt-0.5 line-clamp-2 text-g-app-caption text-fg-secondary">
                                        {pickLang(perk.description, lang)}
                                        {insurerName ? ` — ${insurerName}` : ""}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Upcoming renewals */}
                <SectionCard icon={CalendarClock} title={t.branches.upcomingRenewals}>
                    {renewals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.branches.noRenewalsSoon}</p>
                    ) : (
                        <div className="space-y-2">
                            {renewals.map((policy) => {
                                const days = daysUntil(policy.endDate as Date)
                                return (
                                    <Link
                                        key={policy.id}
                                        href={`/wallet/${policy.id}#dates`}
                                        className="flex items-center justify-between gap-3 rounded-g-control border border-border-subtle bg-surface-raised px-4 py-3 transition-colors hover:border-border-focus"
                                    >
                                        <p
                                            className="truncate text-g-app-body-sm font-bold text-fg-primary"
                                            title={[displayInsurerName(policy.insurerName), policyAssetIdentifier(policy)].filter(Boolean).join(' · ') || undefined}
                                        >
                                            {/* Insurer + asset identifier through the shared
                                                primitive — two same-insurer renewals in one
                                                branch are otherwise the same row twice. */}
                                            {[displayInsurerName(policy.insurerName), policyAssetIdentifier(policy)]
                                                .filter(Boolean)
                                                .join(' · ') || "—"}
                                        </p>
                                        <span
                                            className="flex-shrink-0 rounded-full bg-state-gap-fill px-2.5 py-1 text-g-app-caption font-semibold text-state-gap"
                                            data-fact="policy.daysRemaining"
                                            data-fact-subject={policy.id}
                                        >
                                            {t.branches.expiresInDays.replace('{days}', String(days))}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </SectionCard>

                {/* Recommended actions */}
                <SectionCard icon={ArrowRight} title={t.branches.recommendedActions}>
                    <div className="flex flex-wrap gap-2">
                        {content.recommendedActions.map((action) => {
                            const target = actionTarget(action)
                            if (!target) return null
                            return (
                                <Link
                                    key={action.id}
                                    href={target}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-4 py-2 text-g-app-caption font-semibold text-fg-secondary transition-colors hover:border-border-focus hover:text-fg-brand"
                                >
                                    {action.label[lang]}
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                            )
                        })}
                    </div>
                </SectionCard>

                {/* Suggested AI questions */}
                {firstPolicyId && (
                    <SectionCard icon={MessageCircle} title={t.branches.suggestedQuestions}>
                        <div className="space-y-2">
                            {content.suggestedQuestions.map((question, index) => (
                                <Link
                                    key={index}
                                    href={questionHref(question)}
                                    className="flex items-center gap-3 rounded-g-control border border-border-subtle bg-surface-raised px-4 py-3 text-g-app-body-sm text-fg-secondary transition-colors hover:border-border-focus hover:text-fg-brand"
                                >
                                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-fg-brand" aria-hidden />
                                    {question[lang]}
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Agent CTA */}
                <SectionCard icon={Users} title={t.branches.askAgent}>
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <p className="text-g-app-body-sm leading-relaxed text-fg-secondary">
                            {relationship?.agent?.name
                                ? t.branches.agentConnectedHint.replace('{name}', relationship.agent.name)
                                : t.branches.agentDisconnectedHint}
                        </p>
                        <Link
                            href="/agent"
                            className={buttonClassName({ variant: "primary", size: "sm" }, "flex-shrink-0 gap-2 font-bold")}
                        >
                            {t.branches.askAgent}
                            <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                    </div>
                </SectionCard>
            </div>
        </div>
    )
}
