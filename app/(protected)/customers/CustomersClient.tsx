"use client"

import { useState, useMemo } from "react"
import { CustomerList, AddCustomerModal } from "@/components/agent"
import { customerHasNoEmail } from "@/components/agent/CustomerList"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { BulkImportModal } from "@/components/agent/BulkImportModal"
import { AddCustomerEmailModal } from "@/components/agent/AddCustomerEmailModal"
import { AgentKpiStrip } from "@/components/agent/AgentKpiStrip"
import { Customer } from "@/components/agent/types"
import { getCustomers, createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Clock, User, FileText, AlertTriangle, Upload } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { describeActionError } from "@/lib/i18n/action-error"
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
            // BCC the customers' real email addresses (not their ids) — a
            // no-email customer's synthetic placeholder is never one of them.
            const emails = selected.filter((c) => !customerHasNoEmail(c)).map((c) => c.email).filter(Boolean)
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
        const customer = customerById.get(id)
        // A no-email customer's address is a synthetic placeholder — never a mailto.
        if (!customer || customerHasNoEmail(customer)) return
        if (customer.email) window.location.href = `mailto:${customer.email}`
    }

    // «Προσθέστε email για να τον προσκαλέσετε» — the one action a customer
    // added without an email (D3) needs before an invitation can leave.
    const [addEmailFor, setAddEmailFor] = useState<string | null>(null)
    const handleAddEmail = (id: string) => setAddEmailFor(id)

    // «Αποστολή πρόσκλησης» on a customer the agent added but never invited —
    // the same action and the same delivery handling the dashboard's invite
    // modal uses. A rejected transport (expired session, deploy skew) is
    // caught, never left to window.onunhandledrejection.
    const sendInvite = async (id: string, email: string) => {
        try {
            const result = await createAgentInvite(email, 'portfolio')
            if (result.success) {
                if ("emailDelivered" in result && result.emailDelivered === false) {
                    const link = "inviteLink" in result ? result.inviteLink : undefined
                    if (link) navigator.clipboard?.writeText(link).catch(() => {})
                    toast.warning(t.agentDashboard.inviteEmailFailed)
                } else {
                    toast.success(cust_t.inviteSent)
                }
                router.refresh()
            } else if ("error" in result && result.error) {
                // A code, localised here — never the literal. A customer without
                // an email cannot be invited; open the add-email dialog instead.
                const details = "details" in result ? (result.details as never) : undefined
                toast.error(describeActionError(t, result.error, details, result as Record<string, unknown>).message)
                if (result.error === 'CUSTOMER_NOT_CONTACTABLE') setAddEmailFor(id)
            }
        } catch {
            toast.error(t.apiErrors.generic)
        }
    }
    const handleInvite = async (id: string) => {
        const customer = customerById.get(id)
        if (!customer) return
        if (customerHasNoEmail(customer)) { setAddEmailFor(id); return }
        if (customer.email) await sendInvite(id, customer.email)
    }
    // The address was saved: send the invitation with it, as the button promised.
    const handleEmailSaved = async (id: string, email: string) => {
        setAddEmailFor(null)
        toast.success(cust_t.emailAdded)
        await sendInvite(id, email)
    }

    // The add-customer dialog's second door: close it and open the upload
    // flow, which is the ONLY path that saves a document with the policy.
    const openUploadInstead = () => {
        setIsAddModalOpen(false)
        setIsUploadModalOpen(true)
    }

    // Map Customer to CustomerListItem format (CustomerList expects 'Customer' interface which matches our agent/types Customer mostly but check compatibility)
    // The CustomerList defines its own Customer interface at top of file.
    // I should probably export/import the shared type to be safe, but for now I'll let TS check or cast.

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is, plus the one primary action
                    (upload a policy); import and add are soft pills. min-w-0
                    lets the title column shrink so the actions keep their size;
                    the row wraps rather than pushing the page wide. */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">{cust_t.title}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{cust_t.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setIsBulkImportOpen(true)}
                            className="pw-soft-button"
                        >
                            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{cust_t.import}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="pw-soft-button"
                        >
                            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{cust_t.addClient}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="pw-primary-button"
                        >
                            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{cust_t.uploadPolicy}</span>
                        </button>
                    </div>
                </header>

                {portalStats && <AgentKpiStrip stats={portalStats} />}

                <CustomerList
                    customers={customers}
                    onCustomerClick={(id: string) => router.push(`/customers/${id}`)}
                    onBulkAction={handleBulkAction}
                    onCall={handleCall}
                    onEmail={handleEmail}
                    onInvite={handleInvite}
                    onAddEmail={handleAddEmail}
                />

                <AddCustomerEmailModal
                    isOpen={addEmailFor !== null}
                    customerId={addEmailFor}
                    customerName={addEmailFor ? `${customerById.get(addEmailFor)?.name ?? ''} ${customerById.get(addEmailFor)?.surname ?? ''}`.trim() : undefined}
                    onClose={() => setAddEmailFor(null)}
                    onSaved={handleEmailSaved}
                />

                <AddCustomerModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleSuccess}
                    onUploadInstead={openUploadInstead}
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
