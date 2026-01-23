"use client"

import { useState } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { BulkImportModal } from "@/components/agent/BulkImportModal"
import { Customer } from "@/components/agent/types"
import { getCustomers } from "../agent/actions"
import { useRouter } from "next/navigation"

interface Props {
    initialCustomers: Customer[]
}

type FilterType = 'all' | 'activated' | 'invited' | 'inactive'
type SortType = 'recent' | 'name' | 'policies' | 'gaps'

export function CustomersClient({ initialCustomers }: Props) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<FilterType>('all')
    const [sort, setSort] = useState<SortType>('recent')
    const router = useRouter()

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        setIsLoading(true)
        try {
            const results = await getCustomers(query)
            setCustomers(results)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSuccess = () => {
        router.refresh()
    }

    const handleBulkImportSuccess = (count: number) => {
        router.refresh()
        alert(`Successfully imported ${count} customers!`)
    }

    // Filter customers
    const filteredCustomers = customers.filter(customer => {
        if (filter === 'all') return true
        return customer.activationStatus === filter
    })

    // Sort customers
    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        switch (sort) {
            case 'name':
                return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
            case 'policies':
                return (b.policyCount || 0) - (a.policyCount || 0)
            case 'gaps':
                return (b.openGapsCount || 0) - (a.openGapsCount || 0)
            case 'recent':
            default:
                return new Date(b.lastInteractionDate).getTime() - new Date(a.lastInteractionDate).getTime()
        }
    })

    const statusCounts = {
        all: customers.length,
        activated: customers.filter(c => c.activationStatus === 'activated').length,
        invited: customers.filter(c => c.activationStatus === 'invited').length,
        inactive: customers.filter(c => c.activationStatus === 'inactive').length,
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Customers</h1>
                    <p className="mt-2 text-stone-600 dark:text-stone-400">
                        Manage your customer relationships and track their insurance portfolios.
                    </p>
                </div>
                <button
                    onClick={() => setIsBulkImportOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-500/30 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Bulk Import
                </button>
            </header>

            {/* Filters and Sort */}
            <div className="mb-6 space-y-4">
                {/* Status Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { key: 'all' as FilterType, label: 'All Customers', count: statusCounts.all },
                        { key: 'activated' as FilterType, label: 'Activated', count: statusCounts.activated },
                        { key: 'invited' as FilterType, label: 'Invited', count: statusCounts.invited },
                        { key: 'inactive' as FilterType, label: 'Inactive', count: statusCounts.inactive },
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${filter === key
                                ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                                }`}
                        >
                            {label} {count > 0 && `(${count})`}
                        </button>
                    ))}
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-stone-600 dark:text-stone-400">Sort by:</span>
                    <div className="flex gap-2">
                        {[
                            { key: 'recent' as SortType, label: 'Recent Activity', icon: '🕐' },
                            { key: 'name' as SortType, label: 'Name', icon: '📝' },
                            { key: 'policies' as SortType, label: 'Policy Count', icon: '📄' },
                            { key: 'gaps' as SortType, label: 'Open Gaps', icon: '⚠️' },
                        ].map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setSort(key)}
                                className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${sort === key
                                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                                    }`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <CustomerList
                customers={sortedCustomers}
                isLoading={isLoading}
                onSearch={handleSearch}
                onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
                onAddCustomer={() => setIsAddModalOpen(true)}
            />

            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleSuccess}
            />

            <BulkImportModal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                onSuccess={handleBulkImportSuccess}
            />
        </div>
    )
}
