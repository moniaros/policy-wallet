"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon,
    DocumentIcon,
} from '@/components/icons/PolicyIcons'
import { ChevronRight, BadgeCheck, Sparkles } from 'lucide-react'
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

function getStatusStyle(status: string): string {
    const styles: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        expiring_soon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        action_needed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        analyzing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse',
        cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    }
    return styles[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

// ── Component ────────────────────────────────────────────────────────────────

export function MobilePolicyCard({ policy, onView }: MobilePolicyCardProps) {
    const { t, language } = useLanguage()
    const locale = language as 'el' | 'en'

    const isAnalyzing = policy.status === 'analyzing'
    const isPendingInsurer = !policy.insurerName || policy.insurerName === '__PENDING_EXTRACTION__' || policy.insurerName === 'Unknown Insurer' || policy.insurerName === 'Άγνωστος ασφαλιστής'
    const localizedLob = t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
    const displayInsurer = isPendingInsurer ? localizedLob : policy.insurerName
    const statusLabel = t.policyStatus?.[policy.status as keyof typeof t.policyStatus] || policy.status
    const LobIcon = getLobIcon(policy.lineOfBusiness)

    return (
        <button
            type="button"
            onClick={onView}
            className="group w-full text-left rounded-2xl bg-white p-4 shadow-sm transition-all active:scale-[0.98] dark:bg-slate-900"
            aria-label={`${displayInsurer} — ${localizedLob}`}
        >
            <div className="flex items-center gap-3.5">
                {/* LOB Icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {isAnalyzing ? (
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    ) : (
                        <LobIcon className="h-5 w-5" />
                    )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-black dark:text-white">
                                {displayInsurer}
                            </span>
                            {policy.verified && !isAnalyzing && (
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusStyle(policy.status)}`}>
                            {statusLabel}
                        </span>
                    </div>

                    <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                        {localizedLob}
                    </p>
                </div>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 shrink-0 text-black/20 dark:text-white/20" />
            </div>

            {/* Expiry row */}
            {!isAnalyzing && (
                <div className="mt-2.5 flex items-center justify-between border-t border-black/5 pt-2.5 dark:border-white/5">
                    <span className="text-[11px] font-medium text-black/40 dark:text-white/40">
                        {formatRelativeExpiry(policy.endDate, locale)}
                    </span>
                </div>
            )}

            {isAnalyzing && (
                <div className="mt-2.5 border-t border-black/5 pt-2.5 dark:border-white/5">
                    <p className="text-[11px] text-blue-500 animate-pulse">
                        {t.policyStatus?.analyzing || 'Analyzing...'}
                    </p>
                </div>
            )}
        </button>
    )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function MobilePolicyCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <div className="mt-2.5 border-t border-black/5 pt-2.5 dark:border-white/5">
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    )
}
