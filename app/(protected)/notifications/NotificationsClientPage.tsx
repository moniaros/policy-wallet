"use client"

import { useMemo, useState } from 'react'
import { NotificationHistory, NotificationPreferences, MobileNotificationList } from "@/components/notifications"
import { toggleNotificationPreference } from "./actions"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/useResponsive"
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
    initialData: any
    activeRole: 'policyholder' | 'agent'
}

export function NotificationsClientPage({ initialData, activeRole: initialRole }: Props) {
    const [activeTab, setActiveTab] = useState<'history' | 'preferences'>('history')
    const [currentRole, setCurrentRole] = useState<'policyholder' | 'agent'>(initialRole)
    const router = useRouter()
    const isMobile = useIsMobile()
    const { language, t } = useLanguage()

    const ui = {
        notifications: language === 'el' ? 'Ειδοποιήσεις' : 'Notifications',
        history: language === 'el' ? 'Ιστορικό' : 'History',
        preferences: language === 'el' ? 'Προτιμήσεις' : 'Preferences',
        communicationCenter: t.notifications.communicationCenter || (language === 'el' ? 'Κέντρο Επικοινωνίας' : 'Communication Center'),
        title: language === 'el' ? 'Δραστηριότητα και Ειδοποιήσεις' : 'Activity and alerts',
        subtitle:
            language === 'el'
                ? 'Παρακολουθήστε όλα τα γεγονότα και ρυθμίστε πώς θέλετε να ενημερώνεστε.'
                : 'Track key events and control how you receive updates.',
    }

    const preferenceCategories: any[] = useMemo(
        () =>
            language === 'el'
                ? [
                    {
                        category: 'system_confirmation',
                        label: 'Επιβεβαιώσεις συστήματος',
                        description: 'Αποστέλλονται πάντα για λόγους ασφάλειας και διαφάνειας.',
                        event_types: [
                            { event_type: 'policy_added', label: 'Προσθήκη ασφαλιστηρίου', description: 'Επιβεβαίωση όταν προστίθεται νέο ασφαλιστήριο.', always_sent: true },
                            { event_type: 'policy_shared', label: 'Κοινοποίηση ασφαλιστηρίου', description: 'Ενημέρωση όταν γίνεται κοινοποίηση με σύμβουλο ή συνεργάτη.', always_sent: true },
                            { event_type: 'payment_processed', label: 'Ολοκλήρωση πληρωμής', description: 'Επιβεβαίωση χρέωσης συνδρομής ή πληρωμής.', always_sent: true },
                        ],
                    },
                    {
                        category: 'reminder',
                        label: 'Υπενθυμίσεις',
                        description: 'Ενημερώσεις για λήξεις, ανανεώσεις και εκκρεμότητες.',
                        event_types: [
                            { event_type: 'policy_expiring', label: 'Λήξη συμβολαίου', description: 'Υπενθύμιση 30, 15 και 7 ημέρες πριν τη λήξη.', always_sent: false },
                            { event_type: 'pending_questionnaire', label: 'Εκκρεμές ερωτηματολόγιο', description: 'Υπενθύμιση για συμπλήρωση στοιχείων που εκκρεμούν.', always_sent: false },
                            { event_type: 'renewal_milestone', label: 'Ορόσημο ανανέωσης', description: 'Ενημέρωση για επερχόμενη ανανέωση ασφαλιστηρίου.', always_sent: false },
                        ],
                    },
                    {
                        category: 'intelligence',
                        label: 'Ευφυής ανάλυση',
                        description: 'Προαιρετικές ενημερώσεις από AI ανάλυση και κενά κάλυψης.',
                        event_types: [
                            { event_type: 'policy_reviewed', label: 'Ολοκλήρωση ανάλυσης', description: 'Η AI ανάλυση συμβολαίου ολοκληρώθηκε.', always_sent: false },
                            { event_type: 'new_gap_detected', label: 'Νέο κενό κάλυψης', description: 'Εντοπίστηκε νέο σημαντικό κενό κάλυψης.', always_sent: false },
                        ],
                    },
                ]
                : [
                    {
                        category: 'system_confirmation',
                        label: 'System confirmations',
                        description: 'Always sent for security and transparency.',
                        event_types: [
                            { event_type: 'policy_added', label: 'Policy added', description: 'Confirmation when a new policy is added.', always_sent: true },
                            { event_type: 'policy_shared', label: 'Policy shared', description: 'Update when you share a policy with an agent.', always_sent: true },
                            { event_type: 'payment_processed', label: 'Payment processed', description: 'Receipt for subscription and billing activity.', always_sent: true },
                        ],
                    },
                    {
                        category: 'reminder',
                        label: 'Reminders',
                        description: 'Updates for renewals, expirations, and pending actions.',
                        event_types: [
                            { event_type: 'policy_expiring', label: 'Policy expiring', description: 'Reminder 30, 15, and 7 days before expiry.', always_sent: false },
                            { event_type: 'pending_questionnaire', label: 'Pending questionnaire', description: 'Reminder to complete outstanding information requests.', always_sent: false },
                            { event_type: 'renewal_milestone', label: 'Renewal milestone', description: 'Notice about upcoming policy renewals.', always_sent: false },
                        ],
                    },
                    {
                        category: 'intelligence',
                        label: 'Coverage intelligence',
                        description: 'Optional AI updates and gap detection alerts.',
                        event_types: [
                            { event_type: 'policy_reviewed', label: 'Policy reviewed', description: 'AI review of a policy has completed.', always_sent: false },
                            { event_type: 'new_gap_detected', label: 'New gap detected', description: 'A new critical coverage gap was identified.', always_sent: false },
                        ],
                    },
                ],
        [language]
    )

    const handleToggleChannel = async (eventType: string, channel: 'email' | 'push', enabled: boolean) => {
        await toggleNotificationPreference(eventType, channel, enabled, currentRole)
    }

    const handleNavigate = (type: string, id: string) => {
        if (type === 'policy') router.push(`/wallet/${id}`)
        if (type === 'customer') router.push(`/customers/${id}`)
    }

    if (isMobile) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-20">
                <div className="sticky top-0 z-30 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 px-4 pt-4 pb-0 shadow-sm">
                    <h1 className="text-xl font-black text-stone-900 dark:text-white mb-4">{ui.notifications}</h1>
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'history' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-stone-500'}`}
                        >
                            {ui.history}
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'preferences' ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-stone-500'}`}
                        >
                            {ui.preferences}
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in duration-500">
                    {activeTab === 'history' ? (
                        <MobileNotificationList events={initialData.history} onNavigate={handleNavigate} />
                    ) : (
                        <div className="p-4">
                            <NotificationPreferences
                                currentUser={initialData.user}
                                activeRole={currentRole}
                                preferences={initialData.preferences}
                                preferenceCategories={preferenceCategories}
                                onToggleChannel={handleToggleChannel}
                                onSwitchRole={setCurrentRole}
                            />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{ui.communicationCenter}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">{ui.title}</h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl">{ui.subtitle}</p>
                </div>

                <div className="flex p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'history' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        {ui.history}
                    </button>
                    <button
                        onClick={() => setActiveTab('preferences')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'preferences' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        {ui.preferences}
                    </button>
                </div>
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {activeTab === 'history' ? (
                    <NotificationHistory
                        currentUser={initialData.user}
                        notificationEvents={initialData.history}
                        policies={initialData.policies}
                        customerRelationships={initialData.relationships}
                        onNavigateToRelatedObject={handleNavigate}
                    />
                ) : (
                    <NotificationPreferences
                        currentUser={initialData.user}
                        activeRole={currentRole}
                        preferences={initialData.preferences}
                        preferenceCategories={preferenceCategories}
                        onToggleChannel={handleToggleChannel}
                        onSwitchRole={setCurrentRole}
                    />
                )}
            </div>
        </div>
    )
}
