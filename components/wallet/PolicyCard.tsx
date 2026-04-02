"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRight, BadgeCheck, Sparkles } from 'lucide-react'
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

function getStatusBadge(status: string, t: any) {
    const label = t.policyStatus?.[status as keyof typeof t.policyStatus] || status
    const styles: Record<string, string> = {
        active: 'bg-[#1FDC86]/15 text-[#19b870] dark:bg-[#1FDC86]/15 dark:text-[#7de8ba]',
        expiring_soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        action_needed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        analyzing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
        cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        incomplete: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }
    return { label, className: styles[status] || styles.incomplete }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PolicyCard({ policy, onView, id }: PolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !policy.insurerName || policy.insurerName === '__PENDING_EXTRACTION__' || policy.insurerName === 'Unknown Insurer' || policy.insurerName === 'Άγνωστος ασφαλιστής'
    const localizedLob = t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
    const displayInsurer = isPendingInsurer ? localizedLob : policy.insurerName
    const status = getStatusBadge(policy.status, t)
    const LobIcon = getLobIcon(policy.lineOfBusiness)

    return (
        <button
            type="button"
            id={id}
            onClick={onView}
            className="group w-full text-left pw-card rounded-3xl p-5 transition-all hover:shadow-lg active:scale-[0.98]"
            aria-label={`${displayInsurer} — ${localizedLob}`}
        >
            <div className="flex items-start gap-4">
                {/* LOB Icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1FDC86]/15 text-[#19b870] dark:bg-[#1FDC86]/12 dark:text-[#7de8ba]">
                    {isAnalyzing ? (
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    ) : (
                        <LobIcon className="h-5 w-5" />
                    )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    {/* Row 1: Insurer + Status */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-black dark:text-white">
                                {displayInsurer}
                            </span>
                            {policy.verified && !isAnalyzing && (
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Row 2: Coverage type */}
                    <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                        {localizedLob}
                    </p>

                    {/* Row 3: Expiry + Chevron */}
                    {!isAnalyzing && (
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-black/40 dark:text-white/40">
                                {formatRelativeExpiry(policy.endDate, locale)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-black/20 transition-transform group-hover:translate-x-0.5 dark:text-white/20" />
                        </div>
                    )}

                    {/* Analyzing step label */}
                    {isAnalyzing && (
                        <p className="mt-2 text-xs text-blue-500 animate-pulse">
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
        <div className="pw-card rounded-3xl p-5">
            <div className="flex items-start gap-4">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
        </div>
    )
}
