"use client"

import { useState } from "react"
import { DesktopDashboard, InviteModal } from "@/components/agent"
import { Priority, AccessScope } from "@/components/agent/types"
import { createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"
import { resendVerificationEmail } from "@/app/auth/actions"
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react"

interface Props {
    stats: any
    priorities: any
    recentActivity: any
    isEmailVerified?: boolean
    userEmail?: string
}

export function DashboardClient({ stats, priorities, recentActivity, isEmailVerified = true, userEmail }: Props) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [showBanner, setShowBanner] = useState(!isEmailVerified)
    const [isResending, setIsResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [resendError, setResendError] = useState<string | null>(null)
    const router = useRouter()

    const handleInvite = async (email: string, scope: AccessScope) => {
        const result = await createAgentInvite(email, scope)
        if (result.success) {
            router.refresh()
            alert("Invitation sent successfully!")
        } else {
            alert("Failed to send invitation.")
        }
    }

    const handlePriorityClick = (customerId: string) => {
        if (customerId) {
            router.push(`/customers/${customerId}`)
        }
    }

    const handleResendVerification = async () => {
        if (!userEmail || isResending) return

        setResendError(null)
        setIsResending(true)
        const result = await resendVerificationEmail(userEmail, "en")
        setIsResending(false)

        if (result.success) {
            setResendSuccess(true)
            setTimeout(() => setResendSuccess(false), 5000)
        } else {
            setResendError("Could not send verification email right now.")
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
                                        <span className="font-bold">Verify your email address.</span> Please check your inbox ({userEmail}) to unlock full account protection.
                                    </p>
                                    {resendError ? (
                                        <p className="text-xs font-medium text-rose-700 dark:text-rose-300">{resendError}</p>
                                    ) : null}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                aria-label="Dismiss verification banner"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                            {resendSuccess ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verification email sent
                                </span>
                            ) : null}
                            <button
                                onClick={handleResendVerification}
                                disabled={isResending}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/10 dark:text-amber-200 dark:hover:bg-amber-900/30"
                            >
                                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {isResending ? "Sending..." : "Resend verification email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DesktopDashboard
                stats={stats}
                priorities={priorities}
                recentActivity={recentActivity}
                onInviteCustomer={() => setIsInviteModalOpen(true)}
                onPriorityClick={handlePriorityClick}
            />
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSendInvite={handleInvite}
            />
        </>
    )
}
