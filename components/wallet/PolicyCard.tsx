"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { resolvePolicyLifecycle, type PolicyLifecycle } from '@/lib/policy-status'
import { formatDate } from '@/lib/i18n/format'
import { getPolicyStatusView } from '@/lib/wallet/policy-status-view'
import { displayInsurerName, isPlaceholderInsurerName } from '@/lib/wallet/policy-identity'
import { StatusPill } from '@/components/ui/StatusPill'
import { BadgeCheck, Sparkles, Search, FileText, Share2, Trash2 } from 'lucide-react'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { getBranchIcon } from '@/lib/insurance/branch-icons'
import { Skeleton } from '@/components/ui/skeleton'

// ── Props ────────────────────────────────────────────────────────────────────

interface PolicyCardProps {
    policy: Policy
    onView?: () => void
    onShare?: () => void
    onViewDocuments?: () => void
    onRunAnalysis?: () => void
    onDelete?: () => void
    onViewHistory?: () => void
    id?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────


function formatRelativeExpiry(lifecycle: PolicyLifecycle, locale: 'el' | 'en'): string {
    const { endDate, daysUntilExpiry: days } = lifecycle
    if (!endDate || days === null) return ''
    const el = locale === 'el'
    // Athens-pinned like the day count beside it: a raw UTC date rendered the
    // previous day for a policy ending at Athens midnight, disagreeing with the
    // Athens-computed `days`.
    const dateDisplay = formatDate(endDate, locale)
    if (days < 0) return el ? `Έληξε στις ${dateDisplay}` : `Expired on ${dateDisplay}`
    // Singular/today: «σε 0 ημέρες» / «σε 1 ημέρες» were grammatically broken.
    if (days === 0) return el ? 'σήμερα' : 'today'
    if (days === 1) return el ? 'σε 1 ημέρα' : 'in 1 day'
    if (days <= 60) return el ? `σε ${days} ημέρες` : `in ${days} days`
    return dateDisplay
}

// ── Component ────────────────────────────────────────────────────────────────

/** One touch-target-sized icon action in the card footer. */
function CardAction({
    icon: Icon,
    label,
    onClick,
    destructive = false,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    destructive?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${destructive
                ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
        >
            <Icon className="h-4 w-4" />
        </button>
    )
}

export function PolicyCard({ policy, onView, onShare, onViewDocuments, onRunAnalysis, onDelete, id }: PolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = isPlaceholderInsurerName(policy.insurerName)
    // Branch label + icon from the canonical taxonomy — the old local map knew only
    // five branches, so pet/legal/cyber policies fell back to a generic page icon.
    // Held on an object: `const Icon = getBranchIcon(...)` reads as creating a
    // component during render to react-hooks/static-components.
    const branch = normalizeBranch(policy.lineOfBusiness)
    const glyph = { Icon: getBranchIcon(branch.id) }
    const localizedLob = branch.label[locale]
    const displayInsurer = displayInsurerName(policy.insurerName, localizedLob)
    // Lifecycle from the real (extracted) end date — the stored status string
    // is never recomputed as time passes, so it cannot be trusted for expiry.
    const lifecycle = resolvePolicyLifecycle(policy)
    const view = getPolicyStatusView(policy, t)
    const expiryInline = isAnalyzing ? '' : formatRelativeExpiry(lifecycle, locale)

    // The card used to be ONE <button> that accepted onShare/onViewDocuments/
    // onRunAnalysis/onDelete as props and silently ignored all four. Those actions
    // existed only in PolicyTable's context menu — which is desktop-only — so in
    // the card presentation (the entire mobile experience) a policy could not be
    // shared, analyzed or deleted at all. The card is now a container: the content
    // stays one big "view" target, and the actions sit beside it as real buttons
    // (they cannot nest inside the view button — interactive elements can't nest).
    const hasActions = Boolean(onRunAnalysis || onViewDocuments || onShare || onDelete)

    return (
        // data-testid is the stable hook the UX-audit suite selects on; without
        // it those checks could not find a card at all and reported the wallet
        // as missing features it has rendered all along.
        <div data-testid="policy-card" className="group pw-card pw-pad-tight transition-all">
            <button
                type="button"
                id={id}
                onClick={onView}
                className="w-full text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                aria-label={`${displayInsurer} — ${localizedLob}`}
            >
                <div className="flex items-center gap-3">
                {/* LOB icon — status-semantic chip from the shared status pipeline */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${view.chipClass}`}>
                    {isAnalyzing ? (
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    ) : (
                        <glyph.Icon className="h-5 w-5" />
                    )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    {/* Row 1: insurer name + status badge */}
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-body-sm font-semibold text-foreground">
                                {displayInsurer}
                            </span>
                            {policy.verified && !isAnalyzing && (
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary dark:text-mint" />
                            )}
                        </div>
                        <StatusPill tone={view.tone} label={view.label} icon={false} />
                    </div>

                    {/* Row 2: LOB type + expiry inline */}
                    <p className="text-micro text-muted-foreground">
                        {localizedLob}
                        {expiryInline && (
                            <>
                                {' · '}
                                {/* «σε 24 ημέρες» — the lifecycle's day count,
                                    subject-scoped so a list of cards never reads
                                    as one key disagreeing with itself. */}
                                <span data-fact="policy.daysRemaining" data-fact-subject={policy.id}>
                                    {expiryInline}
                                </span>
                            </>
                        )}
                    </p>

                </div>
                </div>
            </button>

            {hasActions && (
                <div className="mt-3 flex items-center justify-end gap-0.5 border-t border-border pt-2">
                    {onRunAnalysis && (
                        <CardAction icon={Search} label={t.dashboard.runAnalysis} onClick={onRunAnalysis} />
                    )}
                    {onViewDocuments && (
                        <CardAction icon={FileText} label={t.wallet.documents} onClick={onViewDocuments} />
                    )}
                    {onShare && (
                        <CardAction icon={Share2} label={t.wallet.shareWithAgent} onClick={onShare} />
                    )}
                    {onDelete && (
                        <CardAction icon={Trash2} label={t.dashboard.delete} onClick={onDelete} destructive />
                    )}
                </div>
            )}
        </div>
    )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function PolicyCardSkeleton() {
    return (
        <div className="pw-card pw-pad-tight">
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-2.5 w-32" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
            </div>
        </div>
    )
}
