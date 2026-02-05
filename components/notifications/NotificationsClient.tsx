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
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Branded Header */}
                <div className="px-6 pt-12 pb-8 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                        <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                        <span className="text-2xl font-black tracking-tight text-teal-600">Wallet</span>
                    </div>
                </div>

                <div className="px-6 pb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                            <Bell className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
                            {t.notifications.communicationCenter}
                        </span>
                    </div>

                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        {lang === 'el' ? 'Ειδοποιήσεις' : 'Smart'} <span className="text-stone-400 dark:text-stone-500 italic">Alerts.</span>
                    </h1>

                    <p className="text-stone-500 text-lg max-w-xl mb-12">
                        {t.activity.subtitle}
                    </p>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                        {t.userMenu.notifications}
                    </h1>

                    <p className="text-lg md:text-xl text-cyan-100 max-w-2xl mb-8">
                        {t.activity.subtitle}
                    </p>

                    {/* Stats Slider */}
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 snap-x mb-12">
                        <div className="flex-shrink-0 w-[160px] bg-gradient-to-br from-teal-600 to-teal-400 rounded-[32px] p-6 text-white shadow-xl shadow-teal-600/20 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-2">{t.common.all || 'All'}</span>
                            <span className="text-4xl font-black tracking-tighter">{counts.all}</span>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{t.tasks.taskTypes.unread || 'Unread'}</span>
                            <span className="text-4xl font-black tracking-tighter text-amber-500">{counts.unread}</span>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">INTEL</span>
                            <span className="text-4xl font-black tracking-tighter">{counts.intelligence}</span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 mb-8">
                    <div className="flex p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            {t.wallet.history || 'History'}
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preferences' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            {t.userMenu.preferences || 'Settings'}
                        </button>
                    </div>
                </div>

                {activeTab === 'history' && (
                    <>
                        {/* Search and Filters */}
                        <div className="mb-6 space-y-4">
                            {/* Search */}
                            <div className="px-6 mb-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                                    <input
                                        type="search"
                                        placeholder={t.wallet.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[28px] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 px-6 no-scrollbar overflow-x-auto pb-4 -mx-6 mb-4">
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
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${filter === key
                                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xl'
                                            : 'bg-white dark:bg-stone-900 text-stone-400 border border-stone-50 dark:border-stone-800'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
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
                            <div className="space-y-3 px-6">
                                {filteredNotifications.map((notif) => {
                                    const Icon = getIcon(notif.category)
                                    const colors = getPriorityColor(notif.priority)

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`group bg-white dark:bg-stone-900 rounded-[32px] p-5 flex items-center gap-4 shadow-sm border border-stone-50 dark:border-stone-800/50 active:scale-[0.98] transition-all cursor-pointer ${notif.read_at ? 'opacity-70' : ''
                                                }`}
                                            onClick={() => {
                                                if (notif.related_object_type && notif.related_object_id) {
                                                    router.push(`/${notif.related_object_type}/${notif.related_object_id}`)
                                                }
                                            }}
                                        >
                                            <div className="w-14 h-14 rounded-[20px] bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                <Icon className="w-7 h-7" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className="text-base font-black text-stone-900 dark:text-white tracking-tight truncate">
                                                        {notif.title}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap">
                                                        {formatDate(notif.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-stone-400 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                            </div>

                                            {!notif.read_at && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-teal-600 shadow-lg shadow-teal-600/40" />
                                            )}
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
