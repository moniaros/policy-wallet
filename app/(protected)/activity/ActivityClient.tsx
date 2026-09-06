"use client"

import { useState, useMemo } from "react"
import {
    Activity,
    Shield,
    Users,
    Target,
    Bell,
    Clock,
    XCircle,
    ChevronRight,
    Star,
    MessageSquare
} from "lucide-react"
import type { ActivityEvent, ActivityCategory } from "./actions"
import Link from "next/link"

import { EmptyState } from "@/components/ui/EmptyState"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { useLanguage } from "@/contexts/LanguageContext"
import { resolveLocale } from "@/lib/i18n/format"

interface ActivityClientProps {
    events: ActivityEvent[]
    // language prop is no longer strictly needed since we have context, but we can keep it for backwards compatibility if needed
    language?: string
    /** Agent view gets office framing and the customer/opportunity filters. */
    isAgent?: boolean
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
    
    return new Intl.DateTimeFormat(resolveLocale(lang), {
        month: "short", day: "numeric"
    }).format(d)
}

// The category picks the glyph only. The chip stays the neutral card chip:
// status never tints it (DESIGN.md → Icon chip), and an activity row is a
// record, not a verdict.
const getCategoryIcon = (category: ActivityCategory, type: string) => {
    switch (category) {
        case 'policy':
            return Shield
        case 'opportunity':
            return type.includes('won') ? Star : (type.includes('lost') ? XCircle : Target)
        case 'customer':
            return type.includes('questionnaire') ? MessageSquare : Users
        case 'system':
        default:
            return Bell
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

export function ActivityClient({ events, isAgent = false }: ActivityClientProps) {
    const { language, t } = useLanguage()
    const [filter, setFilter] = useState<ActivityCategory | 'all'>('all')

    // «Πελάτες» and «Ευκαιρίες» are an AGENT's nouns. A policyholder has
    // neither — showing them framed the whole page as someone else's tool
    // («ό,τι συμβαίνει στο γραφείο σας» to a person with no office). The feed
    // itself is role-agnostic; only the chrome differed.
    const tabs: { id: ActivityCategory | 'all'; label: string }[] = [
        { id: 'all', label: t.activity.tabs.all },
        { id: 'policy', label: t.activity.tabs.policies },
        ...(isAgent
            ? [
                  { id: 'customer' as const, label: t.activity.tabs.customers },
                  { id: 'opportunity' as const, label: t.activity.tabs.opportunities },
              ]
            : []),
        { id: 'system', label: t.activity.tabs.system },
    ]

    const filteredEvents = useMemo(() => {
        if (filter === 'all') return events
        return events.filter(e => e.category === filter)
    }, [events, filter])

    const isEl = language === "el"

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-form space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.activity.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{isAgent ? t.activity.desc : t.activity.descPersonal}</p>
                </div>

                {/* The category filter is a view switch — the segmented recipe,
                    scrolling rather than wrapping on a phone. */}
                <div className="pw-segmented pw-scroll-strip" role="group" aria-label={t.activity.title}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id)}
                            aria-pressed={filter === tab.id}
                            className="pw-segment"
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ONE card of rows — chip · title and time · description ·
                    who — instead of a timeline rail with a floating card per
                    event. The unread mark sits on the chip. */}
                <section className="pw-card pw-pad" aria-labelledby="activity-feed-heading">
                    <CardHead
                        icon={Activity}
                        title={t.activity.title}
                        id="activity-feed-heading"
                        meta={filteredEvents.length > 0 ? <span className="tabular-nums">{filteredEvents.length}</span> : undefined}
                    />
                    {filteredEvents.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            headline={t.activity.emptyTitle}
                            description={t.activity.emptyDesc}
                            // «Δείτε τους πελάτες» is an agent's action; a policyholder
                            // has no customers page to be sent to.
                            cta={isAgent ? { label: t.emptyStates.viewClients, href: "/customers" } : undefined}
                            ctaVariant="soft"
                            className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
                        />
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {filteredEvents.map((event) => {
                                const Icon = getCategoryIcon(event.category, event.type)
                                return (
                                    <li key={event.id}>
                                        <Link
                                            href={getEntityLink(event)}
                                            className="pw-subcard flex min-h-11 items-start gap-3 p-3 transition-colors"
                                        >
                                            <span className="pw-card-chip relative" aria-hidden="true">
                                                <Icon className="h-4 w-4" strokeWidth={1.75} />
                                                {event.isUnread && (
                                                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {event.title[isEl ? "el" : "en"]}
                                                    </p>
                                                    <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
                                                        <Clock className="h-3 w-3" aria-hidden="true" />
                                                        {formatRelativeTime(event.timestamp, t, language)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                    {event.description[isEl ? "el" : "en"]}
                                                </p>
                                                {event.customerName && (
                                                    <p className="mt-2 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                                                        <Users className="h-3 w-3" aria-hidden="true" />
                                                        {event.customerName}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}
