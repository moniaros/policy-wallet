"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Activity,
    Shield,
    Users,
    Target,
    Bell,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Star,
    MessageSquare
} from "lucide-react"
import type { ActivityEvent, ActivityCategory } from "./actions"
import Link from "next/link"

import { useLanguage } from "@/contexts/LanguageContext"

interface ActivityClientProps {
    events: ActivityEvent[]
    // language prop is no longer strictly needed since we have context, but we can keep it for backwards compatibility if needed
    language?: string
}

/* ─── Helpers ─────────────────────────────────────── */

const formatRelativeTime = (date: Date, t: any, lang: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) return t.activity.justNow
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return t.activity.minsAgo.replace('{m}', diffInMinutes.toString())
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return t.activity.hoursAgo.replace('{h}', diffInHours.toString())
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return t.activity.yesterday
    if (diffInDays < 7) return t.activity.daysAgo.replace('{d}', diffInDays.toString())
    
    return new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-US", {
        month: "short", day: "numeric"
    }).format(d)
}

const getCategoryDetails = (category: ActivityCategory, type: string) => {
    switch (category) {
        case 'policy':
            return {
                icon: Shield,
                bgClass: "bg-primary-soft dark:bg-primary/15",
                textClass: "text-primary dark:text-mint"
            }
        case 'opportunity':
            return {
                icon: type.includes('won') ? Star : (type.includes('lost') ? XCircle : Target),
                bgClass: "bg-mint/25 dark:bg-primary/15",
                textClass: "text-primary dark:text-mint"
            }
        case 'customer':
            return {
                icon: type.includes('questionnaire') ? MessageSquare : Users,
                bgClass: "bg-primary-tint dark:bg-primary/15",
                textClass: "text-primary dark:text-mint"
            }
        case 'system':
        default:
            return {
                icon: Bell,
                bgClass: "bg-slate-100 dark:bg-slate-800",
                textClass: "text-slate-600 dark:text-slate-400"
            }
    }
}

const getEntityLink = (event: ActivityEvent) => {
    // The policy route is /wallet/[id]; there is no /policies/[id] (was a 404).
    if (event.policyId) return `/wallet/${event.policyId}`
    if (event.opportunityId) return `/opportunities?id=${event.opportunityId}`
    if (event.customerId) return `/customers/${event.customerId}`
    return "#"
}

/* ─── Main Component ──────────────────────────────── */

export function ActivityClient({ events }: ActivityClientProps) {
    const { language, t } = useLanguage()
    const [filter, setFilter] = useState<ActivityCategory | 'all'>('all')

    const tabs: { id: ActivityCategory | 'all'; label: string }[] = [
        { id: 'all', label: t.activity.tabs.all },
        { id: 'policy', label: t.activity.tabs.policies },
        { id: 'customer', label: t.activity.tabs.customers },
        { id: 'opportunity', label: t.activity.tabs.opportunities },
        { id: 'system', label: t.activity.tabs.system },
    ]

    const filteredEvents = useMemo(() => {
        if (filter === 'all') return events
        return events.filter(e => e.category === filter)
    }, [events, filter])

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-12">
            
            {/* ── Header ── */}
            <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 lg:py-8 pt-8 relative z-10">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="relative bg-primary text-white dark:text-[#1A2420] p-3 rounded-2xl shadow-lg shadow-primary/25">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {t.activity.title}
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {t.activity.desc}
                                </p>
                            </div>
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex flex-wrap items-center gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                        filter === tab.id
                                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Feed Timeline ── */}
            <div className="max-w-[800px] mx-auto px-4 sm:px-6 pt-10">
                {filteredEvents.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-16 text-center arc-card"
                    >
                        <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {t.activity.emptyTitle}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {t.activity.emptyDesc}
                        </p>
                    </motion.div>
                ) : (
                    <div className="relative">
                        {/* Vertical line connecting timeline */}
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        
                        <div className="space-y-6 relative">
                            <AnimatePresence mode="popLayout">
                                {filteredEvents.map((event, i) => {
                                    const { icon: Icon, bgClass, textClass } = getCategoryDetails(event.category, event.type)
                                    const isEl = language === "el"

                                    return (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                            className="flex gap-4 relative group"
                                        >
                                            {/* Icon */}
                                            <div className="relative z-10 w-[54px] flex-shrink-0 flex justify-center pt-1.5">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border border-white/50 dark:border-transparent ${bgClass}`}>
                                                    <Icon className={`w-4 h-4 ${textClass}`} />
                                                </div>
                                            </div>

                                            {/* Content Card */}
                                            <div className="flex-1">
                                                <Link 
                                                    href={getEntityLink(event)}
                                                    className="block arc-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group-hover:border-slate-300 dark:group-hover:border-slate-700"
                                                >
                                                    <div className="p-4 sm:p-5">
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {event.isUnread && (
                                                                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                                                    )}
                                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                                        {event.title[isEl ? "el" : "en"]}
                                                                    </h3>
                                                                </div>
                                                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                                                    {event.description[isEl ? "el" : "en"]}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] font-semibold tracking-wider uppercase flex-shrink-0 whitespace-nowrap">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {formatRelativeTime(event.timestamp, t, language || "en")}
                                                            </div>
                                                        </div>

                                                        {/* Footer metadata */}
                                                        {event.customerName && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                                    {event.customerName}
                                                                </div>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary dark:text-mint">
                                                                        {t.activity.view}
                                                                        <ChevronRight className="w-3 h-3" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
