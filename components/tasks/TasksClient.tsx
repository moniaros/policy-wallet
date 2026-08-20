"use client"

import React, { useState } from 'react'
import { SeverityCaveat } from "@/components/gaps/SeverityCaveat"
import Link from 'next/link'
import {
    CheckCircle2,
    Clock,
    Lightbulb,
    FileText,
    Bell,
    ChevronRight,
    Filter,
    SortAsc,
    Target
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ActionItem {
    id: string
    type: 'questionnaire' | 'reminder' | 'request' | 'recommendation' | 'general'
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high'
    status: 'pending' | 'completed' | 'dismissed'
    createdAt: string
    dueDate?: string
    actionUrl?: string
    actionLabel?: string
    metadata?: {
        lineOfBusiness?: string
        senderName?: string
        senderImage?: string
        creatorName?: string
        creatorImage?: string
    }
}

interface TasksClientProps {
    actionItems: ActionItem[]
    userLanguage?: string
}

type FilterType = 'all' | 'questionnaire' | 'reminder' | 'request' | 'recommendation'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
type SortType = 'recent' | 'priority' | 'dueDate'

export function TasksClient({ actionItems }: TasksClientProps) {
    const { t } = useLanguage()
    const [filter, setFilter] = useState<FilterType>('all')
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
    const [sort, setSort] = useState<SortType>('priority')

    const filteredTasks = actionItems.filter(task => {
        if (filter !== 'all' && task.type !== filter) return false
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
        return true
    })

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        switch (sort) {
            case 'priority': {
                const priorityOrder = { high: 0, medium: 1, low: 2 }
                return priorityOrder[a.priority] - priorityOrder[b.priority]
            }
            case 'dueDate':
                if (!a.dueDate) return 1
                if (!b.dueDate) return -1
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            case 'recent':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
    })

    const counts = {
        all: actionItems.length,
        questionnaire: actionItems.filter(t => t.type === 'questionnaire').length,
        reminder: actionItems.filter(t => t.type === 'reminder').length,
        request: actionItems.filter(t => t.type === 'request').length,
        recommendation: actionItems.filter(t => t.type === 'recommendation').length
    }

    const priorityCounts = {
        high: actionItems.filter(t => t.priority === 'high').length,
        medium: actionItems.filter(t => t.priority === 'medium').length,
        low: actionItems.filter(t => t.priority === 'low').length
    }

    const getTaskIcon = (type: string) => {
        switch (type) {
            case 'questionnaire': return FileText
            case 'reminder': return Bell
            case 'request': return Clock
            case 'recommendation': return Lightbulb
            default: return FileText
        }
    }

    const typeLabel = (type: ActionItem['type']): string => {
        const key = type as keyof typeof t.tasks.taskTypes
        return t.tasks.taskTypes[key] || t.tasks.actionRequired
    }

    const priorityLabel = (p: ActionItem['priority']): string =>
        t.tasks.priorities[p] || p

    // Priority colours follow the app's urgency ramp (see CoverageGapsWidget:
    // critical=rose, high=amber, medium=sky, low=grey). Tasks top out at "high",
    // so high=amber — the app's high-urgency colour. The old ramp coloured HIGH
    // with the brand green (a success/positive colour) while MEDIUM was amber, so
    // the most urgent task looked reassuring and the medium one looked alarming —
    // an inverted risk signal, and inconsistent (amber meant "high" everywhere
    // else but "medium" here).
    const priorityPill = (p: ActionItem['priority']): string => {
        switch (p) {
            case 'high':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            case 'medium':
                return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
            default:
                return 'bg-muted text-muted-foreground'
        }
    }

    const typeFilters: { key: FilterType; label: string; icon: React.ElementType; count: number }[] = [
        { key: 'all', label: t.common.all, icon: Target, count: counts.all },
        { key: 'questionnaire', label: t.tasks.taskTypes.questionnaire, icon: FileText, count: counts.questionnaire },
        { key: 'reminder', label: t.tasks.taskTypes.reminder, icon: Bell, count: counts.reminder },
        { key: 'request', label: t.tasks.taskTypes.request, icon: Clock, count: counts.request },
        { key: 'recommendation', label: t.tasks.taskTypes.recommendation, icon: Lightbulb, count: counts.recommendation },
    ]

    const priorityFilters: PriorityFilter[] = ['all', 'high', 'medium', 'low']
    const sortOptions: { key: SortType; label: string }[] = [
        { key: 'priority', label: t.common.priority },
        { key: 'recent', label: t.common.recent },
        { key: 'dueDate', label: t.common.dueDate },
    ]

    const summary: { key: 'high' | 'medium' | 'low'; count: number }[] = [
        { key: 'high', count: priorityCounts.high },
        { key: 'medium', count: priorityCounts.medium },
        { key: 'low', count: priorityCounts.low },
    ]

    return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Priority summary */}
            {actionItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {summary.map(({ key, count }) => (
                        <div key={key} className="rounded-2xl border border-border bg-background dark:bg-neutral-900 p-4">
                            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                                {t.tasks.priorities[key]}
                            </p>
                            <p className={`mt-1 text-2xl font-bold ${key === 'high' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                {count}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    {typeFilters.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                filter === key
                                    ? 'bg-primary text-white dark:text-[#1A2420]'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">{t.common.priority}:</span>
                        {priorityFilters.map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriorityFilter(p)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                    priorityFilter === p
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {p === 'all' ? t.common.all : priorityLabel(p)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">{t.common.sort}:</span>
                        {sortOptions.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setSort(key)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                    sort === key
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List / empty */}
            {sortedTasks.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background dark:bg-neutral-900 px-6 py-16 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft dark:bg-primary/15">
                        <CheckCircle2 className="h-8 w-8 text-primary dark:text-mint" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-foreground">{t.tasks.everythingPerfect}</h2>
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">{t.tasks.completedAllTasks}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedTasks.map((task) => {
                        const Icon = getTaskIcon(task.type)
                        return (
                            <Link
                                key={task.id}
                                href={task.actionUrl || '#'}
                                className="group flex items-center gap-4 rounded-2xl border border-border bg-background dark:bg-neutral-900 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 dark:hover:border-mint/40"
                            >
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary-soft group-hover:text-primary dark:group-hover:bg-primary/15 dark:group-hover:text-mint">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {task.description || typeLabel(task.type)}
                                    </p>
                                </div>
                                <span className={`hidden flex-shrink-0 rounded-full px-2.5 py-1 text-kicker font-bold uppercase tracking-wide sm:inline-block ${priorityPill(task.priority)}`}>
                                    {priorityLabel(task.priority)}
                                </span>
                                <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        )
                    })}
                    {/* Task rows carry a priority pill, and some titles were written
                        into the database as the English string "Critical coverage
                        gap". Either way a person reads a severity verdict here. */}
                    <SeverityCaveat />
                </div>
            )}
        </div>
    )
}
