"use client"

import { useState } from "react"
import { DesktopDashboard } from "@/components/agent/DesktopDashboard"
import { InviteModal } from "@/components/agent"
import { UploadPolicyModal } from "@/components/agent/UploadPolicyModal"
import type { AccessScope } from "@/components/agent/types"
import type { ActionQueueItem, AgentDashboardData } from "@/components/agent/types"
import type { AgentTier } from "@/types/subscription-entitlements"
import { createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"
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
}

export function DashboardClient({
    dashboardData,
    recentActivity,
    agentTier,
    agentName,
    isEmailVerified = true,
    userEmail,
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
            router.refresh()
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
                <div className="px-4 py-3 relative animate-in slide-in-from-top-2">
                    <div className="max-w-7xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm text-amber-900 dark:text-amber-100">
                                        <span className="font-bold">{tb.verifyBannerTitle}</span> {tb.verifyBannerCheckInbox} ({userEmail}) {tb.verifyBannerUnlock}
                                    </p>
                                    {resendError && (
                                        <p className="text-xs font-medium text-rose-700 dark:text-rose-300">{resendError}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                aria-label={tb.verifyBannerDismiss}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            {resendSuccess && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-[#166534] dark:border-primary/30 dark:bg-primary/15 dark:text-mint">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {tb.verifyBannerSent}
                                </span>
                            )}
                            <button
                                onClick={handleResendVerification}
                                disabled={isResending}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/10 dark:text-amber-200 dark:hover:bg-amber-900/30"
                            >
                                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {isResending ? tb.verifyBannerSending : tb.verifyBannerResend}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
