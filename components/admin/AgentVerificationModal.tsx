"use client"

import { CheckCircle, XCircle, Clock, Mail, Phone, Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { approveAgent, rejectAgent } from "@/app/(protected)/admin/actions"
import { useRouter } from "next/navigation"

interface AgentProfile {
    id: string
    userId: string
    verificationStatus: string
    agencyName: string | null
    licenseNumber: string | null
    submittedAt: Date
    user: {
        id: string
        name: string | null
        email: string
        phoneNumber: string | null
        createdAt: Date
    }
}

interface AgentVerificationModalProps {
    agent: AgentProfile
    onClose: () => void
}

export default function AgentVerificationModal({ agent, onClose }: AgentVerificationModalProps) {
    const router = useRouter()
    const [isApproving, setIsApproving] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [notes, setNotes] = useState("")
    const [rejectionReason, setRejectionReason] = useState("")
    const [showRejectForm, setShowRejectForm] = useState(false)

    const handleApprove = async () => {
        setIsApproving(true)
        try {
            await approveAgent(agent.id, notes)
            toast.success("Agent approved successfully")
            router.refresh()
            onClose()
        } catch (error) {
            toast.error("Failed to approve agent")
        } finally {
            setIsApproving(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a rejection reason")
            return
        }

        setIsRejecting(true)
        try {
            await rejectAgent(agent.id, rejectionReason)
            toast.success("Agent rejected")
            router.refresh()
            onClose()
        } catch (error) {
            toast.error("Failed to reject agent")
        } finally {
            setIsRejecting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                        Agent Verification
                    </h2>
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                        Review agent application and approve or reject
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Status:</span>
                        {agent.verificationStatus === "pending" && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm rounded">
                                <Clock className="w-3 h-3" /> Pending Review
                            </span>
                        )}
                        {agent.verificationStatus === "approved" && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded">
                                <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                        )}
                        {agent.verificationStatus === "rejected" && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
                                <XCircle className="w-3 h-3" /> Rejected
                            </span>
                        )}
                    </div>

                    {/* Agent Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-stone-900 dark:text-stone-100">Agent Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Name</label>
                                <p className="text-stone-900 dark:text-stone-100">{agent.user.name || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email
                                </label>
                                <p className="text-stone-900 dark:text-stone-100">{agent.user.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Phone
                                </label>
                                <p className="text-stone-900 dark:text-stone-100">{agent.user.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Agency
                                </label>
                                <p className="text-stone-900 dark:text-stone-100">{agent.agencyName || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">License Number</label>
                                <p className="text-stone-900 dark:text-stone-100">{agent.licenseNumber || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-stone-600 dark:text-stone-400">Submitted</label>
                                <p className="text-stone-900 dark:text-stone-100">
                                    {new Date(agent.submittedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Approval Notes */}
                    {!showRejectForm && agent.verificationStatus === "pending" && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                                Approval Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes about this approval..."
                                rows={3}
                                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    {/* Rejection Form */}
                    {showRejectForm && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                                Rejection Reason *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why this application is being rejected..."
                                rows={4}
                                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>

                    {agent.verificationStatus === "pending" && (
                        <div className="flex gap-2">
                            {!showRejectForm ? (
                                <>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isApproving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {isApproving ? "Approving..." : "Approve"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowRejectForm(false)}
                                        className="px-4 py-2 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={isRejecting || !rejectionReason.trim()}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
