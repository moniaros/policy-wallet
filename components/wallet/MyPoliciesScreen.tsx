"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import type { Policy } from './types'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { CarIcon, HomeIcon, DocumentIcon, ShieldIcon, HeartIcon, BriefcaseIcon, PlaneIcon } from '@/components/icons/PolicyIcons'
import { calculatePremiumFootprint } from '@/lib/wallet/premium-footprint'
import { getDocumentPolicySummary } from '@/lib/wallet/document-insights'
import { getRoleCopy } from '@/lib/i18n/role-copy'

interface MyPoliciesScreenProps {
    policies: Policy[]
    onViewPolicy?: (id: string) => void
    onAddPolicy?: () => void
}

export function MyPoliciesScreen({ policies, onViewPolicy, onAddPolicy }: MyPoliciesScreenProps) {
    const { language, t } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const totalPremium = calculatePremiumFootprint(policies)

    const copy = {
        title: roleCopy.walletDashboard.noPoliciesYet,
        subtitle: roleCopy.walletDashboard.subtitle,
        activePolicies: t.wallet.myPoliciesScreen.activePolicies,
        yearlyFootprint: roleCopy.walletDashboard.yearlyFootprint,
        addPolicy: roleCopy.walletDashboard.addPolicyAria,
        emptyTitle: roleCopy.walletDashboard.emptyWalletTitle,
        emptyDescription: roleCopy.walletDashboard.emptyWalletDescription,
        expires: roleCopy.walletDashboard.expires,
        policyCount: roleCopy.walletDashboard.policyCountLabel,
    }

    const statusClass = (tone: 'critical' | 'warning' | 'active' | 'inactive' | 'info') => {
        if (tone === 'critical') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        if (tone === 'warning') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        if (tone === 'inactive') return 'bg-black/5 text-black/65 dark:bg-black dark:text-white/70'
        if (tone === 'info') return 'bg-black/5 text-black/75 dark:bg-black dark:text-white/75'
        return 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint'
    }

    const getVisual = (policy: Policy) => {
        switch (policy.lineOfBusiness) {
            case 'motor':
                return { Icon: CarIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
            case 'health':
                return { Icon: HeartIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
            case 'home':
                return { Icon: HomeIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
            case 'life':
                return { Icon: ShieldIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
            case 'travel':
                return { Icon: PlaneIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
            default:
                return { Icon: BriefcaseIcon, shell: 'bg-black/5 dark:bg-black border border-black/10 dark:border-white/15', icon: 'text-primary dark:text-mint' }
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black pb-28">
            <div className="px-5 pt-6 pb-6 flex items-center justify-between sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-black/10 dark:border-white/15">
                <PolicyWalletLogo size="sm" language={language} />
                <button
                    onClick={onAddPolicy}
                    className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white text-black dark:text-black rounded-2xl transition-all active:scale-[0.95] shadow-sm border border-black/10 dark:border-white/15 cursor-pointer"
                    aria-label={copy.addPolicy}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="px-5 pb-6">
                <h1 className="text-3xl font-black text-black dark:text-white tracking-tight leading-tight">
                    {copy.title}
                </h1>
                <p className="text-black/55 dark:text-white/65 text-sm mt-1 mb-5">
                    {copy.subtitle}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl p-4 bg-white dark:bg-black border border-black/10 dark:border-white/15">
                        <p className="text-[11px] font-bold text-black/55 dark:text-white/65 uppercase tracking-wider">{copy.activePolicies}</p>
                        <p className="text-3xl font-black text-black dark:text-white mt-2">{policies.length}</p>
                        <p className="text-xs text-black/45 dark:text-white/55 mt-1">{copy.policyCount}</p>
                    </div>
                    <div className="rounded-3xl p-4 bg-primary-tint dark:bg-primary/15 border border-primary/30 dark:border-primary/35 text-black dark:text-white">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary dark:text-mint">{copy.yearlyFootprint}</p>
                        <p className="text-2xl font-black mt-2">
                            {new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', { style: 'currency', currency: 'EUR' }).format(totalPremium)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-3">
                {policies.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-black rounded-3xl border border-dashed border-black/15 dark:border-white/20">
                        <div className="w-16 h-16 mx-auto mb-5 bg-black/5 dark:bg-black rounded-full flex items-center justify-center border border-black/10 dark:border-white/15">
                            <DocumentIcon className="w-10 h-10 text-black/45 dark:text-white/60" />
                        </div>
                        <h3 className="text-xl font-black text-black dark:text-white mb-2">
                            {copy.emptyTitle}
                        </h3>
                        <p className="text-black/55 dark:text-white/65 mb-6 max-w-[240px] mx-auto text-sm">
                            {copy.emptyDescription}
                        </p>
                        <button
                            onClick={onAddPolicy}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-semibold rounded-2xl border border-primary/35 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            {copy.addPolicy}
                        </button>
                    </div>
                ) : (
                    policies.map((policy) => {
                        const typeLabel = policy.lineOfBusiness
                        const summary = getDocumentPolicySummary(policy, language === 'el' ? 'el' : 'en', typeLabel)
                        const visual = getVisual(policy)

                        return (
                            <button
                                key={policy.id}
                                onClick={() => onViewPolicy?.(policy.id)}
                                className="w-full bg-white dark:bg-black rounded-3xl p-4 flex items-center gap-4 border border-black/10 dark:border-white/15 active:scale-[0.98] transition-all cursor-pointer text-left"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${visual.shell} flex items-center justify-center`}>
                                    <visual.Icon className={`w-6 h-6 ${visual.icon}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-black dark:text-white truncate">
                                        {summary.assetTitle}
                                    </h3>
                                    <p className="text-xs font-medium text-black/55 dark:text-white/65 uppercase tracking-wider truncate">
                                        {summary.assetSubtitle}
                                    </p>
                                    <p className="text-xs text-black/55 dark:text-white/65 mt-1 truncate">
                                        {summary.insurerLine}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass(summary.status.tone)}`}>
                                        {summary.status.label}
                                    </span>
                                    <span className="text-[11px] text-black/55 dark:text-white/65">
                                        {copy.expires} {summary.expiryDisplay}
                                    </span>
                                    <span className="text-[11px] text-black/55 dark:text-white/65 font-semibold">
                                        {summary.premiumDisplay}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
