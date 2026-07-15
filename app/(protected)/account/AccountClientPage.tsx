"use client"

import { useState, useEffect } from 'react'
import {
    AccountOverview,
    Billing,
    Settings
} from "@/components/account"
import {
    updatePreferredLanguage,
    logoutSession,
    logoutAllSessions,
    upgradeSubscription,
    cancelSubscription,
    createBillingPortalSession,
    updateProfile,
    updateEmail,
    updatePassword,
    toggleNotificationPreference
} from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/useResponsive"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { Policy } from "@/components/wallet/types"
import { PageHeader } from '@/components/ui/PageHeader'
import { User, CreditCard, Settings as SettingsIcon, LogOut } from 'lucide-react'
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
    // NOTE: the Referrals tab is intentionally not rendered — the referral
    // program has no earn/redeem loop yet (credits could never be paid out).
    // Re-add the tab when the loop is real (see PXA audit §8.2 / B18).
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'settings'>('overview')

    const handleSwitchRole = (role: 'policyholder' | 'agent') => {
        // In a real dual-role system, this might update a session cookie or redirect
        console.log(`Switching role context to: ${role}`)
    }

    const handleUpgrade = async (planId: string) => {
        trackJourneyEvent('plan_selected', {
            plan: planId,
            billing_period: 'monthly',
            screen: 'account_overview',
        })
        const result = await upgradeSubscription(planId, 'monthly', '/account')
        if (result.url) {
            window.location.href = result.url
        }
    }

    const handleCancel = async () => {
        const result = await cancelSubscription()
        if ('error' in result && result.error) {
            // Stripe refused the cancellation — never pretend it worked.
            toast.error(result.error)
            return
        }
        if (result.success) {
            toast.success(t.settings.autoRenewalDisabled)
        }
    }

    const handleOpenPortal = async () => {
        const res = await createBillingPortalSession()
        if ('url' in res && res.url) {
            window.location.href = res.url
        } else {
            toast.error((t as any).errors?.somethingWentWrong)
        }
    }

    const handleSwitchToAnnual = async () => {
        // Same plan, annual cadence — Stripe checkout replaces the monthly sub
        const planId = initialData.currentPlan?.plan_id
        if (!planId) return
        trackJourneyEvent('billing_period_selected', {
            plan: planId,
            billing_period: 'annual',
            screen: 'account_billing',
        })
        const result = await upgradeSubscription(planId, 'annual', '/account')
        if (result.url) {
            window.location.href = result.url
        } else if (result.error) {
            toast.error(result.error)
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
        const res = await updateEmail(email)
        if ('error' in res && res.error) toast.error(t.settings.updateFailed)
        else toast.success(t.settings.updateSuccess)
    }

    const handleChangePassword = async (password?: string) => {
        if (!password) return
        const res = await updatePassword(password)
        if ('error' in res && res.error) toast.error(t.settings.updateFailed)
        else toast.success(t.settings.updateSuccess)
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
                            conversionUsage={initialData.conversionUsage}
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
                            onOpenPortal={handleOpenPortal}
                            onSwitchToAnnual={handleSwitchToAnnual}
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
