"use client"

import { useState, useEffect } from 'react'
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
import { useIsMobile } from "@/hooks/useResponsive"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Policy } from "@/components/wallet/types"
import { PageHeader } from '@/components/ui/PageHeader'
import { User, CreditCard, Gift, Settings as SettingsIcon, LogOut } from 'lucide-react'

interface Props {
    initialData: any
    mobileProps?: {
        policies: Policy[]
        user: {
            id: string
            name: string
            email: string
            photoUrl?: string
        }
        agent?: {
            id: string
            name: string
            phone: string
            email: string
            company: string
            photoUrl?: string
        }
    }
}

export function AccountClientPage({ initialData, mobileProps }: Props) {
    const isMobile = useIsMobile()
    const router = useRouter()
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'referrals' | 'settings'>('overview')

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

    const handleChangePassword = async (password?: string) => {
        if (password) await updatePassword(password)
    }

    const handleToggleNotification = async (eventType: string, channel: string, enabled: boolean) => {
        await toggleNotificationPreference(eventType, channel, enabled)
    }

    return (
        <div className="min-h-screen bg-transparent">
            <PageHeader
                title={t.account.pageTitle}
                subtitle={t.account.pageSubtitle}
                actions={
                    <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <User className="w-3.5 h-3.5" />
                            {t.account.overview}
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'billing' ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            {t.account.billing}
                        </button>
                        <button
                            onClick={() => setActiveTab('referrals')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'referrals' ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <Gift className="w-3.5 h-3.5" />
                            {t.account.referrals}
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <SettingsIcon className="w-3.5 h-3.5" />
                            {t.account.settings}
                        </button>
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                            onDowngrade={() => router.push('/upgrade')}
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
                            onChangePassword={handleChangePassword}
                            onToggleNotification={handleToggleNotification}
                            onLogoutSession={handleLogoutSession}
                            onLogoutAllSessions={handleLogoutAll}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
