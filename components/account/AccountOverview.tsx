"use client"

import type { AccountOverviewProps } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { UsageMeter } from '@/components/monetization/UsageMeter'

export function AccountOverview({
    currentUser,
    availablePlans,
    currentSubscription,
    currentPlan,
    usageMetrics,
    conversionUsage,
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
            policy_storage: 'Policy storage',
            ai_analyses_per_month: 'AI analyses per month',
            notifications: 'Notifications',
            priority_processing: 'Priority processing',
            full_history: 'Full history',
            priority_support: 'Priority support',
            customer_limit: 'Customer limit',
            crm_features: 'CRM features',
            opportunity_tracking: 'Opportunity tracking',
            analytics: 'Analytics',
            white_label: 'White label'
        }

        const label = labels[key] || key
        let displayValue = value

        if (value === 'unlimited') displayValue = t.account.unlimited
        if (value === true) displayValue = "Yes"
        if (value === false) return null
        if (value === 'basic') displayValue = t.account.basic
        if (value === 'advanced') displayValue = t.account.advanced

        return (
            <div key={key} className="flex items-center justify-between py-3 border-b border-black/10 dark:border-white/15 last:border-0">
                <span className="text-xs font-black uppercase tracking-widest text-black/45 dark:text-white/60">{t.account.entitlements[key as keyof typeof t.account.entitlements] || label}</span>
                <span className="text-sm font-black text-black dark:text-white">{displayValue}</span>
            </div>
        )
    }

    const roles = currentUser.role.split(',').map(r => r.trim());
    const isDualRole = roles.length > 1;
    const isPolicyholder = currentPlan.plan_type === 'policyholder'

    return (
        <div className="max-w-7xl mx-auto py-6">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-10 p-6 bg-white dark:bg-black rounded-[32px] border border-black/10 dark:border-white/15 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors group-hover:bg-primary/10" />

                <div className="relative">
                <div className="w-28 h-28 rounded-[24px] overflow-hidden bg-black/5 dark:bg-black border-4 border-white dark:border-white/15 shadow-2xl transition-transform active:scale-95 group-hover:scale-105 duration-500">
                        {currentUser.image ? (
                            <img
                                src={currentUser.image}
                                alt={currentUser.name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-white dark:text-[#1A2420]">
                                <span className="text-4xl font-black">{(currentUser.name || 'U')[0]}</span>
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary border-4 border-white dark:border-white/15 rounded-full shadow-lg"></div>
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <span className="px-3 py-1 bg-black/5 dark:bg-black rounded-full text-[10px] font-black uppercase tracking-widest text-black/60 dark:text-white/65">
                            {currentPlan.name} {t.account.tier}
                        </span>
                        {isDualRole && (
                            <span className="px-3 py-1 bg-primary-soft dark:bg-primary/15 rounded-full text-[10px] font-black uppercase tracking-widest text-primary dark:text-mint border border-primary/30 dark:border-primary/30">
                                {t.account.dualRoleAccount}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-black dark:text-white tracking-tighter mb-1">
                        {currentUser.name}
                    </h1>
                    <p className="text-black/60 dark:text-white/60 font-bold tracking-tight">
                        {currentUser.email}
                    </p>
                </div>

                <div className="flex-shrink-0 flex gap-3 relative z-10">
                    {/* Future actions like Edit Profile */}
                </div>
            </div>

            {/* Role Switcher for Dual-Role Users */}
            {isDualRole && (
                <div className="mb-10 relative overflow-hidden bg-black dark:bg-black rounded-[28px] p-6 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-mint/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-8 h-px bg-mint" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-mint">{t.account.dualRoleContext}</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight mb-2">
                                {t.account.manageFor} <span className="text-white/70 italic">{t.account.yourRole}</span>
                            </h3>
                            <p className="text-white/80 text-xs font-medium max-w-sm">
                                {t.account.dualRoleDesc}
                            </p>
                        </div>
                        <div className="flex p-2 bg-black/80 backdrop-blur-md rounded-2xl border border-white/5">
                            <button
                                onClick={() => onSwitchRole?.('policyholder')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isPolicyholder
                                    ? 'bg-white text-black shadow-xl'
                                    : 'text-white/65 hover:text-white'
                                    }`}
                            >
                                {t.account.policyholder}
                            </button>
                            <button
                                onClick={() => onSwitchRole?.('agent')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!isPolicyholder
                                    ? 'bg-white text-black shadow-xl'
                                    : 'text-white/65 hover:text-white'
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
                    <div className="absolute -inset-0.5 bg-primary/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-[32px] overflow-hidden shadow-2xl h-full">
                        <div className="p-8 border-b border-black/10 dark:border-white/15 bg-black/5 dark:bg-black">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-6 h-px bg-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary dark:text-mint">{t.account.currentPlan}</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter">
                                        {currentPlan.name}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-black dark:text-white tracking-tight">
                                        {formatPrice(currentPlan.price)}
                                    </div>
                                    <div className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-widest mt-1">
                                        {currentPlan.billing_interval === 'month' ? t.account.perMonth : t.account.perYear}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h3 className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-[0.2em] mb-6">
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
                    <div className="bg-primary rounded-[32px] p-8 text-white dark:text-[#1A2420] shadow-2xl shadow-primary/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/85 dark:text-[#1A2420]/85">{t.account.walletCredits}</span>
                            </div>
                            <div className="text-4xl font-black tracking-tighter mb-3">
                                {formatPrice(creditBalance)}
                            </div>
                            <p className="text-white/80 dark:text-[#1A2420]/80 text-xs font-medium leading-relaxed italic">
                                {t.account.creditsDesc}
                            </p>
                        </div>
                    </div>

                    {/* Metrics Card */}
                    <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-[32px] p-8 shadow-sm">
                        <h3 className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-[0.2em] mb-8">
                            {t.account.cycleMetrics}
                        </h3>
                        <div className="space-y-8">
                            {usageMetrics.map((metric) => {
                                const percentage = getUsagePercentage(metric.amount_used, metric.amount_limit)
                                const isUnlimited = metric.amount_limit === 'unlimited'

                                return (
                                    <div key={metric.usage_id} className="group/metric">
                                        <div className="flex items-end justify-between mb-3 px-1">
                                            <span className="text-xs font-black uppercase tracking-widest text-black dark:text-white">
                                                {metric.usage_type === 'ai_analysis' && t.account.aiUsage}
                                                {metric.usage_type === 'customer_count' && t.account.activeRelationships}
                                                {metric.usage_type === 'customer_invite' && t.account.networkGrowth}
                                            </span>
                                            <span className="text-[10px] font-bold text-black/45 dark:text-white/60">
                                                {metric.amount_used} / {isUnlimited ? "∞" : metric.amount_limit}
                                            </span>
                                        </div>
                                        {!isUnlimited && (
                                            <div className="h-2 bg-black/5 dark:bg-black rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${percentage >= 90
                                                        ? 'bg-red-500'
                                                        : percentage >= 70
                                                            ? 'bg-amber-500'
                                                            : 'bg-primary'
                                                        }`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Free floor / plan allowance — what's actually left,
                                stated plainly rather than only at the moment of a wall. */}
                            {conversionUsage && conversionUsage.tier === 'free' && (
                                <>
                                    <UsageMeter
                                        label={t.account.freeQuestionsMeter}
                                        used={conversionUsage.freeQuestionsUsed}
                                        limit={conversionUsage.freeQuestionsLimit}
                                    />
                                    <UsageMeter
                                        label={t.account.trialAnalysisMeter}
                                        used={conversionUsage.trialAnalysisAvailable ? 0 : 1}
                                        limit={1}
                                        hint={
                                            conversionUsage.trialAnalysisAvailable
                                                ? t.account.trialAnalysisAvailableHint
                                                : t.account.trialAnalysisUsedHint
                                        }
                                    />
                                </>
                            )}
                            {conversionUsage && conversionUsage.tier !== 'free' && (
                                <UsageMeter
                                    label={t.account.monthlyAnalysesMeter}
                                    used={conversionUsage.analysesUsedThisMonth}
                                    limit={conversionUsage.analysesLimitPerMonth}
                                />
                            )}
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
                                <div className="w-8 h-px bg-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-mint">{t.account.expandCapabilities}</span>
                            </div>
                            <h2 className="text-4xl font-black text-black dark:text-white tracking-tighter">
                                {t.account.scalingTitle} <span className="text-black/45 dark:text-white/60 italic">{t.account.scalingSubtitle}</span>
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
                                        className={`bg-white dark:bg-black border ${isPro ? 'border-primary shadow-primary/15' : 'border-black/10 dark:border-white/15'} rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all group relative overflow-hidden`}
                                    >
                                        {isPro && (
                                            <div className="absolute top-5 right-5 bg-primary text-white dark:text-[#1A2420] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                                {language === 'el' ? '14 ΗΜΕΡΕΣ ΔΩΡΕΑΝ' : '14-DAY FREE TRIAL'}
                                            </div>
                                        )}
                                        <div className="mb-10">
                                            <h4 className="text-xl font-black text-black dark:text-white uppercase tracking-tight mb-2">
                                                {plan.name}
                                            </h4>
                                            <div className="flex items-end gap-1">
                                                <span className="text-3xl font-black text-black dark:text-white">{formatPrice(plan.price)}</span>
                                                <span className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-widest pb-1">/ mo</span>
                                            </div>
                                        </div>

                                        <div className="mb-10 space-y-4">
                                            {Object.entries(plan.entitlements)
                                                .slice(0, 4)
                                                .map(([key, value]) => (
                                                    <div key={key} className="flex items-center gap-3 text-xs font-medium text-black/60 dark:text-white/60">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-primary shadow-[0_0_8px_rgba(41,104,91,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(41,104,91,0.45)]'}`} />
                                                        <span>{value === 'unlimited' ? t.account.unlimited : value} {t.account.entitlements[key as keyof typeof t.account.entitlements] || key.replace(/_/g, ' ')}</span>
                                                    </div>
                                                ))}
                                        </div>

                                        <button
                                            onClick={() => onUpgrade?.(plan.plan_id)}
                                            className="w-full py-4 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-95"
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




