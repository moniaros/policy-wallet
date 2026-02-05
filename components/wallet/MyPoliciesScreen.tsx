"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { MobilePolicyCard } from './MobilePolicyCard'
import type { Policy } from './types'
import { CarIcon, HomeIcon, DocumentIcon } from '@/components/icons/PolicyIcons'

interface MyPoliciesScreenProps {
    policies: Policy[]
    onViewPolicy?: (id: string) => void
    onAddPolicy?: () => void
}

export function MyPoliciesScreen({ policies, onViewPolicy, onAddPolicy }: MyPoliciesScreenProps) {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Branded Header */}
            <div className="px-6 pt-12 pb-8 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                    <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                    <span className="text-2xl font-black tracking-tight text-teal-600">Wallet</span>
                </div>
                <button
                    onClick={onAddPolicy}
                    className="w-12 h-12 flex items-center justify-center bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full transition-all active:scale-[0.95] shadow-xl"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="px-6 pb-6">
                <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-1 leading-tight">
                    {language === 'el' ? 'Τα Συμβόλαια' : 'My'} <span className="text-stone-400 dark:text-stone-500 italic">Policies.</span>
                </h1>
                <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">
                    {policies.length} {language === 'el' ? 'Συμβόλαια Ενεργά' : 'Active Policies'}
                </p>
            </div>

            {/* Policy List */}
            <div className="px-6 space-y-4">
                {policies.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-stone-800 rounded-[32px] border-2 border-dashed border-stone-200 dark:border-stone-700">
                        <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center">
                            <DocumentIcon className="w-10 h-10 text-stone-400 dark:text-stone-500" />
                        </div>
                        <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2 tracking-tight">
                            {language === 'el' ? 'Δεν έχετε συμβόλαια' : 'No policies yet'}
                        </h3>
                        <p className="text-stone-500 mb-8 max-w-[200px] mx-auto">
                            {language === 'el'
                                ? 'Προσθέστε το πρώτο σας συμβόλαιο για να ξεκινήσετε'
                                : 'Add your first policy to get started'}
                        </p>
                        <button
                            onClick={onAddPolicy}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-teal-600/20"
                        >
                            {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Add Policy'}
                        </button>
                    </div>
                ) : (
                    policies.map(policy => (
                        <div
                            key={policy.id}
                            onClick={() => onViewPolicy?.(policy.id)}
                            className="bg-white dark:bg-stone-900 rounded-[32px] p-5 flex items-center gap-4 shadow-sm border border-stone-50 dark:border-stone-800/50 active:scale-[0.98] transition-all cursor-pointer group"
                        >
                            <div className="w-14 h-14 rounded-[20px] bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                {policy.lineOfBusiness === 'motor' && <CarIcon className="w-7 h-7" />}
                                {policy.lineOfBusiness === 'home' && <HomeIcon className="w-7 h-7" />}
                                {!['motor', 'home'].includes(policy.lineOfBusiness as string) && <DocumentIcon className="w-7 h-7" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-black text-stone-900 dark:text-white tracking-tight truncate">
                                    {policy.insurerName}
                                </h3>
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                    {policy.policyNumber}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${policy.status === 'active' ? 'bg-teal-600 text-white' : 'bg-amber-400 text-stone-900'}`}>
                                    {policy.status.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] font-bold text-stone-400">
                                    {policy.endDate ? new Date(policy.endDate).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { day: '2-digit', month: '2-digit' }) : ''}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
