"use client"

import { useState } from "react"
import { Dashboard, InviteModal } from "@/components/agent"
import { DashboardSummary, Priority, AccessScope } from "@/components/agent/types"
import { createAgentInvite } from "../agent/actions"
import { useRouter } from "next/navigation"
import { resendVerificationEmail } from "@/app/auth/actions"
import { AlertCircle, CheckCircle, X } from "lucide-react"

interface Props {
    initialSummary: DashboardSummary
    initialPriorities: Priority[]
    isEmailVerified?: boolean
    userEmail?: string
}

export function DashboardClient({ initialSummary, initialPriorities, isEmailVerified = true, userEmail }: Props) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [showBanner, setShowBanner] = useState(!isEmailVerified)
    const [isResending, setIsResending] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
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

        setIsResending(true)
        const result = await resendVerificationEmail(userEmail)
        setIsResending(false)

        if (result.success) {
            setResendSuccess(true)
            setTimeout(() => setResendSuccess(false), 5000)
        } else {
            alert("Failed to send verification email. Please try again later.")
        }
    }

    return (
        <>
            {showBanner && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3 relative animate-in slide-in-from-top-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <span className="font-bold">Verify your email address.</span> Please check your inbox ({userEmail}) to verify your account.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {resendSuccess ? (
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" /> Sent!
                                </span>
                            ) : (
                                <button
                                    onClick={handleResendVerification}
                                    disabled={isResending}
                                    className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline disabled:opacity-50"
                                >
                                    {isResending ? 'Sending...' : 'Resend Email'}
                                </button>
                            )}
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Dashboard
                summary={initialSummary}
                priorities={initialPriorities}
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
