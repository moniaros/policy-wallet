"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DocumentRequestRespond } from "@/components/collaboration/DocumentRequestFlow"
import { ProposalView, type ProposalDeclineData } from "@/components/collaboration/ProposalCard"
import type { DocumentRequestData, ProposalData, ViewerRole } from "@/components/collaboration/types"
import { useLanguage } from "@/contexts/LanguageContext"

interface ThreadActionPanelProps {
    documentRequest: DocumentRequestData | null
    proposal: ProposalData | null
    viewerRole: ViewerRole
    agentName: string
    licenseNumber?: string | null
}

const COPY = {
    accepted: { el: "Η πρόταση έγινε αποδεκτή", en: "Proposal accepted" },
    declined: { el: "Η απάντησή σας στάλθηκε", en: "Your response was sent" },
    uploaded: { el: "Το έγγραφο ανέβηκε", en: "Document uploaded" },
    failed: { el: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.", en: "Something went wrong. Please try again." },
} as const

/**
 * Renders the actionable card for a thread that is linked to a pending document
 * request or proposal, so a policyholder who deep-links here from a notification
 * can actually upload / accept / decline — instead of landing on a chat-only page.
 * The agent sees these on their own customer-detail surfaces, so this is
 * policyholder-only.
 */
export function ThreadActionPanel({
    documentRequest,
    proposal,
    viewerRole,
    agentName,
    licenseNumber,
}: ThreadActionPanelProps) {
    const router = useRouter()
    const { language } = useLanguage()
    const lang = language === "el" ? "el" : "en"
    const [uploading, setUploading] = useState(false)

    if (viewerRole !== "policyholder") return null

    const showDoc = documentRequest && documentRequest.status === "pending"
    const showProposal = proposal && proposal.status === "pending"
    if (!showDoc && !showProposal) return null

    const handleUpload = async (requestId: string, file: File): Promise<boolean> => {
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)
            const uploadRes = await fetch("/api/v1/upload", { method: "POST", body: formData })
            if (!uploadRes.ok) { toast.error(COPY.failed[lang]); return false }
            const uploadData = await uploadRes.json()
            const fileUrl =
                uploadData?.data?.url || uploadData?.data?.fileUrl || uploadData?.url || uploadData?.fileUrl
            if (!fileUrl) { toast.error(COPY.failed[lang]); return false }
            const patchRes = await fetch(`/api/v1/collaboration/document-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uploadedDocumentUrl: fileUrl }),
            })
            if (!patchRes.ok) { toast.error(COPY.failed[lang]); return false }
            toast.success(COPY.uploaded[lang])
            router.refresh()
            return true
        } catch {
            toast.error(COPY.failed[lang])
            return false
        } finally {
            setUploading(false)
        }
    }

    const respond = async (proposalId: string, body: Record<string, unknown>, successMsg: string) => {
        try {
            const res = await fetch(`/api/v1/collaboration/proposals/${proposalId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            if (res.ok) {
                toast.success(successMsg)
                router.refresh()
            } else {
                toast.error(COPY.failed[lang])
            }
        } catch {
            toast.error(COPY.failed[lang])
        }
    }

    return (
        <div className="space-y-4">
            {showDoc && (
                <DocumentRequestRespond
                    request={documentRequest!}
                    agentName={agentName}
                    onUpload={handleUpload}
                    isUploading={uploading}
                />
            )}
            {showProposal && (
                <ProposalView
                    proposal={proposal!}
                    viewerRole="policyholder"
                    licenseNumber={licenseNumber}
                    onAccept={(id) => respond(id, { status: "accepted" }, COPY.accepted[lang])}
                    onDecline={(id, data: ProposalDeclineData) => respond(id, { status: "declined", ...data }, COPY.declined[lang])}
                />
            )}
        </div>
    )
}
