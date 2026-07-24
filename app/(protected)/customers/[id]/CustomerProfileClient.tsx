"use client"

import { useState, useEffect, useCallback } from "react"
import { QuestionnaireSender } from "@/components/agent"
import { Customer, OpportunityStatus } from "@/components/agent/types"
import { updateOpportunityStatus, createAgentInvite } from "../../agent/actions"
import { terminateRelationshipAsAgent } from "../../agent/relationship-actions"
import { useRouter } from "next/navigation"
import { CreateTaskModal } from "@/components/agent/CreateTaskModal"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import { ClientDetailView } from "@/components/agent/ClientDetailView"
import { DocumentRequestCreate, DocumentRequestCard } from "@/components/collaboration/DocumentRequestFlow"
import { ProposalCreate, ProposalView } from "@/components/collaboration/ProposalCard"
import { AgentInbox } from "@/components/collaboration/AgentInbox"
import { Skeleton } from "@/components/ui/skeleton"
import { FloatingActionButton, type FABAction } from "@/components/ui/FloatingActionButton"
import { useLanguage } from "@/contexts/LanguageContext"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { FileText, Send, Plus, ClipboardList, Sparkles } from "lucide-react"
import type { AgentTier } from "@/types/subscription-entitlements"
import type { DocumentRequestData, ProposalData, DocumentTypeKey, DocumentUrgency } from "@/components/collaboration/types"

import { Modal } from "@/components/ui/Modal"

interface Props {
    initialCustomer: Customer
    agentTier: AgentTier
    canBrandedReport: boolean
    healthScore: number
}

const PROFILE_COPY = {
    actionsMenu: { el: "Ενέργειες", en: "Actions" },
    requestDocument: { el: "Αίτημα εγγράφου", en: "Request Document" },
    createProposal: { el: "Δημιουργία πρότασης", en: "Create Proposal" },
    addPolicy: { el: "Προσθήκη ασφαλιστηρίου", en: "Add Policy" },
    createTask: { el: "Δημιουργία Task", en: "Create Task" },
    questionnaire: { el: "Ερωτηματολόγιο", en: "Questionnaire" },
    documentRequests: { el: "Αιτήματα εγγράφων", en: "Document Requests" },
    newRequest: { el: "Νέο", en: "New" },
    noDocumentRequests: { el: "Δεν υπάρχουν αιτήματα", en: "No document requests" },
    proposals: { el: "Προτάσεις", en: "Proposals" },
    newProposal: { el: "Νέα", en: "New" },
    noProposals: { el: "Δεν υπάρχουν προτάσεις", en: "No proposals" },
    proposalSent: { el: "Η πρόταση στάλθηκε", en: "Proposal sent" },
    docRequestSent: { el: "Το αίτημα εγγράφου στάλθηκε", en: "Document request sent" },
    sendFailed: { el: "Η αποστολή απέτυχε. Δοκιμάστε ξανά.", en: "Send failed. Please try again." },
    proposalUpgrade: { el: "Οι προτάσεις απαιτούν το πρόγραμμα Starter ή ανώτερο.", en: "Proposals require the Starter plan or higher." },
    docRequestUpgrade: { el: "Τα αιτήματα εγγράφων απαιτούν το πρόγραμμα Starter ή ανώτερο.", en: "Document requests require the Starter plan or higher." },
    removeCustomer: { el: "Αφαίρεση πελάτη", en: "Remove Customer" },
    removeCustomerDesc: { el: "Ο πελάτης αφαιρείται από το χαρτοφυλάκιό σας και η πρόσβαση στα συμβόλαιά του ανακαλείται. Δεν διαγράφονται δεδομένα.", en: "The customer is removed from your book and access to their policies is revoked. No data is deleted." },
    removeCustomerConfirm: { el: "Να αφαιρεθεί ο πελάτης από το χαρτοφυλάκιό σας;", en: "Remove this customer from your book?" },
    removeCustomerFailed: { el: "Η αφαίρεση απέτυχε. Δοκιμάστε ξανά.", en: "Removal failed. Please try again." },
    removing: { el: "Αφαίρεση...", en: "Removing..." },
} as const

export function CustomerProfileClient({ initialCustomer, agentTier, canBrandedReport, healthScore }: Props) {
    const router = useRouter()
    const { language } = useLanguage()
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isRemovingCustomer, setIsRemovingCustomer] = useState(false)
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

    // Was a native confirm() on a relationship-severing action; now the shared
    // branded dialog, which also gives the in-flight state this never had.
    const handleRemoveCustomer = async () => {
        setIsRemovingCustomer(true)
        const result = await terminateRelationshipAsAgent(initialCustomer.relationshipId)
        setIsRemovingCustomer(false)
        setRemoveConfirmOpen(false)
        if (result.success) {
            router.push("/customers")
        } else {
            toast.error(PROFILE_COPY.removeCustomerFailed[language])
        }
    }
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
    const [isDocRequestFormOpen, setIsDocRequestFormOpen] = useState(false)
    const [isProposalFormOpen, setIsProposalFormOpen] = useState(false)
    const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
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
                toast.success(PROFILE_COPY.docRequestSent[language])
                setIsDocRequestFormOpen(false)
                fetchDocumentRequests()
            } else {
                // Surface the failure instead of silently leaving the popup open.
                const json = await res.json().catch(() => null)
                const message = res.status === 403
                    ? PROFILE_COPY.docRequestUpgrade[language]
                    : (json?.error || PROFILE_COPY.sendFailed[language])
                toast.error(message)
            }
        } catch {
            toast.error(PROFILE_COPY.sendFailed[language])
        } finally { setIsSendingDocRequest(false) }
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
                toast.success(PROFILE_COPY.proposalSent[language])
                setIsProposalFormOpen(false)
                fetchProposals()
            } else {
                const json = await res.json().catch(() => null)
                const message = res.status === 403
                    ? PROFILE_COPY.proposalUpgrade[language]
                    : (json?.error || PROFILE_COPY.sendFailed[language])
                toast.error(message)
            }
        } catch {
            toast.error(PROFILE_COPY.sendFailed[language])
        } finally { setIsSendingProposal(false) }
    }

    const customerFullName = `${initialCustomer.name} ${initialCustomer.surname}`

    const fabActions: FABAction[] = [
        { id: "doc-request", label: PROFILE_COPY.requestDocument[language], icon: <FileText className="w-5 h-5" />, onClick: () => setIsDocRequestFormOpen(true) },
        { id: "proposal", label: PROFILE_COPY.createProposal[language], icon: <Send className="w-5 h-5" />, onClick: () => setIsProposalFormOpen(true) },
        { id: "questionnaire", label: PROFILE_COPY.questionnaire[language], icon: <ClipboardList className="w-5 h-5" />, onClick: () => setIsQuestionnaireOpen(true) },
        { id: "add-policy", label: PROFILE_COPY.addPolicy[language], icon: <Plus className="w-5 h-5" />, onClick: () => setIsPolicyModalOpen(true) },
        { id: "create-task", label: PROFILE_COPY.createTask[language], icon: <Plus className="w-5 h-5" />, onClick: () => setIsTaskModalOpen(true) },
    ]

    return (
        <>
            {/* Collapsible action speed-dial — one FAB that expands to the actions
                and collapses on backdrop/toggle, so it no longer permanently covers
                the corner. */}
            <FloatingActionButton
                mainLabel={PROFILE_COPY.actionsMenu[language]}
                mainIcon={<Sparkles className="w-6 h-6" strokeWidth={2.5} />}
                position="bottom-right"
                actions={fabActions}
            />

            {/* Questionnaire sender — opened from the FAB (controlled, trigger hidden) */}
            <QuestionnaireSender
                relationshipId={initialCustomer.relationshipId}
                customerName={customerFullName}
                open={isQuestionnaireOpen}
                onOpenChange={setIsQuestionnaireOpen}
                hideTrigger
            />

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
            {/* Both of these were hand-rolled `fixed inset-0` overlays with no
                focus trap, no Escape, and no scroll-lock — inaccessible dialogs
                on the agent's busiest screen. They now use the shared Modal
                (useDialog under the hood). The forms render their own BrandCard,
                so the Modal's chrome is turned off (showCloseButton, transparent
                panel) to avoid a card-in-a-card. */}
            <Modal
                isOpen={isDocRequestFormOpen}
                onClose={() => setIsDocRequestFormOpen(false)}
                showCloseButton={false}
                ariaLabel={PROFILE_COPY.newRequest[language]}
                className="!bg-transparent !shadow-none !rounded-none"
            >
                <DocumentRequestCreate
                    clientName={customerFullName}
                    onSend={handleSendDocRequest}
                    onCancel={() => setIsDocRequestFormOpen(false)}
                    isSending={isSendingDocRequest}
                />
            </Modal>

            <Modal
                isOpen={isProposalFormOpen}
                onClose={() => setIsProposalFormOpen(false)}
                showCloseButton={false}
                ariaLabel={PROFILE_COPY.newProposal[language]}
                className="!bg-transparent !shadow-none !rounded-none"
            >
                <ProposalCreate
                    clientName={customerFullName}
                    onSubmit={handleSendProposal}
                    onCancel={() => setIsProposalFormOpen(false)}
                    isSubmitting={isSendingProposal}
                />
            </Modal>

            <ClientDetailView
                customer={initialCustomer}
                viewerRole="agent"
                agentTier={agentTier}
                canBrandedReport={canBrandedReport}
                healthScore={healthScore}
                policies={initialCustomer.policies || []}
                opportunities={initialCustomer.opportunities || []}
                interactions={initialCustomer.interactions || []}
                onBack={() => router.push("/customers")}
                onUploadPolicy={() => setIsPolicyModalOpen(true)}
            />

            {/* Collaboration Section — below ClientDetailView */}
            <div className="max-w-page mx-auto px-6 pb-32">
                <div className="grid gap-6 lg:grid-cols-2 mt-6">
                    {/* Document Requests */}
                    <div className="pw-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary dark:text-mint" />
                                {PROFILE_COPY.documentRequests[language]}
                                {documentRequests.filter(r => r.status === "pending").length > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-kicker font-bold text-white">
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
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-kicker font-bold text-white dark:text-[#1A2420]">
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

                {/* Relationship danger zone */}
                <div className="mt-6 rounded-2xl border border-dashed border-red-500/25 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{PROFILE_COPY.removeCustomer[language]}</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">{PROFILE_COPY.removeCustomerDesc[language]}</p>
                    </div>
                    <button
                        type="button"
                        disabled={isRemovingCustomer}
                        onClick={() => setRemoveConfirmOpen(true)}
                        className="shrink-0 rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 disabled:opacity-50"
                    >
                        {isRemovingCustomer ? PROFILE_COPY.removing[language] : PROFILE_COPY.removeCustomer[language]}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={removeConfirmOpen}
                onOpenChange={setRemoveConfirmOpen}
                destructive
                title={PROFILE_COPY.removeCustomer[language]}
                description={PROFILE_COPY.removeCustomerConfirm[language]}
                confirmLabel={PROFILE_COPY.removeCustomer[language]}
                onConfirm={handleRemoveCustomer}
            />
        </>
    )
}
