"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    UserCircle,
    FileCheck2,
    UserPlus,
    Sparkles,
    Coins,
    Check,
    ChevronDown,
    ChevronUp,
    X,
} from "lucide-react"
import Link from "next/link"

interface AgentChecklistItem {
    id: string
    titleEl: string
    titleEn: string
    descEl: string
    descEn: string
    href: string
    icon: React.ElementType
    completed: boolean
}

interface AgentGettingStartedChecklistProps {
    language: "el" | "en"
    profileComplete: boolean
    licenseUploaded: boolean
    hasClients: boolean
    hasAnalysis: boolean
    commissionRatesSet: boolean
}

export function AgentGettingStartedChecklist({
    language,
    profileComplete,
    licenseUploaded,
    hasClients,
    hasAnalysis,
    commissionRatesSet,
}: AgentGettingStartedChecklistProps) {
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [dismissed, setDismissed] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const d = localStorage.getItem("pw-agent-checklist-dismissed")
            if (d === "true") setDismissed(true)
        }
    }, [])

    const items: AgentChecklistItem[] = [
        {
            id: "profile",
            titleEl: "Ολοκλήρωση προφίλ",
            titleEn: "Complete your profile",
            descEl: "Προσθέστε logo, brand color και στοιχεία επικοινωνίας.",
            descEn: "Add logo, brand color and contact information.",
            href: "/agent/settings",
            icon: UserCircle,
            completed: profileComplete,
        },
        {
            id: "license",
            titleEl: "Μεταφόρτωση άδειας",
            titleEn: "Upload license",
            descEl: "Ανεβάστε την ασφαλιστική σας άδεια για επαλήθευση.",
            descEn: "Upload your insurance license for verification.",
            href: "/agent/settings",
            icon: FileCheck2,
            completed: licenseUploaded,
        },
        {
            id: "client",
            titleEl: "Πρόσκληση πρώτου πελάτη",
            titleEn: "Invite first client",
            descEl: "Στείλτε πρόσκληση στον πρώτο σας πελάτη.",
            descEn: "Send an invitation to your first client.",
            href: "/customers",
            icon: UserPlus,
            completed: hasClients,
        },
        {
            id: "analysis",
            titleEl: "Δοκιμή AI ανάλυσης",
            titleEn: "Run demo analysis",
            descEl: "Δοκιμάστε την AI ανάλυση με ένα δοκιμαστικό ασφαλιστήριο.",
            descEn: "Try AI analysis with a sample policy.",
            href: "/wallet/add",
            icon: Sparkles,
            completed: hasAnalysis,
        },
        {
            id: "commissions",
            titleEl: "Ρύθμιση προμηθειών",
            titleEn: "Set commission rates",
            descEl: "Ρυθμίστε τα ποσοστά προμηθείας ανά κλάδο.",
            descEn: "Configure commission rates per line of business.",
            href: "/commissions",
            icon: Coins,
            completed: commissionRatesSet,
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
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="pw-kicker">
                        {t("Ξεκινώντας", "Getting started")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {completedCount}/{items.length} {t("ολοκληρωμένα", "completed")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="rounded-lg p-1.5 text-black/55 transition hover:bg-black/5 hover:text-black/70 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/70"
                        // The label alone changes wording but never announces
                        // STATE, so a screen reader could not report whether the
                        // checklist is open — matching ActionQueueCard, which
                        // already does this.
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t("Ανάπτυξη", "Expand") : t("Σύμπτυξη", "Collapse")}
                    >
                        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setDismissed(true)
                            if (typeof window !== "undefined") {
                                localStorage.setItem("pw-agent-checklist-dismissed", "true")
                            }
                        }}
                        className="rounded-lg p-1.5 text-black/55 transition hover:bg-black/5 hover:text-black/70 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/70"
                        aria-label={t("Απόρριψη", "Dismiss")}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mt-3 h-1.5 w-full rounded-full bg-black/8 dark:bg-white/10">
                <motion.div
                    className="h-1.5 rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
            </div>

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
                                                    ? "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/5"
                                                    : "border-black/8 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                                            }`}
                                        >
                                            <span
                                                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
                                                    item.completed
                                                        ? "bg-primary text-white dark:text-[#1A2420]"
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
                                                            ? "text-primary line-through dark:text-mint"
                                                            : "text-black dark:text-white"
                                                    }`}
                                                >
                                                    {language === "el" ? item.titleEl : item.titleEn}
                                                </p>
                                                {!item.completed && (
                                                    <p className="mt-0.5 text-micro text-black/60 dark:text-white/55">
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
