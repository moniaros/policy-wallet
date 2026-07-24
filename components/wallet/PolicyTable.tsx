"use client"

import { AlertCircle, CalendarDays, FileText, MoreVertical, RefreshCw, Search, Share2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getDocumentPolicySummary } from '@/lib/wallet/document-insights'
import { getPolicyStatusView } from '@/lib/wallet/policy-status-view'
import { StatusPill } from '@/components/ui/StatusPill'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { getBranchIcon } from '@/lib/insurance/branch-icons'
import { cn } from '@/lib/utils'

interface PolicyTableProps {
    policies: Policy[]
    onViewPolicy?: (policyId: string) => void
    onRenewPolicy?: (policyId: string) => void
    onViewHistory?: (policyId: string) => void
    onRunAnalysis?: (policyId: string) => void
    onDelete?: (policyId: string) => void
    onShare?: (policyId: string) => void
    onViewDocuments?: (policyId: string) => void
}

const POLICIES_PER_PAGE = 10

export function PolicyTable({
    policies,
    onViewPolicy,
    onRenewPolicy,
    onRunAnalysis,
    onDelete,
    onShare,
    onViewDocuments,
}: PolicyTableProps) {
    const { language, t } = useLanguage()
    const lang: 'el' | 'en' = language === 'el' ? 'el' : 'en'
    const locale = lang === 'el' ? 'el-GR' : 'en-GB'

    const [currentPage, setCurrentPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; origin: string } | null>(null)

    const totalPages = Math.max(1, Math.ceil(policies.length / POLICIES_PER_PAGE))
    const page = Math.min(currentPage, totalPages)
    const currentPolicies = policies.slice((page - 1) * POLICIES_PER_PAGE, page * POLICIES_PER_PAGE)

    useEffect(() => {
        setCurrentPage(1)
    }, [policies.length])

    const closeMenu = () => {
        setOpenMenuId(null)
        setMenuPosition(null)
    }

    // The row menu already had role="menu"/menuitem and aria-expanded; what it
    // lacked was any keyboard exit — Escape did nothing, so a keyboard user who
    // opened it was stuck inside. Focus returns to the row's trigger on close.
    useEffect(() => {
        if (!openMenuId) return
        const trigger = document.getElementById(`policy-actions-${openMenuId}`)
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            closeMenu()
            trigger?.focus()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [openMenuId])

    const columns = t.wallet.columns

    return (
        <div className="pw-card overflow-hidden p-0">
            {/* Wide content scrolls inside its own container — the page never scrolls sideways. */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                    <thead>
                        <tr className="border-b border-black/[0.07] dark:border-white/10">
                            <th className="pw-kicker px-4 py-2.5">{columns.policy}</th>
                            <th className="pw-kicker px-4 py-2.5">{columns.type}</th>
                            <th className="pw-kicker px-4 py-2.5">{columns.renewal}</th>
                            <th className="pw-kicker px-4 py-2.5 text-right">{columns.annualPremium}</th>
                            <th className="pw-kicker px-4 py-2.5">{columns.status}</th>
                            <th className="pw-kicker px-4 py-2.5 text-right">{columns.actions}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {currentPolicies.map((policy) => {
                            const branch = normalizeBranch(policy.lineOfBusiness)
                            const Icon = getBranchIcon(branch.id)
                            const summary = getDocumentPolicySummary(policy, lang, branch.label[lang])
                            const view = getPolicyStatusView(policy, t)
                            const isMenuOpen = openMenuId === policy.id

                            const renewalLabel = view.endDate
                                ? view.endDate.toLocaleDateString(locale, { timeZone: 'UTC' })
                                : '—'
                            const daysLeft =
                                view.daysUntilExpiry !== null &&
                                view.daysUntilExpiry >= 0 &&
                                view.daysUntilExpiry <= 60
                                    ? view.daysUntilExpiry
                                    : null

                            return (
                                <tr
                                    key={policy.id}
                                    onClick={() => onViewPolicy?.(policy.id)}
                                    className="cursor-pointer border-b border-black/[0.05] transition-colors last:border-0 hover:bg-black/[0.02] dark:border-white/[0.07] dark:hover:bg-white/[0.03]"
                                >
                                    {/* Policy — insured asset over insurer, two tight lines */}
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={cn(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                    view.chipClass
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-body-sm font-semibold text-foreground">
                                                    {summary.assetTitle}
                                                </p>
                                                {/* assetTitle falls back to the insurer when there is no
                                                    vehicle/property to name — don't print it twice. */}
                                                <p className="truncate text-micro text-muted-foreground">
                                                    {summary.assetTitle === policy.insurerName
                                                        ? policy.policyNumber
                                                        : policy.insurerName}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <span className="text-caption text-black/70 dark:text-white/70">
                                            {branch.label[lang]}
                                        </span>
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-black/70 dark:text-white/70">
                                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span className="tabular-nums">{renewalLabel}</span>
                                            {daysLeft !== null && (
                                                <span className="tabular-nums text-micro text-muted-foreground">
                                                    ({daysLeft}
                                                    {lang === 'el' ? 'η' : 'd'})
                                                </span>
                                            )}
                                        </span>
                                    </td>

                                    <td className="px-4 py-2.5 text-right">
                                        <span className="text-body-sm font-semibold tabular-nums text-foreground">
                                            {summary.premiumDisplay}
                                        </span>
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <StatusPill tone={view.tone} label={view.label} />
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <div
                                            className="flex items-center justify-end gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => onViewPolicy?.(policy.id)}
                                                className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-caption font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                                            >
                                                {columns.manage}
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    const MENU_WIDTH = 240
                                                    const MENU_HEIGHT = 240
                                                    const PAD = 12
                                                    const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT

                                                    setMenuPosition({
                                                        top: openUpward
                                                            ? Math.max(PAD, rect.top - MENU_HEIGHT - 8)
                                                            : Math.min(
                                                                window.innerHeight - MENU_HEIGHT - PAD,
                                                                rect.bottom + 8
                                                            ),
                                                        left: Math.min(
                                                            window.innerWidth - MENU_WIDTH - PAD,
                                                            Math.max(PAD, rect.right - MENU_WIDTH)
                                                        ),
                                                        origin: openUpward ? 'bottom right' : 'top right',
                                                    })
                                                    if (isMenuOpen) closeMenu()
                                                    else setOpenMenuId(policy.id)
                                                }}
                                                className={cn(
                                                    'cursor-pointer rounded-lg p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
                                                    isMenuOpen
                                                        ? 'bg-black/5 dark:bg-white/10'
                                                        : 'hover:bg-black/5 dark:hover:bg-white/10'
                                                )}
                                                id={`policy-actions-${policy.id}`}
                                                aria-label={columns.actions}
                                                aria-expanded={isMenuOpen}
                                                aria-haspopup="menu"
                                            >
                                                <MoreVertical className="h-4 w-4 text-black/60 dark:text-white/60" />
                                            </button>

                                            {isMenuOpen &&
                                                typeof document !== 'undefined' &&
                                                createPortal(
                                                    <>
                                                        <div aria-hidden="true" className="fixed inset-0 z-[9998]" onClick={closeMenu} />
                                                        <div
                                                            role="menu"
                                                            className="animate-in fade-in zoom-in-95 fixed z-[9999] w-60 rounded-2xl border border-black/10 bg-white py-1.5 shadow-2xl duration-150 dark:border-white/15 dark:bg-black"
                                                            style={{
                                                                top: `${menuPosition?.top ?? 0}px`,
                                                                left: `${menuPosition?.left ?? 0}px`,
                                                                transformOrigin: menuPosition?.origin ?? 'top right',
                                                            }}
                                                        >
                                                            <MenuItem
                                                                icon={Search}
                                                                label={t.dashboard.runAnalysis}
                                                                onClick={() => {
                                                                    onRunAnalysis?.(policy.id)
                                                                    closeMenu()
                                                                }}
                                                            />
                                                            <MenuItem
                                                                icon={FileText}
                                                                label={t.wallet.documents}
                                                                onClick={() => {
                                                                    onViewDocuments?.(policy.id)
                                                                    closeMenu()
                                                                }}
                                                            />
                                                            <MenuItem
                                                                icon={Share2}
                                                                label={t.wallet.shareWithAgent}
                                                                onClick={() => {
                                                                    onShare?.(policy.id)
                                                                    closeMenu()
                                                                }}
                                                            />
                                                            {(view.key === 'expiring_soon' || view.key === 'expired') && (
                                                                <MenuItem
                                                                    icon={RefreshCw}
                                                                    label={t.dashboard.renewPolicy}
                                                                    onClick={() => {
                                                                        onRenewPolicy?.(policy.id)
                                                                        closeMenu()
                                                                    }}
                                                                />
                                                            )}
                                                            <MenuItem
                                                                icon={Trash2}
                                                                label={t.dashboard.delete}
                                                                destructive
                                                                onClick={() => {
                                                                    onDelete?.(policy.id)
                                                                    closeMenu()
                                                                }}
                                                            />
                                                        </div>
                                                    </>,
                                                    document.body
                                                )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {currentPolicies.length === 0 && (
                <div className="px-6 py-10 text-center">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6 text-black/30 dark:text-white/30" />
                    <h3 className="text-body-sm font-semibold text-black dark:text-white">{t.dashboard.noPolicies}</h3>
                    <p className="mt-0.5 text-caption text-black/55 dark:text-white/55">{t.dashboard.addFirstPolicy}</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-black/[0.07] px-4 py-2.5 dark:border-white/10">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="cursor-pointer rounded-full px-3 py-1.5 text-caption font-medium text-black/70 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10"
                    >
                        {t.dashboard.previous}
                    </button>

                    <span className="text-caption tabular-nums text-black/60 dark:text-white/50">
                        {page} / {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="cursor-pointer rounded-full px-3 py-1.5 text-caption font-medium text-black/70 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10"
                    >
                        {t.dashboard.next}
                    </button>
                </div>
            )}
        </div>
    )
}

function MenuItem({
    icon: Icon,
    label,
    onClick,
    destructive,
}: {
    icon: React.ElementType
    label: string
    onClick: () => void
    destructive?: boolean
}) {
    return (
        <button
            role="menuitem"
            onClick={onClick}
            className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-body-sm font-medium transition-colors',
                destructive
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/15'
                    : 'text-black/80 hover:bg-black/5 dark:text-white/85 dark:hover:bg-white/10'
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    )
}
