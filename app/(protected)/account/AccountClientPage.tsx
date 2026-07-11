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
import { motion } from 'framer-motion'

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
        const result = await upgradeSubscription(planId, 'monthly', '/account')
        if (result.url) {
            window.location.href = result.url
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
        <div className="pw-page-shell">
            <PageHeader
                title={t.account.pageTitle}
                subtitle={t.account.pageSubtitle}
                className="shadow-sm"
                actions={
                    <div className="flex p-1 bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-xl border border-black/10 dark:border-white/15 overflow-x-auto no-scrollbar relative isolate">
                        {[
                            { id: 'overview', label: t.account.overview, icon: User },
                            { id: 'billing', label: t.account.billing, icon: CreditCard },
                            { id: 'referrals', label: t.account.referrals, icon: Gift },
                            { id: 'settings', label: t.account.settings, icon: SettingsIcon },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider
                                    transition-all duration-300 relative isolate whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'text-black dark:text-mint'
                                        : 'text-black/45 dark:text-white/60 hover:text-black dark:hover:text-white'
                                    }
                                `}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeAccountTab"
                                        className="absolute inset-0 bg-white dark:bg-black rounded-xl shadow-sm -z-10 border border-black/10 dark:border-white/15"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

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
