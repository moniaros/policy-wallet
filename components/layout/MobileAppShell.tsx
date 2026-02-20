"use client"

import { useRouter, usePathname } from 'next/navigation'
import { MyPoliciesScreen, MyProfileScreen } from '@/components/wallet'
import type { Policy } from '@/components/wallet/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface MobileAppShellProps {
    policies: Policy[]
    user?: {
        id: string
        name: string
        email: string
        photoUrl?: string
        isOnline?: boolean
    }
    agent?: {
        id: string
        name: string
        phone: string
        email: string
        company?: string
        photoUrl?: string
        isOnline?: boolean
    }
}

export function MobileAppShell({ policies, user }: MobileAppShellProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { language } = useLanguage()

    const activeTab = (() => {
        if (pathname === '/wallet' || pathname === '/') return 'home'
        if (pathname?.includes('/tasks')) return 'tasks'
        if (pathname?.includes('/coverage-insights') || pathname?.includes('/coverage')) return 'coverage'
        if (pathname?.includes('/notifications')) return 'alerts'
        if (pathname?.includes('/account')) return 'account'
        return 'home'
    })()

    const copy = {
        allTasksDone: language === 'el' ? 'Όλες οι εργασίες ολοκληρώθηκαν' : 'All tasks complete',
        checkLater: language === 'el' ? 'Επιστρέψτε αργότερα για νέες ενέργειες.' : 'Check back later for new items.',
        coverageTitle: language === 'el' ? 'Ανάλυση καλύψεων' : 'Coverage analysis',
        coverageDesc: language === 'el' ? 'Δείτε τα κενά και τις προτεραιότητες του χαρτοφυλακίου σας.' : 'Review your portfolio gaps and priorities.',
        openInsights: language === 'el' ? 'Άνοιγμα coverage insights' : 'Open coverage insights',
        allCaughtUp: language === 'el' ? 'Είσαι ενημερωμένος' : 'All caught up',
        noWarnings: language === 'el' ? 'Δεν υπάρχουν εκκρεμείς ειδοποιήσεις.' : 'No pending warnings or tasks.',
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
            <div className="pb-24">
                {activeTab === 'home' && (
                    <MyPoliciesScreen
                        policies={policies}
                        onViewPolicy={(id) => router.push(`/wallet/${id}`)}
                        onAddPolicy={() => router.push('/wallet/add')}
                    />
                )}

                {activeTab === 'tasks' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 px-5 py-8">
                        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 text-center">
                            <h3 className="text-lg font-black text-stone-900 dark:text-white">{copy.allTasksDone}</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">{copy.checkLater}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 px-5 py-8">
                        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6">
                            <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2">{copy.coverageTitle}</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">{copy.coverageDesc}</p>
                            <button
                                onClick={() => router.push('/coverage-insights')}
                                className="px-4 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-sm font-bold cursor-pointer"
                            >
                                {copy.openInsights}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 px-5 py-8">
                        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 text-center">
                            <h3 className="text-lg font-black text-stone-900 dark:text-white">{copy.allCaughtUp}</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">{copy.noWarnings}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'account' && (
                    <MyProfileScreen
                        user={user}
                        onEditProfile={() => router.push('/account/edit')}
                        onPaymentMethods={() => router.push('/account/payment')}
                        onSettings={() => router.push('/account/settings')}
                        onHelp={() => router.push('/help')}
                        onLogout={() => router.push('/auth/signout')}
                    />
                )}
            </div>
        </div>
    )
}
