"use client"

import React from "react"
import { Shield, ChevronRight, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

interface CategoryScoreData {
    key: string
    label: { en: string; el: string }
    score: number // 0-100, -1 = N/A
    applicable: boolean
    essential: boolean
    coveredLobs: string[]
    missingLobs: string[]
}

interface ProtectionScoreCardProps {
    overallScore: number
    tier: {
        tier: string
        color: string
        label: { en: string; el: string }
    }
    categoryScores: Record<string, CategoryScoreData>
    gapCount: number
    expectedLines: string[]
    actualLines: string[]
    profileCompleteness: number
    language: "en" | "el"
}

const CATEGORY_ICONS: Record<string, string> = {
    health: "🏥",
    life: "🛡️",
    property: "🏠",
    income: "💼",
    liability: "⚖️",
    other: "✈️",
}

export function ProtectionScoreCard({
    overallScore,
    tier,
    categoryScores,
    gapCount,
    profileCompleteness,
    language,
}: ProtectionScoreCardProps) {
    const router = useRouter()
    const lang = language

    const copy = {
        title: lang === "el" ? "Βαθμολογία Προστασίας" : "Protection Score",
        subtitle: lang === "el" ? "Πόσο καλά καλύπτεστε" : "How well you are covered",
        // Concept A — missing coverage TYPES (profile categories), distinct from
        // the policy-gap count on the rest of the page. Never call these "gaps".
        typesMissing: lang === "el" ? "κατηγορίες χωρίς κάλυψη" : "coverage types missing",
        provisional: lang === "el" ? "Προσωρινή — συμπληρώστε το προφίλ σας" : "Provisional — complete your profile",
        categories: lang === "el" ? "Κατηγορίες" : "Categories",
        notApplicable: lang === "el" ? "Δεν εφαρμόζεται" : "N/A",
        completeProfile: lang === "el"
            ? "Συμπληρώστε το προφίλ σας για ακριβέστερα αποτελέσματα"
            : "Complete your profile for more accurate results",
        updateProfile: lang === "el" ? "Ενημέρωση προφίλ" : "Update profile",
        profileComplete: lang === "el" ? "Πληρότητα προφίλ" : "Profile completeness",
    }

    const scoreColor =
        tier.color === "green"
            ? "text-primary dark:text-mint"
            : tier.color === "amber"
                ? "text-amber-500"
                : tier.color === "orange"
                    ? "text-orange-500"
                    : "text-red-500"

    // SVG donut ring
    const radius = 54
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (overallScore / 100) * circumference

    const applicableCategories = Object.values(categoryScores).filter(
        (c) => c.applicable
    )
    // Essential/applicable coverage TYPES the user has no active policy for.
    const missingTypes = applicableCategories.filter((c) => c.coveredLobs.length === 0).length

    return (
        <div className="pw-card p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Score ring */}
                <div className="relative flex-shrink-0">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-black/8 dark:text-white/10"
                        />
                        <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 70 70)"
                            className={scoreColor}
                            style={{ transition: "stroke-dashoffset 1s ease" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${scoreColor}`}>
                            {overallScore}
                        </span>
                        <span className="text-xs text-black/50 dark:text-white/50">
                            /100
                        </span>
                    </div>
                </div>

                {/* Score text */}
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-lg font-semibold text-black dark:text-white mb-1">
                        {copy.title}
                    </h2>
                    <p className={`text-sm font-medium ${scoreColor} mb-1`}>
                        {tier.label[lang]}
                        {profileCompleteness < 80 && (
                            <span className="ml-1.5 text-xs font-normal text-black/45 dark:text-white/50">· {copy.provisional}</span>
                        )}
                    </p>
                    <p className="text-sm text-black/60 dark:text-white/60 mb-2">
                        {copy.subtitle}
                    </p>
                    {missingTypes > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {missingTypes} {copy.typesMissing}
                        </div>
                    )}
                </div>
            </div>

            {/* Category breakdown */}
            {applicableCategories.length > 0 && (
                <div className="mt-6 pt-5 border-t border-black/8 dark:border-white/10">
                    <h3 className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-widest mb-3">
                        {copy.categories}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {applicableCategories.map((cat) => {
                            const barColor =
                                cat.score >= 70
                                    ? "bg-primary dark:bg-mint"
                                    : cat.score >= 40
                                        ? "bg-amber-400"
                                        : "bg-red-400"
                            const icon = CATEGORY_ICONS[cat.key] || "📋"
                            return (
                                <div
                                    key={cat.key}
                                    className="rounded-xl bg-black/3 dark:bg-white/5 p-3"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-base">{icon}</span>
                                        <span className="text-xs font-semibold text-black dark:text-white truncate">
                                            {cat.label[lang]}
                                        </span>
                                        {cat.essential && (
                                            <Shield className="w-3 h-3 text-black/30 dark:text-white/30 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${barColor}`}
                                            style={{
                                                width: `${Math.max(cat.score, 3)}%`,
                                                transition: "width 0.8s ease",
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                                        {cat.score >= 0
                                            ? `${cat.score}%`
                                            : copy.notApplicable}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Profile completeness nudge */}
            {profileCompleteness < 80 && (
                <div className="mt-5 pt-4 border-t border-black/8 dark:border-white/10">
                    <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-900/15 rounded-xl p-3.5">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-black/75 dark:text-white/75">
                                {copy.completeProfile}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex-1 h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-amber-400"
                                        style={{ width: `${profileCompleteness}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-black/50 dark:text-white/50">
                                    {profileCompleteness}%
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const wizard = document.getElementById("risk-profile-wizard")
                                if (wizard) {
                                    wizard.scrollIntoView({ behavior: "smooth", block: "start" })
                                } else {
                                    router.push("/account")
                                }
                            }}
                            className="text-xs font-semibold text-primary dark:text-mint hover:underline cursor-pointer flex-shrink-0 flex items-center gap-1"
                        >
                            {copy.updateProfile}
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            <AiDisclaimer language={language} />
        </div>
    )
}
