"use client"

import React, { useState, useMemo } from 'react'
import { Search, Filter, Phone, Mail, MessageCircle, ChevronRight, User, TrendingUp, AlertCircle } from 'lucide-react'

interface Customer {
    id: string
    name: string
    email: string
    phone?: string
    policiesCount: number
    totalPremium?: number
    lastContact?: string
    status: 'active' | 'invited' | 'inactive'
    hasOpenOpportunities?: boolean
    avatar?: string
}

interface CustomerListProps {
    customers: Customer[]
    onCustomerClick: (customerId: string) => void
    onCall?: (customerId: string) => void
    onEmail?: (customerId: string) => void
    onWhatsApp?: (customerId: string) => void
}

export function CustomerList({
    customers,
    onCustomerClick,
    onCall,
    onEmail,
    onWhatsApp
}: CustomerListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited' | 'inactive'>('all')
    const [sortBy, setSortBy] = useState<'name' | 'policies' | 'lastContact'>('name')

    // Filter and sort customers
    const filteredCustomers = useMemo(() => {
        let filtered = customers

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = customers.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query)
            )
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter)
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name)
                case 'policies':
                    return b.policiesCount - a.policiesCount
                case 'lastContact':
                    if (!a.lastContact) return 1
                    if (!b.lastContact) return -1
                    return new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()
                default:
                    return 0
            }
        })

        return filtered
    }, [customers, searchQuery, statusFilter, sortBy])

    // Group by first letter for alphabetical index
    const groupedCustomers = useMemo(() => {
        const groups: Record<string, Customer[]> = {}
        filteredCustomers.forEach(customer => {
            const firstLetter = customer.name[0].toUpperCase()
            if (!groups[firstLetter]) {
                groups[firstLetter] = []
            }
            groups[firstLetter].push(customer)
        })
        return groups
    }, [filteredCustomers])

    const getStatusColor = (status: Customer['status']) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            case 'invited':
                return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            case 'inactive':
                return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }
    }

    const getStatusDot = (status: Customer['status']) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-500'
            case 'invited':
                return 'bg-amber-500'
            case 'inactive':
                return 'bg-slate-400'
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
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
        return `${Math.floor(diffDays / 30)}mo ago`
    }

    const statusCounts = {
        all: customers.length,
        active: customers.filter(c => c.status === 'active').length,
        invited: customers.filter(c => c.status === 'invited').length,
        inactive: customers.filter(c => c.status === 'inactive').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Customers
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                        {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                    </p>
                </div>

                {/* Search Bar - Sticky on mobile */}
                <div className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-950 pb-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm text-base"
                            inputMode="search"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters - Horizontal scroll on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {[
                        { key: 'all' as const, label: 'All' },
                        { key: 'active' as const, label: 'Active' },
                        { key: 'invited' as const, label: 'Invited' },
                        { key: 'inactive' as const, label: 'Inactive' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setStatusFilter(filter.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${statusFilter === filter.key
                                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50'
                                }`}
                        >
                            {filter.label}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusFilter === filter.key
                                    ? 'bg-white/20'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                {statusCounts[filter.key]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Sort Options - Mobile */}
                <div className="sm:hidden flex items-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="policies">Sort by Policies</option>
                        <option value="lastContact">Sort by Last Contact</option>
                    </select>
                </div>

                {/* Empty State */}
                {filteredCustomers.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            No customers found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-4">
                            {searchQuery ? 'Try different search terms' : 'Start by inviting your first customer'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-sky-600 dark:text-sky-400 font-semibold text-sm hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {/* Customer List */}
                {filteredCustomers.length > 0 && (
                    <div className="space-y-6">
                        {sortBy === 'name' ? (
                            // Grouped by letter
                            Object.keys(groupedCustomers).sort().map(letter => (
                                <div key={letter}>
                                    <div className="sticky top-20 z-20 bg-slate-50 dark:bg-slate-950 py-2 mb-3">
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
                                            {letter}
                                        </h2>
                                    </div>
                                    <div className="space-y-3">
                                        {groupedCustomers[letter].map(customer => (
                                            <CustomerCard
                                                key={customer.id}
                                                customer={customer}
                                                onClick={() => onCustomerClick(customer.id)}
                                                onCall={onCall ? () => onCall(customer.id) : undefined}
                                                onEmail={onEmail ? () => onEmail(customer.id) : undefined}
                                                onWhatsApp={onWhatsApp ? () => onWhatsApp(customer.id) : undefined}
                                                getStatusColor={getStatusColor}
                                                getStatusDot={getStatusDot}
                                                formatLastContact={formatLastContact}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Flat list
                            <div className="space-y-3">
                                {filteredCustomers.map(customer => (
                                    <CustomerCard
                                        key={customer.id}
                                        customer={customer}
                                        onClick={() => onCustomerClick(customer.id)}
                                        onCall={onCall ? () => onCall(customer.id) : undefined}
                                        onEmail={onEmail ? () => onEmail(customer.id) : undefined}
                                        onWhatsApp={onWhatsApp ? () => onWhatsApp(customer.id) : undefined}
                                        getStatusColor={getStatusColor}
                                        getStatusDot={getStatusDot}
                                        formatLastContact={formatLastContact}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// Customer Card Component
interface CustomerCardProps {
    customer: Customer
    onClick: () => void
    onCall?: () => void
    onEmail?: () => void
    onWhatsApp?: () => void
    getStatusColor: (status: Customer['status']) => string
    getStatusDot: (status: Customer['status']) => string
    formatLastContact: (dateStr?: string) => string
}

function CustomerCard({
    customer,
    onClick,
    onCall,
    onEmail,
    onWhatsApp,
    getStatusColor,
    getStatusDot,
    formatLastContact
}: CustomerCardProps) {
    return (
        <div
            onClick={onClick}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:border-sky-500/50 transition-all cursor-pointer active:scale-[0.98]"
        >
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {customer.avatar ? (
                        <img
                            src={customer.avatar}
                            alt={customer.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                    ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg sm:text-xl">
                            {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Name and Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {customer.name}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                {customer.email}
                            </p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex-shrink-0 ${getStatusColor(customer.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(customer.status)} ${customer.status === 'active' ? 'animate-pulse' : ''}`} />
                            {customer.status}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-semibold">{customer.policiesCount}</span> policies
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-medium">
                            Last: {formatLastContact(customer.lastContact)}
                        </span>
                    </div>

                    {/* Opportunity Badge */}
                    {customer.hasOpenOpportunities && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold mb-3">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Open opportunity
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                        {onCall && customer.phone && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCall()
                                }}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                                aria-label="Call"
                            >
                                <Phone className="w-4 h-4" />
                            </button>
                        )}
                        {onEmail && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEmail()
                                }}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Email"
                            >
                                <Mail className="w-4 h-4" />
                            </button>
                        )}
                        {onWhatsApp && customer.phone && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onWhatsApp()
                                }}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                aria-label="WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        )}
                        <div className="ml-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
