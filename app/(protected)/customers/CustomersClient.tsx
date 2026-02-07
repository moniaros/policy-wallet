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
    const router = useRouter()

    const handleSuccess = () => {
        router.refresh()
    }

    const handleBulkImportSuccess = (count: number) => {
        router.refresh()
        // In a real app, we'd show a toast here
        console.log(`Successfully imported ${count} customers!`)
    }

    const handleBulkAction = (action: 'export' | 'email' | 'delete', ids: string[]) => {
        console.log(`Bulk action: ${action} on ${ids.length} items`)
        // Implement bulk actions here
        if (action === 'email') {
            // Open email modal or similar
            window.location.href = `mailto:?bcc=${ids.join(',')}` // Naive implementation
        }
    }

    // Map Customer to CustomerListItem format (CustomerList expects 'Customer' interface which matches our agent/types Customer mostly but check compatibility)
    // The CustomerList defines its own Customer interface at top of file.
    // I should probably export/import the shared type to be safe, but for now I'll let TS check or cast.

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Client Directory
                        </h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Manage your customer relationships and portfolios.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsBulkImportOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Import</span>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <User className="w-4 h-4" />
                            <span>Add Client</span>
                        </button>
                    </div>
                </header>

                <CustomerList
                    customers={customers}
                    onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
                    onBulkAction={handleBulkAction}
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
