"use client"

import { useState } from 'react'
import { NotificationHistory, NotificationPreferences, MobileNotificationList } from "@/components/notifications"
import { toggleNotificationPreference } from "./actions"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/useResponsive"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"

interface Props {
    initialData: any
    activeRole: 'policyholder' | 'agent'
}

export function NotificationsClientPage({ initialData, activeRole: initialRole }: Props) {
    const [activeTab, setActiveTab] = useState<'history' | 'preferences'>('history')
    const [currentRole, setCurrentRole] = useState<'policyholder' | 'agent'>(initialRole)
    const router = useRouter()

    const preferenceCategories: any[] = [
        {
            category: 'system_confirmation',
            label: 'Επιβεβαιώσεις Συστήματος',
            description: 'Πάντα αποστέλλονται - δεν μπορούν να απενεργοποιηθούν',
            event_types: [
                { event_type: 'policy_added', label: 'Ασφάλεια προστέθηκε', description: 'Επιβεβαίωση όταν προστίθεται μια νέα ασφάλεια στο πορτοφόλι σας.', always_sent: true },
                { event_type: 'policy_shared', label: 'Ασφάλεια μοιράστηκε', description: 'Ενημέρωση όταν μοιράζεστε μια ασφάλεια με έναν πράκτορα.', always_sent: true },
                { event_type: 'payment_processed', label: 'Πληρωμή επεξεργάστηκε', description: 'Απόδειξη πληρωμής για τις συνδρομές σας.', always_sent: true },
            ]
        },
        {
            category: 'reminder',
            label: 'Υπενθυμίσεις',
            description: 'Υπενθυμίσεις για ενέργειες που χρειάζονται προσοχή',
            event_types: [
                { event_type: 'policy_expiring', label: 'Ασφάλεια λήγει', description: 'Υπενθυμίσεις 30, 15 και 7 ημέρες πριν τη λήξη.', always_sent: false },
                { event_type: 'pending_questionnaire', label: 'Εκκρεμές ερωτηματολόγιο', description: 'Υπενθύμιση για συμπλήρωση ερωτηματολογίων από τον πράκτορά σας.', always_sent: false },
                { event_type: 'renewal_milestone', label: 'Ανανέωση πλησιάζει', description: 'Ειδοποιήσεις για επερχόμενες ανανεώσεις συμβολαίων.', always_sent: false },
            ]
        },
        {
            category: 'intelligence',
            label: 'Ευφυία Κάλυψης',
            description: 'Ενημερώσεις από την ανάλυση κάλυψης - προαιρετικές',
            event_types: [
                { event_type: 'policy_reviewed', label: 'Ασφάλεια αξιολογήθηκε', description: 'Ενημέρωση όταν η AI ολοκληρώσει την αξιολόγηση μιας ασφάλειας.', always_sent: false },
                { event_type: 'new_gap_detected', label: 'Νέο κενό εντοπίστηκε', description: 'Άμεση ειδοποίηση όταν εντοπιστεί ένα κρίσιμο κενό στην κάλυψή σας.', always_sent: false },
            ]
        }
    ]

    const handleToggleChannel = async (eventType: string, channel: 'email' | 'push', enabled: boolean) => {
        await toggleNotificationPreference(eventType, channel, enabled, currentRole)
    }

    const handleNavigate = (type: string, id: string) => {
        if (type === 'policy') router.push(`/wallet/${id}`)
        if (type === 'customer') router.push(`/customers/${id}`)
    }

    // Mobile View
    const isMobile = useIsMobile()
    if (isMobile) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-20">
                <div className="sticky top-0 z-30 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 px-4 pt-4 pb-0 shadow-sm">
                    <h1 className="text-xl font-black text-stone-900 dark:text-white mb-4">Notifications</h1>
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-stone-500'
                                }`}
                        >
                            History
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'preferences'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-stone-500'
                                }`}
                        >
                            Preferences
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in duration-500">
                    {activeTab === 'history' ? (
                        <MobileNotificationList
                            events={initialData.history}
                            onNavigate={handleNavigate}
                        />
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
                <MobileBottomNav />
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
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Communication Center</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Activity & <span className="text-stone-400 dark:text-stone-500 italic">Alerts.</span>
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl">
                        A chronological record of all system interactions and your personalized notification controls.
                    </p>
                </div>

                <div className="flex p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Ιστορικό
                    </button>
                    <button
                        onClick={() => setActiveTab('preferences')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preferences' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Προτιμήσεις
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
