"use client"

import React, { useState } from 'react'
import {
    User,
    CreditCard,
    Users,
    Settings,
    Shield,
    Bell,
    Globe,
    Lock,
    Mail,
    Phone,
    Calendar,
    TrendingUp,
    Award,
    Sparkles,
    Target
} from 'lucide-react'

interface AccountClientProps {
    initialData: {
        user: any
        currentPlan: any
        currentSubscription: any
        usageMetrics: any
        creditBalance: number
        referrals: any[]
        activeSessions: any[]
    }
    userLanguage?: string
}

type TabType = 'overview' | 'billing' | 'referrals' | 'settings'

export function AccountClient({ initialData, userLanguage = 'en' }: AccountClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview')
    const lang = userLanguage === 'el' ? 'el' : 'en'

    const copy = {
        title: {
            el: 'Λογαριασμός',
            en: 'Account'
        },
        subtitle: {
            el: 'Διαχειριστείτε το προφίλ, τη συνδρομή και τις ρυθμίσεις σας',
            en: 'Manage your profile, subscription, and settings'
        },
        overview: {
            el: 'Επισκόπηση',
            en: 'Overview'
        },
        billing: {
            el: 'Χρεώσεις',
            en: 'Billing'
        },
        referrals: {
            el: 'Παραπομπές',
            en: 'Referrals'
        },
        settings: {
            el: 'Ρυθμίσεις',
            en: 'Settings'
        },
        currentPlan: {
            el: 'Τρέχον Πλάνο',
            en: 'Current Plan'
        },
        usage: {
            el: 'Χρήση',
            en: 'Usage'
        },
        credits: {
            el: 'Πιστώσεις',
            en: 'Credits'
        },
        activeSessions: {
            el: 'Ενεργές Συνεδρίες',
            en: 'Active Sessions'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Hero Header */}
                <div className="relative mb-12 overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400/20 blur-3xl rounded-full -ml-32 -mb-32" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                                {lang === 'el' ? 'Διακυβέρνηση & Λογαριασμός' : 'Governance & Account'}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                            {copy.title[lang]}
                        </h1>

                        <p className="text-lg md:text-xl text-amber-100 max-w-2xl mb-8">
                            {copy.subtitle[lang]}
                        </p>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="w-4 h-4 text-amber-200" />
                                    <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                                        {copy.currentPlan[lang]}
                                    </span>
                                </div>
                                <span className="text-2xl font-black">{initialData.currentPlan?.name || 'Free'}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-amber-200" />
                                    <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                                        {copy.usage[lang]}
                                    </span>
                                </div>
                                <span className="text-2xl font-black">
                                    {initialData.usageMetrics?.policies || 0}/{initialData.currentPlan?.max_policies || '∞'}
                                </span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-amber-200" />
                                    <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                                        {copy.credits[lang]}
                                    </span>
                                </div>
                                <span className="text-2xl font-black">€{initialData.creditBalance || 0}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-amber-200" />
                                    <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                                        {copy.activeSessions[lang]}
                                    </span>
                                </div>
                                <span className="text-2xl font-black">{initialData.activeSessions?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center justify-center mb-8">
                    <div className="inline-flex gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">
                        {[
                            { key: 'overview' as TabType, label: copy.overview[lang], icon: Target },
                            { key: 'billing' as TabType, label: copy.billing[lang], icon: CreditCard },
                            { key: 'referrals' as TabType, label: copy.referrals[lang], icon: Users },
                            { key: 'settings' as TabType, label: copy.settings[lang], icon: Settings }
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === key
                                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-start gap-6">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-3xl font-black">
                                        {initialData.user?.name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                            {initialData.user?.name || 'User'}
                                        </h2>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                <Mail className="w-4 h-4" />
                                                <span>{initialData.user?.email}</span>
                                            </div>
                                            {initialData.user?.phone && (
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{initialData.user.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Card */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-3xl p-8 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
                                        <Award className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {copy.currentPlan[lang]}
                                    </h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">
                                            {initialData.currentPlan?.name || 'Free'}
                                        </span>
                                        {initialData.currentPlan?.price && (
                                            <span className="text-2xl text-slate-600 dark:text-slate-400 ml-3">
                                                €{initialData.currentPlan.price}/month
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {initialData.currentPlan?.description || 'Basic features included'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                                {copy.billing[lang]}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                {lang === 'el'
                                    ? 'Διαχειριστείτε τις μεθόδους πληρωμής και τα τιμολόγιά σας'
                                    : 'Manage your payment methods and invoices'
                                }
                            </p>
                        </div>
                    )}

                    {activeTab === 'referrals' && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
                                {copy.referrals[lang]}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                {lang === 'el'
                                    ? 'Προσκαλέστε φίλους και κερδίστε πιστώσεις'
                                    : 'Invite friends and earn credits'
                                }
                            </p>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Language Settings */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {lang === 'el' ? 'Γλώσσα' : 'Language'}
                                    </h2>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {lang === 'el'
                                        ? 'Επιλέξτε την προτιμώμενη γλώσσα σας'
                                        : 'Choose your preferred language'
                                    }
                                </p>
                            </div>

                            {/* Security Settings */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {lang === 'el' ? 'Ασφάλεια' : 'Security'}
                                    </h2>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {lang === 'el'
                                        ? 'Διαχειριστείτε τον κωδικό πρόσβασης και τις συνεδρίες σας'
                                        : 'Manage your password and sessions'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
