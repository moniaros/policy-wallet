"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { resolvePolicyLifecycle, type PolicyLifecycle } from '@/lib/policy-status'
import { getPolicyStatusView } from '@/lib/wallet/policy-status-view'
import { StatusPill } from '@/components/ui/StatusPill'
import { AlertTriangle, BadgeCheck, Sparkles } from 'lucide-react'
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
    const dateDisplay = endDate.toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', { timeZone: 'UTC' })
    if (days < 0) return locale === 'el' ? `Έληξε στις ${dateDisplay}` : `Expired on ${dateDisplay}`
    if (days <= 60) return locale === 'el' ? `σε ${days} ημέρες` : `in ${days} days`
    return dateDisplay
}

// ── Component ────────────────────────────────────────────────────────────────

export function PolicyCard({ policy, onView, id }: PolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !policy.insurerName || policy.insurerName === '__PENDING_EXTRACTION__' || policy.insurerName === 'Unknown Insurer' || policy.insurerName === 'Άγνωστος ασφαλιστής'
    // Branch label + icon from the canonical taxonomy — the old local map knew only
    // five branches, so pet/legal/cyber policies fell back to a generic page icon.
    // Held on an object: `const Icon = getBranchIcon(...)` reads as creating a
    // component during render to react-hooks/static-components.
    const branch = normalizeBranch(policy.lineOfBusiness)
    const glyph = { Icon: getBranchIcon(branch.id) }
    const localizedLob = branch.label[locale]
    const displayInsurer = isPendingInsurer ? localizedLob : policy.insurerName
    // Lifecycle from the real (extracted) end date — the stored status string
    // is never recomputed as time passes, so it cannot be trusted for expiry.
    const lifecycle = resolvePolicyLifecycle(policy)
    const view = getPolicyStatusView(policy, t)
    const expiryInline = isAnalyzing ? '' : formatRelativeExpiry(lifecycle, locale)

    return (
        <button
            type="button"
            id={id}
            onClick={onView}
            className="group w-full text-left pw-card p-4 transition-all active:scale-[0.98]"
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
                            <span className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white">
                                {displayInsurer}
                            </span>
                            {policy.verified && !isAnalyzing && (
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary dark:text-mint" />
                            )}
                        </div>
                        <StatusPill tone={view.tone} label={view.label} icon={false} />
                    </div>

                    {/* Row 2: LOB type + expiry inline */}
                    <p className="text-[11px] text-[#94A3B8]">
                        {localizedLob}
                        {expiryInline && <> · {expiryInline}</>}
                    </p>

                    {/* Needs-review chip — only for explicitly unconfirmed/flagged extractions.
                        The old "coverage %" bar that used to sit here was invented: it was
                        looked up from the status alone (active → 88%, expiring → 68%), so it
                        described nothing about the actual policy. Removed, not restyled. */}
                    {!isAnalyzing && (policy.reviewState === 'unconfirmed' || policy.reviewState === 'flagged') && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309] dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {policy.reviewState === 'flagged'
                                ? (t.wallet as any)?.review?.flaggedChip
                                : (t.wallet as any)?.review?.needsReviewChip}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function PolicyCardSkeleton() {
    return (
        <div className="pw-card p-4">
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
