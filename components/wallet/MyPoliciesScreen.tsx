"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import type { Policy } from './types'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { CarIcon, HomeIcon, DocumentIcon, ShieldIcon } from '@/components/icons/PolicyIcons'
import { calculatePremiumFootprint } from '@/lib/wallet/premium-footprint'

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

    const formatStatus = (status: Policy['status']) => {
        if (status === 'active') return language === 'el' ? 'Ενεργό' : 'Active'
        if (status === 'expiring_soon') return language === 'el' ? 'Λήγει σύντομα' : 'Expiring soon'
        if (status === 'action_needed') return language === 'el' ? 'Χρειάζεται ενέργεια' : 'Action needed'
        if (status === 'cancelled') return language === 'el' ? 'Ακυρωμένο' : 'Cancelled'
        if (status === 'analyzing') return language === 'el' ? 'Σε ανάλυση' : 'Analyzing'
        return language === 'el' ? 'Ελλιπές' : 'Incomplete'
    }

    const statusClass = (status: Policy['status']) => {
        if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        if (status === 'expiring_soon') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        if (status === 'action_needed') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-28">
            <div className="px-5 pt-6 pb-6 flex items-center justify-between sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
                <PolicyWalletLogo size="sm" language={language} />
                <button
                    onClick={onAddPolicy}
                    className="w-11 h-11 flex items-center justify-center bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl transition-all active:scale-[0.95] shadow-lg cursor-pointer"
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
                    <div className="rounded-3xl p-4 bg-teal-600 text-white">
                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{copy.yearlyFootprint}</p>
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
                            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
                        >
                            {copy.addPolicy}
                        </button>
                    </div>
                ) : (
                    policies.map((policy) => (
                        <button
                            key={policy.id}
                            onClick={() => onViewPolicy?.(policy.id)}
                            className="w-full bg-white dark:bg-stone-900 rounded-3xl p-4 flex items-center gap-4 border border-stone-200 dark:border-stone-800 active:scale-[0.98] transition-all cursor-pointer text-left"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-300">
                                {policy.lineOfBusiness === 'motor' && <CarIcon className="w-7 h-7" />}
                                {policy.lineOfBusiness === 'home' && <HomeIcon className="w-7 h-7" />}
                                {policy.lineOfBusiness === 'life' && <ShieldIcon className="w-7 h-7" />}
                                {!['motor', 'home', 'life'].includes(policy.lineOfBusiness as string) && <DocumentIcon className="w-7 h-7" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-stone-900 dark:text-white truncate">
                                    {policy.insurerName}
                                </h3>
                                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    {policy.policyNumber}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass(policy.status)}`}>
                                    {formatStatus(policy.status)}
                                </span>
                                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                    {policy.endDate
                                        ? `${copy.expires} ${new Date(policy.endDate).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { day: '2-digit', month: '2-digit' })}`
                                        : ''}
                                </span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}
