"use client"

import { useState, useMemo } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { BulkImportModal } from "@/components/agent/BulkImportModal"
import { AgentKpiStrip } from "@/components/agent/AgentKpiStrip"
import { Customer } from "@/components/agent/types"
import { getCustomers } from "../agent/actions"
import { useRouter } from "next/navigation"
import { Clock, User, FileText, AlertTriangle, Upload } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentPortalStats } from "@/lib/services/agent-portal.service"

interface Props {
    initialCustomers: Customer[]
    portalStats?: AgentPortalStats | null
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

export function CustomersClient({ initialCustomers, portalStats }: Props) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()
    const cust_t = t.agentPages.customers

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
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <span className="pw-kicker inline-block mb-2">{cust_t.kicker}</span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                            {cust_t.title}
                        </h1>
                        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
                            {cust_t.subtitle}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsBulkImportOpen(true)}
                            className="arc-btn bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            <span>{cust_t.import}</span>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="arc-btn arc-btn-primary shadow-sm flex items-center gap-2"
                        >
                            <User className="w-4 h-4" />
                            <span>{cust_t.addClient}</span>
                        </button>
                    </div>
                </header>

                {portalStats && <AgentKpiStrip stats={portalStats} className="mb-8" />}

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
