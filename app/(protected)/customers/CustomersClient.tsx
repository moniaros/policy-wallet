"use client"

import { useState, useMemo } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
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
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()
    const cust_t = t.agentPages.customers

    const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

    const handleSuccess = () => {
        router.refresh()
    }

    const handleBulkImportSuccess = () => {
        // The modal shows its own "Import Complete" step; just refresh the list.
        router.refresh()
    }

    const handleBulkAction = (action: 'export' | 'email' | 'delete', ids: string[]) => {
        const selected = ids.map((id) => customerById.get(id)).filter(Boolean) as Customer[]

        if (action === 'email') {
            // BCC the customers' real email addresses (not their ids).
            const emails = selected.map((c) => c.email).filter(Boolean)
            if (emails.length) window.location.href = `mailto:?bcc=${emails.join(',')}`
            return
        }

        if (action === 'export') {
            // Real client-side CSV download of the selected customers.
            const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
            const header = ['Name', 'Email', 'Phone', 'Policies', 'Status']
            const rows = selected.map((c) => [
                `${c.name} ${c.surname}`.trim(),
                c.email,
                c.phone,
                c.policyCount ?? 0,
                c.activationStatus,
            ])
            const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'customers.csv'
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    const handleCall = (id: string) => {
        const phone = customerById.get(id)?.phone
        if (phone) window.location.href = `tel:${phone}`
    }
    const handleEmail = (id: string) => {
        const email = customerById.get(id)?.email
        if (email) window.location.href = `mailto:${email}`
    }

    // Map Customer to CustomerListItem format (CustomerList expects 'Customer' interface which matches our agent/types Customer mostly but check compatibility)
    // The CustomerList defines its own Customer interface at top of file.
    // I should probably export/import the shared type to be safe, but for now I'll let TS check or cast.

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <span className="pw-kicker inline-block mb-2">{cust_t.kicker}</span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                            {cust_t.title}
                        </h1>
                        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                            {cust_t.subtitle}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsBulkImportOpen(true)}
                            className="pw-secondary-button"
                        >
                            <Upload className="w-4 h-4" />
                            <span>{cust_t.import}</span>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="pw-secondary-button"
                        >
                            <User className="w-4 h-4" />
                            <span>{cust_t.addClient}</span>
                        </button>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="pw-primary-button"
                        >
                            <FileText className="w-4 h-4" />
                            <span>{cust_t.uploadPolicy}</span>
                        </button>
                    </div>
                </header>

                {portalStats && <AgentKpiStrip stats={portalStats} className="mb-8" />}

                <CustomerList
                    customers={customers}
                    onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
                    onBulkAction={handleBulkAction}
                    onCall={handleCall}
                    onEmail={handleEmail}
                />

                <AddCustomerModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleSuccess}
                />

                <UploadPolicyModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
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
