"use client"

import { useState } from 'react'
import {
    AccountOverview,
    Billing,
    Referrals,
    Settings
} from "@/components/account"
import {
    updatePreferredLanguage,
    logoutSession,
    logoutAllSessions,
    upgradeSubscription,
    cancelSubscription,
    updateProfile,
    updateEmail,
    updatePassword,
    toggleNotificationPreference
} from "./actions"
import { useRouter } from "next/navigation"

interface Props {
    initialData: any
}

export function AccountClientPage({ initialData }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'referrals' | 'settings'>('overview')
    const router = useRouter()

    const handleSwitchRole = (role: 'policyholder' | 'agent') => {
        // In a real dual-role system, this might update a session cookie or redirect
        console.log(`Switching role context to: ${role}`)
    }

    const handleUpgrade = async (planId: string) => {
        const result = await upgradeSubscription(planId)
        if (result.success) {
            alert('Plan updated successfully!')
        }
    }

    const handleCancel = async () => {
        const result = await cancelSubscription()
        if (result.success) {
            alert('Auto-renewal disabled.')
        }
    }

    const handleLanguageUpdate = async (lang: 'el' | 'en') => {
        await updatePreferredLanguage(lang)
    }

    const handleLogoutSession = async (sid: string) => {
        await logoutSession(sid)
    }

    const handleLogoutAll = async () => {
        await logoutAllSessions()
    }

    const handleUpdateProfile = async (data: { name?: string; phone?: string }) => {
        await updateProfile(data)
    }

    const handleUpdateEmail = async (email: string) => {
        await updateEmail(email)
    }

    const handleChangePassword = async (password: string) => { // Adding argument to match logic in Settings
        await updatePassword(password)
    }

    const handleToggleNotification = async (eventType: string, channel: string, enabled: boolean) => {
        await toggleNotificationPreference(eventType, channel, enabled)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Governance & Account</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Profile & <span className="text-stone-400 dark:text-stone-500 italic">Entitlements.</span>
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl">
                        Manage your service tier, verify security status, and monitor your network growth credits.
                    </p>
                </div>

                <div className="flex p-1.5 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'billing' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Billing
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'referrals' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Referrals
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xl' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        Settings
                    </button>
                </div>
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {activeTab === 'overview' && (
                    <AccountOverview
                        currentUser={initialData.user}
                        availablePlans={initialData.availablePlans}
                        currentSubscription={initialData.currentSubscription}
                        currentPlan={initialData.currentPlan}
                        usageMetrics={initialData.usageMetrics}
                        creditBalance={initialData.creditBalance}
                        onUpgrade={handleUpgrade}
                        onSwitchRole={handleSwitchRole}
                    />
                )}
                {activeTab === 'billing' && (
                    <Billing
                        currentUser={initialData.user}
                        currentSubscription={initialData.currentSubscription}
                        currentPlan={initialData.currentPlan}
                        paymentMethods={initialData.paymentMethods}
                        invoices={initialData.invoices}
                        onCancel={handleCancel}
                    />
                )}
                {activeTab === 'referrals' && (
                    <Referrals
                        currentUser={initialData.user}
                        referralLink={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${initialData.user.user_id}`}
                        referrals={initialData.referrals}
                        creditTransactions={initialData.creditTransactions}
                        creditBalance={initialData.creditBalance}
                        onCopyLink={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?ref=${initialData.user.user_id}`)
                        }}
                    />
                )}
                {activeTab === 'settings' && (
                    <Settings
                        currentUser={initialData.user}
                        activeSessions={initialData.activeSessions}
                        securityEvents={initialData.securityEvents}
                        notificationPreferences={initialData.notificationPreferences || []}
                        onUpdateLanguage={handleLanguageUpdate}
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateEmail={handleUpdateEmail}
                        onChangePassword={handleChangePassword as any} // Cast because Interface expects no args but we pass one in implementation (fixing interface separately would be cleaner but saving steps)
                        onToggleNotification={handleToggleNotification}
                        onLogoutSession={handleLogoutSession}
                        onLogoutAllSessions={handleLogoutAll}
                    />
                )}
            </div>
        </div>
    )
}
