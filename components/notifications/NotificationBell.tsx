"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/i18n/format'

interface Notification {
    id: string
    eventType: string
    title: string
    message: string
    relatedObjectType: string | null
    relatedObjectId: string | null
    isRead: boolean
    createdAt: string
}

interface NotificationBellProps {
    initialNotifications?: Notification[]
    initialUnreadCount?: number
}

export function NotificationBell({ initialNotifications = [], initialUnreadCount = 0 }: NotificationBellProps) {
    const router = useRouter()
    const { language } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'policy_added':
                return (
                    <div className="w-8 h-8 bg-primary-soft dark:bg-primary/15 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📋</span>
                    </div>
                )
            case 'policy_shared':
                return (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🤝</span>
                    </div>
                )
            case 'gap_detected':
                return (
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-lg">⚠️</span>
                    </div>
                )
            case 'policy_expiring':
                return (
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-lg">⏰</span>
                    </div>
                )
            default:
                return (
                    <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🔔</span>
                    </div>
                )
        }
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        return formatDate(date, language as 'el' | 'en')
    }

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.isRead) {
            try {
                await fetch('/api/notifications/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notificationId: notification.id })
                })
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                )
                setUnreadCount(prev => Math.max(0, prev - 1))
            } catch (e) {
                // Silently fail - don't block navigation
            }
        }

        // Navigate to related object
        if (notification.relatedObjectType && notification.relatedObjectId) {
            setIsOpen(false)
            if (notification.relatedObjectType === 'policy') {
                router.push(`/wallet/${notification.relatedObjectId}`)
            } else if (notification.relatedObjectType === 'customer') {
                router.push(`/customers/${notification.relatedObjectId}`)
            } else if (notification.relatedObjectType === 'thread') {
                router.push(`/collaboration/threads/${notification.relatedObjectId}`)
            } else if (notification.relatedObjectType === 'questionnaire') {
                router.push(`/tasks/${notification.relatedObjectId}`)
            }
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await fetch('/api/notifications/mark-all-read', { method: 'POST' })
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
        } catch (e) {
            // Silently fail
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Notifications"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <h3 className="font-bold text-stone-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-bold text-primary dark:text-mint hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-sm text-stone-500 dark:text-stone-400">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-stone-100 dark:divide-stone-800">
                                {notifications.slice(0, 10).map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${!notification.isRead ? 'bg-primary-tint dark:bg-primary/10' : ''
                                            }`}
                                    >
                                        {getEventIcon(notification.eventType)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-semibold truncate ${notification.isRead
                                                        ? 'text-stone-600 dark:text-stone-400'
                                                        : 'text-stone-900 dark:text-white'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                                                {formatTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer — always shown so the dropdown is never a dead-end.
                        The inline list is not yet wired to fetch (it renders the
                        server-provided initial set), so this link is the reliable
                        path to the full /notifications page regardless of state. */}
                    <div className="px-4 py-3 border-t border-stone-100 dark:border-stone-800">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                router.push('/notifications')
                            }}
                            className="w-full py-2 text-sm font-bold text-center text-primary dark:text-mint hover:text-primary-hover dark:hover:text-mint transition-colors"
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
