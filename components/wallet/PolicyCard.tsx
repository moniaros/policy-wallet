"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { resolvePolicyLifecycle, type PolicyLifecycle } from '@/lib/policy-status'
import { AlertTriangle, BadgeCheck, Sparkles } from 'lucide-react'
import { CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon, DocumentIcon } from '@/components/icons/PolicyIcons'
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

const LOB_ICONS: Record<string, React.ElementType> = {
    motor: CarIcon,
    health: HeartIcon,
    home: HomeIcon,
    life: ShieldIcon,
    travel: PlaneIcon,
}

function LobIcon({ lob, className }: { lob: string; className?: string }) {
    const Icon = LOB_ICONS[lob] ?? DocumentIcon
    return <Icon className={className} />
}

function formatRelativeExpiry(lifecycle: PolicyLifecycle, locale: 'el' | 'en'): string {
    const { endDate, daysUntilExpiry: days } = lifecycle
    if (!endDate || days === null) return ''
    const dateDisplay = endDate.toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', { timeZone: 'UTC' })
    if (days < 0) return locale === 'el' ? `Έληξε στις ${dateDisplay}` : `Expired on ${dateDisplay}`
    if (days <= 60) return locale === 'el' ? `σε ${days} ημέρες` : `in ${days} days`
    return dateDisplay
}

// Lifecycle status → i18n key (t.policyStatus uses camelCase keys)
const STATUS_I18N_KEY: Record<string, string> = {
    active: 'active',
    expiring_soon: 'expiringSoon',
    expired: 'expired',
    unknown_duration: 'unknownDuration',
    action_needed: 'actionNeeded',
    cancelled: 'cancelled',
    analyzing: 'analyzing',
}

function getStatusBadge(status: string, t: any) {
    const label = t.policyStatus?.[STATUS_I18N_KEY[status] || status] || status
    // Aligned to widget HEX palette for visual consistency
    const styles: Record<string, string> = {
        active:           'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint',
        expiring_soon:    'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300',
        // Expired: calendar fact, amber — never green, never red-alarm.
        expired:          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        unknown_duration: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
        action_needed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        analyzing:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
        cancelled:        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        incomplete:       'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }
    return { label, className: styles[status] || styles.incomplete }
}

// Status-semantic icon + coverage config
const STATUS_ICON_CONFIG: Record<string, { icon: string; bg: string; bar: string }> = {
    active:           { icon: 'text-primary dark:text-mint', bg: 'bg-primary-soft dark:bg-primary/15',  bar: 'bg-primary'  },
    expiring_soon:    { icon: 'text-[#D97706] dark:text-amber-400',   bg: 'bg-[#FEF3C7] dark:bg-amber-900/30',   bar: 'bg-[#F59E0B]'  },
    expired:          { icon: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30',   bar: 'bg-amber-400'  },
    unknown_duration: { icon: 'text-stone-500 dark:text-stone-400',   bg: 'bg-stone-100 dark:bg-stone-800',      bar: 'bg-stone-300'  },
    action_needed:    { icon: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-900/30',         bar: 'bg-red-500'    },
    cancelled:        { icon: 'text-slate-400',                        bg: 'bg-slate-100 dark:bg-slate-800',       bar: 'bg-slate-300'  },
}
function getStatusIconConfig(status: string) {
    return STATUS_ICON_CONFIG[status] ?? STATUS_ICON_CONFIG.active
}

// Static coverage classes (avoids inline styles for the linter)
const STATUS_COVERAGE: Record<string, { cls: string; pct: number }> = {
    active:        { cls: 'w-[88%]', pct: 88 },
    expiring_soon: { cls: 'w-[68%]', pct: 68 },
    action_needed: { cls: 'w-[45%]', pct: 45 },
}
function statusCoverage(status: string) {
    return STATUS_COVERAGE[status] ?? { cls: 'w-[75%]', pct: 75 }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PolicyCard({ policy, onView, id }: PolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !policy.insurerName || policy.insurerName === '__PENDING_EXTRACTION__' || policy.insurerName === 'Unknown Insurer' || policy.insurerName === 'Άγνωστος ασφαλιστής'
    const localizedLob = t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
    const displayInsurer = isPendingInsurer ? localizedLob : policy.insurerName
    // Lifecycle from the real (extracted) end date — the stored status string
    // is never recomputed as time passes, so it cannot be trusted for expiry.
    const lifecycle = resolvePolicyLifecycle(policy)
    const displayStatus = isAnalyzing ? 'analyzing' : lifecycle.status
    const status = getStatusBadge(displayStatus, t)
    const iconCfg = getStatusIconConfig(isAnalyzing ? 'active' : displayStatus)
    const { cls: coverageCls, pct: coveragePct } = statusCoverage(displayStatus)
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
                {/* LOB icon — h-9 w-9 rounded-lg, status-semantic colors */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconCfg.bg}`}>
                    {isAnalyzing ? (
                        <Sparkles className={`h-5 w-5 animate-pulse ${iconCfg.icon}`} />
                    ) : (
                        <LobIcon lob={policy.lineOfBusiness} className={`h-5 w-5 ${iconCfg.icon}`} />
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
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Row 2: LOB type + expiry inline */}
                    <p className="mb-1.5 text-[11px] text-[#94A3B8]">
                        {localizedLob}
                        {expiryInline && <> · {expiryInline}</>}
                    </p>

                    {/* Needs-review chip — only for explicitly unconfirmed/flagged extractions */}
                    {!isAnalyzing && (policy.reviewState === 'unconfirmed' || policy.reviewState === 'flagged') && (
                        <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309] dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {policy.reviewState === 'flagged'
                                ? (t.wallet as any)?.review?.flaggedChip
                                : (t.wallet as any)?.review?.needsReviewChip}
                        </span>
                    )}

                    {/* Row 3: coverage progress bar */}
                    {!isAnalyzing ? (
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10">
                                <div className={`h-full rounded-full transition-all duration-700 ${iconCfg.bar} ${coverageCls}`} />
                            </div>
                            <span className="text-[10px] font-medium text-[#94A3B8]">{coveragePct}%</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-blue-500 animate-pulse">
                            {t.policyStatus?.analyzing || 'Analyzing...'}
                        </p>
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
