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
    toggleNotificationPreference
} from "./actions"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useRouter } from "next/navigation"
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
    const router = useRouter()
    const { t } = useLanguage()
    // NOTE: the Referrals tab is intentionally not rendered — the referral
    // program has no earn/redeem loop yet (credits could never be paid out).
    // Re-add the tab when the loop is real (see PXA audit §8.2 / B18).
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'settings'>('overview')
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

    const handleSwitchRole = (role: 'policyholder' | 'agent') => {
        // Dual-role accounts switch context by navigating to that role's home.
        router.push(role === 'agent' ? '/dashboard/agent' : '/dashboard')
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

    // Cancelling a paid plan used to fire immediately on click — no confirmation
    // and no disclosure of what happens (access continues to period end, no
    // partial refund). A compliance/CPO review flags both: accidental-cancel
    // risk and a missing consequence statement. The button now opens a
    // confirmation that states the outcome plainly; this runs only on confirm.
    const performCancel = async () => {
        setCancelConfirmOpen(false)
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
                    <div role="tablist" aria-label={t.account.pageTitle} className="flex p-1 bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-xl border border-black/10 dark:border-white/15 overflow-x-auto no-scrollbar relative isolate">
                        {[
                            { id: 'overview', label: t.account.overview, icon: User },
                            { id: 'billing', label: t.account.billing, icon: CreditCard },
                            { id: 'settings', label: t.account.settings, icon: SettingsIcon },
                        ].map((tab, index, arr) => (
                            <button
                                key={tab.id}
                                role="tab"
                                id={`account-tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`account-panel-${tab.id}`}
                                tabIndex={activeTab === tab.id ? 0 : -1}
                                onClick={() => setActiveTab(tab.id as any)}
                                onKeyDown={(e) => {
                                    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                                    e.preventDefault()
                                    const dir = e.key === 'ArrowRight' ? 1 : -1
                                    const nextId = arr[(index + dir + arr.length) % arr.length].id
                                    setActiveTab(nextId as any)
                                    document.getElementById(`account-tab-${nextId}`)?.focus()
                                }}
                                className={`
                                    flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-kicker font-black uppercase tracking-wider
                                    transition-all duration-300 relative isolate whitespace-nowrap
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                                    ${activeTab === tab.id
                                        ? 'text-black dark:text-mint'
                                        : 'text-black/55 dark:text-white/60 hover:text-black dark:hover:text-white'
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

                <div
                    role="tabpanel"
                    id={`account-panel-${activeTab}`}
                    aria-labelledby={`account-tab-${activeTab}`}
                    tabIndex={0}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-700 focus:outline-none"
                >
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
                            onCancel={() => setCancelConfirmOpen(true)}
                            onDowngrade={() => router.push(initialData.currentPlan?.plan_type === 'agent' ? '/agent/pricing' : '/upgrade')}
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
                            pendingDeletion={initialData.pendingDeletion}
                            onUpdateLanguage={handleLanguageUpdate}
                            onUpdateProfile={handleUpdateProfile}
                            onUpdateEmail={handleUpdateEmail}
                            onToggleNotification={handleToggleNotification}
                            onLogoutSession={handleLogoutSession}
                            onLogoutAllSessions={handleLogoutAll}
                        />
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={cancelConfirmOpen}
                onOpenChange={setCancelConfirmOpen}
                destructive
                title={t.billing.cancelConfirmTitle}
                description={t.billing.cancelConfirmBody}
                confirmLabel={t.billing.cancelConfirmCta}
                onConfirm={performCancel}
            />
        </div>
    )
}
