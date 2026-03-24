"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { PlanGate } from "@/components/ui/PlanGate"
import type { Policy } from "@/components/wallet/types"
import { Shield, AlertTriangle, BadgeCheck, Sparkles } from "lucide-react"

type PlanTier = 'free' | 'plus' | 'pro'

interface CoverageHealthScoreProps {
    policy: Policy & { gapCount?: number }
    userPlan: PlanTier
}

function calculateHealthScore(policy: Policy & { gapCount?: number }): number {
    let score = 100
    score -= (policy.aiInsights?.exclusions?.length ?? 0) * 10
    score -= (policy.gapCount ?? 0) * 15
    if (policy.verified) score = Math.min(score + 5, 100)
    return Math.max(0, Math.min(100, score))
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
    if (score <= 40) return { stroke: '#ef4444', text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' }
    if (score <= 70) return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
    return { stroke: '#1fdc86', text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
}

function DonutRing({ score, size = 96, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference
    const color = getScoreColor(score)

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-black/5 dark:text-white/10"
            />
            {/* Score ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color.stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-700 ease-out"
            />
        </svg>
    )
}

export function CoverageHealthScore({ policy, userPlan }: CoverageHealthScoreProps) {
    const { t, language } = useLanguage()
    const copy = (t.wallet as any)?.healthScore || {}

    const score = calculateHealthScore(policy)
    const color = getScoreColor(score)
    const exclusionCount = policy.aiInsights?.exclusions?.length ?? 0
    const gapCount = policy.gapCount ?? 0

    return (
        <div className="space-y-5">
            {/* Title */}
            <h3 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/60">
                {copy.title || (language === 'el' ? 'Υγεία Κάλυψης' : 'Coverage Health')}
            </h3>

            {/* Donut + Score — visible to ALL tiers */}
            <div className="flex items-center gap-6">
                <div className="relative">
                    <DonutRing score={score} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black ${color.text}`}>{score}</span>
                        <span className="text-[10px] font-semibold text-black/30 dark:text-white/30">/ 100</span>
                    </div>
                </div>

                <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-black/80 dark:text-white/80">
                        {score >= 71
                            ? (language === 'el' ? 'Καλή κάλυψη' : 'Good coverage')
                            : score >= 41
                                ? (language === 'el' ? 'Μέτρια κάλυψη' : 'Moderate coverage')
                                : (language === 'el' ? 'Χρειάζεται προσοχή' : 'Needs attention')}
                    </p>
                    <p className="text-xs text-black/40 dark:text-white/40">
                        {language === 'el'
                            ? 'Βασισμένο στις εξαιρέσεις και τα κενά κάλυψης'
                            : 'Based on exclusions and coverage gaps'}
                    </p>
                </div>
            </div>

            {/* Category Breakdown — PLUS tier */}
            <PlanGate userPlan={userPlan} requiredPlan="plus" featureLabel={copy.title || 'Coverage breakdown'}>
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
                        <AlertTriangle className="mx-auto h-4 w-4 text-amber-500" />
                        <p className="mt-1 text-lg font-bold text-black dark:text-white">{exclusionCount}</p>
                        <p className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                            {copy.exclusions || (language === 'el' ? 'Εξαιρέσεις' : 'Exclusions')}
                        </p>
                    </div>
                    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
                        <Shield className="mx-auto h-4 w-4 text-red-400" />
                        <p className="mt-1 text-lg font-bold text-black dark:text-white">{gapCount}</p>
                        <p className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                            {copy.gaps || (language === 'el' ? 'Κενά' : 'Gaps')}
                        </p>
                    </div>
                    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
                        <BadgeCheck className="mx-auto h-4 w-4 text-emerald-500" />
                        <p className="mt-1 text-lg font-bold text-black dark:text-white">
                            {policy.verified ? '✓' : '—'}
                        </p>
                        <p className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                            {language === 'el' ? 'Επαληθευμένο' : 'Verified'}
                        </p>
                    </div>
                </div>
            </PlanGate>

            {/* AI Recommendations — PRO tier */}
            {policy.aiInsights?.exclusions && policy.aiInsights.exclusions.length > 0 && (
                <PlanGate userPlan={userPlan} requiredPlan="pro" featureLabel={copy.recommendations || 'AI Recommendations'}>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#1fdc86]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                                {copy.recommendations || (language === 'el' ? 'AI Συστάσεις' : 'AI Recommendations')}
                            </span>
                        </div>
                        <ul className="space-y-1.5">
                            {policy.aiInsights.exclusions.slice(0, 3).map((exc, i) => (
                                <li key={i} className="flex items-start gap-2 rounded-lg border border-black/5 bg-black/[0.02] p-2.5 text-xs text-black/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
                                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                                    {language === 'el'
                                        ? `Εξετάστε πρόσθετη κάλυψη για: ${exc}`
                                        : `Consider additional coverage for: ${exc}`}
                                </li>
                            ))}
                        </ul>
                    </div>
                </PlanGate>
            )}
        </div>
    )
}
