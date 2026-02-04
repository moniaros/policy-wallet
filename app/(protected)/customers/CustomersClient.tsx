"use client"

import { useState, useMemo } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { BulkImportModal } from "@/components/agent/BulkImportModal"
import { Customer } from "@/components/agent/types"
import { getCustomers } from "../agent/actions"
import { useRouter } from "next/navigation"
import { Clock, User, FileText, AlertTriangle, Upload } from "lucide-react"

interface Props {
    initialCustomers: Customer[]
}

type FilterType = 'all' | 'activated' | 'invited' | 'inactive'
type SortType = 'recent' | 'name' | 'policies' | 'gaps'

// Type for CustomerList component
interface CustomerListItem {
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

    // Map Customer to CustomerListItem format
    const mappedCustomers: CustomerListItem[] = useMemo(() => {
        return customers.map(customer => ({
            id: customer.id,
            name: `${customer.name} ${customer.surname}`,
            email: customer.email,
            phone: customer.phone,
            policiesCount: customer.policyCount,
            lastContact: customer.lastInteractionDate,
            status: customer.activationStatus === 'activated' ? 'active' : customer.activationStatus,
            hasOpenOpportunities: (customer.openGapsCount || 0) > 0
        }))
    }, [customers])

    // Filter customers
    const filteredCustomers = mappedCustomers.filter(customer => {
        if (filter === 'all') return true
        return customer.status === filter || (filter === 'activated' && customer.status === 'active')
    })

    // Sort customers
    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        switch (sort) {
            case 'name':
                return a.name.localeCompare(b.name)
            case 'policies':
                return (b.policiesCount || 0) - (a.policiesCount || 0)
            case 'gaps':
                return (b.hasOpenOpportunities ? 1 : 0) - (a.hasOpenOpportunities ? 1 : 0)
            case 'recent':
            default:
                if (!a.lastContact) return 1
                if (!b.lastContact) return -1
                return new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()
        }
    })

    const statusCounts = {
        all: mappedCustomers.length,
        activated: mappedCustomers.filter(c => c.status === 'active').length,
        invited: mappedCustomers.filter(c => c.status === 'invited').length,
        inactive: mappedCustomers.filter(c => c.status === 'inactive').length,
    }

    const sortOptions = [
        { key: 'recent' as SortType, label: 'Recent Activity', Icon: Clock },
        { key: 'name' as SortType, label: 'Name', Icon: User },
        { key: 'policies' as SortType, label: 'Policy Count', Icon: FileText },
        { key: 'gaps' as SortType, label: 'Open Gaps', Icon: AlertTriangle },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Client <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Directory</span>
                        </h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Manage your customer relationships and track their insurance portfolios.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsBulkImportOpen(true)}
                        className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    >
                        <Upload className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                        <span>Bulk Import</span>
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
                                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 cursor-pointer ${filter === key
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-indigo-500/50 hover:shadow-md'
                                    }`}
                            >
                                {label} {count > 0 && `(${count})`}
                            </button>
                        ))}
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Sort by:</span>
                        <div className="flex gap-2 flex-wrap">
                            {sortOptions.map(({ key, label, Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setSort(key)}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${sort === key
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <CustomerList
                    customers={sortedCustomers}
                    onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
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
        </div>
    )
}
