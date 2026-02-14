"use client"

import React, { useState, useMemo } from 'react'
import {
    Search,
    Phone,
    Mail,
    User,
    AlertCircle,
    LayoutList,
    LayoutGrid,
    Download,
    MoreHorizontal,
    ChevronRight,
    Filter,
    UserPlus,
    Sparkles,
    FileText,
} from 'lucide-react'
import { Customer, CustomerListProps } from './types'

const LIST_ANIMATION_CSS = `
@keyframes listFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes listSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
`

export function CustomerList({
    customers,
    onCustomerClick,
    onAddCustomer,
    onCall,
    onEmail,
    onWhatsApp,
    onBulkAction
}: CustomerListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'activated' | 'invited' | 'inactive'>('all')
    const [sortBy, setSortBy] = useState<'name' | 'policyCount' | 'lastInteractionDate'>('name')
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const filteredCustomers = useMemo(() => {
        let filtered = customers

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = customers.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.surname.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            )
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.activationStatus === statusFilter)
        }

        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
                case 'policyCount':
                    return b.policyCount - a.policyCount
                case 'lastInteractionDate':
                    if (!a.lastInteractionDate) return 1
                    if (!b.lastInteractionDate) return -1
                    return new Date(b.lastInteractionDate).getTime() - new Date(a.lastInteractionDate).getTime()
                default:
                    return 0
            }
        })

        return filtered
    }, [customers, searchQuery, statusFilter, sortBy])

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
        }
    }

    const getStatusStyle = (status: Customer['activationStatus']) => {
        switch (status) {
            case 'activated':
                return { badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
            case 'invited':
                return { badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
            case 'inactive':
                return { badge: 'bg-slate-500/15 text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' }
        }
    }

    const getInitials = (name: string, surname: string) => {
        return `${(name?.[0] || '').toUpperCase()}${(surname?.[0] || '').toUpperCase()}`
    }

    const getAvatarGradient = (name: string) => {
        const gradients = [
            'from-blue-500 to-indigo-600',
            'from-emerald-500 to-teal-600',
            'from-violet-500 to-purple-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-pink-600',
            'from-cyan-500 to-blue-600',
        ]
        const idx = name.charCodeAt(0) % gradients.length
        return gradients[idx]
    }

    const formatLastContact = (dateStr?: string) => {
        if (!dateStr) return 'Never'
        const date = new Date(dateStr)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    const statusCounts = useMemo(() => ({
        all: customers.length,
        activated: customers.filter(c => c.activationStatus === 'activated').length,
        invited: customers.filter(c => c.activationStatus === 'invited').length,
        inactive: customers.filter(c => c.activationStatus === 'inactive').length,
    }), [customers])

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: LIST_ANIMATION_CSS }} />

            <div className="space-y-4" style={{ animation: 'listFadeIn .4s ease-out both' }}>
                {/* ═══════════ TOOLBAR ═══════════ */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                    {/* Search */}
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Status filter pills */}
                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl gap-0.5">
                            {(['all', 'activated', 'invited', 'inactive'] as const).map(status => {
                                const isActive = statusFilter === status
                                return (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${isActive
                                            ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {status === 'all' ? `All (${statusCounts.all})` : `${status} (${statusCounts[status]})`}
                                    </button>
                                )
                            })}
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════════ BULK ACTIONS ═══════════ */}
                {selectedIds.size > 0 && (
                    <div className="bg-blue-50/80 dark:bg-blue-900/15 backdrop-blur-sm border border-blue-200/60 dark:border-blue-800/40 rounded-2xl p-3.5 flex items-center justify-between" style={{ animation: 'listFadeIn .3s ease-out both' }}>
                        <div className="flex items-center gap-3">
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                {selectedIds.size}
                            </span>
                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                {selectedIds.size === 1 ? 'client selected' : 'clients selected'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => onBulkAction?.('email', Array.from(selectedIds))}
                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-xl transition-colors cursor-pointer"
                                title="Send Email"
                            >
                                <Mail className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onBulkAction?.('export', Array.from(selectedIds))}
                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-xl transition-colors cursor-pointer"
                                title="Export"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════ CONTENT ═══════════ */}
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                            <User className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No clients found</h3>
                        <p className="text-slate-500 text-sm mb-4">Try adjusting your filters or search terms.</p>
                        {onAddCustomer && (
                            <button
                                onClick={onAddCustomer}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all cursor-pointer"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Client
                            </button>
                        )}
                    </div>

                ) : viewMode === 'table' ? (
                    /* ──── TABLE VIEW ──── */
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-slate-800/60">
                                    <tr>
                                        <th className="px-4 py-3.5 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                                                onChange={toggleAll}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-4 py-3.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy('name')}>
                                            Client {sortBy === 'name' && '↑'}
                                        </th>
                                        <th className="px-4 py-3.5">Contact</th>
                                        <th className="px-4 py-3.5">Status</th>
                                        <th className="px-4 py-3.5 text-center cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy('policyCount')}>
                                            Policies {sortBy === 'policyCount' && '↓'}
                                        </th>
                                        <th className="px-4 py-3.5 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => setSortBy('lastInteractionDate')}>
                                            Last Activity {sortBy === 'lastInteractionDate' && '↓'}
                                        </th>
                                        <th className="px-4 py-3.5 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
                                    {filteredCustomers.map((customer, idx) => {
                                        const style = getStatusStyle(customer.activationStatus)
                                        return (
                                            <tr
                                                key={customer.id}
                                                onClick={() => onCustomerClick(customer.id)}
                                                className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all cursor-pointer ${selectedIds.has(customer.id) ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                                    }`}
                                                style={{ animation: `listSlideIn .35s ease-out ${idx * 30}ms both` }}
                                            >
                                                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(customer.id)}
                                                        onChange={() => toggleSelection(customer.id)}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(customer.name)} flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
                                                            {customer.avatar ? (
                                                                <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-xl object-cover" />
                                                            ) : (
                                                                getInitials(customer.name, customer.surname)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white text-[13px]">
                                                                {customer.name} {customer.surname}
                                                            </div>
                                                            {customer.openGapsCount > 0 && (
                                                                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                                    <Sparkles className="w-3 h-3" />
                                                                    <span>{customer.openGapsCount} {customer.openGapsCount === 1 ? 'opportunity' : 'opportunities'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col text-[12px] text-slate-500 dark:text-slate-400 gap-0.5">
                                                        <span className="truncate max-w-[180px]">{customer.email}</span>
                                                        <span className="text-slate-400">{customer.phone || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                        {customer.activationStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {customer.policyCount}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[12px] text-slate-400">
                                                    {formatLastContact(customer.lastInteractionDate)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {customer.phone && (
                                                            <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                                                                <Phone className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                                                            <Mail className="w-3.5 h-3.5" />
                                                        </button>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ──── GRID VIEW ──── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCustomers.map((customer, idx) => {
                            const style = getStatusStyle(customer.activationStatus)
                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => onCustomerClick(customer.id)}
                                    className={`group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedIds.has(customer.id)
                                        ? 'border-blue-500 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                                        : 'border-slate-200/60 dark:border-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:-translate-y-0.5'
                                        }`}
                                    style={{ animation: `listFadeIn .4s ease-out ${idx * 50}ms both` }}
                                >
                                    {/* Gradient accent on hover */}
                                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getAvatarGradient(customer.name)} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(customer.name)} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                                                {customer.avatar ? (
                                                    <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-xl object-cover" />
                                                ) : (
                                                    getInitials(customer.name, customer.surname)
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-[15px]">
                                                    {customer.name} {customer.surname}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${style.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                    {customer.activationStatus}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(customer.id)}
                                            onChange={(e) => { e.stopPropagation(); toggleSelection(customer.id) }}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                                        <span className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {customer.policyCount} policies
                                        </span>
                                        <span>{formatLastContact(customer.lastInteractionDate)}</span>
                                    </div>

                                    {customer.openGapsCount > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold mb-3 bg-amber-50/80 dark:bg-amber-900/15 px-2.5 py-1.5 rounded-lg border border-amber-200/40 dark:border-amber-800/30">
                                            <Sparkles className="w-3 h-3" />
                                            <span>{customer.openGapsCount} open {customer.openGapsCount === 1 ? 'opportunity' : 'opportunities'}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-3 border-t border-slate-100/80 dark:border-slate-800/60">
                                        <button className="flex-1 py-2 text-xs font-semibold bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1">
                                            Profile
                                            <ChevronRight className="w-3 h-3 opacity-50" />
                                        </button>
                                        {customer.phone && (
                                            <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors cursor-pointer">
                                                <Phone className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors cursor-pointer">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}


