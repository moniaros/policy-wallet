"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Upload,
    Sparkles,
    ShieldAlert,
    Users,
    Bell,
    Check,
    ChevronDown,
    ChevronUp,
    X,
} from "lucide-react"
import Link from "next/link"

interface ChecklistItem {
    id: string
    titleEl: string
    titleEn: string
    descEl: string
    descEn: string
    href: string
    icon: React.ElementType
    completed: boolean
}

interface GettingStartedChecklistProps {
    language: "el" | "en"
    policyCount: number
    hasAnalysis: boolean
    gapCount: number
    hasAgent: boolean
    notificationsEnabled: boolean
}

export function GettingStartedChecklist({
    language,
    policyCount,
    hasAnalysis,
    gapCount,
    hasAgent,
    notificationsEnabled,
}: GettingStartedChecklistProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [dismissed, setDismissed] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    // Check localStorage for dismissal
    useEffect(() => {
        if (typeof window !== "undefined") {
            const dismissedVal = localStorage.getItem("pw-checklist-dismissed")
            if (dismissedVal === "true") setDismissed(true)
        }
    }, [])

    const items: ChecklistItem[] = [
        {
            id: "upload",
            titleEl: "Ανέβασμα συμβολαίου",
            titleEn: "Upload a policy",
            descEl: "Ανεβάστε το πρώτο σας ασφαλιστήριο PDF ή φωτογραφία.",
            descEn: "Upload your first insurance policy PDF or photo.",
            href: "/wallet/add",
            icon: Upload,
            completed: policyCount > 0,
        },
        {
            id: "analysis",
            titleEl: "Ανάλυση AI",
            titleEn: "Review AI analysis",
            descEl: "Δείτε τί ανακάλυψε η AI για την κάλυψή σας.",
            descEn: "See what AI discovered about your coverage.",
            href: "/coverage-insights",
            icon: Sparkles,
            completed: hasAnalysis,
        },
        {
            id: "gaps",
            titleEl: "Έλεγχος κενών κάλυψης",
            titleEn: "Check coverage gaps",
            descEl: "Ελέγξτε αν υπάρχουν κενά στην ασφαλιστική σας κάλυψη.",
            descEn: "Check if there are gaps in your insurance coverage.",
            href: "/coverage-insights",
            icon: ShieldAlert,
            completed: policyCount > 0 && gapCount === 0,
        },
        {
            id: "agent",
            titleEl: "Σύνδεση με σύμβουλο",
            titleEn: "Connect with an agent",
            descEl: "Συνδεθείτε με τον ασφαλιστικό σας σύμβουλο.",
            descEn: "Connect with your insurance advisor.",
            href: "/agent",
            icon: Users,
            completed: hasAgent,
        },
        {
            id: "notifications",
            titleEl: "Ενεργοποίηση ειδοποιήσεων",
            titleEn: "Enable notifications",
            descEl: "Ενεργοποιήστε ειδοποιήσεις για ανανεώσεις και ενημερώσεις.",
            descEn: "Turn on alerts for renewals and updates.",
            href: "/settings",
            icon: Bell,
            completed: notificationsEnabled,
        },
    ]

    const completedCount = items.filter((i) => i.completed).length
    const allComplete = completedCount === items.length
    const progress = (completedCount / items.length) * 100

    if (dismissed || allComplete) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="pw-card rounded-3xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="pw-kicker">
                        {t("Ξεκινώντας", "Getting started")}
                    </p>
                    <p className="mt-1 text-xs text-black/55 dark:text-white/60">
                        {completedCount}/{items.length} {t("ολοκληρωμένα", "completed")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="rounded-lg p-1.5 text-black/40 transition hover:bg-black/5 hover:text-black/70 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70"
                        aria-label={collapsed ? "Expand" : "Collapse"}
                    >
                        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setDismissed(true)
                            if (typeof window !== "undefined") {
                                localStorage.setItem("pw-checklist-dismissed", "true")
                            }
                        }}
                        className="rounded-lg p-1.5 text-black/40 transition hover:bg-black/5 hover:text-black/70 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70"
                        aria-label="Dismiss"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-black/8 dark:bg-white/10">
                <motion.div
                    className="h-1.5 rounded-full bg-[#1FDC86]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            </div>

            {/* Items */}
            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 space-y-2">
                            {items.map((item, index) => {
                                const Icon = item.icon
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                                                item.completed
                                                    ? "border-[#1FDC86]/30 bg-[#1FDC86]/5 dark:border-[#1FDC86]/20 dark:bg-[#1FDC86]/5"
                                                    : "border-black/8 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                                            }`}
                                        >
                                            <span
                                                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
                                                    item.completed
                                                        ? "bg-[#1FDC86] text-white"
                                                        : "bg-white text-black/60 dark:bg-black dark:text-white/60"
                                                }`}
                                            >
                                                {item.completed ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Icon className="h-4 w-4" />
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-xs font-semibold ${
                                                        item.completed
                                                            ? "text-[#1FDC86] line-through dark:text-[#1FDC86]"
                                                            : "text-black dark:text-white"
                                                    }`}
                                                >
                                                    {language === "el" ? item.titleEl : item.titleEn}
                                                </p>
                                                {!item.completed && (
                                                    <p className="mt-0.5 text-[11px] text-black/50 dark:text-white/55">
                                                        {language === "el" ? item.descEl : item.descEn}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
