"use client"

import Link from "next/link"
import { Crown } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const TIER_RANK = { free: 0, plus: 1, pro: 2 } as const
type PlanTier = 'free' | 'plus' | 'pro'

interface PlanGateProps {
    userPlan: PlanTier
    requiredPlan: 'plus' | 'pro'
    featureLabel?: string
    children: React.ReactNode
}

export function PlanGate({ userPlan, requiredPlan, featureLabel, children }: PlanGateProps) {
    const { t, language } = useLanguage()
    const copy = (t as any).planGate as { lockedFeature?: string; upgradeCta?: string } | undefined

    if (TIER_RANK[userPlan] >= TIER_RANK[requiredPlan]) {
        return <>{children}</>
    }

    return (
        <div className="relative">
            <div aria-hidden="true" className="select-none blur-sm pointer-events-none">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 bg-white/90 px-6 py-5 text-center shadow-lg backdrop-blur-sm dark:border-white/15 dark:bg-black/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Crown className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    </div>

                    {featureLabel && (
                        <p className="text-sm font-medium text-black/60 dark:text-white/60">
                            {featureLabel}
                        </p>
                    )}

                    <p className="text-xs text-black/60 dark:text-white/50">
                        {copy?.lockedFeature?.replace('{plan}', requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1))
                            || (language === 'el'
                                ? `Απαιτεί ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`
                                : `Requires ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`)}
                    </p>

                    <Link
                        href="/upgrade"
                        className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                    >
                        <Crown className="h-3.5 w-3.5" />
                        {copy?.upgradeCta || t.wallet.upgradePlan}
                    </Link>
                </div>
            </div>
        </div>
    )
}
