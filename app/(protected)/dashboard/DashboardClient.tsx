"use client"

import { useState } from "react"
import { DesktopDashboard } from "@/components/agent/DesktopDashboard"
import { AgentGettingStartedChecklist } from "@/components/agent/GettingStartedChecklist"
import { InviteModal } from "@/components/agent"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import type { AccessScope } from "@/components/agent/types"
import type { ActionQueueItem, AgentDashboardData } from "@/components/agent/types"
import type { AgentTier } from "@/types/subscription-entitlements"
import { createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { resendVerificationEmail } from "@/app/auth/actions"
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface Props {
    dashboardData: AgentDashboardData
    recentActivity: Array<{
        id: string
        type: string
        customerName: string
        timestamp: string
        details: string
    }>
    agentTier: AgentTier
    agentName?: string
    isEmailVerified?: boolean
    userEmail?: string
    /** Real first-run signals for the getting-started checklist (server-computed). */
    checklistSignals: {
        profileComplete: boolean
        licenseUploaded: boolean
        hasClients: boolean
        hasAnalysis: boolean
        commissionRatesSet: boolean
    }
}

export function DashboardClient({
    dashboardData,
    recentActivity,
    agentTier,
    agentName,
    isEmailVerified = true,
    userEmail,
    checklistSignals,
}: Props) {
    const { language, t } = useLanguage()
    const tb = t.agentDashboard
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [showBanner, setShowBanner] = useState(!isEmailVerified)
    const [isResending, setIsResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [resendError, setResendError] = useState<string | null>(null)
    const router = useRouter()

    const handleInvite = async (email: string, scope: AccessScope) => {
        const result = await createAgentInvite(email, scope)
        if (result.success) {
            if ("emailDelivered" in result && result.emailDelivered === false) {
                // Invite exists but the email never left — hand over the link.
                const link = "inviteLink" in result ? result.inviteLink : undefined
                if (link) navigator.clipboard?.writeText(link).catch(() => {})
                toast.warning(tb.inviteEmailFailed)
            }
            router.refresh()
        } else if ("error" in result && result.error) {
            toast.error(result.error)
        }
    }

    const handleActionQueueItem = (item: ActionQueueItem) => {
        if (item.clientId) {
            router.push(`/customers/${item.clientId}`)
        }
    }

    const handleClientClick = (clientId: string) => {
        router.push(`/customers/${clientId}`)
    }

    const handleQuickAdd = (type: "client" | "policy" | "document_request") => {
        if (type === "client") {
            setIsInviteModalOpen(true)
        } else if (type === "policy") {
            // Smart upload: identify the customer from the document, then
            // create/attach — not the agent's own B2C wallet upload.
            setIsUploadModalOpen(true)
        }
    }

    const handleResendVerification = async () => {
        if (!userEmail || isResending) return
        setResendError(null)
        setIsResending(true)
        const result = await resendVerificationEmail(userEmail, language)
        setIsResending(false)
        if (result.success) {
            setResendSuccess(true)
            setTimeout(() => setResendSuccess(false), 5000)
        } else {
            setResendError(tb.verifyBannerError)
        }
    }

    return (
        <>
            {showBanner && (
                <div className="mx-auto max-w-page-wide px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                    <div className="rounded-xl bg-status-warning-tint px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-status-warning" aria-hidden="true" />
                                <div className="space-y-1">
                                    <p className="text-sm text-foreground">
                                        <span className="font-semibold text-status-warning">{tb.verifyBannerTitle}</span> {tb.verifyBannerCheckInbox} ({userEmail}) {tb.verifyBannerUnlock}
                                    </p>
                                    {resendError && (
                                        <p className="text-caption font-semibold text-status-danger">{resendError}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBanner(false)}
                                className="grid h-9 w-9 flex-shrink-0 cursor-pointer place-items-center rounded-full text-status-warning transition-colors hover:bg-card/60"
                                aria-label={tb.verifyBannerDismiss}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            {resendSuccess && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-status-success-tint px-2.5 py-1.5 text-caption font-semibold text-status-success">
                                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                    {tb.verifyBannerSent}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={isResending}
                                className="pw-soft-button !bg-card"
                            >
                                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {isResending ? tb.verifyBannerSending : tb.verifyBannerResend}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* First-run getting-started checklist. Self-hides (renders null)
                once every step is done or the agent dismisses it, so the empty
                wrapper collapses via [&:empty]:hidden — no stray gap above the
                dashboard header for established agents. */}
            <div className="mx-auto max-w-page-wide px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8 [&:empty]:hidden">
                <AgentGettingStartedChecklist
                    language={language}
                    profileComplete={checklistSignals.profileComplete}
                    licenseUploaded={checklistSignals.licenseUploaded}
                    hasClients={checklistSignals.hasClients}
                    hasAnalysis={checklistSignals.hasAnalysis}
                    commissionRatesSet={checklistSignals.commissionRatesSet}
                />
            </div>

            <DesktopDashboard
                data={dashboardData}
                recentActivity={recentActivity}
                agentTier={agentTier}
                agentName={agentName}
                onActionQueueItem={handleActionQueueItem}
                onClientClick={handleClientClick}
                onInviteCustomer={() => setIsInviteModalOpen(true)}
                onQuickAdd={handleQuickAdd}
            />
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSendInvite={handleInvite}
            />
            <UploadPolicyModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => router.refresh()}
            />
        </>
    )
}
