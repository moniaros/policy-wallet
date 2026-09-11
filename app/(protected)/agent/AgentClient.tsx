"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Switch } from "@/components/ui/form/Switch"
import type { Policy } from "@/components/wallet/types"
import { Mail, Phone, Globe, ShieldCheck, ShieldOff, Building2, MessageSquare, FileText, Send, Inbox, Handshake } from "lucide-react"
import { EmptyState as SharedEmptyState } from "@/components/ui/EmptyState"
import { redeemInviteCode } from "@/app/onboarding/actions"
import { revokeShare } from "@/app/(protected)/wallet/actions"
import { disconnectFromAgent, inviteAdvisorByEmail, setUnsharedCountDisclosure } from "@/app/(protected)/agent/relationship-actions"
import { toast } from "sonner"
import { CardHead } from "@/components/dashboard/home/CardHead"
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
    /** The grant's level, normalised by lib/policy-access — what the advisor can do (A-10). */
    permissions: string
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
    /**
     * Whether this customer has chosen to let the advisor know that policies
     * exist beyond the shared ones — a count, never an identity (halt H-B2).
     * The platform discloses nothing on its own; this switch is the disclosure.
     */
    unsharedCountDisclosed?: boolean
}

type Tab = "overview" | "messages" | "documents" | "proposals"

const PAGE_COPY = {
    tablistLabel: { el: "Ενότητες", en: "Sections" },
    kicker: { el: "Ο σύμβουλός μου", en: "My Agent" },
    disconnect: { el: "Αποσύνδεση από τον σύμβουλο", en: "Disconnect from advisor" },
    disconnectShort: { el: "Αποσύνδεση", en: "Disconnect" },
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
    licence: { el: "Αρ. αδείας", en: "Licence no." },
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
    // A-10: what the level lets the advisor do, in the words the collaboration panel uses.
    levelRead: { el: "Βλέπει το ασφαλιστήριο και τα έγγραφά του", en: "Sees the policy and its documents" },
    levelWrite: { el: "Μπορεί να διορθώσει τα στοιχεία του", en: "Can correct its details" },
    levelManage: { el: "Διαχειρίζεται το ασφαλιστήριο", en: "Manages this policy" },
    levelNone: { el: "Χωρίς δικαιώματα", en: "No permissions" },
    // A-09: the denominator the book never states — how many of the customer's policies the advisor sees.
    discloseUnsharedLabel: {
        el: "Να γνωρίζει ο σύμβουλός σας ότι έχετε κι άλλα ασφαλιστήρια",
        en: "Let your advisor know you hold other policies",
    },
    discloseUnsharedHelp: {
        el: "Θα βλέπει μόνο πόσα είναι — ποτέ ποια, από ποια εταιρεία ή με τι καλύψεις. Μπορείτε να το απενεργοποιήσετε όποτε θέλετε.",
        en: "They will see only how many — never which, from which insurer, or with what cover. You can switch it off at any time.",
    },
    disclosureFailed: { el: "Η αλλαγή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.", en: "The change was not saved. Please try again." },
    sharedSummary: { el: "Ο σύμβουλός σας βλέπει {shared} από τα {total} ασφαλιστήριά σας.", en: "Your advisor sees {shared} of your {total} policies." },
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
        <div className="mx-auto max-w-page-wide px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            <div className="max-w-3xl">
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
                    <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            Γ
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-body-sm font-semibold text-foreground">
                                {NO_AGENT_COPY.exampleName[lang]}
                            </p>
                            <p className="inline-flex items-center gap-1 text-caption text-muted-foreground">
                                <ShieldCheck className="h-3 w-3 text-primary dark:text-mint" />
                                {NO_AGENT_COPY.exampleMeta[lang]}
                            </p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-status-success dark:bg-primary/15">
                            {NO_AGENT_COPY.exampleBadge[lang]}
                        </span>
                    </div>
                }
                trust={NO_AGENT_COPY.trust[lang]}
                secondary={
                    <div className="text-left">
                        {sent ? (
                            <div className="pw-subcard p-4">
                                <p className="text-sm font-semibold text-foreground">{NO_AGENT_COPY.sentTitle[lang]}</p>
                                <p className="mt-1 text-caption text-muted-foreground">{NO_AGENT_COPY.sentBody[lang]}</p>
                                {sent.link && (
                                    <div className="mt-3">
                                        <p className="text-caption text-muted-foreground">{NO_AGENT_COPY.linkFallback[lang]}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard?.writeText(sent.link!)
                                                toast.success(NO_AGENT_COPY.linkCopied[lang])
                                            }}
                                            className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-card px-4 text-caption font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        >
                                            {NO_AGENT_COPY.copyLink[lang]}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <label htmlFor="advisor-email" className="mb-1.5 block text-caption font-medium text-muted-foreground">
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
                                {emailError && <p className="mt-2 text-caption text-status-danger">{emailError}</p>}

                                <button
                                    type="button"
                                    onClick={() => setShowCode((v) => !v)}
                                    className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded text-caption font-semibold text-primary underline-offset-2 hover:underline dark:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    {NO_AGENT_COPY.haveCode[lang]}
                                </button>

                                {showCode && (
                                    <div className="mt-3">
                                        <label htmlFor="agent-invite-code" className="mb-1.5 block text-caption font-medium text-muted-foreground">
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
                                                className="pw-soft-button flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {redeeming ? NO_AGENT_COPY.submitting[lang] : NO_AGENT_COPY.submit[lang]}
                                            </button>
                                        </div>
                                        {codeError && <p className="mt-2 text-caption text-status-danger">{codeError}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                }
            />
            </div>
        </div>
    )
}

export function AgentClient({
    policies,
    user,
    agent,
    relationshipId,
    sharedPolicies = [],
    unsharedCountDisclosed = false,
}: AgentClientProps) {
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
    // Optimistic, because the switch must feel like a switch. The server is the
    // authority; a refused write snaps it back and says so.
    const [disclosesUnshared, setDisclosesUnshared] = useState(unsharedCountDisclosed)
    const [savingDisclosure, setSavingDisclosure] = useState(false)

    const handleDisclosureToggle = async (next: boolean) => {
        if (!relationshipId || savingDisclosure) return
        setDisclosesUnshared(next)
        setSavingDisclosure(true)
        const result = await setUnsharedCountDisclosure(relationshipId, next)
        setSavingDisclosure(false)
        if (result.success) {
            router.refresh()
        } else {
            setDisclosesUnshared(!next)
            toast.error(pick(PAGE_COPY.disclosureFailed, language))
        }
    }

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
        <div className="mx-auto w-full max-w-page-wide px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            <div className="max-w-3xl">
            <h1 className="text-h3 font-semibold tracking-tight text-foreground">{pick(PAGE_COPY.kicker, language)}</h1>
            <div className="mt-5">

                {/* Tabs — real tablist semantics via useTabs (role tab/tabpanel,
                    roving tabindex, arrow keys). */}
                <div
                    role="tablist"
                    aria-label={pick(PAGE_COPY.tablistLabel, language)}
                    className="pw-segmented pw-scroll-strip mb-4"
                >
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                type="button"
                                key={tab.id}
                                {...tabProps(tab.id)}
                                className="pw-segment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                {tab.label}
                                {/* The pending count on the warning tint pair — a token pair
                                    that clears 4.5:1 in both themes. */}
                                {tab.count && tab.count > 0 && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning-tint px-1.5 text-caption font-semibold tabular-nums text-status-warning">
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
                            totalPolicies={policies.length}
                            onRevoke={handleRevokeShare}
                            revokingGrantId={revokingGrantId}
                            relationshipId={relationshipId}
                            disclosesUnshared={disclosesUnshared}
                            savingDisclosure={savingDisclosure}
                            onDisclosureToggle={handleDisclosureToggle}
                        />
                        {relationshipId && (
                            <div className="pw-card pw-pad mt-4 flex flex-col items-start justify-between gap-4 border-status-danger-edge sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="text-sm font-semibold text-status-danger">{pick(PAGE_COPY.disconnect, language)}</h3>
                                    <p className="mt-1 max-w-md text-caption leading-snug text-muted-foreground">{pick(PAGE_COPY.disconnectDesc, language)}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={isDisconnecting}
                                    onClick={() => setDisconnectConfirmOpen(true)}
                                    aria-label={pick(PAGE_COPY.disconnect, language)}
                                    className="pw-soft-button shrink-0 cursor-pointer !text-caption text-status-danger disabled:opacity-50"
                                >
                                    {isDisconnecting ? pick(PAGE_COPY.disconnecting, language) : pick(PAGE_COPY.disconnectShort, language)}
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
    totalPolicies,
    onRevoke,
    revokingGrantId,
    relationshipId,
    disclosesUnshared,
    savingDisclosure,
    onDisclosureToggle,
}: {
    agent: NonNullable<AgentClientProps['agent']>
    language: string
    sharedPolicies: SharedPolicyLedgerItem[]
    totalPolicies: number
    onRevoke: (grantId: string) => void
    revokingGrantId: string | null
    relationshipId: string | null
    disclosesUnshared: boolean
    savingDisclosure: boolean
    onDisclosureToggle: (next: boolean) => void
}) {
    return (
        <div className="space-y-6">
            {/* The advisor card — white like every other card. The agency's
                brand colour (a paid entitlement) tints the avatar only: a
                gradient wash and a 4px coloured side bar were the one place the
                app let a third party repaint a surface. */}
            <div className="pw-card pw-pad">
                <div className="flex items-start gap-4">
                    {agent.photoUrl ? (
                        <img src={agent.photoUrl} alt={agent.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                    ) : (
                        <div
                            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
                            style={agent.branding?.brandColor ? { backgroundColor: agent.branding.brandColor, color: "white" } : undefined}
                        >
                            {agent.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-title font-semibold tracking-tight text-foreground">{agent.name}</h2>
                            {agent.branding?.verified && <ShieldCheck className="h-5 w-5 flex-shrink-0 text-primary dark:text-mint" aria-hidden="true" />}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {agent.branding?.agencyName || agent.company || pick(PAGE_COPY.advisorFallback, language)}
                        </p>
                        {agent.branding?.licenseNumber && (
                            <p className="mt-1 text-caption text-muted-foreground">
                                {pick(PAGE_COPY.licence, language)}: {agent.branding.licenseNumber}
                            </p>
                        )}
                    </div>
                </div>

                {/* One primary — the call — and soft pills beside it. */}
                <div className="mt-5 flex flex-wrap gap-3">
                    <a href={`tel:${agent.phone}`} className="pw-primary-button pw-btn-sm">
                        <Phone className="h-4 w-4" aria-hidden="true" /> {pick(PAGE_COPY.call, language)}
                    </a>
                    <a href={`mailto:${agent.email}`} className="pw-soft-button">
                        <Mail className="h-4 w-4" aria-hidden="true" /> Email
                    </a>
                    {agent.branding?.website && (
                        <a
                            href={agent.branding.website.startsWith("http") ? agent.branding.website : `https://${agent.branding.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pw-soft-button"
                        >
                            <Globe className="h-4 w-4" aria-hidden="true" /> Website
                        </a>
                    )}
                </div>
            </div>

            {/* Shared-access ledger — real, revocable control over what the
                advisor can see (backs the "revoke at any time" promise). */}
            <section className="pw-card pw-pad" aria-labelledby="shared-access-heading">
                <CardHead icon={ShieldCheck} title={pick(PAGE_COPY.sharedAccessTitle, language)} id="shared-access-heading" />
                <p className="mt-2 text-caption leading-snug text-muted-foreground">{pick(PAGE_COPY.sharedAccessSubtitle, language)}</p>

                <p className="mt-3 text-sm text-foreground">
                    {pick(PAGE_COPY.sharedSummary, language)
                        .split(/(\{shared\}|\{total\})/)
                        .map((part, i) =>
                            part === "{shared}" ? (
                                <span key={i} data-count="portfolio.sharedWithAdvisorCount" className="font-semibold tabular-nums">{sharedPolicies.length}</span>
                            ) : part === "{total}" ? (
                                <span key={i} data-count="portfolio.policyCount" className="font-semibold tabular-nums">{totalPolicies}</span>
                            ) : (
                                <span key={i}>{part}</span>
                            )
                        )}
                </p>
                {/* H-B2 — the disclosure the PLATFORM will not make on its own.
                    An advisor cannot infer that unshared policies exist, and we
                    do not tell them: that would be new information about this
                    person's record which they never shared. This switch hands
                    the decision to the person whose record it is. It discloses a
                    COUNT and nothing else, it is off by default, and it is off
                    again the moment they say so. */}
                {relationshipId && (
                    <div className="mt-4 border-t border-border pt-1">
                        <Switch
                            checked={disclosesUnshared}
                            onCheckedChange={onDisclosureToggle}
                            pending={savingDisclosure}
                            label={pick(PAGE_COPY.discloseUnsharedLabel, language)}
                            description={pick(PAGE_COPY.discloseUnsharedHelp, language)}
                        />
                    </div>
                )}

                {sharedPolicies.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{pick(PAGE_COPY.noShares, language)}</p>
                ) : (
                    <ul className="mt-4 space-y-2">
                        {sharedPolicies.map((sp) => (
                            <li
                                key={sp.grantId}
                                className="pw-subcard flex items-center justify-between gap-3 px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {[displayInsurerName(sp.insurerName), displayPolicyNumber(sp.policyNumber)].filter(Boolean).join(' · ')}
                                    </p>
                                    <p className="text-caption text-muted-foreground">
                                        {sp.addedByAdvisor
                                            ? pick(PAGE_COPY.addedByAdvisor, language)
                                            : pick(PAGE_COPY.sharedByYou, language)}
                                        {" · "}
                                        <span data-fact="grant.level" data-fact-subject={sp.grantId} data-fact-value={sp.permissions}>
                                            {pick(sp.permissions === "manage" ? PAGE_COPY.levelManage : sp.permissions === "write" || sp.permissions === "edit" ? PAGE_COPY.levelWrite : sp.permissions === "none" ? PAGE_COPY.levelNone : PAGE_COPY.levelRead, language)}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRevoke(sp.grantId)}
                                    disabled={revokingGrantId === sp.grantId}
                                    className="inline-flex min-h-11 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-card px-3.5 text-caption font-semibold text-status-danger shadow-sm transition-colors hover:bg-status-danger-tint disabled:opacity-50"
                                >
                                    <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                                    {revokingGrantId === sp.grantId
                                        ? pick(PAGE_COPY.revoking, language)
                                        : pick(PAGE_COPY.revoke, language)}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
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
            <div className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
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
                    <p className="mb-2 mt-4 text-caption font-semibold text-muted-foreground">
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
            <div className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                <Send className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
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
