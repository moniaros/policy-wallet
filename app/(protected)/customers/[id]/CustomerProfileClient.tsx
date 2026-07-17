"use client"

import { useState, useEffect, useCallback } from "react"
import { QuestionnaireSender } from "@/components/agent"
import { Customer, OpportunityStatus } from "@/components/agent/types"
import { updateOpportunityStatus, createAgentInvite } from "../../agent/actions"
import { useRouter } from "next/navigation"
import { CreateTaskModal } from "@/components/agent/CreateTaskModal"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { ClientDetailView } from "@/components/agent/ClientDetailView"
import { DocumentRequestCreate, DocumentRequestCard } from "@/components/collaboration/DocumentRequestFlow"
import { ProposalCreate, ProposalView } from "@/components/collaboration/ProposalCard"
import { AgentInbox } from "@/components/collaboration/AgentInbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { MessageSquare, FileText, Send, X, Plus } from "lucide-react"
import type { AgentTier } from "@/types/subscription-entitlements"
import type { DocumentRequestData, ProposalData, DocumentTypeKey, DocumentUrgency } from "@/components/collaboration/types"

interface Props {
    initialCustomer: Customer
    agentTier: AgentTier
    healthScore: number
}

const PROFILE_COPY = {
    requestDocument: { el: "Αίτημα Εγγράφου", en: "Request Document" },
    createProposal: { el: "Δημιουργία Πρότασης", en: "Create Proposal" },
    addPolicy: { el: "Προσθήκη Ασφαλιστηρίου", en: "Add Policy" },
    createTask: { el: "Δημιουργία Task", en: "Create Task" },
    documentRequests: { el: "Αιτήματα Εγγράφων", en: "Document Requests" },
    newRequest: { el: "Νέο", en: "New" },
    noDocumentRequests: { el: "Δεν υπάρχουν αιτήματα", en: "No document requests" },
    proposals: { el: "Προτάσεις", en: "Proposals" },
    newProposal: { el: "Νέα", en: "New" },
    noProposals: { el: "Δεν υπάρχουν προτάσεις", en: "No proposals" },
} as const

export function CustomerProfileClient({ initialCustomer, agentTier, healthScore }: Props) {
    const router = useRouter()
    const { language } = useLanguage()
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
    const [isDocRequestFormOpen, setIsDocRequestFormOpen] = useState(false)
    const [isProposalFormOpen, setIsProposalFormOpen] = useState(false)
    const [isSendingDocRequest, setIsSendingDocRequest] = useState(false)
    const [isSendingProposal, setIsSendingProposal] = useState(false)
    const [documentRequests, setDocumentRequests] = useState<DocumentRequestData[]>([])
    const [proposals, setProposals] = useState<ProposalData[]>([])
    const [isLoadingDocs, setIsLoadingDocs] = useState(false)
    const [isLoadingProposals, setIsLoadingProposals] = useState(false)

    const handleUpdateStatus = async (opportunityId: string, status: OpportunityStatus, notes?: string) => {
        const result = await updateOpportunityStatus(opportunityId, status, notes)
        if (result.success) {
            router.refresh()
        }
    }

    const fetchDocumentRequests = useCallback(async () => {
        setIsLoadingDocs(true)
        try {
            const res = await fetch(`/api/v1/collaboration/document-requests?relationshipId=${initialCustomer.relationshipId}`)
            if (res.ok) {
                const data = await res.json()
                setDocumentRequests((data.requests || []).map((r: any) => ({
                    id: r.id,
                    threadId: r.threadId,
                    relationshipId: r.relationshipId,
                    requestedByUserId: r.requestedByUserId,
                    documentType: r.documentType,
                    instruction: r.instruction,
                    urgency: r.urgency,
                    status: r.status,
                    dueDate: r.dueDate,
                    completedAt: r.completedAt,
                    uploadedDocumentUrl: r.uploadedDocumentUrl,
                    createdAt: r.createdAt,
                })))
            }
        } catch { /* silent */ } finally { setIsLoadingDocs(false) }
    }, [initialCustomer.relationshipId])

    const fetchProposals = useCallback(async () => {
        setIsLoadingProposals(true)
        try {
            const res = await fetch(`/api/v1/collaboration/proposals?relationshipId=${initialCustomer.relationshipId}`)
            if (res.ok) {
                const data = await res.json()
                setProposals((data.proposals || []).map((p: any) => ({
                    id: p.id,
                    threadId: p.threadId,
                    relationshipId: p.relationshipId,
                    createdByUserId: p.createdByUserId,
                    proposalType: p.proposalType,
                    insurerName: p.insurerName,
                    lineOfBusiness: p.lineOfBusiness,
                    premiumAmount: Number(p.premiumAmount),
                    premiumCurrency: p.premiumCurrency,
                    coverageSummary: p.coverageSummary,
                    comparisonData: p.comparisonData,
                    plainLanguageSummary: p.plainLanguageSummary,
                    status: p.status,
                    clientResponseAt: p.clientResponseAt,
                    eSignatureUrl: p.eSignatureUrl,
                    createdAt: p.createdAt,
                })))
            }
        } catch { /* silent */ } finally { setIsLoadingProposals(false) }
    }, [initialCustomer.relationshipId])

    useEffect(() => {
        fetchDocumentRequests()
        fetchProposals()
    }, [fetchDocumentRequests, fetchProposals])

    const handleSendDocRequest = async (data: {
        documentType: DocumentTypeKey
        instruction: string
        urgency: DocumentUrgency
        dueDate?: string
    }) => {
        setIsSendingDocRequest(true)
        try {
            const res = await fetch("/api/v1/collaboration/document-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    relationshipId: initialCustomer.relationshipId,
                    documentType: data.documentType,
                    instruction: data.instruction || undefined,
                    urgency: data.urgency,
                    dueDate: data.dueDate || undefined,
                }),
            })
            if (res.ok) {
                setIsDocRequestFormOpen(false)
                fetchDocumentRequests()
            }
        } catch { /* silent */ } finally { setIsSendingDocRequest(false) }
    }

    const handleSendProposal = async (data: {
        proposalType: string
        insurerName: string
        lineOfBusiness: string
        premiumAmount: number
        coverageSummary: string
        comparisonData?: Record<string, unknown>
        plainLanguageSummary?: string
    }) => {
        setIsSendingProposal(true)
        try {
            const res = await fetch("/api/v1/collaboration/proposals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    relationshipId: initialCustomer.relationshipId,
                    ...data,
                }),
            })
            if (res.ok) {
                setIsProposalFormOpen(false)
                fetchProposals()
            }
        } catch { /* silent */ } finally { setIsSendingProposal(false) }
    }

    const customerFullName = `${initialCustomer.name} ${initialCustomer.surname}`

    return (
        <>
            {/* Floating Action Buttons */}
            <div className="fixed bottom-8 right-8 z-[60]">
                <div className="flex flex-col gap-4 items-end">
                    {/* Request Document Button */}
                    <button
                        type="button"
                        onClick={() => setIsDocRequestFormOpen(true)}
                        className="bg-primary text-white dark:text-[#1A2420] rounded-full p-4 shadow-lg shadow-primary/20 hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <FileText className="w-5 h-5" />
                        <span className="font-bold text-sm">
                            {PROFILE_COPY.requestDocument[language]}
                        </span>
                    </button>

                    {/* Create Proposal Button */}
                    <button
                        type="button"
                        onClick={() => setIsProposalFormOpen(true)}
                        className="bg-primary text-white dark:text-[#1A2420] rounded-full p-4 shadow-lg shadow-primary/20 hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <Send className="w-5 h-5" />
                        <span className="font-bold text-sm">
                            {PROFILE_COPY.createProposal[language]}
                        </span>
                    </button>

                    {/* Add Policy Button */}
                    <button
                        type="button"
                        onClick={() => setIsPolicyModalOpen(true)}
                        className="bg-primary text-white dark:text-[#1A2420] rounded-full p-4 shadow-lg shadow-primary/20 hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <span className="w-6 h-6 flex items-center justify-center border-2 border-white/30 rounded-full">
                            <Plus className="w-3 h-3" />
                        </span>
                        <span className="font-bold text-sm">
                            {PROFILE_COPY.addPolicy[language]}
                        </span>
                    </button>

                    {/* Create Task Button */}
                    <button
                        type="button"
                        onClick={() => setIsTaskModalOpen(true)}
                        className="bg-neutral-900 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform group flex items-center gap-3 pr-6"
                    >
                        <span className="w-6 h-6 flex items-center justify-center border-2 border-white/30 rounded-full">
                            <Plus className="w-3 h-3" />
                        </span>
                        <span className="font-bold text-sm">
                            {PROFILE_COPY.createTask[language]}
                        </span>
                    </button>

                    <QuestionnaireSender
                        relationshipId={initialCustomer.relationshipId}
                        customerName={customerFullName}
                    />
                </div>
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                userId={initialCustomer.id}
                customerName={customerFullName}
            />

            {/* Add Policy Modal — smart upload, customer already known */}
            <UploadPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                onSuccess={() => router.refresh()}
                presetCustomerId={initialCustomer.id}
                presetCustomerName={customerFullName}
            />

            {/* Document Request Modal */}
            {isDocRequestFormOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDocRequestFormOpen(false)} />
                    <div className="relative z-10 w-full max-w-lg mx-4 mb-4 sm:mb-0">
                        <DocumentRequestCreate
                            clientName={customerFullName}
                            onSend={handleSendDocRequest}
                            onCancel={() => setIsDocRequestFormOpen(false)}
                            isSending={isSendingDocRequest}
                        />
                    </div>
                </div>
            )}

            {/* Proposal Creation Modal */}
            {isProposalFormOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProposalFormOpen(false)} />
                    <div className="relative z-10 w-full max-w-lg mx-4 mb-4 sm:mb-0 max-h-[90vh] overflow-y-auto">
                        <ProposalCreate
                            clientName={customerFullName}
                            onSubmit={handleSendProposal}
                            onCancel={() => setIsProposalFormOpen(false)}
                            isSubmitting={isSendingProposal}
                        />
                    </div>
                </div>
            )}

            <ClientDetailView
                customer={initialCustomer}
                viewerRole="agent"
                agentTier={agentTier}
                healthScore={healthScore}
                policies={initialCustomer.policies || []}
                opportunities={initialCustomer.opportunities || []}
                interactions={initialCustomer.interactions || []}
                onBack={() => router.push("/customers")}
                onRenewPolicy={(policyId) => {
                    router.push(`/customers/${initialCustomer.id}/policy/${policyId}`)
                }}
                onUploadPolicy={() => setIsPolicyModalOpen(true)}
            />

            {/* Collaboration Section — below ClientDetailView */}
            <div className="max-w-[1200px] mx-auto px-6 pb-32">
                <div className="grid gap-6 lg:grid-cols-2 mt-6">
                    {/* Document Requests */}
                    <div className="pw-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary dark:text-mint" />
                                {PROFILE_COPY.documentRequests[language]}
                                {documentRequests.filter(r => r.status === "pending").length > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                                        {documentRequests.filter(r => r.status === "pending").length}
                                    </span>
                                )}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsDocRequestFormOpen(true)}
                                className="text-xs font-semibold text-primary dark:text-mint hover:underline"
                            >
                                + {PROFILE_COPY.newRequest[language]}
                            </button>
                        </div>
                        {isLoadingDocs ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                            </div>
                        ) : documentRequests.length === 0 ? (
                            <p className="text-sm text-neutral-500 text-center py-4">
                                {PROFILE_COPY.noDocumentRequests[language]}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {documentRequests.map(request => (
                                    <DocumentRequestCard
                                        key={request.id}
                                        request={request}
                                        viewerRole="agent"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Proposals */}
                    <div className="pw-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Send className="h-5 w-5 text-primary dark:text-mint" />
                                {PROFILE_COPY.proposals[language]}
                                {proposals.filter(p => p.status === "pending").length > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white dark:text-[#1A2420]">
                                        {proposals.filter(p => p.status === "pending").length}
                                    </span>
                                )}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsProposalFormOpen(true)}
                                className="text-xs font-semibold text-primary dark:text-mint hover:underline"
                            >
                                + {PROFILE_COPY.newProposal[language]}
                            </button>
                        </div>
                        {isLoadingProposals ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                            </div>
                        ) : proposals.length === 0 ? (
                            <p className="text-sm text-neutral-500 text-center py-4">
                                {PROFILE_COPY.noProposals[language]}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {proposals.map(proposal => (
                                    <ProposalView
                                        key={proposal.id}
                                        proposal={proposal}
                                        viewerRole="agent"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Inbox / Messages */}
                <div className="pw-card rounded-2xl p-5 mt-6">
                    <AgentInbox
                        relationshipId={initialCustomer.relationshipId}
                        onSelectThread={(threadId) => {
                            router.push(`/collaboration/threads/${threadId}`)
                        }}
                    />
                </div>
            </div>
        </>
    )
}
