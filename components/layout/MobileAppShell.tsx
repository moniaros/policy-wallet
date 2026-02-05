"use client"

import { useRouter, usePathname } from 'next/navigation'
import { MyPoliciesScreen, MyAgentScreen, MyProfileScreen } from '@/components/wallet'
// MobileBottomNav removed
import type { Policy } from '@/components/wallet/types'
import { hapticFeedback } from '@/utils/haptic'

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

export function MobileAppShell({ policies, user, agent }: MobileAppShellProps) {
    const router = useRouter()
    const pathname = usePathname()

    // Determine active tab from pathname
    const activeTab = (() => {
        if (pathname === '/wallet' || pathname === '/') return 'home'
        if (pathname?.includes('/tasks')) return 'tasks'
        if (pathname?.includes('/coverage')) return 'coverage'
        if (pathname?.includes('/notifications')) return 'alerts'
        if (pathname?.includes('/account')) return 'account'
        return 'home'
    })()

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Content */}
            <div className="pb-24">
                {activeTab === 'home' && (
                    <MyPoliciesScreen
                        policies={policies}
                        onViewPolicy={(id) => router.push(`/wallet/${id}`)}
                        onAddPolicy={() => router.push('/wallet/add')}
                    />
                )}

                {activeTab === 'tasks' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
                        <div className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md">
                            <div className="flex items-center gap-0.5">
                                <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                                <span className="text-2xl font-black tracking-tight text-teal-600">Tasks</span>
                            </div>
                        </div>
                        <div className="px-6">
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-300 mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-stone-900 dark:text-white">All Tasks Complete</h3>
                                <p className="text-sm text-stone-500 mt-1">Check back later for new items.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
                        <div className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md">
                            <div className="flex items-center gap-0.5">
                                <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                                <span className="text-2xl font-black tracking-tight text-teal-600">Coverage</span>
                            </div>
                        </div>
                        <div className="px-6">
                            <div className="bg-teal-600 rounded-[32px] p-8 text-white shadow-xl shadow-teal-600/20 mb-6">
                                <h3 className="text-2xl font-black tracking-tight mb-2">Coverage Analysis</h3>
                                <p className="opacity-90 leading-relaxed text-sm">
                                    Your portfolio is being analyzed by our AI. Insights will appear here shortly.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
                        <div className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 z-20 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md">
                            <div className="flex items-center gap-0.5">
                                <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                                <span className="text-2xl font-black tracking-tight text-teal-600">Alerts</span>
                            </div>
                        </div>
                        <div className="px-6">
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-300 mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-stone-900 dark:text-white">All Caught Up!</h3>
                                <p className="text-sm text-stone-500 mt-1">No warnings or tasks are pending.</p>
                            </div>
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

            {/* Bottom Navigation Removed - Handled by AppShell */}
        </div>
    )
}
