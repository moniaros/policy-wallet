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
    ListChecks,
    Target
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { EmptyState } from '@/components/ui/EmptyState'

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

    // Priority colours follow the app's urgency ramp (critical=danger,
    // high=warning, medium=info, low=grey), now on the status TOKENS rather
    // than palette literals. Tasks top out at "high", so high = the warning
    // (amber) pair. The old ramp coloured HIGH with the brand green (a
    // success/positive colour) while MEDIUM was amber, so the most urgent task
    // looked reassuring and the medium one looked alarming — an inverted risk
    // signal. task-priority-colors-urgency guards it.
    const priorityPill = (p: ActionItem['priority']): string => {
        switch (p) {
            case 'high':
                return 'bg-status-warning-tint text-status-warning'
            case 'medium':
                return 'bg-status-info-tint text-status-info'
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
        <div className="space-y-4">
            {/* Priority summary — a row of fact cells in ONE card, not three
                floating tiles. The high count keeps the urgency colour: amber
                means «look here», and the brand green would read as
                reassurance (task-priority-colors-urgency). */}
            {actionItems.length > 0 && (
                <section className="pw-card pw-pad" aria-label={t.common.priority}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-0 sm:[&>*+*]:border-l sm:[&>*+*]:border-border sm:[&>*+*]:pl-4 sm:[&>*]:pr-4 sm:[&>*:last-child]:pr-0">
                        {summary.map(({ key, count }) => (
                            <div key={key} className="flex min-w-0 flex-col gap-1">
                                <p className="text-caption leading-snug text-muted-foreground">{t.tasks.priorities[key]}</p>
                                <p className={`text-title font-semibold leading-none tracking-tight tabular-nums ${key === 'high' ? 'text-status-warning' : 'text-foreground'}`}>
                                    {count}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Filters — view switches on the segmented recipe, never green
                pills; the type strip scrolls rather than wraps on a phone. */}
            <div className="space-y-3">
                <div className="pw-segmented pw-scroll-strip">
                    {typeFilters.map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            aria-pressed={filter === key}
                            className="pw-segment"
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {label}
                            {count > 0 && <span className="tabular-nums font-medium">{count}</span>}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2" role="group" aria-label={t.common.priority}>
                        <span className="text-caption font-medium text-muted-foreground">{t.common.priority}</span>
                        <div className="pw-segmented">
                            {priorityFilters.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriorityFilter(p)}
                                    aria-pressed={priorityFilter === p}
                                    className="pw-segment"
                                >
                                    {p === 'all' ? t.common.all : priorityLabel(p)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2" role="group" aria-label={t.common.sort}>
                        <span className="text-caption font-medium text-muted-foreground">{t.common.sort}</span>
                        <div className="pw-segmented">
                            {sortOptions.map(({ key, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSort(key)}
                                    aria-pressed={sort === key}
                                    className="pw-segment"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* The list — one card of sub-card rows: chip · title/description ·
                priority pill · chevron. */}
            <section className="pw-card pw-pad" aria-labelledby="tasks-list-heading">
                <CardHead
                    icon={ListChecks}
                    title={t.tasks.actionRequired}
                    id="tasks-list-heading"
                    meta={sortedTasks.length > 0 ? <span className="tabular-nums">{sortedTasks.length}</span> : undefined}
                />
                {sortedTasks.length === 0 ? (
                    <EmptyState
                        icon={CheckCircle2}
                        headline={t.tasks.everythingPerfect}
                        description={t.tasks.completedAllTasks}
                        className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
                    />
                ) : (
                    <>
                        <ul className="mt-4 space-y-2">
                            {sortedTasks.map((task) => {
                                const Icon = getTaskIcon(task.type)
                                return (
                                    <li key={task.id}>
                                        <Link
                                            href={task.actionUrl || '#'}
                                            className="pw-subcard flex min-h-11 items-center gap-3 p-3 transition-colors"
                                        >
                                            <span className="pw-card-chip" aria-hidden="true">
                                                <Icon className="h-4 w-4" strokeWidth={1.75} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                                                <p className="truncate text-caption text-muted-foreground">
                                                    {task.description || typeLabel(task.type)}
                                                </p>
                                            </div>
                                            <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold sm:inline-block ${priorityPill(task.priority)}`}>
                                                {priorityLabel(task.priority)}
                                            </span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                        {/* Task rows carry a priority pill, and some titles were written
                            into the database as the English string "Critical coverage
                            gap". Either way a person reads a severity verdict here. */}
                        <SeverityCaveat />
                    </>
                )}
            </section>
        </div>
    )
}
