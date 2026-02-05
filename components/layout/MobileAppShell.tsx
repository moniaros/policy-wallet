"use client"

import { useRouter, usePathname } from 'next/navigation'
import { MyPoliciesScreen, MyAgentScreen, MyProfileScreen } from '@/components/wallet'
import { MobileBottomNav } from './MobileBottomNav' // Import new component
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
                    <div className="p-8 text-center pt-24">
                        <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-4">Tasks</h2>
                        <p className="text-stone-500">Redirecting to task center...</p>
                        {/* The Task page will handle its own rendering if accessed directly */}
                    </div>
                )}

                {activeTab === 'coverage' && (
                    <div className="p-8 text-center pt-24">
                        <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-4">Coverage</h2>
                        <p className="text-stone-500">Analyzing your protection...</p>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="p-8 text-center pt-24">
                        <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-4">Alerts</h2>
                        <p className="text-stone-500">Syncing notifications...</p>
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

            {/* Bottom Navigation */}
            <MobileBottomNav activeTab={activeTab} />
        </div>
    )
}
