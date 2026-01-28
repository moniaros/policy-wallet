"use client"

import { usePathname, useRouter } from 'next/navigation'
import { hapticFeedback } from '@/utils/haptic'

interface MobileBottomNavProps {
    activeTab?: 'policies' | 'agent' | 'profile' | 'notifications' // Added notifications as a possible active state, though maybe not a tab
}

export function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleTabChange = (tab: 'policies' | 'agent' | 'profile') => {
        hapticFeedback.selection()

        // Update URL
        if (tab === 'policies') router.push('/wallet')
        if (tab === 'agent') router.push('/agent')
        if (tab === 'profile') router.push('/account')
    }

    // Determine active tab from pathname if not provided
    const currentTab = activeTab || (() => {
        if (pathname?.includes('/agent')) return 'agent'
        if (pathname?.includes('/account') || pathname?.includes('/profile')) return 'profile'
        if (pathname?.includes('/wallet') || pathname === '/') return 'policies'
        return undefined
    })()

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom z-50">
            <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-around">
                <button
                    onClick={() => handleTabChange('policies')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'policies'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="My Policies"
                >
                    <svg
                        className="w-6 h-6"
                        fill={currentTab === 'policies' ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-bold">Policies</span>
                </button>

                <button
                    onClick={() => handleTabChange('agent')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'agent'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="My Agent"
                >
                    <svg
                        className="w-6 h-6"
                        fill={currentTab === 'agent' ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-bold">Agent</span>
                </button>

                <button
                    onClick={() => handleTabChange('profile')}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'profile'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="My Profile"
                >
                    <svg
                        className="w-6 h-6"
                        fill={currentTab === 'profile' ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-bold">Profile</span>
                </button>
            </div>
        </div>
    )
}
