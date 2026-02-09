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
    Target,
    LayoutDashboard,
    FileText,
    CreditCard,
    ShieldAlert,
    Zap
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/ui/PageHeader'

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
    const getRelatedRoute = (type?: string, id?: string) => {
        if (!type || !id) return null
        if (type === 'policy') return `/wallet/${id}`
        if (type === 'customer') return `/customers/${id}`
        return null
    }

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
        <div className="min-h-screen bg-transparent">
            <PageHeader
                title={lang === 'el' ? 'Smart Alerts' : 'Smart Alerts'}
                subtitle={t.activity.subtitle}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800/30">
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{t.common.all || 'Total'}</span>
                            <span className="text-xl font-black text-teal-700 dark:text-teal-300">{counts.all}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{t.tasks.taskTypes.unread || 'Unread'}</span>
                            <span className="text-xl font-black text-amber-700 dark:text-amber-300">{counts.unread}</span>
                        </div>
                    </div>
                }
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Tab Navigation */}
                <div className="mb-8">
                    <div className="flex p-1 w-full max-w-md mx-auto bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 relative">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 relative z-10 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'history' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'}`}
                        >
                            {t.wallet.history || 'Activity'}
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`flex-1 relative z-10 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'preferences' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'}`}
                        >
                            {t.userMenu.preferences || 'Preferences'}
                        </button>
                    </div>
                </div>

                {activeTab === 'history' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Search and Filters */}
                        <div className="mb-6 space-y-4">
                            {/* Search */}
                            <div className="relative max-w-lg mx-auto mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                <input
                                    type="search"
                                    placeholder={t.wallet.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-stone-900/50 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all shadow-sm"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { key: 'all' as FilterType, label: t.common.all || 'All' },
                                    { key: 'unread' as FilterType, label: t.tasks.taskTypes.unread || 'Unread' },
                                    { key: 'system_confirmation' as FilterType, label: t.tasks.taskTypes.confirmation || 'System' },
                                    { key: 'reminder' as FilterType, label: t.tasks.taskTypes.reminder || 'Reminders' },
                                    { key: 'intelligence' as FilterType, label: t.tasks.taskTypes.intelligence || 'Insights' }
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === key
                                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-md'
                                            : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notifications List */}
                        {filteredNotifications.length === 0 ? (
                            <div className="bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/40 dark:border-stone-700/40 mt-8">
                                <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-stone-400" />
                                </div>
                                <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
                                    {t.wallet.noNotifications}
                                </h3>
                                <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                                    {t.wallet.noNotificationsYetDesc || "We'll notify you when there's something new."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredNotifications.map((notif) => {
                                    const Icon = getIcon(notif.category)
                                    // Removed unused generic color logic for cleaner custom implement

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`group bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-4 border border-white/50 dark:border-stone-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${notif.read_at ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                            onClick={() => {
                                                const route = getRelatedRoute(notif.related_object_type, notif.related_object_id)
                                                if (route) {
                                                    router.push(route)
                                                }
                                            }}
                                        >
                                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.category === 'intelligence' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' :
                                                notif.category === 'reminder' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                                                }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className={`text-sm font-bold text-stone-900 dark:text-white truncate ${!notif.read_at ? 'text-teal-900 dark:text-teal-50' : ''}`}>
                                                        {notif.title}
                                                    </h3>
                                                    <span className="text-[10px] font-medium text-stone-400 whitespace-nowrap">
                                                        {formatDate(notif.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </div>

                                            {!notif.read_at && (
                                                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'preferences' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PreferencesPanel
                            initialPreferences={initialData.preferences}
                            userId={initialData.user.id}
                            language={lang}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

function PreferencesPanel({ initialPreferences, userId, language }: { initialPreferences: NotificationPreference[], userId: string, language: string }) {
    const [preferences, setPreferences] = useState(initialPreferences)
    const [isSaving, setIsSaving] = useState<string | null>(null) // 'eventType-channel'

    // Default categories if no preferences exist
    const defaultTypes = [
        { type: 'policy_update', label_en: 'Policy Updates', label_el: 'Ενημερώσεις Συμβολαίων', desc_en: 'Changes to coverage, renewals, and status', desc_el: 'Αλλαγές σε καλύψεις, ανανεώσεις και κατάσταση' },
        { type: 'payment_reminder', label_en: 'Payment Reminders', label_el: 'Υπενθυμίσεις Πληρωμών', desc_en: 'Upcoming bills and payment confirmations', desc_el: 'Επερχόμενοι λογαριασμοί και επιβεβαιώσεις πληρωμών' },
        { type: 'security_alert', label_en: 'Security Alerts', label_el: 'Ειδοποιήσεις Ασφαλείας', desc_en: 'Login attempts and password changes', desc_el: 'Προσπάθειες σύνδεσης και αλλαγές κωδικού' },
        { type: 'marketing', label_en: 'News & Offers', label_el: 'Νέα & Προσφορές', desc_en: 'Product news and personalized offers', desc_el: 'Νέα προϊόντων και εξατομικευμένες προσφορές' },
        { type: 'smart_insight', label_en: 'Smart Insights', label_el: 'Έξυπνες Προτάσεις', desc_en: 'AI-driven suggestions for your portfolio', desc_el: 'Προτάσεις AI για το χαρτοφυλάκιό σας' }
    ]

    const getIcon = (type: string) => {
        switch (type) {
            case 'policy_update': return FileText
            case 'payment_reminder': return CreditCard
            case 'security_alert': return ShieldAlert
            case 'marketing': return Zap
            case 'smart_insight': return Sparkles
            default: return Bell
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'policy_update': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-blue-500/10'
            case 'payment_reminder': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-emerald-500/10'
            case 'security_alert': return 'text-red-600 bg-red-50 dark:bg-red-900/20 shadow-red-500/10'
            case 'marketing': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-purple-500/10'
            case 'smart_insight': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 shadow-amber-500/10'
            default: return 'text-stone-600 bg-stone-50 dark:bg-stone-800'
        }
    }

    const handleToggle = async (type: string, channel: 'email' | 'push', currentValue: boolean) => {
        const key = `${type}-${channel}`
        setIsSaving(key)

        // Optimistic update
        const updatedPrefs = [...preferences]
        const prefIndex = updatedPrefs.findIndex(p => p.event_type === type)

        if (prefIndex >= 0) {
            updatedPrefs[prefIndex] = {
                ...updatedPrefs[prefIndex],
                [channel === 'email' ? 'email_enabled' : 'push_enabled']: !currentValue
            }
        } else {
            // Create new if doesn't exist in local state
            updatedPrefs.push({
                event_type: type,
                email_enabled: channel === 'email' ? !currentValue : true, // Default other to true if new
                push_enabled: channel === 'push' ? !currentValue : true
            })
        }

        setPreferences(updatedPrefs)

        try {
            const { toggleNotificationPreference } = await import('@/app/(protected)/notifications/actions')
            await toggleNotificationPreference(type, channel, !currentValue, 'policyholder')
        } catch (error) {
            console.error('Failed to save preference', error)
            // Revert on error could be implemented here
        } finally {
            setIsSaving(null)
        }
    }

    return (
        <div className="bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl border border-white/40 dark:border-stone-700/40 rounded-[2.5rem] p-8 shadow-sm">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                    {language === 'el' ? 'Ρυθμίσεις Ειδοποιήσεων' : 'Notification Preferences'}
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 mt-2 font-medium">
                    {language === 'el' ? 'Διαχειριστείτε τις προτιμήσεις επικοινωνίας σας για να ενημερώνεστε για τα σημαντικά.' : 'Manage your communication preferences to stay updated on what matters.'}
                </p>
            </div>

            <div className="space-y-4">
                {defaultTypes.map((item) => {
                    const pref = preferences.find(p => p.event_type === item.type)
                    const emailEnabled = pref ? pref.email_enabled : true // Default true
                    const pushEnabled = pref ? pref.push_enabled : true   // Default true
                    const Icon = getIcon(item.type)
                    const colorClass = getColor(item.type)

                    return (
                        <div key={item.type} className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white/60 dark:bg-stone-900/60 rounded-[2rem] border border-white/60 dark:border-stone-800/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-start gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${colorClass}`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <div className="py-1">
                                    <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                                        {language === 'el' ? item.label_el : item.label_en}
                                    </h3>
                                    <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                                        {language === 'el' ? item.desc_el : item.desc_en}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 pl-[4.75rem] md:pl-0 pt-2 md:pt-0 border-t border-stone-100 dark:border-stone-800/50 md:border-t-0">
                                {/* Email Toggle */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${emailEnabled ? 'text-stone-800 dark:text-stone-200' : 'text-stone-400/70'}`}>Email</span>
                                    <button
                                        onClick={() => handleToggle(item.type, 'email', emailEnabled)}
                                        disabled={isSaving === `${item.type}-email`}
                                        className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-stone-100 dark:focus:ring-stone-800 ${emailEnabled ? 'bg-teal-500 shadow-inner' : 'bg-stone-200 dark:bg-stone-800'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ease-out flex items-center justify-center ${emailEnabled ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                        >
                                            {isSaving === `${item.type}-email` ? (
                                                <div className="w-3 h-3 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
                                            ) : emailEnabled ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                            ) : null}
                                        </span>
                                    </button>
                                </div>

                                {/* Push Toggle */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${pushEnabled ? 'text-stone-800 dark:text-stone-200' : 'text-stone-400/70'}`}>Push</span>
                                    <button
                                        onClick={() => handleToggle(item.type, 'push', pushEnabled)}
                                        disabled={isSaving === `${item.type}-push`}
                                        className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-stone-100 dark:focus:ring-stone-800 ${pushEnabled ? 'bg-teal-500 shadow-inner' : 'bg-stone-200 dark:bg-stone-800'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ease-out flex items-center justify-center ${pushEnabled ? 'translate-x-6' : 'translate-x-0'
                                                }`}
                                        >
                                            {isSaving === `${item.type}-push` ? (
                                                <div className="w-3 h-3 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
                                            ) : pushEnabled ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                            ) : null}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
