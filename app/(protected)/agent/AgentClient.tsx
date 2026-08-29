"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import type { Policy } from "@/components/wallet/types"
import { Mail, Phone, Globe, ShieldCheck, ShieldOff, Building2, MessageSquare, FileText, Send, Inbox, Handshake } from "lucide-react"
import { EmptyState as SharedEmptyState } from "@/components/ui/EmptyState"
import { redeemInviteCode } from "@/app/onboarding/actions"
import { revokeShare } from "@/app/(protected)/wallet/actions"
import { disconnectFromAgent, inviteAdvisorByEmail } from "@/app/(protected)/agent/relationship-actions"
import { toast } from "sonner"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentRequestRespond, DocumentRequestCard } from "@/components/collaboration/DocumentRequestFlow"
import { ProposalView, type ProposalDeclineData } from "@/components/collaboration/ProposalCard"
import { AgentInbox } from "@/components/collaboration/AgentInbox"
import type { DocumentRequestData, ProposalData } from "@/components/collaboration/types"

import { useTabs } from "@/hooks/useTabs"
import { displayInsurerName, displayPolicyNumber } from '@/lib/wallet/policy-identity'
interface AgentBranding {
    agencyName?: string | null
    licenseNumber?: string | null
    logoUrl?: string | null
    brandColor: string
    website?: string | null
    verified: boolean
}

export interface SharedPolicyLedgerItem {
    grantId: string
    policyId: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    addedByAdvisor: boolean
    grantedAt: string
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
    sharedPolicies?: SharedPolicyLedgerItem[]
}

type Tab = "overview" | "messages" | "documents" | "proposals"

const PAGE_COPY = {
    tablistLabel: { el: "Ενότητες", en: "Sections" },
    kicker: { el: "Ο σύμβουλός μου", en: "My Agent" },
    disconnect: { el: "Αποσύνδεση από τον σύμβουλο", en: "Disconnect from advisor" },
    disconnectDesc: { el: "Η σύνδεση τερματίζεται και η πρόσβαση του συμβούλου στα ασφαλιστήριά σας ανακαλείται.", en: "The connection ends and your advisor's access to your policies is revoked." },
    disconnectConfirm: { el: "Να αποσυνδεθείτε από τον σύμβουλό σας; Η πρόσβασή του στα ασφαλιστήριά σας θα ανακληθεί.", en: "Disconnect from your advisor? Their access to your policies will be revoked." },
    disconnectFailed: { el: "Η αποσύνδεση απέτυχε. Δοκιμάστε ξανά.", en: "Disconnect failed. Please try again." },
    disconnecting: { el: "Αποσύνδεση...", en: "Disconnecting..." },
    tabOverview: { el: "Επισκόπηση", en: "Overview" },
    tabMessages: { el: "Μηνύματα", en: "Messages" },
    tabDocuments: { el: "Έγγραφα", en: "Documents" },
    tabProposals: { el: "Προτάσεις", en: "Proposals" },
    advisorFallback: { el: "Ασφαλιστικός σύμβουλος", en: "Insurance advisor" },
    call: { el: "Κλήση", en: "Call" },
    noDocumentRequests: { el: "Δεν υπάρχουν αιτήματα εγγράφων", en: "No document requests yet" },
    completedSection: { el: "Ολοκληρωμένα", en: "Completed" },
    noProposals: { el: "Δεν υπάρχουν προτάσεις ακόμα", en: "No proposals yet" },
    sharedAccessTitle: { el: "Κοινή πρόσβαση", en: "Shared access" },
    sharedAccessSubtitle: {
        el: "Ελέγχετε τι βλέπει ο σύμβουλός σας. Ανακαλέστε ανά πάσα στιγμή.",
        en: "You control what your advisor can see. Revoke any time.",
    },
    noShares: {
        el: "Δεν έχετε μοιραστεί κανένα ασφαλιστήριο με τον σύμβουλό σας.",
        en: "You haven't shared any policies with your advisor yet.",
    },
    addedByAdvisor: { el: "Προστέθηκε από τον σύμβουλο", en: "Added by your advisor" },
    sharedByYou: { el: "Κοινοποιήθηκε από εσάς", en: "Shared by you" },
    revoke: { el: "Ανάκληση", en: "Revoke" },
    revoking: { el: "Ανάκληση…", en: "Revoking…" },
    proposalAccepted: { el: "Η πρόταση έγινε αποδεκτή", en: "Proposal accepted" },
    proposalDeclined: { el: "Η απάντησή σας στάλθηκε", en: "Your response was sent" },
    documentUploaded: { el: "Το έγγραφο ανέβηκε", en: "Document uploaded" },
    responseFailed: { el: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.", en: "Something went wrong. Please try again." },
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
    exampleName: { el: "Γιώργος Π. — Ασφαλιστικός σύμβουλος", en: "George P. — Insurance Advisor" },
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
        wrong_account: { el: "Η πρόσκληση στάλθηκε σε διαφορετική διεύθυνση email.", en: "This invite was sent to a different email address." },
    },
    // Primary action — invite the advisor by email.
    emailLabel: { el: "Το email του συμβούλου σας", en: "Your advisor's email" },
    emailPlaceholder: { el: "advisor@example.com", en: "advisor@example.com" },
    sendInvite: { el: "Αποστολή πρόσκλησης", en: "Send invitation" },
    sending: { el: "Αποστολή…", en: "Sending…" },
    sentTitle: { el: "Η πρόσκληση στάλθηκε", en: "Invitation sent" },
    sentBody: {
        el: "Στείλαμε πρόσκληση με email στον σύμβουλό σας. Θα συνδεθείτε μόλις την αποδεχτεί.",
        en: "We emailed your advisor an invitation. You'll be connected once they accept.",
    },
    linkFallback: {
        el: "Δεν στάλθηκε το email. Αντιγράψτε τον σύνδεσμο και στείλτε τον στον σύμβουλό σας:",
        en: "Couldn't send the email. Copy this link and send it to your advisor:",
    },
    copyLink: { el: "Αντιγραφή συνδέσμου", en: "Copy link" },
    linkCopied: { el: "Ο σύνδεσμος αντιγράφηκε", en: "Link copied" },
    haveCode: { el: "Έχετε κωδικό πρόσκλησης;", en: "Have an invite code instead?" },
    emailErrors: {
        invalid_email: { el: "Μη έγκυρο email.", en: "Invalid email address." },
        self: { el: "Δεν μπορείτε να προσκαλέσετε τον εαυτό σας.", en: "You can't invite yourself." },
        rate_limited: { el: "Πολλές προσκλήσεις. Δοκιμάστε ξανά αργότερα.", en: "Too many invites. Try again later." },
        unauthorized: { el: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.", en: "Something went wrong. Please try again." },
    },
} as const

function NoAgentEmptyState({ language }: { language: "el" | "en" }) {
    const router = useRouter()
    const lang = language

    // Primary — invite the advisor by email.
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState<string | null>(null)
    const [sent, setSent] = useState<{ link?: string } | null>(null)
    const [sending, startSending] = useTransition()

    // Secondary — redeem an invite code (revealed on demand).
    const [showCode, setShowCode] = useState(false)
    const [code, setCode] = useState("")
    const [codeError, setCodeError] = useState<string | null>(null)
    const [redeeming, startRedeeming] = useTransition()

    const sendInvite = () => {
        if (!email.trim() || sending) return
        setEmailError(null)
        startSending(async () => {
            const result = await inviteAdvisorByEmail(email.trim())
            if (result.success) {
                // Already connected → the parent will show the advisor card.
                if (result.alreadyConnected) {
                    router.refresh()
                    return
                }
                setSent({ link: result.inviteLink })
            } else {
                setEmailError(NO_AGENT_COPY.emailErrors[result.error]?.[lang] ?? NO_AGENT_COPY.emailErrors.unauthorized[lang])
            }
        })
    }

    const redeem = () => {
        if (!code.trim() || redeeming) return
        setCodeError(null)
        startRedeeming(async () => {
            const result = await redeemInviteCode(code.trim())
            if (result.success) {
                router.refresh()
            } else {
                const key = ("error" in result ? result.error : "invalid") as keyof typeof NO_AGENT_COPY.errors
                setCodeError(NO_AGENT_COPY.errors[key]?.[lang] ?? NO_AGENT_COPY.errors.invalid[lang])
            }
        })
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <p className="pw-kicker mb-4">{PAGE_COPY.kicker[lang]}</p>
            <SharedEmptyState
                icon={Handshake}
                // This empty state IS the page for anyone without a linked
                // advisor — the default for every new policyholder — so its
                // headline has to be the route's h1.
                headingLevel="h1"
                headline={NO_AGENT_COPY.headline[lang]}
                description={NO_AGENT_COPY.benefit[lang]}
                previewLabel={NO_AGENT_COPY.previewLabel[lang]}
                preview={
                    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-black">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            Γ
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-body-sm font-semibold text-[#0F172A] dark:text-white">
                                {NO_AGENT_COPY.exampleName[lang]}
                            </p>
                            <p className="inline-flex items-center gap-1 text-micro text-[#5B6A7A] dark:text-white/55">
                                <ShieldCheck className="h-3 w-3 text-primary dark:text-mint" />
                                {NO_AGENT_COPY.exampleMeta[lang]}
                            </p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-kicker font-bold uppercase tracking-widest text-status-success dark:bg-primary/15">
                            {NO_AGENT_COPY.exampleBadge[lang]}
                        </span>
                    </div>
                }
                trust={NO_AGENT_COPY.trust[lang]}
                secondary={
                    <div className="text-left">
                        {sent ? (
                            <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 dark:border-mint/20 dark:bg-mint/10">
                                <p className="text-sm font-semibold text-foreground">{NO_AGENT_COPY.sentTitle[lang]}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{NO_AGENT_COPY.sentBody[lang]}</p>
                                {sent.link && (
                                    <div className="mt-3">
                                        <p className="text-xs text-muted-foreground">{NO_AGENT_COPY.linkFallback[lang]}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard?.writeText(sent.link!)
                                                toast.success(NO_AGENT_COPY.linkCopied[lang])
                                            }}
                                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            {NO_AGENT_COPY.copyLink[lang]}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <label htmlFor="advisor-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {NO_AGENT_COPY.emailLabel[lang]}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="advisor-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                                        placeholder={NO_AGENT_COPY.emailPlaceholder[lang]}
                                        className="pw-input pw-input-sm min-w-0 flex-1 dark:focus:border-mint"
                                    />
                                    <button
                                        type="button"
                                        onClick={sendInvite}
                                        disabled={sending || !email.trim()}
                                        className="pw-primary-button flex-shrink-0"
                                    >
                                        {sending ? NO_AGENT_COPY.sending[lang] : NO_AGENT_COPY.sendInvite[lang]}
                                    </button>
                                </div>
                                {emailError && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{emailError}</p>}

                                <button
                                    type="button"
                                    onClick={() => setShowCode((v) => !v)}
                                    className="mt-4 rounded text-xs font-semibold text-primary underline-offset-2 hover:underline dark:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    {NO_AGENT_COPY.haveCode[lang]}
                                </button>

                                {showCode && (
                                    <div className="mt-3">
                                        <label htmlFor="agent-invite-code" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {NO_AGENT_COPY.inputLabel[lang]}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                id="agent-invite-code"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && redeem()}
                                                placeholder={NO_AGENT_COPY.inputPlaceholder[lang]}
                                                className="pw-input pw-input-sm min-w-0 flex-1 dark:focus:border-mint"
                                            />
                                            <button
                                                type="button"
                                                onClick={redeem}
                                                disabled={redeeming || !code.trim()}
                                                className="flex-shrink-0 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                            >
                                                {redeeming ? NO_AGENT_COPY.submitting[lang] : NO_AGENT_COPY.submit[lang]}
                                            </button>
                                        </div>
                                        {codeError && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{codeError}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                }
            />
        </div>
    )
}

export function AgentClient({ policies, user, agent, relationshipId, sharedPolicies = [] }: AgentClientProps) {
    const { language } = useLanguage()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<Tab>("overview")
    const TAB_IDS: Tab[] = ["overview", "messages", "documents", "proposals"]
    const { tabProps, panelProps } = useTabs(TAB_IDS, activeTab, setActiveTab)
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
        // Fetch both up front so the Documents/Proposals tab badges reflect what's
        // pending from the start — not only after the customer opens each tab.
        fetchDocumentRequests()
        fetchProposals()
    }, [fetchDocumentRequests, fetchProposals])

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
            if (!patchRes.ok) {
                toast.error(pick(PAGE_COPY.responseFailed, language))
                return false
            }

            toast.success(pick(PAGE_COPY.documentUploaded, language))
            fetchDocumentRequests()
            return true
        } catch {
            toast.error(pick(PAGE_COPY.responseFailed, language))
            return false
        } finally {
            setUploadingRequestId(null)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        try {
            const res = await fetch(`/api/v1/collaboration/proposals/${proposalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "accepted" }),
            })
            if (res.ok) {
                toast.success(pick(PAGE_COPY.proposalAccepted, language))
                fetchProposals()
            } else {
                toast.error(pick(PAGE_COPY.responseFailed, language))
            }
        } catch {
            toast.error(pick(PAGE_COPY.responseFailed, language))
        }
    }

    const handleDeclineProposal = async (proposalId: string, data: ProposalDeclineData) => {
        try {
            const res = await fetch(`/api/v1/collaboration/proposals/${proposalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "declined", ...data }),
            })
            if (res.ok) {
                toast.success(pick(PAGE_COPY.proposalDeclined, language))
                fetchProposals()
            } else {
                toast.error(pick(PAGE_COPY.responseFailed, language))
            }
        } catch {
            toast.error(pick(PAGE_COPY.responseFailed, language))
        }
    }

    const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false)

    // Was a native confirm(); now the shared branded dialog.
    const handleDisconnect = async () => {
        if (!relationshipId) return
        setIsDisconnecting(true)
        const result = await disconnectFromAgent(relationshipId)
        setIsDisconnecting(false)
        setDisconnectConfirmOpen(false)
        if (result.success) {
            router.refresh()
        } else {
            toast.error(pick(PAGE_COPY.disconnectFailed, language))
        }
    }
    const handleRevokeShare = async (grantId: string) => {
        setRevokingGrantId(grantId)
        try {
            await revokeShare(grantId)
            router.refresh()
        } catch {
            /* silent — the ledger reloads on refresh */
        } finally {
            setRevokingGrantId(null)
        }
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
        <div className="mx-auto w-full px-4 py-6 lg:max-w-3xl lg:py-10">
            <div className="pw-card rounded-3xl p-6 sm:p-8">
                <p className="pw-kicker mb-4">{pick(PAGE_COPY.kicker, language)}</p>

                {/* Tabs — real tablist semantics via useTabs (role tab/tabpanel,
                    roving tabindex, arrow keys). */}
                <div
                    role="tablist"
                    aria-label={pick(PAGE_COPY.tablistLabel, language)}
                    className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide -mx-2 px-2"
                >
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                type="button"
                                key={tab.id}
                                {...tabProps(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                    isActive
                                        ? 'bg-primary/15 text-primary dark:text-mint'
                                        : 'text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                {tab.label}
                                {/* amber-700, not amber-500: white on amber-500 is 2.14:1,
                                    which fails even the 3:1 large-text floor — and this is a
                                    `text-kicker` count, the smallest text on the page.
                                    amber-700 is 5.03:1. */}
                                {tab.count && tab.count > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-700 px-1 text-kicker font-bold text-white">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab content — one panel bound to the active tab. */}
                <div {...panelProps}>
                {activeTab === "overview" && (
                    <>
                        <OverviewTab
                            agent={agent}
                            language={language}
                            sharedPolicies={sharedPolicies}
                            onRevoke={handleRevokeShare}
                            revokingGrantId={revokingGrantId}
                        />
                        {relationshipId && (
                            <div className="mt-6 rounded-2xl border border-dashed border-red-500/25 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{pick(PAGE_COPY.disconnect, language)}</h3>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-md">{pick(PAGE_COPY.disconnectDesc, language)}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={isDisconnecting}
                                    onClick={() => setDisconnectConfirmOpen(true)}
                                    className="shrink-0 rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 disabled:opacity-50"
                                >
                                    {isDisconnecting ? pick(PAGE_COPY.disconnecting, language) : pick(PAGE_COPY.disconnect, language)}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {activeTab === "messages" && relationshipId && (
                    <AgentInbox
                        relationshipId={relationshipId}
                        onSelectThread={(threadId) => {
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
                        onDecline={handleDeclineProposal}
                        licenseNumber={agent.branding?.licenseNumber}
                        language={language}
                    />
                )}
                </div>
            </div>

            <ConfirmDialog
                open={disconnectConfirmOpen}
                onOpenChange={setDisconnectConfirmOpen}
                destructive
                title={pick(PAGE_COPY.disconnect, language)}
                description={pick(PAGE_COPY.disconnectConfirm, language)}
                confirmLabel={pick(PAGE_COPY.disconnect, language)}
                onConfirm={handleDisconnect}
            />
        </div>
    )
}

function OverviewTab({
    agent,
    language,
    sharedPolicies,
    onRevoke,
    revokingGrantId,
}: {
    agent: NonNullable<AgentClientProps['agent']>
    language: string
    sharedPolicies: SharedPolicyLedgerItem[]
    onRevoke: (grantId: string) => void
    revokingGrantId: string | null
}) {
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
                            <h1 className="text-2xl font-black text-foreground truncate">{agent.name}</h1>
                            {agent.branding?.verified && <ShieldCheck className="w-5 h-5 text-primary dark:text-mint flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                            <p className="text-sm font-medium text-muted-foreground">
                                {agent.branding?.agencyName || agent.company || pick(PAGE_COPY.advisorFallback, language)}
                            </p>
                        </div>
                        {agent.branding?.licenseNumber && (
                            <p className="text-kicker font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm font-bold text-neutral-800 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-neutral-800 min-h-[44px]"
                >
                    <Mail className="h-4 w-4" /> Email
                </a>
                {agent.branding?.website && (
                    <a
                        href={agent.branding.website.startsWith("http") ? agent.branding.website : `https://${agent.branding.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm font-bold text-neutral-800 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-neutral-800 min-h-[44px]"
                    >
                        <Globe className="h-4 w-4" /> Website
                    </a>
                )}
            </div>

            {/* Shared-access ledger — real, revocable control over what the
                advisor can see (backs the "revoke at any time" promise). */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-primary dark:text-mint" />
                    <h2 className="text-sm font-bold text-foreground">{pick(PAGE_COPY.sharedAccessTitle, language)}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{pick(PAGE_COPY.sharedAccessSubtitle, language)}</p>

                {sharedPolicies.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{pick(PAGE_COPY.noShares, language)}</p>
                ) : (
                    <ul className="space-y-2">
                        {sharedPolicies.map((sp) => (
                            <li
                                key={sp.grantId}
                                className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {[displayInsurerName(sp.insurerName), displayPolicyNumber(sp.policyNumber)].filter(Boolean).join(' · ')}
                                    </p>
                                    <p className="text-micro text-muted-foreground">
                                        {sp.addedByAdvisor
                                            ? pick(PAGE_COPY.addedByAdvisor, language)
                                            : pick(PAGE_COPY.sharedByYou, language)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRevoke(sp.grantId)}
                                    disabled={revokingGrantId === sp.grantId}
                                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 min-h-[36px]"
                                >
                                    <ShieldOff className="h-3.5 w-3.5" />
                                    {revokingGrantId === sp.grantId
                                        ? pick(PAGE_COPY.revoking, language)
                                        : pick(PAGE_COPY.revoke, language)}
                                </button>
                            </li>
                        ))}
                    </ul>
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-4 mb-2">
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
    onDecline,
    licenseNumber,
    language,
}: {
    proposals: ProposalData[]
    isLoading: boolean
    onAccept: (proposalId: string) => void
    onDecline: (proposalId: string, data: ProposalDeclineData) => void
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
                    onDecline={onDecline}
                />
            ))}
        </div>
    )
}
