"use client"

import type { AccountOverviewProps } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

export function AccountOverview({
    currentUser,
    availablePlans,
    currentSubscription,
    currentPlan,
    usageMetrics,
    creditBalance,
    onViewPlan,
    onUpgrade,
    onSwitchRole
}: AccountOverviewProps) {
    const { language, t } = useLanguage()

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format(price)
    }

    const getUsagePercentage = (used: number, limit: number | string) => {
        if (limit === 'unlimited') return 0
        return Math.round((used / (limit as number)) * 100)
    }

    const renderEntitlement = (key: string, value: any) => {
        const labels: Record<string, string> = {
            policy_storage: 'Αποθήκευση ασφαλειών',
            ai_analyses_per_month: 'AI αναλύσεις ανά μήνα',
            notifications: 'Ειδοποιήσεις',
            priority_processing: 'Προτεραιότητα επεξεργασίας',
            full_history: 'Πλήρες ιστορικό',
            priority_support: 'Προτεραιότητα υποστήριξης',
            customer_limit: 'Όριο πελατών',
            crm_features: 'Χαρακτηριστικά CRM',
            opportunity_tracking: 'Παρακολούθηση ευκαιριών',
            analytics: 'Αναλυτικά',
            white_label: 'White label'
        }

        const label = labels[key] || key
        let displayValue = value

        if (value === 'unlimited') displayValue = t.account.unlimited
        if (value === true) displayValue = '✓'
        if (value === false) return null
        if (value === 'basic') displayValue = t.account.basic
        if (value === 'advanced') displayValue = t.account.advanced

        return (
            <div key={key} className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                <span className="text-xs font-black uppercase tracking-widest text-stone-400">{t.account.entitlements[key as keyof typeof t.account.entitlements] || label}</span>
                <span className="text-sm font-black text-stone-900 dark:text-stone-100">{displayValue}</span>
            </div>
        )
    }

    const roles = currentUser.role.split(',').map(r => r.trim());
    const isDualRole = roles.length > 1;
    const isPolicyholder = currentPlan.plan_type === 'policyholder'

    return (
        <div className="max-w-7xl mx-auto py-6">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-10 p-6 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors group-hover:bg-teal-500/10" />

                <div className="relative">
                <div className="w-28 h-28 rounded-[24px] overflow-hidden bg-stone-100 dark:bg-stone-800 border-4 border-white dark:border-stone-900 shadow-2xl transition-transform active:scale-95 group-hover:scale-105 duration-500">
                        {currentUser.image ? (
                            <img
                                src={currentUser.image}
                                alt={currentUser.name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-400 text-white">
                                <span className="text-4xl font-black">{(currentUser.name || 'U')[0]}</span>
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-stone-900 rounded-full shadow-lg"></div>
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-500">
                            {currentPlan.name} {t.account.tier}
                        </span>
                        {isDualRole && (
                            <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/20 rounded-full text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
                                {t.account.dualRoleAccount}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-1">
                        {currentUser.name}
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 font-bold tracking-tight">
                        {currentUser.email}
                    </p>
                </div>

                <div className="flex-shrink-0 flex gap-3 relative z-10">
                    {/* Future actions like Edit Profile */}
                </div>
            </div>

            {/* Role Switcher for Dual-Role Users */}
            {isDualRole && (
                <div className="mb-10 relative overflow-hidden bg-stone-900 dark:bg-black rounded-[28px] p-6 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-px bg-teal-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500">{t.account.dualRoleContext}</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight mb-2">
                                {t.account.manageFor} <span className="text-stone-400 italic">{t.account.yourRole}</span>
                            </h3>
                            <p className="text-stone-500 text-xs font-medium max-w-sm">
                                {t.account.dualRoleDesc}
                            </p>
                        </div>
                        <div className="flex p-2 bg-stone-800/50 backdrop-blur-md rounded-2xl border border-white/5">
                            <button
                                onClick={() => onSwitchRole?.('policyholder')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isPolicyholder
                                    ? 'bg-white text-stone-900 shadow-xl'
                                    : 'text-stone-400 hover:text-white'
                                    }`}
                            >
                                {t.account.policyholder}
                            </button>
                            <button
                                onClick={() => onSwitchRole?.('agent')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!isPolicyholder
                                    ? 'bg-white text-stone-900 shadow-xl'
                                    : 'text-stone-400 hover:text-white'
                                    }`}
                            >
                                {t.account.agent}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Current Plan Card */}
                <div className="lg:col-span-2 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-teal-500/20 to-stone-500/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] overflow-hidden shadow-2xl h-full">
                        <div className="p-8 border-b border-stone-50 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-6 h-px bg-teal-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{t.account.currentPlan}</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">
                                        {currentPlan.name}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                                        {formatPrice(currentPlan.price)}
                                    </div>
                                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">
                                        {currentPlan.billing_interval === 'month' ? t.account.perMonth : t.account.perYear}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-6">
                                {t.account.includedPrivileges}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                                {Object.entries(currentPlan.entitlements).map(([key, value]) =>
                                    renderEntitlement(key, value)
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credit Registry & Quick Metrics */}
                <div className="space-y-8">
                    {/* Credit Registry */}
                    <div className="bg-teal-600 rounded-[32px] p-8 text-white shadow-2xl shadow-teal-600/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-teal-100">{t.account.walletCredits}</span>
                            </div>
                            <div className="text-4xl font-black tracking-tighter mb-3">
                                {formatPrice(creditBalance)}
                            </div>
                            <p className="text-teal-50/70 text-xs font-medium leading-relaxed italic">
                                {t.account.creditsDesc}
                            </p>
                        </div>
                    </div>

                    {/* Metrics Card */}
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm">
                        <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-8">
                            {t.account.cycleMetrics}
                        </h3>
                        <div className="space-y-8">
                            {usageMetrics.map((metric) => {
                                const percentage = getUsagePercentage(metric.amount_used, metric.amount_limit)
                                const isUnlimited = metric.amount_limit === 'unlimited'

                                return (
                                    <div key={metric.usage_id} className="group/metric">
                                        <div className="flex items-end justify-between mb-3 px-1">
                                            <span className="text-xs font-black uppercase tracking-widest text-stone-900 dark:text-white">
                                                {metric.usage_type === 'ai_analysis' && t.account.aiUsage}
                                                {metric.usage_type === 'customer_count' && t.account.activeRelationships}
                                                {metric.usage_type === 'customer_invite' && t.account.networkGrowth}
                                            </span>
                                            <span className="text-[10px] font-bold text-stone-400">
                                                {metric.amount_used} / {isUnlimited ? '∞' : metric.amount_limit}
                                            </span>
                                        </div>
                                        {!isUnlimited && (
                                            <div className="h-2 bg-stone-50 dark:bg-stone-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${percentage >= 90
                                                        ? 'bg-red-500'
                                                        : percentage >= 70
                                                            ? 'bg-amber-500'
                                                            : 'bg-teal-500'
                                                        }`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Options (if on basic/free) */}
            {(currentPlan.price === 0 || currentPlan.name.toLowerCase().includes('free')) && (
                <div className="mt-14">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 px-4">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-px bg-teal-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">{t.account.expandCapabilities}</span>
                            </div>
                            <h2 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter">
                                {t.account.scalingTitle} <span className="text-stone-400 italic">{t.account.scalingSubtitle}</span>
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availablePlans
                            .filter(plan => plan.price > (currentPlan.price || 0))
                            .map((plan) => {
                                const isPro = plan.name.toLowerCase().includes('pro')
                                return (
                                    <div
                                        key={plan.plan_id}
                                        className={`bg-white dark:bg-stone-900 border ${isPro ? 'border-teal-500 shadow-teal-500/10' : 'border-stone-100 dark:border-stone-800'} rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden`}
                                    >
                                        {isPro && (
                                            <div className="absolute top-5 right-5 bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                                {language === 'el' ? '14 ΗΜΕΡΕΣ ΔΩΡΕΑΝ' : '14-DAY FREE TRIAL'}
                                            </div>
                                        )}
                                        <div className="mb-10">
                                            <h4 className="text-xl font-black text-stone-900 dark:text-white uppercase tracking-tight mb-2">
                                                {plan.name}
                                            </h4>
                                            <div className="flex items-end gap-1">
                                                <span className="text-3xl font-black text-stone-900 dark:text-white">{formatPrice(plan.price)}</span>
                                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest pb-1">/ mo</span>
                                            </div>
                                        </div>

                                        <div className="mb-10 space-y-4">
                                            {Object.entries(plan.entitlements)
                                                .slice(0, 4)
                                                .map(([key, value]) => (
                                                    <div key={key} className="flex items-center gap-3 text-xs font-medium text-stone-500 dark:text-stone-400">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]'}`} />
                                                        <span>{value === 'unlimited' ? t.account.unlimited : value} {t.account.entitlements[key as keyof typeof t.account.entitlements] || key.replace(/_/g, ' ')}</span>
                                                    </div>
                                                ))}
                                        </div>

                                        <button
                                            onClick={() => onUpgrade?.(plan.plan_id)}
                                            className={`w-full py-4 ${isPro ? 'bg-teal-600 hover:bg-teal-700' : 'bg-stone-900 dark:bg-white hover:bg-teal-600 hover:dark:bg-teal-500'} ${isPro ? 'text-white' : 'text-white dark:text-stone-900'} rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-xl shadow-stone-900/10 transition-all active:scale-95`}
                                        >
                                            {isPro
                                                ? (language === 'el' ? 'Ξεκινήστε δωρεάν δοκιμή 14 ημερών' : 'Start 14-Day Free Trial')
                                                : t.account.selectPlan}
                                        </button>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}
