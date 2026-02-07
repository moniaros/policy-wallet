"use client"

import React, { useState, useMemo } from 'react'
import { Search, Phone, Mail, User, AlertCircle, LayoutList, LayoutGrid, Upload, Download, MoreHorizontal } from 'lucide-react'
import { Customer, CustomerListProps } from './types'

export function CustomerList({
    customers,
    onCustomerClick,
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

    // Filter and sort customers
    const filteredCustomers = useMemo(() => {
        let filtered = customers

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = customers.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.surname.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            )
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.activationStatus === statusFilter)
        }

        // Sort
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

    // Bulk Selection Handlers
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

    const getStatusColor = (status: Customer['activationStatus']) => {
        switch (status) {
            case 'activated':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            case 'invited':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            case 'inactive':
                return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }
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

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">

                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Filter Dropdown */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="activated">Activated</option>
                        <option value="invited">Invited</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                            {selectedIds.size} Selected
                        </span>
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                            Apply actions to selected clients
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onBulkAction?.('email', Array.from(selectedIds))}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
                            title="Send Email"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onBulkAction?.('export', Array.from(selectedIds))}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
                            title="Export"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No clients found</h3>
                    <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
                </div>
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                                            onChange={toggleAll}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => setSortBy('name')}>
                                        Client Name
                                    </th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center cursor-pointer hover:text-slate-700" onClick={() => setSortBy('policyCount')}>
                                        Policies
                                    </th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-700" onClick={() => setSortBy('lastInteractionDate')}>
                                        Last Activity
                                    </th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        onClick={() => onCustomerClick(customer.id)}
                                        className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.has(customer.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(customer.id)}
                                                onChange={() => toggleSelection(customer.id)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {customer.avatar ? (
                                                        <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        customer.name.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{customer.name} {customer.surname}</div>
                                                    {customer.openGapsCount > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium mt-0.5">
                                                            <AlertCircle className="w-3 h-3" />
                                                            <span>Opportunity</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            <div className="flex flex-col text-xs">
                                                <span>{customer.email}</span>
                                                <span>{customer.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize border ${getStatusColor(customer.activationStatus)}`}>
                                                {customer.activationStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-900 dark:text-white">
                                            {customer.policyCount}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                            {formatLastContact(customer.lastInteractionDate)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {customer.phone && (
                                                    <button onClick={(e) => { e.stopPropagation(); onCall?.(customer.id) }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500">
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500">
                                                    <Mail className="w-3.5 h-3.5" />
                                                </button>
                                                <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500">
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            onClick={() => onCustomerClick(customer.id)}
                            className={`group bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all cursor-pointer ${selectedIds.has(customer.id)
                                ? 'border-blue-500 ring-1 ring-blue-500'
                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                        {customer.avatar ? (
                                            <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            customer.name.slice(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{customer.name} {customer.surname}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border border-current opacity-80 uppercase font-bold tracking-wide ${customer.activationStatus === 'activated' ? 'text-emerald-600' :
                                            customer.activationStatus === 'invited' ? 'text-amber-600' : 'text-slate-500'
                                            }`}>
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

                            <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                                <span>{customer.policyCount} active policies</span>
                                <span>{formatLastContact(customer.lastInteractionDate)}</span>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button className="flex-1 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors">
                                    Profile
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onEmail?.(customer.id) }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
