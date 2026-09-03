"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PolicyWalletProps, Policy } from './types'
import { StatusSummary } from './StatusSummary'
import { PolicyCard } from './PolicyCard'
import { PolicyTable } from './PolicyTable'
import { EmptyState } from './EmptyState'
import { useLanguage } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, FileUp, Grid3X3, List, PenSquare, Plus, Sparkles, Search } from 'lucide-react'
import { calculatePremiumFootprintDetailed } from '@/lib/wallet/premium-footprint'
import { getPolicyStatusView, isAttentionKey } from '@/lib/wallet/policy-status-view'
import { ImportantNotices, type Notice } from './ImportantNotices'
import { getRoleCopy } from '@/lib/i18n/role-copy'
import { INSURANCE_BRANCHES, normalizeBranch } from '@/lib/insurance/taxonomy'
import { formatDate } from '@/lib/i18n/format'
import { displayInsurerName, policyAssetIdentifier, warnOnHomoglyphNearMisses } from '@/lib/wallet/policy-identity'

export function PolicyWallet({
    policies,
    isLoading = false,
    onViewPolicy,
    onAddManually,
    onUploadDocument,
    onBatchUpload,
    onShareWithAgent,
    onViewDocuments,
    onRunAnalysis,
    onDeletePolicy,
    onViewHistory,
}: PolicyWalletProps & {
    isLoading?: boolean
    onRunAnalysis?: (policyId: string) => void
    onDeletePolicy?: (policyId: string) => void
    onViewHistory?: (policyId: string) => void
}) {
    const { t, language } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const [showAddMenu, setShowAddMenu] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<string>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const addMenuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const savedMode = localStorage.getItem('wallet_view_mode') as 'grid' | 'list' | null
        if (savedMode) setViewMode(savedMode)
    }, [])

    useEffect(() => {
        if (!showAddMenu) return

        const closeOnOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null
            if (target && addMenuRef.current && !addMenuRef.current.contains(target)) {
                setShowAddMenu(false)
            }
        }

        document.addEventListener('mousedown', closeOnOutside)
        document.addEventListener('touchstart', closeOnOutside)
        return () => {
            document.removeEventListener('mousedown', closeOnOutside)
            document.removeEventListener('touchstart', closeOnOutside)
        }
    }, [showAddMenu])

    const filteredPolicies = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()

        return policies.filter((policy) => {
            const byQuery =
                !query ||
                policy.policyNumber?.toLowerCase().includes(query) ||
                policy.insurerName?.toLowerCase().includes(query) ||
                policy.lineOfBusiness?.toLowerCase().includes(query) ||
                // The row shows the asset identifier (plate/address/pet), so
                // typing what the row shows must find the row.
                policyAssetIdentifier(policy)?.toLowerCase().includes(query)

            const byFilter = activeFilter === 'all' || normalizeBranch(policy.lineOfBusiness).id === activeFilter
            return byQuery && byFilter
        })
    }, [policies, searchQuery, activeFilter])

    // Acceptance 3 (P5-wallet-01): Greek/Latin homoglyph pairs among the
    // rendered identifiers («ΙΚΖ-4821» Greek vs «IKZ-4821» Latin) are LOGGED,
    // never resolved — two different vehicles can legitimately produce that
    // pair, so both rows render, byte-honest, and the log is the trace that a
    // human should look at the pair.
    useEffect(() => {
        warnOnHomoglyphNearMisses(
            policies.map((policy) => policyAssetIdentifier(policy)),
            '/wallet list'
        )
    }, [policies])

    // KPI counts come from the computed lifecycle (real end dates), not the
    // stored status string — nothing ever recomputes the stored value, so an
    // expired policy would count as active forever.
    const views = useMemo(() => policies.map((p) => getPolicyStatusView(p, t)), [policies, t])
    const activeCount = views.filter((v) => v.key === 'active').length
    const expiringCount = views.filter((v) => v.key === 'expiring_soon').length
    const attentionCount = views.filter((v) => isAttentionKey(v.key)).length
    // Same lifecycle predicate as the counts above, so the premium total and the
    // "active" tile can never tell two different stories.
    const premiumFootprint = calculatePremiumFootprintDetailed(policies)

    // One notice per policy that needs the user, newest problem first. The old UI
    // shouted this as a full-width block; it is a bulleted list now.
    const notices = useMemo<Notice[]>(() => {
        const copy = t.wallet.notices
        return policies
            .map((policy, i) => ({ policy, view: views[i] }))
            .filter(({ view }) => isAttentionKey(view.key))
            .sort((a, b) => (a.view.daysUntilExpiry ?? 9999) - (b.view.daysUntilExpiry ?? 9999))
            .map(({ policy, view }) => {
                // The branch label always resolves; the insurer may not exist
                // yet (extraction pending or unreadable). Compose only the
                // parts that are real — this line used to interpolate the raw
                // column and printed "Αυτοκίνητο · __PENDING_EXTRACTION__".
                const branchLabel = normalizeBranch(policy.lineOfBusiness).label[language === 'el' ? 'el' : 'en']
                const insurer = displayInsurerName(policy.insurerName)
                const name = insurer ? `${branchLabel} · ${insurer}` : branchLabel
                // Athens-pinned (shared formatter): a raw UTC date could show the
                // previous day and disagree with the Athens-computed days-left.
                const date = view.endDate ? formatDate(view.endDate, language === 'el' ? 'el' : 'en') : ''
                const template =
                    view.key === 'expired' ? copy.expired
                        : view.key === 'expiring_soon' ? copy.expiringSoon
                            : view.key === 'unknown_duration' ? copy.unknownDuration
                                : copy.actionNeeded
                return {
                    id: policy.id,
                    policyId: policy.id,
                    text: template
                        .replace('{policy}', name)
                        .replace('{date}', date)
                        .replace('{days}', String(Math.max(view.daysUntilExpiry ?? 0, 0))),
                }
            })
    }, [policies, views, t, language])

    // Filter chips follow the branches actually present in this portfolio,
    // in canonical taxonomy order — a pet-only wallet gets a pet chip, not
    // a fixed motor/health/home row it can't use.
    const presentBranchIds = useMemo(() => {
        const present = new Set(policies.map((policy) => normalizeBranch(policy.lineOfBusiness).id))
        return INSURANCE_BRANCHES.filter((branch) => present.has(branch.id)).map((branch) => branch.id)
    }, [policies])
    const filters: string[] = ['all', ...presentBranchIds]

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-12 rounded-2xl mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-3xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (policies.length === 0) {
        return <EmptyState onAddManually={onAddManually} onUploadDocument={onUploadDocument} />
    }

    return (
        <div className="mx-auto max-w-7xl bg-transparent px-4 pb-10 pt-4 sm:px-6 lg:px-8">
            {/* KPIs lead — they are the answer to "how is my cover doing?" and used to
                sit below the filter bar, where nobody looked. */}
            <StatusSummary
                activeCount={activeCount}
                expiringCount={expiringCount}
                attentionCount={attentionCount}
                totalPolicies={policies.length}
                totalPremium={premiumFootprint.total}
                unknownDurationCount={premiumFootprint.unknownDurationCount}
                unknownPremiumCount={premiumFootprint.unknownPremiumCount}
                premiumCurrency={premiumFootprint.currency}
                otherCurrencyCount={premiumFootprint.otherCurrencyCount}
            />

            <ImportantNotices notices={notices} onSelect={onViewPolicy} />

            <div className="mb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative group w-full sm:max-w-md">
                        <input
                            type="text"
                            aria-label={t.wallet.searchPlaceholder}
                            placeholder={t.wallet.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pw-input pl-10 pr-4"
                        />
                        <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
                        <div className="pw-subcard pw-scroll-strip min-w-0 max-w-full gap-0.5 !rounded-full p-1">
                            {filters.map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`inline-flex min-h-10 cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 text-caption font-semibold transition-colors ${activeFilter === filter
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {filter === 'all' ? t.common.all : t.policyTypes?.[filter as keyof typeof t.policyTypes] || filter}
                                </button>
                            ))}
                        </div>

                        {/* xl:flex — the dense table only appears at xl (at lg the sidebar
                            leaves ~736px and the actions column clipped), so below that a
                            view toggle would be a no-op control. */}
                        <div className="pw-subcard hidden gap-0.5 !rounded-full p-1 xl:flex">
                            <button
                                onClick={() => {
                                    setViewMode('grid')
                                    localStorage.setItem('wallet_view_mode', 'grid')
                                }}
                                className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                aria-label={roleCopy.walletDashboard.viewCard}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('list')
                                    localStorage.setItem('wallet_view_mode', 'list')
                                }}
                                className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                aria-label={roleCopy.walletDashboard.viewList}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* The policy list needs an accessible name. The old table carried this
                heading inside itself; the rewrite dropped it, which left the whole
                list unnamed to a screen reader (the only heading on the page was the
                "welcome back" greeting). It lives here now so grid and list share it. */}
            {filteredPolicies.length > 0 && (
            <section aria-labelledby="wallet-policy-list-heading">
                <h2
                    id="wallet-policy-list-heading"
                    className="mb-3 text-body font-semibold text-foreground"
                >
                    {t.dashboard.myPolicies}
                </h2>

                {/* Presentation is CSS-first, not JS-branched: cards are ALWAYS the
                    presentation below `lg`, because a dense table is unusable on a
                    phone and the view toggle is itself desktop-only. `viewMode` only
                    decides what desktop shows. Doing this with a JS breakpoint would
                    reintroduce the hydration fork this change exists to remove. */}
                <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${viewMode === 'list' ? 'xl:hidden' : ''}`}>
                    {filteredPolicies.map((policy, index) => (
                        <PolicyCard
                            key={policy.id}
                            policy={policy}
                            onView={() => onViewPolicy?.(policy.id)}
                            onShare={() => onShareWithAgent?.(policy.id)}
                            onViewDocuments={() => onViewDocuments?.(policy.id)}
                            onRunAnalysis={() => onRunAnalysis?.(policy.id)}
                            // No onDelete on the LIST card. A red trash on every
                            // row keeps a destructive action permanently in
                            // thumb's reach next to three routine ones — the
                            // confirm dialog catches slips, but the HIG's point
                            // is distance, not recovery. Deletion lives on the
                            // policy page (PolicyDetailsClientView), where the
                            // same confirm modal already owns it. The xl:
                            // PolicyTable keeps its delete column: a desktop
                            // table row is not a thumb target.
                            onViewHistory={() => onViewHistory?.(policy.id)}
                            id={index === 0 ? 'tour-policy-card-0' : undefined}
                        />
                    ))}
                </div>

                {viewMode === 'list' && (
                    <div className="hidden xl:block">
                        <PolicyTable
                            policies={filteredPolicies}
                            onViewPolicy={onViewPolicy}
                            onViewHistory={onViewHistory}
                            onRunAnalysis={onRunAnalysis}
                            onDelete={onDeletePolicy}
                            onShare={onShareWithAgent}
                            onViewDocuments={onViewDocuments}
                        />
                    </div>
                )}
            </section>
            )}

            {filteredPolicies.length === 0 && policies.length > 0 && (
                <div className="py-20 text-center">
                    <div className="pw-subcard mx-auto mb-4 grid h-16 w-16 place-items-center !rounded-full">
                        <Search className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="text-title font-semibold tracking-tight text-foreground">{t.wallet.noPoliciesFound}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t.wallet.noPoliciesFoundDesc}</p>
                    <button
                        onClick={() => {
                            setSearchQuery('')
                            setActiveFilter('all')
                        }}
                        className="pw-soft-button mt-6 cursor-pointer"
                    >
                        {roleCopy.walletDashboard.clearFilters}
                    </button>
                </div>
            )}

            {/* Sits ABOVE the mobile bottom nav (77px + safe-area, also z-40) — at
                bottom-8 the two overlapped by ~45px at 375px, burying half the
                add-policy button behind the nav. Desktop has no bottom nav, so it
                keeps the original position from lg up. */}
            <div className="fixed bottom-28 right-6 z-40 lg:bottom-8 lg:right-8">
                {policies.length > 0 ? (
                    <div ref={addMenuRef} className="relative">
                        <div
                            className={`absolute bottom-full right-0 mb-4 flex flex-col gap-2 transition-all duration-200 origin-bottom-right ${showAddMenu ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                                }`}
                        >
                            <button
                                onClick={() => {
                                    onAddManually?.()
                                    setShowAddMenu(false)
                                }}
                                className="pw-card flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap py-2 pl-4 pr-2 text-sm font-semibold text-foreground shadow-xl transition-colors hover:bg-muted"
                            >
                                {roleCopy.walletDashboard.addDetailsManually}
                                <span className="pw-card-chip">
                                    <PenSquare className="w-4 h-4" />
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    onUploadDocument?.()
                                    setShowAddMenu(false)
                                }}
                                data-testid="wallet-menu-upload-document"
                                className="pw-card flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap py-2 pl-4 pr-2 text-sm font-semibold text-foreground shadow-xl transition-colors hover:bg-muted"
                            >
                                {roleCopy.walletDashboard.uploadDocument}
                                <span className="pw-card-chip">
                                    <FileUp className="w-4 h-4" />
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    onBatchUpload?.()
                                    setShowAddMenu(false)
                                }}
                                data-testid="wallet-menu-batch-upload"
                                className="pw-card flex min-h-11 cursor-pointer items-center gap-3 whitespace-nowrap py-2 pl-4 pr-2 text-sm font-semibold text-foreground shadow-xl transition-colors hover:bg-muted"
                            >
                                {roleCopy.walletDashboard.batchUpload}
                                <span className="pw-card-chip">
                                    <List className="w-4 h-4" />
                                </span>
                            </button>
                        </div>
                        <button
                            id="tour-fab"
                            onClick={() => setShowAddMenu((prev) => !prev)}
                            className="grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:bg-primary-hover active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            aria-label={roleCopy.walletDashboard.addPolicyAria}
                            aria-expanded={showAddMenu}
                            aria-haspopup="menu"
                        >
                            <Plus className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onAddManually}
                        id="tour-fab"
                        className="pw-primary-button group relative w-16 h-16"
                        aria-label={roleCopy.walletDashboard.addPolicyAria}
                    >
                        <svg className="w-8 h-8 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}





