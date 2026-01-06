"use client"

import type { NotificationPreferencesProps } from './types'

export function NotificationPreferences({
    currentUser,
    activeRole,
    preferences,
    preferenceCategories,
    onToggleChannel,
    onSwitchRole
}: NotificationPreferencesProps) {
    const getPreference = (eventType: string) => {
        return preferences.find(p => p.event_type === eventType && p.role === activeRole)
    }

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'system_confirmation':
                return 'Επιβεβαιώσεις Συστήματος'
            case 'reminder':
                return 'Υπενθυμίσεις'
            case 'intelligence':
                return 'Ευφυία Κάλυψης'
            default:
                return category
        }
    }

    const getCategoryDescription = (category: string) => {
        switch (category) {
            case 'system_confirmation':
                return 'Πάντα αποστέλλονται - δεν μπορούν να απενεργοποιηθούν'
            case 'reminder':
                return 'Υπενθυμίσεις για ενέργειες που χρειάζονται προσοχή'
            case 'intelligence':
                return 'Ενημερώσεις από την ανάλυση κάλυψης - προαιρετικές'
            default:
                return ''
        }
    }

    // Check if user has dual roles
    const roles = currentUser.role.split(',').map(r => r.trim());
    const isDualRole = roles.length > 1;

    return (
        <div className="max-w-5xl mx-auto py-8">
            {/* Role Switcher for Dual-Role Users */}
            {isDualRole && (
                <div className="mb-12 relative overflow-hidden bg-stone-900 dark:bg-black rounded-[32px] p-8 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-px bg-teal-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500">Dual-Role Context</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight mb-2">
                                Προτιμήσεις για <span className="text-stone-400 italic">τον Ρόλο σας</span>
                            </h3>
                            <p className="text-stone-500 text-xs font-medium max-w-sm">
                                Οι ρυθμίσεις ειδοποιήσεων είναι ανεξάρτητες για κάθε ρόλο. Επιλέξτε τον ρόλο που θέλετε να παραμετροποιήσετε.
                            </p>
                        </div>
                        <div className="flex p-2 bg-stone-800/50 backdrop-blur-md rounded-2xl border border-white/5">
                            <button
                                onClick={() => onSwitchRole?.('policyholder')}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRole === 'policyholder'
                                        ? 'bg-white text-stone-900 shadow-xl'
                                        : 'text-stone-400 hover:text-white'
                                    }`}
                            >
                                Ασφαλισμένος
                            </button>
                            <button
                                onClick={() => onSwitchRole?.('agent')}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRole === 'agent'
                                        ? 'bg-white text-stone-900 shadow-xl'
                                        : 'text-stone-400 hover:text-white'
                                    }`}
                            >
                                Πράκτορας
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preference Categories */}
            <div className="grid grid-cols-1 gap-10">
                {preferenceCategories.map((category) => (
                    <div
                        key={category.category}
                        className="group"
                    >
                        {/* Category Header */}
                        <div className="flex items-end justify-between mb-8 px-2">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                                        {getCategoryLabel(category.category)}
                                    </h2>
                                    {category.category === 'system_confirmation' && (
                                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-[8px] font-black text-stone-500 uppercase tracking-widest rounded border border-stone-200 dark:border-stone-700">CORE</span>
                                    )}
                                </div>
                                <p className="text-sm font-medium text-stone-400 dark:text-stone-500 italic">
                                    {getCategoryDescription(category.category)}
                                </p>
                            </div>
                        </div>

                        {/* Event Types */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {category.event_types.map((eventType) => {
                                const pref = getPreference(eventType.event_type)
                                const isAlwaysSent = eventType.always_sent

                                return (
                                    <div key={eventType.event_type} className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-8 rounded-[32px] shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all group/item">
                                        <div className="flex flex-col h-full">
                                            {/* Label and Description */}
                                            <div className="mb-8">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight group-hover/item:text-teal-600 transition-colors">
                                                        {eventType.label}
                                                    </div>
                                                </div>
                                                <p className="text-xs font-medium text-stone-400 dark:text-stone-500 leading-relaxed">
                                                    {eventType.description}
                                                </p>
                                            </div>

                                            {/* Toggles Container */}
                                            <div className="mt-auto pt-6 border-t border-stone-50 dark:border-stone-800 flex items-center justify-between">
                                                {!isAlwaysSent && pref ? (
                                                    <div className="flex items-center gap-8 w-full">
                                                        {/* Email Toggle */}
                                                        <div className="flex items-center justify-between flex-1 group/toggle">
                                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Email</span>
                                                            <button
                                                                onClick={() => onToggleChannel?.(eventType.event_type, 'email', !pref.channel_email)}
                                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${pref.channel_email
                                                                        ? 'bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                                                                        : 'bg-stone-200 dark:bg-stone-700'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${pref.channel_email ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </button>
                                                        </div>

                                                        <div className="w-px h-4 bg-stone-100 dark:bg-stone-800" />

                                                        {/* Push Toggle */}
                                                        <div className="flex items-center justify-between flex-1 group/toggle">
                                                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Push</span>
                                                            <button
                                                                onClick={() => onToggleChannel?.(eventType.event_type, 'push', !pref.channel_push)}
                                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${pref.channel_push
                                                                        ? 'bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                                                                        : 'bg-stone-200 dark:bg-stone-700'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${pref.channel_push ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-stone-300 dark:text-stone-700">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5" /></svg>
                                                        <span className="text-[9px] font-black uppercase tracking-widest italic">Always active via email</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Footnote */}
            <div className="mt-16 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-stone-100 dark:border-stone-700 flex-shrink-0">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">Σημείωση για την Ιδιωτικότητα</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed max-w-2xl italic">
                        Οι αλλαγές σας αποθηκεύονται σε πραγματικό χρόνο. Το σύστημα PolicyWallet διαθέτει ενσωματωμένους μηχανισμούς κατά της υπερβολικής όχλησης (anti-spam), οι οποίοι διασφαλίζουν ότι λαμβάνετε μόνο τις πιο ουσιαστικές ενημερώσεις, ανεξάρτητα από τις επιλεγμένες προτιμήσεις σας.
                    </p>
                </div>
            </div>
        </div>
    )
}
