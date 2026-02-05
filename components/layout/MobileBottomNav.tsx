"use client"

import { usePathname, useRouter } from 'next/navigation'
import { hapticFeedback } from '@/utils/haptic'

interface MobileBottomNavProps {
    activeTab?: 'home' | 'tasks' | 'coverage' | 'alerts' | 'account'
}

export function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleTabChange = (tab: 'home' | 'tasks' | 'coverage' | 'alerts' | 'account') => {
        hapticFeedback.selection()

        // Update URL
        if (tab === 'home') router.push('/wallet')
        if (tab === 'tasks') router.push('/tasks')
        if (tab === 'coverage') router.push('/coverage')
        if (tab === 'alerts') router.push('/notifications')
        if (tab === 'account') router.push('/account')
    }

    // Determine active tab from pathname if not provided
    const currentTab = activeTab || (() => {
        if (pathname === '/wallet' || pathname === '/') return 'home'
        if (pathname?.includes('/tasks')) return 'tasks'
        if (pathname?.includes('/coverage')) return 'coverage'
        if (pathname?.includes('/notifications')) return 'alerts'
        if (pathname?.includes('/account')) return 'account'
        return 'home'
    })()

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom z-50">
            <div className="max-w-md mx-auto px-6 py-3 flex items-center justify-around">
                <button
                    onClick={() => handleTabChange('home')}
                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentTab === 'home'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="Home"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill={currentTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
                </button>

                <button
                    onClick={() => handleTabChange('tasks')}
                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentTab === 'tasks'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="Tasks"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <path d="m9 14 2 2 4-4" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Tasks</span>
                </button>

                <button
                    onClick={() => handleTabChange('coverage')}
                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentTab === 'coverage'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="Coverage"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Coverage</span>
                </button>

                <button
                    onClick={() => handleTabChange('alerts')}
                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentTab === 'alerts'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="Alerts"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Alerts</span>
                </button>

                <button
                    onClick={() => handleTabChange('account')}
                    className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${currentTab === 'account'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-400 dark:text-stone-500'
                        }`}
                    aria-label="Account"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Account</span>
                </button>
            </div>
        </div>
    )
}
