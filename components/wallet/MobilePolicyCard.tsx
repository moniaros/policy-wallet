"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon,
    DocumentIcon,
} from '@/components/icons/PolicyIcons'
import { BadgeCheck, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// ── Props ────────────────────────────────────────────────────────────────────

interface MobilePolicyCardProps {
    policy: Policy
    variant?: 'hero' | 'compact'
    onView?: () => void
    onShare?: () => void
    onViewDocuments?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const LOB_ICONS: Record<string, React.ElementType> = {
    motor: CarIcon,
    health: HeartIcon,
    home: HomeIcon,
    life: ShieldIcon,
    travel: PlaneIcon,
}

function getLobIcon(lob: string) {
    return LOB_ICONS[lob] || DocumentIcon
}

function formatRelativeExpiry(endDate: string | null, locale: 'el' | 'en'): string {
    if (!endDate) return '-'
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    if (days <= 0) return locale === 'el' ? 'Έληξε' : 'Expired'
    if (days <= 60) return locale === 'el' ? `σε ${days} ημέρες` : `in ${days} days`
    return new Date(endDate).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US')
}

/** Visual coverage indicator — status-derived, purely representational */
const STATUS_COVERAGE: Record<string, { cls: string; pct: number }> = {
    active:        { cls: 'w-[88%]', pct: 88 },
    expiring_soon: { cls: 'w-[68%]', pct: 68 },
    action_needed: { cls: 'w-[45%]', pct: 45 },
}
function statusCoverage(status: string) {
    return STATUS_COVERAGE[status] ?? { cls: 'w-[75%]', pct: 75 }
}

interface StatusConfig {
    badge: string
    icon: string
    iconBg: string
    border: string
    bar: string
}

function getStatusConfig(status: string): StatusConfig {
    if (status === 'expiring_soon') {
        return {
            badge: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300',
            icon: 'text-[#D97706] dark:text-amber-400',
            iconBg: 'bg-[#FEF3C7] dark:bg-amber-900/30',
            border: 'border-[#FDE68A] dark:border-amber-800/40',
            bar: 'bg-[#F59E0B]',
        }
    }
    if (status === 'action_needed') {
        return {
            badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            icon: 'text-red-600 dark:text-red-400',
            iconBg: 'bg-red-50 dark:bg-red-900/30',
            border: 'border-red-200 dark:border-red-800/40',
            bar: 'bg-red-500',
        }
    }
    if (status === 'cancelled') {
        return {
            badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            icon: 'text-slate-400',
            iconBg: 'bg-slate-100 dark:bg-slate-800',
            border: 'border-[#E2E8F0] dark:border-white/8',
            bar: 'bg-slate-300',
        }
    }
    // active / default
    return {
        badge: 'bg-[#F0FDF4] text-[#166534] dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: 'text-[#29685B] dark:text-emerald-400',
        iconBg: 'bg-[#F0FDF4] dark:bg-emerald-900/30',
        border: 'border-[#E2E8F0] dark:border-white/8',
        bar: 'bg-[#29685B]',
    }
}

// ── Component ────────────────────────────────────────────────────────────────

export function MobilePolicyCard({ policy, onView }: MobilePolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !policy.insurerName
        || policy.insurerName === '__PENDING_EXTRACTION__'
        || policy.insurerName === 'Unknown Insurer'
        || policy.insurerName === 'Άγνωστος ασφαλιστής'
    const localizedLob = t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
    const displayInsurer = isPendingInsurer ? localizedLob : policy.insurerName
    const statusLabel = t.policyStatus?.[policy.status as keyof typeof t.policyStatus] || policy.status
    const LobIcon = getLobIcon(policy.lineOfBusiness)
    const cfg = getStatusConfig(isAnalyzing ? 'active' : policy.status)
    const { cls: coverageCls, pct: coveragePct } = statusCoverage(policy.status)

    return (
        <button
            type="button"
            onClick={onView}
            className={`group w-full text-left rounded-xl border bg-white p-3 transition-all active:scale-[0.98] hover:shadow-md dark:bg-[#111111] ${cfg.border}`}
            aria-label={`${displayInsurer} — ${localizedLob}`}
        >
            <div className="flex items-center gap-3">
                {/* LOB icon — h-9 w-9 rounded-lg, semantic status colors */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
                    {isAnalyzing ? (
                        <Sparkles className={`h-5 w-5 animate-pulse ${cfg.icon}`} />
                    ) : (
                        <LobIcon className={`h-5 w-5 ${cfg.icon}`} />
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
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {/* Row 2: LOB + expiry inline */}
                    <p className="mb-1.5 text-[11px] text-[#94A3B8]">
                        {localizedLob}
                        {!isAnalyzing && policy.endDate && (
                            <> · {formatRelativeExpiry(policy.endDate, locale)}</>
                        )}
                    </p>

                    {/* Row 3: coverage progress bar */}
                    {!isAnalyzing ? (
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-white/10">
                                <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar} ${coverageCls}`} />
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

export function MobilePolicyCardSkeleton() {
    return (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 dark:bg-[#111111] dark:border-white/8">
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
