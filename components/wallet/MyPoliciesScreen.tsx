"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import type { Policy } from './types'
import { PolicyWalletLogo } from '@/components/branding/Logo'
import { calculatePremiumFootprint } from '@/lib/wallet/premium-footprint'
import { getPolicyStatusView } from '@/lib/wallet/policy-status-view'
import { StatusPill } from '@/components/ui/StatusPill'
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { getBranchIcon } from '@/lib/insurance/branch-icons'
import { getDocumentPolicySummary } from '@/lib/wallet/document-insights'
import { getRoleCopy } from '@/lib/i18n/role-copy'
import { Wallet, Car } from 'lucide-react'
import { EmptyState as SharedEmptyState, PolicyPreviewRow } from '@/components/ui/EmptyState'
import { UpgradeTriggerCard } from '@/components/monetization/UpgradeTriggerCard'

interface MyPoliciesScreenProps {
    policies: Policy[]
    tier?: 'free' | 'plus' | 'pro'
    onViewPolicy?: (id: string) => void
    onAddPolicy?: () => void
}

export function MyPoliciesScreen({ policies, tier = 'free', onViewPolicy, onAddPolicy }: MyPoliciesScreenProps) {
    const { language, t } = useLanguage()
    const lang: 'el' | 'en' = language === 'el' ? 'el' : 'en'
    const roleCopy = getRoleCopy(language)
    const totalPremium = calculatePremiumFootprint(policies)
    const activeCount = policies.filter((p) => getPolicyStatusView(p, t).key === 'active').length

    const copy = {
        title: roleCopy.walletDashboard.noPoliciesYet,
        subtitle: roleCopy.walletDashboard.subtitle,
        activePolicies: t.wallet.myPoliciesScreen.activePolicies,
        yearlyFootprint: roleCopy.walletDashboard.yearlyFootprint,
        addPolicy: roleCopy.walletDashboard.addPolicyAria,
        emptyTitle: roleCopy.walletDashboard.emptyWalletTitle,
        emptyDescription: roleCopy.walletDashboard.emptyWalletDescription,
        expires: roleCopy.walletDashboard.expires,
        policyCount: roleCopy.walletDashboard.policyCountLabel,
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black pb-28">
            <div className="px-5 pt-6 pb-6 flex items-center justify-between sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-black/10 dark:border-white/15">
                <PolicyWalletLogo size="sm" language={language} />
                <button
                    onClick={onAddPolicy}
                    className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white text-black dark:text-black rounded-2xl transition-all active:scale-[0.95] shadow-sm border border-black/10 dark:border-white/15 cursor-pointer"
                    aria-label={copy.addPolicy}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="px-5 pb-6">
                <h1 className="text-3xl font-black text-black dark:text-white tracking-tight leading-tight">
                    {copy.title}
                </h1>
                <p className="text-black/55 dark:text-white/65 text-sm mt-1 mb-5">
                    {copy.subtitle}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 bg-white dark:bg-black border border-black/10 dark:border-white/15">
                        <p className="text-[11px] font-bold text-black/55 dark:text-white/65 uppercase tracking-wider">{copy.activePolicies}</p>
                        {/* Was policies.length — it counted expired policies as active while the
                            premium tile beside it excluded them, so the two tiles disagreed. */}
                        <p className="text-3xl font-semibold tracking-tight text-black dark:text-white mt-2 tabular-nums">{activeCount}</p>
                        <p className="text-xs text-black/45 dark:text-white/55 mt-1">
                            {activeCount}/{policies.length} {copy.policyCount}
                        </p>
                    </div>
                    <div className="rounded-2xl p-4 bg-primary-tint dark:bg-primary/15 border border-primary/30 dark:border-primary/35 text-black dark:text-white">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary dark:text-mint">{copy.yearlyFootprint}</p>
                        <p className="text-2xl font-semibold tracking-tight mt-2 tabular-nums">
                            {new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPremium)}
                        </p>
                    </div>
                </div>

                {/* Mobile upgrade surface — the desktop wallet has its own triggers,
                    this is the only one a phone user sees on the wallet tab. */}
                {tier === 'free' && policies.length > 0 && (
                    <div className="mt-3">
                        <UpgradeTriggerCard
                            featureKey="full_ai_policy_analysis"
                            triggerSource="mobile_wallet_tile"
                            returnTo="/wallet"
                        />
                    </div>
                )}
            </div>

            <div className="px-5 space-y-3">
                {policies.length === 0 ? (
                    <SharedEmptyState
                        icon={Wallet}
                        headline={t.wallet.emptyState.headline}
                        description={t.wallet.emptyState.benefit}
                        cta={{ label: t.wallet.emptyState.ctaPrimary, onClick: onAddPolicy }}
                        previewLabel={t.wallet.emptyState.previewLabel}
                        preview={
                            <PolicyPreviewRow
                                icon={Car}
                                name={t.wallet.emptyState.exampleMotor}
                                meta={t.wallet.emptyState.exampleMotorMeta}
                                statusLabel={t.wallet.emptyState.exampleMotorStatus}
                            />
                        }
                        trust={t.wallet.emptyState.trust}
                    />
                ) : (
                    policies.map((policy) => {
                        const branch = normalizeBranch(policy.lineOfBusiness)
                        // Was `policy.lineOfBusiness` — the raw enum, so a Greek wallet
                        // showed "motor", "legal_expenses", "cyber".
                        const typeLabel = branch.label[lang]
                        const summary = getDocumentPolicySummary(policy, lang, typeLabel)
                        const view = getPolicyStatusView(policy, t)
                        const Icon = getBranchIcon(branch.id)

                        return (
                            <button
                                key={policy.id}
                                onClick={() => onViewPolicy?.(policy.id)}
                                className="w-full bg-white dark:bg-black rounded-2xl px-3.5 py-3 flex items-center gap-3 border border-black/10 dark:border-white/15 active:scale-[0.98] transition-all cursor-pointer text-left"
                            >
                                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${view.chipClass}`}>
                                    <Icon className="w-4 h-4" />
                                </span>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[14px] font-semibold text-black dark:text-white truncate">
                                        {summary.assetTitle}
                                    </h3>
                                    {/* assetTitle falls back to the insurer when there is no
                                        vehicle/property to name — don't print it twice. */}
                                    <p className="text-[11px] text-black/50 dark:text-white/50 truncate">
                                        {summary.assetTitle === policy.insurerName
                                            ? typeLabel
                                            : `${typeLabel} · ${policy.insurerName}`}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <StatusPill tone={view.tone} label={view.label} icon={false} />
                                    <span className="text-[12px] font-semibold tabular-nums text-black dark:text-white">
                                        {summary.premiumDisplay}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
