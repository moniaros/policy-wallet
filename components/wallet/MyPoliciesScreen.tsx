"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import type { Policy } from './types'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { CarIcon, HomeIcon, DocumentIcon, ShieldIcon, HeartIcon, BriefcaseIcon, PlaneIcon } from '@/components/icons/PolicyIcons'
import { calculatePremiumFootprint } from '@/lib/wallet/premium-footprint'
import { getDocumentPolicySummary } from '@/lib/wallet/document-insights'

interface MyPoliciesScreenProps {
    policies: Policy[]
    onViewPolicy?: (id: string) => void
    onAddPolicy?: () => void
}

export function MyPoliciesScreen({ policies, onViewPolicy, onAddPolicy }: MyPoliciesScreenProps) {
    const { language } = useLanguage()
    const totalPremium = calculatePremiumFootprint(policies)

    const copy = {
        title: language === 'el' ? 'Το Πορτοφόλι Μου' : 'My Wallet',
        subtitle: language === 'el' ? 'Τα ασφαλιστήριά σου σε μια καθαρή εικόνα.' : 'Your policies in one clear view.',
        activePolicies: language === 'el' ? 'Ενεργά συμβόλαια' : 'Active policies',
        yearlyFootprint: language === 'el' ? 'Ετήσιο ασφαλιστικό αποτύπωμα' : 'Yearly insurance footprint',
        addPolicy: language === 'el' ? 'Προσθήκη συμβολαίου' : 'Add policy',
        emptyTitle: language === 'el' ? 'Δεν υπάρχουν ασφαλιστήρια ακόμη' : 'No policies yet',
        emptyDescription: language === 'el' ? 'Πρόσθεσε το πρώτο σου συμβόλαιο για να ξεκινήσεις.' : 'Add your first policy to get started.',
        expires: language === 'el' ? 'Λήγει' : 'Expires',
        policyCount: language === 'el' ? 'συμβόλαια' : 'policies',
    }

    const statusClass = (tone: 'critical' | 'warning' | 'active' | 'inactive' | 'info') => {
        if (tone === 'critical') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        if (tone === 'warning') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        if (tone === 'inactive') return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
        if (tone === 'info') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    }

    const getVisual = (policy: Policy) => {
        switch (policy.lineOfBusiness) {
            case 'motor':
                return { Icon: CarIcon, shell: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-700 dark:text-amber-300' }
            case 'health':
                return { Icon: HeartIcon, shell: 'bg-cyan-100 dark:bg-cyan-900/30', icon: 'text-cyan-700 dark:text-cyan-300' }
            case 'home':
                return { Icon: HomeIcon, shell: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-700 dark:text-emerald-300' }
            case 'life':
                return { Icon: ShieldIcon, shell: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-700 dark:text-violet-300' }
            case 'travel':
                return { Icon: PlaneIcon, shell: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-700 dark:text-indigo-300' }
            default:
                return { Icon: BriefcaseIcon, shell: 'bg-stone-100 dark:bg-stone-800', icon: 'text-stone-700 dark:text-stone-300' }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-stone-950 dark:to-stone-900 pb-28">
            <div className="px-5 pt-6 pb-6 flex items-center justify-between sticky top-0 z-20 bg-white/90 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
                <PolicyWalletLogo size="sm" language={language} />
                <button
                    onClick={onAddPolicy}
                    className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-white text-slate-900 dark:text-stone-900 rounded-2xl transition-all active:scale-[0.95] shadow-sm border border-slate-300/70 cursor-pointer"
                    aria-label={copy.addPolicy}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="px-5 pb-6">
                <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                    {copy.title}
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 mb-5">
                    {copy.subtitle}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{copy.activePolicies}</p>
                        <p className="text-3xl font-black text-stone-900 dark:text-white mt-2">{policies.length}</p>
                        <p className="text-xs text-stone-400 mt-1">{copy.policyCount}</p>
                    </div>
                    <div className="rounded-3xl p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900/40 text-sky-900 dark:text-sky-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">{copy.yearlyFootprint}</p>
                        <p className="text-2xl font-black mt-2">
                            {new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', { style: 'currency', currency: 'EUR' }).format(totalPremium)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-3">
                {policies.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-700">
                        <div className="w-16 h-16 mx-auto mb-5 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                            <DocumentIcon className="w-10 h-10 text-stone-400 dark:text-stone-500" />
                        </div>
                        <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">
                            {copy.emptyTitle}
                        </h3>
                        <p className="text-stone-500 dark:text-stone-400 mb-6 max-w-[240px] mx-auto text-sm">
                            {copy.emptyDescription}
                        </p>
                        <button
                            onClick={onAddPolicy}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-900 font-semibold rounded-2xl border border-sky-300/80 transition-all active:scale-[0.98] cursor-pointer"
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
                                className="w-full bg-white dark:bg-stone-900 rounded-3xl p-4 flex items-center gap-4 border border-stone-200 dark:border-stone-800 active:scale-[0.98] transition-all cursor-pointer text-left"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${visual.shell} flex items-center justify-center`}>
                                    <visual.Icon className={`w-6 h-6 ${visual.icon}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-stone-900 dark:text-white truncate">
                                        {summary.assetTitle}
                                    </h3>
                                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">
                                        {summary.assetSubtitle}
                                    </p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 truncate">
                                        {summary.insurerLine}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass(summary.status.tone)}`}>
                                        {summary.status.label}
                                    </span>
                                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                        {copy.expires} {summary.expiryDisplay}
                                    </span>
                                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">
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
