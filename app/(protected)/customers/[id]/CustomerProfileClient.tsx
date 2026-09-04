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
import type { CandidateAiConsent } from "@/lib/services/customer-resolution.service"
import type { DocumentRequestData, ProposalData, DocumentTypeKey, DocumentUrgency } from "@/components/collaboration/types"

import { Modal } from "@/components/ui/Modal"
import { CardHead } from "@/components/dashboard/home/CardHead"

interface Props {
    initialCustomer: Customer
    agentTier: AgentTier
    canBrandedReport: boolean
    healthScore: number
    /**
     * Whether an AI analysis can run for this customer if the advisor uploads
     * now — derived by the page with deriveAiConsentState, the same verdict
     * the resolution path renders per candidate.
     */
    customerAiConsent: CandidateAiConsent
}

const PROFILE_COPY = {
    actionsMenu: { el: "Ενέργειες", en: "Actions" },
    requestDocument: { el: "Αίτημα εγγράφου", en: "Request Document" },
    createProposal: { el: "Δημιουργία πρότασης", en: "Create Proposal" },
    addPolicy: { el: "Προσθήκη ασφαλιστηρίου", en: "Add Policy" },
    createTask: { el: "Δημιουργία εργασίας", en: "Create Task" },
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
    removeCustomerDesc: { el: "Ο πελάτης αφαιρείται από το χαρτοφυλάκιό σας και η πρόσβαση στα ασφαλιστήριά του ανακαλείται. Δεν διαγράφονται δεδομένα.", en: "The customer is removed from your book and access to their policies is revoked. No data is deleted." },
    removeCustomerConfirm: { el: "Να αφαιρεθεί ο πελάτης από το χαρτοφυλάκιό σας;", en: "Remove this customer from your book?" },
    removeCustomerFailed: { el: "Η αφαίρεση απέτυχε. Δοκιμάστε ξανά.", en: "Removal failed. Please try again." },
    removing: { el: "Αφαίρεση...", en: "Removing..." },
} as const

export function CustomerProfileClient({ initialCustomer, agentTier, canBrandedReport, healthScore, customerAiConsent }: Props) {
    const router = useRouter()
    const { language, t } = useLanguage()
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isRemovingCustomer, setIsRemovingCustomer] = useState(false)
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

    // Was a native confirm() on a relationship-severing action; now the shared
    // branded dialog, which also gives the in-flight state this never had.
    const handleRemoveCustomer = async () => {
        setIsRemovingCustomer(true)
        try {
            const result = await terminateRelationshipAsAgent(initialCustomer.relationshipId)
            setRemoveConfirmOpen(false)
            if (result.success) {
                router.push("/customers")
            } else {
                toast.error(PROFILE_COPY.removeCustomerFailed[language])
            }
        } catch {
            // A transport failure (expired session, deploy skew) rejects rather
            // than returning. Without this the dialog sat on "Removing…"
            // forever, since the reset below never ran.
            setRemoveConfirmOpen(false)
            toast.error(PROFILE_COPY.removeCustomerFailed[language])
        } finally {
            setIsRemovingCustomer(false)
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
        // A rejected update used to do nothing at all — no refresh, no message.
        // The advisor clicked, the pipeline did not move, and nothing said why.
        // Transport failures (expired session, deploy skew) reject rather than
        // return, so both shapes have to be handled.
        try {
            const result = await updateOpportunityStatus(opportunityId, status, notes)
            if (result && "error" in result && result.error) {
                toast.error(String(result.error))
                return
            }
            router.refresh()
        } catch {
            toast.error(t.apiErrors.generic)
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

            {/* Add Policy Modal — smart upload, customer already known. The
                consent verdict travels with the preset so the confirm step
                shows the real next step (granted / attestable / blocked)
                rather than a checkbox that does nothing for a live account. */}
            <UploadPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                onSuccess={() => router.refresh()}
                presetCustomerId={initialCustomer.id}
                presetCustomerName={customerFullName}
                presetCustomerConsent={customerAiConsent}
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
            >
                {/* Collaboration — rendered inside the profile's own page
                    container, so the page has one column and one rhythm. */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Document Requests */}
                    <section className="pw-card pw-pad">
                        <CardHead
                            as="h3"
                            icon={FileText}
                            title={PROFILE_COPY.documentRequests[language]}
                            meta={
                                <span className="flex items-center gap-2">
                                    {documentRequests.filter(r => r.status === "pending").length > 0 && (
                                        <span className="rounded-full bg-status-warning-tint px-2 py-0.5 text-caption font-semibold tabular-nums text-status-warning">
                                            {documentRequests.filter(r => r.status === "pending").length}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsDocRequestFormOpen(true)}
                                        className="pw-soft-button"
                                    >
                                        + {PROFILE_COPY.newRequest[language]}
                                    </button>
                                </span>
                            }
                        />
                        {isLoadingDocs ? (
                            <div className="mt-4 space-y-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                            </div>
                        ) : documentRequests.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {PROFILE_COPY.noDocumentRequests[language]}
                            </p>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {documentRequests.map(request => (
                                    <DocumentRequestCard
                                        key={request.id}
                                        request={request}
                                        viewerRole="agent"
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Proposals */}
                    <section className="pw-card pw-pad">
                        <CardHead
                            as="h3"
                            icon={Send}
                            title={PROFILE_COPY.proposals[language]}
                            meta={
                                <span className="flex items-center gap-2">
                                    {proposals.filter(p => p.status === "pending").length > 0 && (
                                        <span className="rounded-full bg-status-info-tint px-2 py-0.5 text-caption font-semibold tabular-nums text-status-info">
                                            {proposals.filter(p => p.status === "pending").length}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsProposalFormOpen(true)}
                                        className="pw-soft-button"
                                    >
                                        + {PROFILE_COPY.newProposal[language]}
                                    </button>
                                </span>
                            }
                        />
                        {isLoadingProposals ? (
                            <div className="mt-4 space-y-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                            </div>
                        ) : proposals.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {PROFILE_COPY.noProposals[language]}
                            </p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {proposals.map(proposal => (
                                    <ProposalView
                                        key={proposal.id}
                                        proposal={proposal}
                                        viewerRole="agent"
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Inbox / Messages */}
                <section className="pw-card pw-pad">
                    <AgentInbox
                        relationshipId={initialCustomer.relationshipId}
                        onSelectThread={(threadId) => {
                            router.push(`/collaboration/threads/${threadId}`)
                        }}
                    />
                </section>

                {/* Relationship danger zone — a card like any other; the danger
                    lives in the copy and the action's colour, not in a dashed
                    red border around a box. */}
                <section className="pw-card pw-pad flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="text-sm font-semibold text-status-danger">{PROFILE_COPY.removeCustomer[language]}</h3>
                        <p className="mt-1 max-w-md text-caption text-muted-foreground">{PROFILE_COPY.removeCustomerDesc[language]}</p>
                    </div>
                    <button
                        type="button"
                        disabled={isRemovingCustomer}
                        onClick={() => setRemoveConfirmOpen(true)}
                        className="pw-soft-button shrink-0 text-status-danger disabled:opacity-50"
                    >
                        {isRemovingCustomer ? PROFILE_COPY.removing[language] : PROFILE_COPY.removeCustomer[language]}
                    </button>
                </section>
            </ClientDetailView>

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
