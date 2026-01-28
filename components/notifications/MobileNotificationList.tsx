"use client"

import { NotificationCard } from "./NotificationCard"

interface MobileNotificationListProps {
    events: any[]
    onNavigate: (type: string, id: string) => void
}

export function MobileNotificationList({ events, onNavigate }: MobileNotificationListProps) {
    if (!events || events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-300 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">All Caught Up!</h3>
                <p className="text-sm text-stone-500 mt-1">No warnings or tasks are pending.</p>
            </div>
        )
    }

    // Grouping Logic
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups = events.reduce((acc: Record<string, any[]>, event) => {
        const date = new Date(event.created_at).toDateString()
        let label = 'Earlier'
        if (date === today) label = 'Today'
        else if (date === yesterday) label = 'Yesterday'

        if (!acc[label]) acc[label] = []
        acc[label].push(event)
        return acc
    }, {})

    const order = ['Today', 'Yesterday', 'Earlier']

    return (
        <div className="space-y-6 pb-24">
            {order.map(label => (
                groups[label] && groups[label].length > 0 && (
                    <div key={label}>
                        <h3 className="sticky top-0 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur py-3 px-4 text-xs font-black uppercase tracking-widest text-stone-400 z-10 border-b border-stone-100 dark:border-stone-800">
                            {label}
                        </h3>
                        <div className="px-4 py-3 space-y-3">
                            {groups[label].map(event => (
                                <NotificationCard key={event.event_id} event={event} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    )
}
