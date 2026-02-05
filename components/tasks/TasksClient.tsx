"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    Lightbulb,
    FileText,
    Bell,
    Calendar,
    User,
    ChevronRight,
    Filter,
    SortAsc,
    Sparkles,
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

export function TasksClient({ actionItems, userLanguage = 'en' }: TasksClientProps) {
    const { t, language } = useLanguage()
    const [filter, setFilter] = useState<FilterType>('all')
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
    const [sort, setSort] = useState<SortType>('priority')
    const lang = language || userLanguage || 'en'

    // Filter tasks
    const filteredTasks = actionItems.filter(task => {
        if (filter !== 'all' && task.type !== filter) return false
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
        return true
    })

    // Sort tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        switch (sort) {
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 }
                return priorityOrder[a.priority] - priorityOrder[b.priority]
            case 'dueDate':
                if (!a.dueDate) return 1
                if (!b.dueDate) return -1
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            case 'recent':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
    })

    // Count by type
    const counts = {
        all: actionItems.length,
        questionnaire: actionItems.filter(t => t.type === 'questionnaire').length,
        reminder: actionItems.filter(t => t.type === 'reminder').length,
        request: actionItems.filter(t => t.type === 'request').length,
        recommendation: actionItems.filter(t => t.type === 'recommendation').length
    }

    // Count by priority
    const priorityCounts = {
        all: actionItems.length,
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-600 dark:text-red-400',
                    accent: 'bg-red-500'
                }
            case 'medium':
                return {
                    bg: 'bg-amber-50 dark:bg-amber-900/20',
                    border: 'border-amber-200 dark:border-amber-800',
                    text: 'text-amber-600 dark:text-amber-400',
                    accent: 'bg-amber-500'
                }
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-600 dark:text-blue-400',
                    accent: 'bg-blue-500'
                }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Hero Header */}
                <div className="relative mb-12 overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 blur-3xl rounded-full -ml-32 -mb-32" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <Target className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                                {t.tasks.actionCenter}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                            {lang === 'el' ? 'Καθημερινή Επισκόπηση' : 'Daily Review'}
                        </h1>

                        <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-8">
                            {lang === 'el' ? 'Βελτιώστε τη βαθμολογία κάλυψής σας ολοκληρώνοντας αυτές τις εργασίες' : 'Improve your coverage score by completing these tasks'}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-red-300" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {t.tasks.priorities.high}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-red-400">{priorityCounts.high}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-amber-300" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {t.tasks.priorities.medium}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-amber-400">{priorityCounts.medium}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="w-4 h-4 text-blue-200" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {t.tasks.priorities.low}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{priorityCounts.low}</span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-blue-200" />
                                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                                        {t.tasks.total}
                                    </span>
                                </div>
                                <span className="text-3xl font-black">{counts.all}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Sort */}
                <div className="mb-8 space-y-4">
                    {/* Type Filters */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'all' as FilterType, label: t.common.all, icon: Target, count: counts.all },
                            { key: 'questionnaire' as FilterType, label: t.tasks.taskTypes.questionnaire, icon: FileText, count: counts.questionnaire },
                            { key: 'reminder' as FilterType, label: t.tasks.taskTypes.reminder, icon: Bell, count: counts.reminder },
                            { key: 'request' as FilterType, label: t.tasks.taskTypes.request, icon: Clock, count: counts.request },
                            { key: 'recommendation' as FilterType, label: t.tasks.taskTypes.recommendation, icon: Lightbulb, count: counts.recommendation }
                        ].map(({ key, label, icon: Icon, count }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter === key
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                                {count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${filter === key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Priority Filters & Sort */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {t.common.priority}:
                            </span>
                            {['all', 'high', 'medium', 'low'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPriorityFilter(p as PriorityFilter)}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${priorityFilter === p
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {p === 'all' ? t.common.all : (t.tasks.priorities[p as keyof typeof t.tasks.priorities] || p)}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <SortAsc className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {t.common.sort}:
                            </span>
                            {[
                                { key: 'priority' as SortType, label: t.common.priority },
                                { key: 'recent' as SortType, label: t.common.recent || 'Recent' },
                                { key: 'dueDate' as SortType, label: t.common.dueDate || 'Due Date' }
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setSort(key)}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${sort === key
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                {sortedTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
                            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 relative z-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
                            {lang === 'el' ? 'Όλα Τέλεια!' : 'Everything is Perfect!'}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                            {lang === 'el' ? 'Έχετε ολοκληρώσει όλες τις εκκρεμείς αιτήσεις. Θα σας ειδοποιήσουμε όταν υπάρχουν νέες πληροφορίες.' : "You've completed all outstanding requests. We'll notify you when new insights are available."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {sortedTasks.map((task) => {
                            const Icon = getTaskIcon(task.type)
                            const colors = getPriorityColor(task.priority)

                            return (
                                <div
                                    key={task.id}
                                    className="group bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all relative overflow-hidden"
                                >
                                    {/* Priority accent */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${colors.accent}`} />

                                    <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between pl-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                                                    <Icon className={`w-5 h-5 ${colors.text}`} />
                                                </div>
                                                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {task.type} • {task.priority}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {task.title}
                                            </h3>

                                            {task.description && (
                                                <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3">
                                                {task.metadata?.senderImage || task.metadata?.creatorImage ? (
                                                    <img
                                                        src={task.metadata.senderImage || task.metadata.creatorImage}
                                                        alt=""
                                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {(task.metadata?.senderName || task.metadata?.creatorName || 'A')[0]}
                                                    </div>
                                                )}
                                                <div className="text-sm">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {task.metadata?.senderName || task.metadata?.creatorName || 'Your Agent'}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400 mx-2">•</span>
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        {new Date(task.createdAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 min-w-[200px]">
                                            {task.actionUrl && (
                                                <Link
                                                    href={task.actionUrl}
                                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 group/btn"
                                                >
                                                    {task.actionLabel || (lang === 'el' ? 'Προβολή' : 'View')}
                                                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
