"use client"

import React from "react"
import {
    Shield,
    FileText,
    Clock,
    Send,
    Upload,
    Lock,
    AlertCircle,
    Calendar,
    ChevronRight,
    Inbox,
} from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatRelativeDate, formatDateGreek, formatCurrencyCompact } from "@/lib/agent/format"
import { AgentCard } from "./AgentCard"
import { TrustSignalsFooter, DataConfidenceBadge, VerifiedInsurerBadge } from "./TrustSignals"
import type { SharedPolicyRoomData, ViewerRole, AgentCardData } from "./types"

interface SharedPolicyRoomProps {
    data: SharedPolicyRoomData
    viewerRole: ViewerRole
    onViewPolicy?: (policyId: string) => void
    onRespondToAction?: (actionId: string) => void
    onViewProposal?: (proposalId: string) => void
    onViewDocumentRequest?: (requestId: string) => void
    isLoading?: boolean
}

export function SharedPolicyRoom({
    data,
    viewerRole,
    onViewPolicy,
    onRespondToAction,
    onViewProposal,
    onViewDocumentRequest,
    isLoading,
}: SharedPolicyRoomProps) {
    const { language } = useLanguage()

    if (isLoading) return <SharedPolicyRoomSkeleton />

    const hasPolicies = data.policies.length > 0
    const hasPendingActions = data.pendingActions.length > 0
    const hasDocuments = data.sharedDocuments.length > 0

    if (!hasPolicies && !hasPendingActions && !hasDocuments) {
        return <SharedPolicyRoomEmpty viewerRole={viewerRole} language={language} />
    }

    return (
        <div className="space-y-5">
            {/* Agent Card (client view only) */}
            {viewerRole === "policyholder" && (
                <AgentCard agent={data.agent} viewerRole={viewerRole} />
            )}

            {/* Pending Actions — always on top */}
            {hasPendingActions && (
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        {language === "el" ? "Εκκρεμείς Ενέργειες" : "Pending Actions"}
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                            {data.pendingActions.length}
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {data.pendingActions.map((action) => (
                            <button
                                key={action.id}
                                type="button"
                                onClick={() => {
                                    if (action.type === "proposal") onViewProposal?.(action.id)
                                    else if (action.type === "document_request") onViewDocumentRequest?.(action.id)
                                    else onRespondToAction?.(action.id)
                                }}
                                className="flex w-full items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-left transition hover:shadow-sm cursor-pointer"
                            >
                                {action.type === "document_request" ? (
                                    <Upload className="h-4 w-4 text-amber-600 shrink-0" />
                                ) : action.type === "proposal" ? (
                                    <Send className="h-4 w-4 text-amber-600 shrink-0" />
                                ) : (
                                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {action.title}
                                    </p>
                                    {action.dueDate && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            {language === "el" ? "Προθεσμία" : "Due"}: {formatDateGreek(action.dueDate)}
                                        </p>
                                    )}
                                </div>
                                {action.urgency === "urgent" && (
                                    <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
                                        {language === "el" ? "ΕΠΕΙΓΟΝ" : "URGENT"}
                                    </span>
                                )}
                                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                </BrandCard>
            )}

            {/* Active Policies */}
            <BrandCard className="p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary dark:text-mint" />
                    {language === "el" ? "Ενεργά Ασφαλιστήρια" : "Active Policies"}
                </h3>
                <div className="space-y-2">
                    {data.policies.map((policy) => {
                        const statusColors: Record<string, string> = {
                            active: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
                            expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        }

                        return (
                            <button
                                key={policy.id}
                                type="button"
                                onClick={() => onViewPolicy?.(policy.id)}
                                className="flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] p-3 text-left transition hover:shadow-sm cursor-pointer"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft dark:bg-primary/15">
                                    <Shield className="h-4 w-4 text-primary dark:text-mint" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <VerifiedInsurerBadge insurerName={policy.insurerName} />
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[policy.status] || statusColors.active}`}>
                                            {policy.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {policy.lineOfBusiness}
                                        {policy.premiumAmount && viewerRole === "agent" && (
                                            <> · {formatCurrencyCompact(policy.premiumAmount, language)}</>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        {formatDateGreek(policy.endDate)}
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            </button>
                        )
                    })}
                </div>
                <TrustSignalsFooter
                    licenseNumber={data.agent.licenseNumber}
                    lastUpdated={new Date().toISOString()}
                />
            </BrandCard>

            {/* Shared Documents */}
            {hasDocuments && (
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5 text-primary dark:text-mint" />
                        {language === "el" ? "Κοινά Έγγραφα" : "Shared Documents"}
                    </h3>
                    <div className="space-y-2">
                        {data.sharedDocuments.map((doc) => (
                            <a
                                key={doc.id}
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] p-3 transition hover:shadow-sm"
                            >
                                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {doc.fileName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {doc.uploadedBy === "agent"
                                            ? (language === "el" ? "Από τον ασφαλιστή" : "From agent")
                                            : (language === "el" ? "Από εσάς" : "From you")}
                                        {" · "}
                                        {formatRelativeDate(doc.uploadedAt, language)}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </BrandCard>
            )}

            {/* Proposals (client view) */}
            {viewerRole === "policyholder" && data.proposals.length > 0 && (
                <BrandCard className="p-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <Send className="h-5 w-5 text-primary dark:text-mint" />
                        {language === "el" ? "Προτάσεις" : "Proposals"}
                    </h3>
                    <div className="space-y-2">
                        {data.proposals.map((proposal) => (
                            <button
                                key={proposal.id}
                                type="button"
                                onClick={() => onViewProposal?.(proposal.id)}
                                className="flex w-full items-center gap-3 rounded-xl border border-primary/20 dark:border-primary/30 bg-primary-tint dark:bg-primary/15 p-3 text-left transition hover:shadow-sm cursor-pointer"
                            >
                                <Send className="h-4 w-4 text-primary dark:text-mint shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {proposal.insurerName} — {proposal.lineOfBusiness}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {proposal.plainLanguageSummary || proposal.coverageSummary}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    €{proposal.premiumAmount}
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                </BrandCard>
            )}
        </div>
    )
}

function SharedPolicyRoomEmpty({ viewerRole, language }: { viewerRole: ViewerRole; language: string }) {
    return (
        <BrandCard className="p-8">
            <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft dark:bg-primary/15">
                    <Inbox className="h-5 w-5 text-primary dark:text-mint" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {viewerRole === "agent"
                        ? (language === "el" ? "Μοιραστείτε ένα ασφαλιστήριο για να ξεκινήσετε" : "Share a policy to begin collaborating")
                        : (language === "el" ? "Ο ασφαλιστής σας δεν έχει μοιραστεί κάτι ακόμα" : "Your agent hasn't shared anything yet")}
                </p>
            </div>
        </BrandCard>
    )
}

export function SharedPolicyRoomSkeleton() {
    return (
        <div className="space-y-5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
    )
}
