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
        if (pathname?.includes('/agent')) return 'agent'
        if (pathname?.includes('/account') || pathname?.includes('/profile')) return 'profile'
        return 'policies'
    })()

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Content */}
            <div className="pb-20"> {/* Add padding for bottom nav */}
                {activeTab === 'policies' && (
                    <MyPoliciesScreen
                        policies={policies}
                        onViewPolicy={(id) => router.push(`/wallet/${id}`)}
                        onAddPolicy={() => router.push('/wallet/add')}
                    />
                )}

                {activeTab === 'agent' && (
                    <MyAgentScreen
                        agent={agent}
                        recentCommunications={[]}
                        onCall={() => {
                            hapticFeedback.tap()
                            if (agent?.phone) window.location.href = `tel:${agent.phone}`
                        }}
                        onEmail={() => {
                            hapticFeedback.tap()
                            if (agent?.email) window.location.href = `mailto:${agent.email}`
                        }}
                        onChat={() => {
                            hapticFeedback.tap()
                            router.push('/chat')
                        }}
                        onViewCommunication={(id) => router.push(`/communications/${id}`)}
                    />
                )}

                {activeTab === 'profile' && (
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
