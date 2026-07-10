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
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* Branded Header */}
                <div className="px-6 pt-12 pb-8 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                        <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                        <span className="text-2xl font-black tracking-tight text-primary dark:text-mint">Wallet</span>
                    </div>
                </div>

                <div className="px-6 pb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white dark:text-[#1A2420]">
                            <Target className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
                            {t.tasks.actionCenter}
                        </span>
                    </div>

                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        {t.tasks.daily} <span className="text-stone-400 dark:text-stone-500 italic">{t.tasks.review}.</span>
                    </h1>

                    <p className="text-stone-500 text-lg max-w-xl mb-12">
                        {t.tasks.manageTasks}
                    </p>

                    {/* Stats Slider */}
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 snap-x mb-12">
                        <div className="flex-shrink-0 w-[160px] bg-primary rounded-[32px] p-6 text-white dark:text-[#1A2420] shadow-xl shadow-primary/20 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-2">{t.tasks.priorities.high}</span>
                            <span className="text-4xl font-black tracking-tighter">{priorityCounts.high}</span>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{t.tasks.priorities.medium}</span>
                            <span className="text-4xl font-black tracking-tighter">{priorityCounts.medium}</span>
                        </div>

                        <div className="flex-shrink-0 w-[160px] bg-white dark:bg-stone-800 rounded-[32px] p-6 text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-800 snap-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{t.tasks.priorities.low}</span>
                            <span className="text-4xl font-black tracking-tighter">{priorityCounts.low}</span>
                        </div>
                    </div>
                </div>

                {/* Filters and Sort */}
                <div className="mb-8 space-y-4">
                    {/* Type Filters */}
                    <div className="flex flex-wrap gap-2 px-6 no-scrollbar overflow-x-auto pb-4 -mx-6">
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
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${filter === key
                                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xl'
                                    : 'bg-white dark:bg-stone-900 text-stone-400 border border-stone-100 dark:border-stone-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
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
                    <div className="bg-white/50 dark:bg-stone-900/50 backdrop-blur-xl rounded-[48px] p-24 text-center border border-stone-200 dark:border-stone-800 shadow-2xl shadow-stone-200/50 dark:shadow-none">
                        <div className="w-32 h-32 bg-primary/10 dark:bg-mint/10 rounded-full flex items-center justify-center mx-auto mb-10 relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-110 group-hover:scale-125 transition-transform duration-700" />
                            <CheckCircle2 className="w-16 h-16 text-primary dark:text-mint relative z-10" />
                        </div>
                        <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">
                            {t.tasks.everythingPerfect}
                        </h2>
                        <p className="text-stone-500 dark:text-stone-400 text-lg max-w-md mx-auto leading-relaxed">
                            {t.tasks.completedAllTasks}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 px-6">
                        {sortedTasks.map((task) => {
                            const Icon = getTaskIcon(task.type)
                            const colors = getPriorityColor(task.priority)

                            return (
                                <Link
                                    key={task.id}
                                    href={task.actionUrl || '#'}
                                    className="bg-white dark:bg-stone-900 rounded-[32px] p-5 flex items-center gap-4 shadow-sm border border-stone-50 dark:border-stone-800/50 active:scale-[0.98] transition-all cursor-pointer group"
                                >
                                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-colors bg-stone-50 dark:bg-stone-800 text-stone-400 group-hover:bg-primary-soft group-hover:text-primary dark:group-hover:bg-primary/15 dark:group-hover:text-mint`}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-black text-stone-900 dark:text-white tracking-tight truncate">{task.title}</h3>
                                        <p className="text-xs font-bold text-stone-400">{task.type.toUpperCase()}</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${task.priority === 'high'
                                        ? 'bg-primary text-white dark:text-[#1A2420]'
                                        : task.priority === 'medium'
                                            ? 'bg-amber-400 text-stone-900'
                                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                                        }`}>
                                        {task.priority === 'high'
                                            ? (t.tasks.priorities.high.toUpperCase())
                                            : (t.tasks.priorities[task.priority] || task.priority).toUpperCase()}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
