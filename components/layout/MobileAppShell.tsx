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
    const { t } = useLanguage()

    const activeTab = (() => {
        if (pathname === '/home' || pathname === '/wallet' || pathname === '/') return 'home'
        if (pathname?.includes('/tasks')) return 'tasks'
        if (pathname?.includes('/coverage-insights') || pathname?.includes('/coverage')) return 'coverage'
        if (pathname?.includes('/notifications')) return 'alerts'
        if (pathname?.includes('/account')) return 'account'
        return 'home'
    })()

    const copy = t.wallet.mobileShell

    return (
        <div className="pw-page-shell">
            <div className="pb-24">
                {activeTab === 'home' && (
                    <MyPoliciesScreen
                        policies={policies}
                        onViewPolicy={(id) => router.push(`/wallet/${id}`)}
                        onAddPolicy={() => router.push('/wallet/add')}
                    />
                )}

                {activeTab === 'tasks' && (
                    <div className="min-h-screen px-5 py-8">
                        <div className="pw-card rounded-3xl p-8 text-center">
                            <h3 className="text-lg font-semibold text-black dark:text-white">{copy.allTasksDone}</h3>
                            <p className="text-sm text-black/55 dark:text-white/65 mt-2">{copy.checkLater}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="min-h-screen px-5 py-8">
                        <div className="pw-card rounded-3xl p-6">
                            <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{copy.coverageTitle}</h3>
                            <p className="text-sm text-black/55 dark:text-white/65 mb-5">{copy.coverageDesc}</p>
                            <button
                                onClick={() => router.push('/coverage-insights')}
                                className="pw-primary-button text-sm cursor-pointer"
                            >
                                {copy.openInsights}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="min-h-screen px-5 py-8">
                        <div className="pw-card rounded-3xl p-8 text-center">
                            <h3 className="text-lg font-semibold text-black dark:text-white">{copy.allCaughtUp}</h3>
                            <p className="text-sm text-black/55 dark:text-white/65 mt-2">{copy.noWarnings}</p>
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
