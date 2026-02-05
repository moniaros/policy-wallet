"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    Info,
    Mail,
    Smartphone,
    Settings,
    Clock,
    Filter,
    Search,
    Sparkles,
    Target
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface NotificationEvent {
    id: string
    event_type: string
    title: string
    message: string
    created_at: string
    read_at?: string
    priority: 'low' | 'medium' | 'high'
    category: 'system_confirmation' | 'reminder' | 'intelligence'
    related_object_type?: string
    related_object_id?: string
}

const getIcon = (category: string) => {
    switch (category) {
        case 'system_confirmation': return CheckCircle2
        case 'reminder': return Clock
        case 'intelligence': return Sparkles
        default: return Info
    }
}

interface NotificationPreference {
    event_type: string
    email_enabled: boolean
    push_enabled: boolean
}

interface NotificationsClientProps {
    initialData: {
        history: NotificationEvent[]
        preferences: NotificationPreference[]
        user: any
    }
    userLanguage?: string
}

type TabType = 'history' | 'preferences'
type FilterType = 'all' | 'unread' | 'system_confirmation' | 'reminder' | 'intelligence'

export function NotificationsClient({ initialData, userLanguage = 'en' }: NotificationsClientProps) {
    const { t, language } = useLanguage()
    const [activeTab, setActiveTab] = useState<TabType>('history')
    const [filter, setFilter] = useState<FilterType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()
    const lang = language || userLanguage || 'en'

    // Filter notifications
    const filteredNotifications = initialData.history.filter(notif => {
        if (filter === 'unread' && notif.read_at) return false
        if (filter !== 'all' && filter !== 'unread' && notif.category !== filter) return false
        if (searchQuery && !notif.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !notif.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
    })

    // Count by category
    const counts = {
        all: initialData.history.length,
        unread: initialData.history.filter(n => !n.read_at).length,
        system_confirmation: initialData.history.filter(n => n.category === 'system_confirmation').length,
        reminder: initialData.history.filter(n => n.category === 'reminder').length,
        intelligence: initialData.history.filter(n => n.category === 'intelligence').length
    }


    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-600 dark:text-red-400',
                    dot: 'bg-red-500'
                }
            case 'medium':
                return {
                    bg: 'bg-amber-50 dark:bg-amber-900/20',
                    border: 'border-amber-200 dark:border-amber-800',
                    text: 'text-amber-600 dark:text-amber-400',
                    dot: 'bg-amber-500'
                }
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-600 dark:text-blue-400',
                    dot: 'bg-blue-500'
                }
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return lang === 'el' ? 'Τώρα' : 'Just now'
        if (diffMins < 60) return `${diffMins}${lang === 'el' ? 'λ' : 'm'}`
        if (diffHours < 24) return `${diffHours}${lang === 'el' ? 'ω' : 'h'}`
        if (diffDays < 7) return `${diffDays}${lang === 'el' ? 'η' : 'd'}`
        return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Hero Header */}
                <div className="relative mb-12 overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-cyan-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full -ml-32 -mb-32" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <Bell className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
                                {t.notifications.communicationCenter}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                            {t.userMenu.notifications}
                        </h1>

                        <p className="text-lg md:text-xl text-cyan-100 max-w-2xl mb-8">
                            {t.activity.subtitle}
                        </p>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-cyan-200" />
                                    <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">
                                        {t.common.all || 'All'}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{counts.all}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="w-4 h-4 text-amber-300" />
                                    <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">
                                        {t.tasks.taskTypes.unread || 'Unread'}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-amber-400">{counts.unread}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-cyan-200" />
                                    <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">
                                        {t.tasks.taskTypes.reminder}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{counts.reminder}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-cyan-200" />
                                    <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">
                                        {t.tasks.taskTypes.intelligence || 'Intelligence'}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{counts.intelligence}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'history'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            {t.wallet.history || 'History'}
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'preferences'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                {t.userMenu.preferences || 'Preferences'}
                            </div>
                        </button>
                    </div>
                </div>

                {activeTab === 'history' && (
                    <>
                        {/* Search and Filters */}
                        <div className="mb-6 space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="search"
                                    placeholder={t.wallet.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-sm"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'all' as FilterType, label: t.common.all || 'All', icon: Target },
                                    { key: 'unread' as FilterType, label: t.tasks.taskTypes.unread || 'Unread', icon: Mail },
                                    { key: 'system_confirmation' as FilterType, label: t.tasks.taskTypes.confirmation || 'Confirmations', icon: CheckCircle2 },
                                    { key: 'reminder' as FilterType, label: t.tasks.taskTypes.reminder, icon: Clock },
                                    { key: 'intelligence' as FilterType, label: t.tasks.taskTypes.intelligence || 'Intelligence', icon: Sparkles }
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter === key
                                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                        {key !== 'all' && counts[key] > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${filter === key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                                                }`}>
                                                {counts[key]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notifications List */}
                        {filteredNotifications.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="w-24 h-24 bg-cyan-50 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full" />
                                    <Bell className="w-12 h-12 text-cyan-600 dark:text-cyan-400 relative z-10" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
                                    {t.wallet.noNotifications}
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                    {t.wallet.noNotificationsYetDesc || "We'll notify you when there's something new"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredNotifications.map((notif) => {
                                    const Icon = getIcon(notif.category)
                                    const colors = getPriorityColor(notif.priority)

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`group bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all cursor-pointer hover:shadow-lg ${notif.read_at
                                                ? 'border-slate-200 dark:border-slate-800'
                                                : 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-900/10'
                                                }`}
                                            onClick={() => {
                                                if (notif.related_object_type && notif.related_object_id) {
                                                    router.push(`/${notif.related_object_type}/${notif.related_object_id}`)
                                                }
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.border} border`}>
                                                    <Icon className={`w-5 h-5 ${colors.text}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                                            {notif.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {!notif.read_at && (
                                                                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                                            )}
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                {formatDate(notif.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'preferences' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                        );
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                            {t.userMenu.notificationsPreferences || 'Notification Preferences'}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            {t.userMenu.notificationsPreferencesDesc || 'Manage how you want to receive notifications'}
                        </p>
                        {/* Preferences content would go here */}
                    </div>
                )}
            </div>
        </div>
    )
}
