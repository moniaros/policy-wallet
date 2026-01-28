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
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-stone-900 dark:to-stone-800">
            {/* Header */}
            <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900 dark:text-white">
                            PolicyWallet
                        </h1>
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            {language === 'el' ? 'Τα Συμβόλαια Μου' : 'My Policies'}
                        </p>
                    </div>
                    <button
                        onClick={onAddPolicy}
                        className="w-11 h-11 flex items-center justify-center bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full transition-all active:scale-[0.95]"
                        aria-label={language === 'el' ? 'Προσθήκη συμβολαίου' : 'Add policy'}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Policy List */}
            <div className="max-w-md mx-auto px-4 py-6 space-y-4">
                {policies.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                            <DocumentIcon className="w-10 h-10 text-stone-400 dark:text-stone-500" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
                            {language === 'el' ? 'Δεν έχετε συμβόλαια' : 'No policies yet'}
                        </h3>
                        <p className="text-stone-600 dark:text-stone-400 mb-6">
                            {language === 'el'
                                ? 'Προσθέστε το πρώτο σας συμβόλαιο για να ξεκινήσετε'
                                : 'Add your first policy to get started'}
                        </p>
                        <button
                            onClick={onAddPolicy}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Add Policy'}
                        </button>
                    </div>
                ) : (
                    policies.map(policy => (
                        <div key={policy.id} className="bg-white dark:bg-stone-800 rounded-3xl p-5 border-2 border-stone-200 dark:border-stone-700 shadow-sm">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="flex-shrink-0 w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center justify-center">
                                    {policy.lineOfBusiness === 'motor' && <CarIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />}
                                    {policy.lineOfBusiness === 'home' && <HomeIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />}
                                    {!['motor', 'home'].includes(policy.lineOfBusiness as string) && <DocumentIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-stone-900 dark:text-white mb-1">
                                        {policy.insurerName || (language === 'el' ? 'Ασφάλεια' : 'Insurance')}
                                    </h3>
                                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-1">
                                        {language === 'el' ? 'Πήμος' : 'Policy'}: {policy.policyNumber}
                                    </p>
                                    <p className="text-sm text-stone-600 dark:text-stone-400">
                                        {language === 'el' ? 'Λλέθη' : 'Expires'}: {policy.endDate ? new Date(policy.endDate).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                    </p>
                                </div>
                            </div>

                            {/* View Button */}
                            <button
                                onClick={() => onViewPolicy?.(policy.id)}
                                className="w-full mt-4 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                {language === 'el' ? 'Προβολή' : 'View'}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-around">
                    <button className="flex flex-col items-center gap-1 text-teal-600 dark:text-teal-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Αρχή' : 'Home'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-900 dark:text-white">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Συμβόλαια' : 'Policies'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Πράκτορας' : 'Agent'}</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-stone-400 dark:text-stone-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold">{language === 'el' ? 'Προφίλ' : 'Profile'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
