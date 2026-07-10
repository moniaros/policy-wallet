"use client"

import { useState } from 'react'
import type { NotificationHistoryProps } from './types'

export function NotificationHistory({
    currentUser,
    notificationEvents,
    policies,
    customerRelationships,
    activeFilter,
    onNavigateToRelatedObject,
    onFilterChange,
    onClearFilters
}: NotificationHistoryProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const getChannelBadge = (channel: string) => {
        switch (channel) {
            case 'email':
                return {
                    icon: (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    ),
                    label: 'Email',
                    color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900'
                }
            case 'push':
                return {
                    icon: (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    ),
                    label: 'Push',
                    color: 'bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border-primary/30 dark:border-primary/30'
                }
            case 'whatsapp':
                return {
                    icon: (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    ),
                    label: 'WhatsApp',
                    color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                }
            case 'viber':
                return {
                    icon: (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.398.002C9.473.028 5.331.344 2.862 2.813 1.009 4.667.49 7.191.458 10.402.425 13.615.46 19.762 6.792 21.53h.005l-.005 2.021s-.037.98.61 1.179c.777.242 1.236-.5 1.98-1.304.409-.44.972-1.086 1.397-1.58 3.851.322 6.812-.416 7.149-.525.777-.253 5.176-.816 5.892-6.657.737-6.022-.44-9.83-2.034-11.534-.72-.799-3.11-2.297-6.561-2.297l-.085-.002zm.058 1.693c3.076.006 5.278 1.368 5.943 2.099 1.327 1.432 2.285 4.56 1.673 9.636-.58 4.8-3.961 5.186-4.561 5.38-.28.091-2.876.737-6.152.495 0 0-2.439 2.941-3.199 3.702-.12.12-.26.167-.352.145-.13-.032-.166-.188-.165-.414l.02-4.016v-.001c-5.09-1.449-4.77-6.32-4.745-8.947.025-2.627.411-4.691 1.854-6.135 2.03-1.969 5.382-2.271 7.058-2.295l.626-.007v-.002z" />
                        </svg>
                    ),
                    label: 'Viber',
                    color: 'bg-[#7360F2]/10 dark:bg-[#7360F2]/20 text-[#7360F2] dark:text-[#B4A9F8] border-[#7360F2]/30 dark:border-[#7360F2]/40'
                }
            default:
                return {
                    icon: null,
                    label: channel,
                    color: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
                return {
                    label: 'Εστάλη',
                    color: 'bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-primary/30 dark:border-primary/30'
                }
            case 'failed':
                return {
                    label: 'Απέτυχε',
                    color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
                }
            case 'queued':
                return {
                    label: 'Σε αναμονή',
                    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                }
            default:
                return {
                    label: status,
                    color: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }
        }
    }

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '—'
        const date = new Date(dateString)
        return date.toLocaleDateString('el-GR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getEventTypeLabel = (eventType: string) => {
        const labels: Record<string, string> = {
            policy_added: 'Ασφάλεια προστέθηκε',
            policy_shared: 'Ασφάλεια μοιράστηκε',
            payment_processed: 'Πληρωμή επεξεργάστηκε',
            subscription_changed: 'Συνδρομή άλλαξε',
            policy_expiring: 'Ασφάλεια λήγει',
            pending_questionnaire: 'Εκκρεμές ερωτηματολόγιο',
            policy_reviewed: 'Ασφάλεια αξιολογήθηκε',
            new_gap_detected: 'Νέο κενό εντοπίστηκε',
            invite_accepted: 'Πρόσκληση έγινε δεκτή',
            questionnaire_completed: 'Ερωτηματολόγιο ολοκληρώθηκε',
            renewal_milestone: 'Ανανέωση πλησιάζει',
            whatsapp_message_triggered: 'Μήνυμα WhatsApp'
        }
        return labels[eventType] || eventType
    }

    // Filter events
    const filteredEvents = notificationEvents.filter(event => {
        if (activeFilter) {
            if (activeFilter.type === 'policy' && event.related_policy_id !== activeFilter.value) {
                return false
            }
            if (activeFilter.type === 'customer' && event.related_customer_relationship_id !== activeFilter.value) {
                return false
            }
            if (activeFilter.type === 'event_type' && event.event_type !== activeFilter.value) {
                return false
            }
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                event.subject.toLowerCase().includes(query) ||
                event.message.toLowerCase().includes(query) ||
                (event.related_policy_name?.toLowerCase().includes(query)) ||
                (event.related_customer_name?.toLowerCase().includes(query))
            )
        }
        return true
    })

    // Sort by timestamp (newest first)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
    })

    return (
        <div className="max-w-7xl mx-auto py-8">
            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
                {/* Search */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-stone-400 group-focus-within:text-primary dark:group-focus-within:text-mint transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Αναζήτηση στις ειδοποιήσεις..."
                        className="block w-full pl-16 pr-6 py-5 border border-stone-100 dark:border-stone-800 rounded-[24px] bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all shadow-sm"
                    />
                </div>

                {/* Active Filters */}
                {activeFilter && (
                    <div className="flex items-center gap-3 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Φίλτρο:</span>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-stone-900/10 transition-all">
                            {activeFilter.type === 'policy' && 'Ασφάλεια'}
                            {activeFilter.type === 'customer' && 'Πελάτης'}
                            {activeFilter.type === 'event_type' && 'Τύπος'}
                            <button
                                onClick={() => onClearFilters?.()}
                                className="ml-1 hover:text-primary dark:hover:text-mint p-0.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    </div>
                )}
            </div>

            {/* Notification List */}
            {sortedEvents.length === 0 ? (
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-24 text-center shadow-xl shadow-stone-100/50 dark:shadow-none">
                    <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800 rounded-3xl flex items-center justify-center mx-auto mb-8 text-stone-200">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-stone-900 dark:text-white mb-2 tracking-tight">Όλα ήσυχα εδώ</h3>
                    <p className="text-stone-400 text-sm max-w-xs mx-auto italic font-medium">
                        {searchQuery || activeFilter ? 'Δεν βρέθηκαν ειδοποιήσεις για τα κριτήρια αναζήτησης.' : 'Δεν υπάρχουν ακόμα ειδοποιήσεις στο ιστορικό σας.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-2xl shadow-stone-200/50 dark:shadow-none overflow-hidden">
                    <div className="divide-y divide-stone-50 dark:divide-stone-800">
                        {sortedEvents.map((event) => {
                            const channelBadge = getChannelBadge(event.channel)
                            const statusBadge = getStatusBadge(event.status)

                            return (
                                <div key={event.event_id} className="p-8 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all group">
                                    <div className="flex items-start gap-8">
                                        {/* Icon and Badges */}
                                        <div className="flex-shrink-0 flex flex-col gap-3 pt-1">
                                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${channelBadge.color}`}>
                                                {channelBadge.icon}
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border text-center ${statusBadge.color}`}>
                                                {statusBadge.label}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-6 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight text-lg">
                                                            {event.subject}
                                                        </div>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700" />
                                                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{getEventTypeLabel(event.event_type)}</span>
                                                    </div>
                                                    <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-3xl">
                                                        {event.message}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-3 py-1.5 rounded-full border border-stone-100 dark:border-stone-700 whitespace-nowrap">
                                                    {formatDateTime(event.sent_at || event.created_at)}
                                                </div>
                                            </div>

                                            {/* Metadata / Actions */}
                                            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-stone-50 dark:border-stone-800">
                                                {event.related_policy_name && (
                                                    <button
                                                        onClick={() => onNavigateToRelatedObject?.('policy', event.related_policy_id!)}
                                                        className="flex items-center gap-2 group/link"
                                                    >
                                                        <div className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover/link:bg-primary group-hover/link:text-white dark:group-hover/link:text-[#1A2420] transition-all">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5" /></svg>
                                                        </div>
                                                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest group-hover/link:text-primary dark:group-hover/link:text-mint transition-colors">{event.related_policy_name}</span>
                                                    </button>
                                                )}
                                                {event.related_customer_name && (
                                                    <button
                                                        onClick={() => onNavigateToRelatedObject?.('customer', event.related_customer_relationship_id!)}
                                                        className="flex items-center gap-2 group/link"
                                                    >
                                                        <div className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover/link:bg-primary group-hover/link:text-white dark:group-hover/link:text-[#1A2420] transition-all">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" /></svg>
                                                        </div>
                                                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest group-hover/link:text-primary dark:group-hover/link:text-mint transition-colors">{event.related_customer_name}</span>
                                                    </button>
                                                )}

                                                {event.status === 'failed' && event.failure_reason && (
                                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-1.5 rounded-full border border-red-100 dark:border-red-900/50 ml-auto">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Αποτυχία: {event.failure_reason}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
