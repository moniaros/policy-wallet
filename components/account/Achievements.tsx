"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Lock, Sparkles } from "lucide-react"

interface AchievementItem {
    id: string
    titleEl: string
    titleEn: string
    descriptionEl: string
    descriptionEn: string
    icon: string
    category: string
    unlocked: boolean
    unlockedAt: string | null
}

interface AchievementsProps {
    language: "el" | "en"
}

const CATEGORY_LABELS: Record<string, { el: string; en: string }> = {
    policies: { el: "Ασφαλιστήρια", en: "Policies" },
    analysis: { el: "Ανάλυση", en: "Analysis" },
    social: { el: "Κοινωνικά", en: "Social" },
    engagement: { el: "Δέσμευση", en: "Engagement" },
    milestone: { el: "Ορόσημα", en: "Milestones" },
}

export function AchievementsPanel({ language }: AchievementsProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [achievements, setAchievements] = useState<AchievementItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("all")

    useEffect(() => {
        fetch("/api/v1/me/achievements")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setAchievements(data)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const unlockedCount = achievements.filter((a) => a.unlocked).length
    const totalCount = achievements.length
    const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

    const categories = ["all", ...new Set(achievements.map((a) => a.category))]
    const filtered =
        filter === "all" ? achievements : achievements.filter((a) => a.category === filter)

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return ""
        return new Date(dateStr).toLocaleDateString(
            language === "el" ? "el-GR" : "en-US",
            { month: "short", day: "numeric", year: "numeric" }
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Sparkles className="h-5 w-5 animate-pulse text-amber-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header + progress */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-black dark:text-white">
                            {t("Επιτεύγματα", "Achievements")}
                        </h3>
                        <p className="text-xs text-black/50 dark:text-white/50">
                            {unlockedCount}/{totalCount} {t("ξεκλειδωμένα", "unlocked")}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {progressPct}%
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                />
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setFilter(cat)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                            filter === cat
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                        }`}
                    >
                        {cat === "all"
                            ? t("Όλα", "All")
                            : CATEGORY_LABELS[cat]?.[language] || cat}
                    </button>
                ))}
            </div>

            {/* Achievement grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                    {filtered.map((ach, i) => (
                        <motion.div
                            key={ach.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={`relative rounded-2xl border p-4 transition ${
                                ach.unlocked
                                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
                                    : "border-black/8 bg-black/[0.02] opacity-60 dark:border-white/8 dark:bg-white/[0.02]"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{ach.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-black dark:text-white truncate">
                                        {language === "el" ? ach.titleEl : ach.titleEn}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-black/50 dark:text-white/50 truncate">
                                        {language === "el" ? ach.descriptionEl : ach.descriptionEn}
                                    </p>
                                    {ach.unlocked && ach.unlockedAt && (
                                        <p className="mt-1 text-[9px] text-amber-600 dark:text-amber-400">
                                            {formatDate(ach.unlockedAt)}
                                        </p>
                                    )}
                                </div>
                                {!ach.unlocked && (
                                    <Lock className="h-3.5 w-3.5 flex-shrink-0 text-black/20 dark:text-white/20" />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
