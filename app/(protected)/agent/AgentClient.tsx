"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/useResponsive"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Policy } from "@/components/wallet/types"
import { Mail, Phone, Globe, ShieldCheck, Building2, MessageSquare, FileText, Send, Inbox, Handshake } from "lucide-react"
import { EmptyState as SharedEmptyState } from "@/components/ui/EmptyState"
import { redeemInviteCode } from "@/app/onboarding/actions"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentRequestRespond, DocumentRequestCard } from "@/components/collaboration/DocumentRequestFlow"
import { ProposalView } from "@/components/collaboration/ProposalCard"
import { AgentInbox } from "@/components/collaboration/AgentInbox"
import type { DocumentRequestData, ProposalData } from "@/components/collaboration/types"

interface AgentBranding {
    agencyName?: string | null
    licenseNumber?: string | null
    logoUrl?: string | null
    brandColor: string
    website?: string | null
    verified: boolean
}

interface AgentClientProps {
    policies: Policy[]
    user: {
        id: string
        name: string
        email: string
        photoUrl?: string
    }
    agent?: {
        id: string
        name: string
        phone: string
        email: string
        company: string
        photoUrl?: string
        branding?: AgentBranding
    }
    relationshipId: string | null
}

type Tab = "overview" | "messages" | "documents" | "proposals"

const PAGE_COPY = {
    kicker: { el: "Ο Σύμβουλός μου", en: "My Agent" },
    tabOverview: { el: "Επισκόπηση", en: "Overview" },
    tabMessages: { el: "Μηνύματα", en: "Messages" },
    tabDocuments: { el: "Έγγραφα", en: "Documents" },
    tabProposals: { el: "Προτάσεις", en: "Proposals" },
    advisorFallback: { el: "Ασφαλιστικός σύμβουλος", en: "Insurance advisor" },
    call: { el: "Κλήση", en: "Call" },
    noDocumentRequests: { el: "Δεν υπάρχουν αιτήματα εγγράφων", en: "No document requests yet" },
    completedSection: { el: "Ολοκληρωμένα", en: "Completed" },
    noProposals: { el: "Δεν υπάρχουν προτάσεις ακόμα", en: "No proposals yet" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

const NO_AGENT_COPY = {
    headline: { el: "Συνδεθείτε με τον ασφαλιστικό σας σύμβουλο", en: "Connect with your insurance advisor" },
    benefit: {
        el: "Μοιραστείτε μόνο ό,τι επιλέγετε και αποκτήστε επαγγελματική ματιά στα κενά κάλυψής σας.",
        en: "Share only what you choose and get a professional eye on your coverage gaps.",
    },
    previewLabel: { el: "Παράδειγμα", en: "Example" },
    exampleName: { el: "Γιώργος Π. — Ασφαλιστικός Σύμβουλος", en: "George P. — Insurance Advisor" },
    exampleMeta: { el: "Πιστοποιημένος συνεργάτης", en: "Verified partner" },
    exampleBadge: { el: "Συνδεδεμένος", en: "Connected" },
    inputLabel: { el: "Κωδικός πρόσκλησης", en: "Invite code" },
    inputPlaceholder: { el: "π.χ. 8f3a-…", en: "e.g. 8f3a-…" },
    submit: { el: "Σύνδεση με σύμβουλο", en: "Connect with advisor" },
    submitting: { el: "Σύνδεση…", en: "Connecting…" },
    trust: {
        el: "Εσείς ελέγχετε την πρόσβαση — μπορείτε να την ανακαλέσετε ανά πάσα στιγμή",
        en: "You control the access — revoke it at any time",
    },
    errors: {
        invalid: { el: "Μη έγκυρος κωδικός. Ελέγξτε τον και δοκιμάστε ξανά.", en: "Invalid code. Check it and try again." },
        already_used: { el: "Ο κωδικός έχει ήδη χρησιμοποιηθεί.", en: "This code has already been used." },
        expired: { el: "Ο κωδικός έχει λήξει. Ζητήστε νέο από τον σύμβουλό σας.", en: "This code has expired. Ask your advisor for a new one." },
    },
} as const

function NoAgentEmptyState({ language }: { language: "el" | "en" }) {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const lang = language

    const submit = () => {
        if (!code.trim() || isPending) return
        setError(null)
        startTransition(async () => {
            const result = await redeemInviteCode(code.trim())
            if (result.success) {
                router.refresh()
            } else {
                const key = ("error" in result ? result.error : "invalid") as keyof typeof NO_AGENT_COPY.errors
                setError(NO_AGENT_COPY.errors[key]?.[lang] ?? NO_AGENT_COPY.errors.invalid[lang])
            }
        })
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <p className="pw-kicker mb-4">{PAGE_COPY.kicker[lang]}</p>
            <SharedEmptyState
                icon={Handshake}
                headline={NO_AGENT_COPY.headline[lang]}
                description={NO_AGENT_COPY.benefit[lang]}
                previewLabel={NO_AGENT_COPY.previewLabel[lang]}
                preview={
                    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-black">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white dark:text-[#1A2420]">
                            Γ
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white">
                                {NO_AGENT_COPY.exampleName[lang]}
                            </p>
                            <p className="inline-flex items-center gap-1 text-[11px] text-[#64748B] dark:text-white/55">
                                <ShieldCheck className="h-3 w-3 text-primary dark:text-mint" />
                                {NO_AGENT_COPY.exampleMeta[lang]}
                            </p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#166534] dark:bg-primary/15 dark:text-mint">
                            {NO_AGENT_COPY.exampleBadge[lang]}
                        </span>
                    </div>
                }
                trust={NO_AGENT_COPY.trust[lang]}
                secondary={
                    <div className="text-left">
                        <label htmlFor="agent-invite-code" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-white/55">
                            {NO_AGENT_COPY.inputLabel[lang]}
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="agent-invite-code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && submit()}
                                placeholder={NO_AGENT_COPY.inputPlaceholder[lang]}
                                className="min-w-0 flex-1 rounded-full border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-primary dark:border-white/15 dark:bg-black dark:text-white dark:focus:border-mint"
                            />
                            <button
                                type="button"
                                onClick={submit}
                                disabled={isPending || !code.trim()}
                                className="flex-shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#1A2420]"
                            >
                                {isPending ? NO_AGENT_COPY.submitting[lang] : NO_AGENT_COPY.submit[lang]}
                            </button>
                        </div>
                        {error && <p className="mt-2 text-xs text-[#B91C1C]">{error}</p>}
                    </div>
                }
            />
        </div>
    )
}

export function AgentClient({ policies, user, agent, relationshipId }: AgentClientProps) {
    const isMobile = useIsMobile()
    const { language } = useLanguage()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const [documentRequests, setDocumentRequests] = useState<DocumentRequestData[]>([])
    const [proposals, setProposals] = useState<ProposalData[]>([])
    const [isLoadingDocs, setIsLoadingDocs] = useState(false)
    const [isLoadingProposals, setIsLoadingProposals] = useState(false)
    const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null)

    const fetchDocumentRequests = useCallback(async () => {
        if (!relationshipId) return
        setIsLoadingDocs(true)
        try {
            const res = await fetch(`/api/v1/collaboration/document-requests?relationshipId=${relationshipId}`)
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
    }, [relationshipId])

    const fetchProposals = useCallback(async () => {
        if (!relationshipId) return
        setIsLoadingProposals(true)
        try {
            const res = await fetch(`/api/v1/collaboration/proposals?relationshipId=${relationshipId}`)
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
    }, [relationshipId])

    useEffect(() => {
        if (activeTab === "documents") fetchDocumentRequests()
        if (activeTab === "proposals") fetchProposals()
    }, [activeTab, fetchDocumentRequests, fetchProposals])

    const handleDocumentUpload = async (requestId: string, file: File): Promise<boolean> => {
        setUploadingRequestId(requestId)
        try {
            const formData = new FormData()
            formData.append("file", file)
            const uploadRes = await fetch("/api/v1/upload", { method: "POST", body: formData })
            if (!uploadRes.ok) return false

            const uploadData = await uploadRes.json()
            const fileUrl =
                uploadData?.data?.url ||
                uploadData?.data?.fileUrl ||
                uploadData?.url ||
                uploadData?.fileUrl

            if (!fileUrl) return false

            const patchRes = await fetch(`/api/v1/collaboration/document-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uploadedDocumentUrl: fileUrl }),
            })
            if (!patchRes.ok) return false

            fetchDocumentRequests()
            return true
        } catch {
            return false
        } finally {
            setUploadingRequestId(null)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        try {
            await fetch(`/api/v1/collaboration/proposals/${proposalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "accepted" }),
            })
            fetchProposals()
        } catch { /* silent */ }
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
        { id: "overview", label: pick(PAGE_COPY.tabOverview, language), icon: Building2 },
        { id: "messages", label: pick(PAGE_COPY.tabMessages, language), icon: MessageSquare },
        {
            id: "documents",
            label: pick(PAGE_COPY.tabDocuments, language),
            icon: FileText,
            count: documentRequests.filter(r => r.status === "pending").length || undefined,
        },
        {
            id: "proposals",
            label: pick(PAGE_COPY.tabProposals, language),
            icon: Send,
            count: proposals.filter(p => p.status === "pending").length || undefined,
        },
    ]

    if (!agent) {
        return <NoAgentEmptyState language={language === "el" ? "el" : "en"} />
    }

    return (
        <div className={`mx-auto ${isMobile ? 'px-4 py-6' : 'max-w-3xl px-4 py-10'}`}>
            <div className="pw-card rounded-3xl p-6 sm:p-8">
                <p className="pw-kicker mb-4">{pick(PAGE_COPY.kicker, language)}</p>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide -mx-2 px-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                                    isActive
                                        ? 'bg-primary/15 text-primary dark:text-mint'
                                        : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count && tab.count > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab content */}
                {activeTab === "overview" && (
                    <OverviewTab agent={agent} language={language} />
                )}

                {activeTab === "messages" && relationshipId && (
                    <AgentInbox
                        relationshipId={relationshipId}
                        onSelectThread={(threadId) => {
                            // For now, navigate could go to a thread detail — using alert as placeholder
                            router.push(`/collaboration/threads/${threadId}`)
                        }}
                    />
                )}

                {activeTab === "documents" && (
                    <DocumentsTab
                        documentRequests={documentRequests}
                        isLoading={isLoadingDocs}
                        agentName={agent.name}
                        onUpload={handleDocumentUpload}
                        uploadingRequestId={uploadingRequestId}
                        language={language}
                    />
                )}

                {activeTab === "proposals" && (
                    <ProposalsTab
                        proposals={proposals}
                        isLoading={isLoadingProposals}
                        onAccept={handleAcceptProposal}
                        licenseNumber={agent.branding?.licenseNumber}
                        language={language}
                    />
                )}
            </div>
        </div>
    )
}

function OverviewTab({ agent, language }: { agent: NonNullable<AgentClientProps['agent']>; language: string }) {
    return (
        <div className="space-y-6">
            {/* Agent branded card */}
            <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${agent.branding?.brandColor || "#29685B"}15, ${agent.branding?.brandColor || "#29685B"}05)`,
                    borderLeft: `4px solid ${agent.branding?.brandColor || "#29685B"}`,
                }}
            >
                <div className="flex items-start gap-4">
                    {agent.photoUrl ? (
                        <img src={agent.photoUrl} alt={agent.name} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                    ) : (
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg"
                            style={{ backgroundColor: agent.branding?.brandColor || "#29685B" }}
                        >
                            {agent.name.charAt(0)}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">{agent.name}</h1>
                            {agent.branding?.verified && <ShieldCheck className="w-5 h-5 text-primary dark:text-mint flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {agent.branding?.agencyName || agent.company || pick(PAGE_COPY.advisorFallback, language)}
                            </p>
                        </div>
                        {agent.branding?.licenseNumber && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                License: {agent.branding.licenseNumber}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="grid gap-3 sm:grid-cols-3">
                <a
                    href={`tel:${agent.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 shadow-lg min-h-[44px]"
                    style={{ backgroundColor: agent.branding?.brandColor || "#29685B" }}
                >
                    <Phone className="h-4 w-4" /> {pick(PAGE_COPY.call, language)}
                </a>
                <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white transition hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
                >
                    <Mail className="h-4 w-4" /> Email
                </a>
                {agent.branding?.website && (
                    <a
                        href={agent.branding.website.startsWith("http") ? agent.branding.website : `https://${agent.branding.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white transition hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
                    >
                        <Globe className="h-4 w-4" /> Website
                    </a>
                )}
            </div>
        </div>
    )
}

function DocumentsTab({
    documentRequests,
    isLoading,
    agentName,
    onUpload,
    uploadingRequestId,
    language,
}: {
    documentRequests: DocumentRequestData[]
    isLoading: boolean
    agentName: string
    onUpload: (requestId: string, file: File) => Promise<boolean>
    uploadingRequestId: string | null
    language: string
}) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
        )
    }

    if (documentRequests.length === 0) {
        return (
            <div className="flex flex-col items-center text-center py-10">
                <FileText className="w-10 h-10 mb-3 text-black/20 dark:text-white/20" />
                <p className="text-sm text-black/60 dark:text-white/60">
                    {pick(PAGE_COPY.noDocumentRequests, language)}
                </p>
            </div>
        )
    }

    const pending = documentRequests.filter(r => r.status === "pending")
    const completed = documentRequests.filter(r => r.status !== "pending")

    return (
        <div className="space-y-4">
            {pending.map(request => (
                <DocumentRequestRespond
                    key={request.id}
                    request={request}
                    agentName={agentName}
                    onUpload={onUpload}
                    isUploading={uploadingRequestId === request.id}
                />
            ))}
            {completed.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-2">
                        {pick(PAGE_COPY.completedSection, language)}
                    </p>
                    {completed.map(request => (
                        <DocumentRequestCard
                            key={request.id}
                            request={request}
                            viewerRole="policyholder"
                            agentName={agentName}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function ProposalsTab({
    proposals,
    isLoading,
    onAccept,
    licenseNumber,
    language,
}: {
    proposals: ProposalData[]
    isLoading: boolean
    onAccept: (proposalId: string) => void
    licenseNumber?: string | null
    language: string
}) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
        )
    }

    if (proposals.length === 0) {
        return (
            <div className="flex flex-col items-center text-center py-10">
                <Send className="w-10 h-10 mb-3 text-black/20 dark:text-white/20" />
                <p className="text-sm text-black/60 dark:text-white/60">
                    {pick(PAGE_COPY.noProposals, language)}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {proposals.map(proposal => (
                <ProposalView
                    key={proposal.id}
                    proposal={proposal}
                    viewerRole="policyholder"
                    licenseNumber={licenseNumber}
                    onAccept={onAccept}
                />
            ))}
        </div>
    )
}
