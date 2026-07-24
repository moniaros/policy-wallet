"use client"

import React, { useState } from "react"
import {
    Send,
    CheckCircle2,
    MessageSquare,
    Calendar,
    Shield,
    ArrowRight,
    ArrowDown,
    ArrowUp,
    Clock,
    X,
} from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyFull, formatDateGreek } from "@/lib/agent/format"
import { TrustSignalsFooter, VerifiedInsurerBadge } from "./TrustSignals"
import type { ProposalData, ProposalType, ViewerRole } from "./types"

// ── Agent: Create Proposal Form ───────────────────────────────────────

interface ProposalCreateProps {
    clientName: string
    onSubmit: (data: {
        proposalType: ProposalType
        insurerName: string
        lineOfBusiness: string
        premiumAmount: number
        coverageSummary: string
        comparisonData?: Record<string, unknown>
        plainLanguageSummary?: string
    }) => void
    onCancel?: () => void
    isSubmitting?: boolean
}

const LOB_OPTIONS = [
    { value: "motor", en: "Motor", el: "Αυτοκίνητο" },
    { value: "health", en: "Health", el: "Υγεία" },
    { value: "home", en: "Home", el: "Κατοικία" },
    { value: "life", en: "Life", el: "Ζωή" },
    { value: "travel", en: "Travel", el: "Ταξίδι" },
]

const PROPOSAL_TYPE_LABELS: Record<ProposalType, { en: string; el: string }> = {
    new_policy: { en: "New Policy", el: "Νέο ασφαλιστήριο" },
    renewal: { en: "Renewal", el: "Ανανέωση" },
    upgrade: { en: "Upgrade", el: "Αναβάθμιση" },
    bundle: { en: "Bundle", el: "Πακέτο" },
}

export function ProposalCreate({ clientName, onSubmit, onCancel, isSubmitting }: ProposalCreateProps) {
    const { language, t } = useLanguage()
    const [proposalType, setProposalType] = useState<ProposalType>("new_policy")
    const [insurerName, setInsurerName] = useState("")
    const [lineOfBusiness, setLineOfBusiness] = useState("motor")
    const [premiumAmount, setPremiumAmount] = useState("")
    const [coverageSummary, setCoverageSummary] = useState("")
    const [plainLanguageSummary, setPlainLanguageSummary] = useState("")
    const [showPreview, setShowPreview] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!insurerName || !premiumAmount || !coverageSummary) return
        onSubmit({
            proposalType,
            insurerName,
            lineOfBusiness,
            premiumAmount: parseFloat(premiumAmount),
            coverageSummary,
            plainLanguageSummary: plainLanguageSummary || undefined,
        })
    }

    if (showPreview) {
        return (
            <BrandCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-foreground">
                        {t.collaboration.proposals.proposalPreview}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="text-neutral-500 hover:text-neutral-600 transition cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <ProposalView
                    proposal={{
                        id: "preview",
                        threadId: "",
                        relationshipId: "",
                        createdByUserId: "",
                        proposalType,
                        insurerName,
                        lineOfBusiness,
                        premiumAmount: parseFloat(premiumAmount) || 0,
                        premiumCurrency: "EUR",
                        coverageSummary,
                        plainLanguageSummary,
                        status: "pending",
                        createdAt: new Date().toISOString(),
                    }}
                    viewerRole="policyholder"
                    licenseNumber={null}
                    isPreview
                />
                <div className="flex items-center justify-end gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                    >
                        {t.collaboration.proposals.edit}
                    </button>
                    <BrandActionButton onClick={handleSubmit} disabled={isSubmitting} className="text-sm">
                        <Send className="h-4 w-4" />
                        {isSubmitting
                            ? t.collaboration.proposals.sending
                            : t.collaboration.proposals.sendProposal}
                    </BrandActionButton>
                </div>
            </BrandCard>
        )
    }

    return (
        <BrandCard className="p-5">
            <h3 className="text-base font-bold text-foreground mb-1">
                {t.collaboration.proposals.createProposal}
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
                {t.collaboration.proposals.forClient.replace("{name}", clientName)}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); setShowPreview(true) }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="proposalcard-f1" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.proposals.proposalType}
                        </label>
                        <select id="proposalcard-f1"
                            value={proposalType}
                            onChange={(e) => setProposalType(e.target.value as ProposalType)}
                            className="pw-input pw-input-sm"
                        >
                            {Object.entries(PROPOSAL_TYPE_LABELS).map(([key, labels]) => (
                                <option key={key} value={key}>
                                    {language === "el" ? labels.el : labels.en}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="proposalcard-f2" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.proposals.lineOfBusiness}
                        </label>
                        <select id="proposalcard-f2"
                            value={lineOfBusiness}
                            onChange={(e) => setLineOfBusiness(e.target.value)}
                            className="pw-input pw-input-sm"
                        >
                            {LOB_OPTIONS.map((lob) => (
                                <option key={lob.value} value={lob.value}>
                                    {language === "el" ? lob.el : lob.en}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="proposalcard-f3" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.proposals.insurer}
                        </label>
                        <input id="proposalcard-f3"
                            type="text"
                            value={insurerName}
                            onChange={(e) => setInsurerName(e.target.value)}
                            required
                            placeholder={t.collaboration.proposals.insurerPlaceholder}
                            className="pw-input pw-input-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="proposalcard-f4" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.proposals.annualPremium}
                        </label>
                        <input id="proposalcard-f4"
                            type="number"
                            step="0.01"
                            value={premiumAmount}
                            onChange={(e) => setPremiumAmount(e.target.value)}
                            required
                            placeholder="0.00"
                            className="pw-input pw-input-sm"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="proposalcard-f5" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t.collaboration.proposals.coverageSummary}
                    </label>
                    <textarea id="proposalcard-f5"
                        value={coverageSummary}
                        onChange={(e) => setCoverageSummary(e.target.value)}
                        required
                        rows={3}
                        className="pw-input pw-input-sm resize-none"
                    />
                </div>

                <div>
                    <label htmlFor="proposalcard-f6" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t.collaboration.proposals.plainLanguageSummary}
                    </label>
                    <textarea id="proposalcard-f6"
                        value={plainLanguageSummary}
                        onChange={(e) => setPlainLanguageSummary(e.target.value)}
                        rows={2}
                        placeholder={t.collaboration.proposals.plainLanguagePlaceholder}
                        className="pw-input pw-input-sm resize-none"
                    />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                        >
                            {t.collaboration.proposals.cancel}
                        </button>
                    )}
                    <BrandActionButton type="submit" className="text-sm">
                        {t.collaboration.proposals.preview}
                        <ArrowRight className="h-4 w-4" />
                    </BrandActionButton>
                </div>
            </form>
        </BrandCard>
    )
}

// ── Client: View Proposal ─────────────────────────────────────────────

export type ProposalDeclineReason = "too_expensive" | "not_needed" | "prefer_different" | "other"

export interface ProposalDeclineData {
    declineReason?: ProposalDeclineReason
    declineComment?: string
    counterOfferNotes?: string
}

interface ProposalViewProps {
    proposal: ProposalData
    viewerRole: ViewerRole
    licenseNumber?: string | null
    onAccept?: (proposalId: string) => void
    onDecline?: (proposalId: string, data: ProposalDeclineData) => void | Promise<void>
    onAskQuestion?: (proposalId: string) => void
    isPreview?: boolean
}

const DECLINE_REASONS: { value: ProposalDeclineReason; key: "reasonTooExpensive" | "reasonNotNeeded" | "reasonPreferDifferent" | "reasonOther" }[] = [
    { value: "too_expensive", key: "reasonTooExpensive" },
    { value: "not_needed", key: "reasonNotNeeded" },
    { value: "prefer_different", key: "reasonPreferDifferent" },
    { value: "other", key: "reasonOther" },
]

export function ProposalView({
    proposal,
    viewerRole,
    licenseNumber,
    onAccept,
    onDecline,
    onAskQuestion,
    isPreview,
}: ProposalViewProps) {
    const { language, t } = useLanguage()
    const [isDeclining, setIsDeclining] = useState(false)
    const [declineReason, setDeclineReason] = useState<ProposalDeclineReason | null>(null)
    const [declineComment, setDeclineComment] = useState("")
    const [counterOffer, setCounterOffer] = useState("")
    const [isResponding, setIsResponding] = useState(false)

    const submitDecline = async () => {
        if (!onDecline) return
        setIsResponding(true)
        try {
            await onDecline(proposal.id, {
                declineReason: declineReason ?? undefined,
                declineComment: declineComment.trim() || undefined,
                counterOfferNotes: counterOffer.trim() || undefined,
            })
        } finally {
            setIsResponding(false)
        }
    }

    const statusBadges: Record<string, { label: { en: string; el: string }; style: string }> = {
        pending: {
            label: { en: "Pending", el: "Εκκρεμεί" },
            style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        },
        accepted: {
            label: { en: "Accepted", el: "Αποδεκτή" },
            style: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
        },
        declined: {
            label: { en: "Declined", el: "Απορρίφθηκε" },
            style: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        },
        expired: {
            label: { en: "Expired", el: "Έληξε" },
            style: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-500",
        },
    }

    const statusBadge = statusBadges[proposal.status] || statusBadges.pending

    return (
        <BrandCard className="p-5 border-l-4 border-l-primary">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <VerifiedInsurerBadge insurerName={proposal.insurerName} />
                        <span className={`rounded-full px-2 py-0.5 text-kicker font-medium ${statusBadge.style}`}>
                            {language === "el" ? statusBadge.label.el : statusBadge.label.en}
                        </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                        {PROPOSAL_TYPE_LABELS[proposal.proposalType]?.[language] || proposal.proposalType}
                        {" · "}
                        {LOB_OPTIONS.find((l) => l.value === proposal.lineOfBusiness)?.[language] || proposal.lineOfBusiness}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-foreground">
                        {formatCurrencyFull(proposal.premiumAmount, language)}
                    </p>
                    <p className="text-kicker text-neutral-500">
                        {t.collaboration.proposals.perYear}
                    </p>
                </div>
            </div>

            {/* Plain language summary */}
            {proposal.plainLanguageSummary && (
                <div className="rounded-xl bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 p-4 mb-4">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {proposal.plainLanguageSummary}
                    </p>
                </div>
            )}

            {/* Coverage summary */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                    {t.collaboration.proposals.coverage}
                </h4>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {proposal.coverageSummary}
                </p>
            </div>

            {/* Comparison data */}
            {proposal.comparisonData && (
                <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 p-4 mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        {t.collaboration.proposals.comparison}
                    </h4>
                    <div className="space-y-2">
                        {Object.entries(proposal.comparisonData).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-neutral-600 dark:text-neutral-500">{key}</span>
                                <span className="font-medium text-foreground">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTAs (client view, pending only) */}
            {viewerRole === "policyholder" && proposal.status === "pending" && !isPreview && !isDeclining && (
                <div className="flex flex-wrap gap-3 mt-4">
                    {onAccept && (
                        <BrandActionButton
                            onClick={() => onAccept(proposal.id)}
                            className="flex-1 text-sm"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {t.collaboration.proposals.accept}
                        </BrandActionButton>
                    )}
                    {onDecline && (
                        <BrandActionButton
                            variant="secondary"
                            onClick={() => setIsDeclining(true)}
                            className="flex-1 text-sm"
                        >
                            <X className="h-4 w-4" />
                            {t.collaboration.proposals.decline}
                        </BrandActionButton>
                    )}
                    {onAskQuestion && (
                        <BrandActionButton
                            variant="secondary"
                            onClick={() => onAskQuestion(proposal.id)}
                            className="flex-1 text-sm"
                        >
                            <MessageSquare className="h-4 w-4" />
                            {t.collaboration.proposals.askMe}
                        </BrandActionButton>
                    )}
                </div>
            )}

            {/* Decline / counter-offer form */}
            {viewerRole === "policyholder" && proposal.status === "pending" && !isPreview && isDeclining && onDecline && (
                <div className="mt-4 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 p-4 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        {t.collaboration.proposals.declineHeading}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {DECLINE_REASONS.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setDeclineReason(r.value)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                                    declineReason === r.value
                                        ? "bg-primary text-white dark:text-[#1A2420] border-primary"
                                        : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
                                }`}
                            >
                                {t.collaboration.proposals[r.key]}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={declineComment}
                        onChange={(e) => setDeclineComment(e.target.value)}
                        rows={2}
                        placeholder={t.collaboration.proposals.declineCommentPlaceholder}
                        className="pw-input pw-input-sm resize-none"
                    />
                    <div>
                        <label htmlFor="proposalcard-f7" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.proposals.counterOfferLabel}
                        </label>
                        <textarea id="proposalcard-f7"
                            value={counterOffer}
                            onChange={(e) => setCounterOffer(e.target.value)}
                            rows={2}
                            placeholder={t.collaboration.proposals.counterOfferPlaceholder}
                            className="pw-input pw-input-sm resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsDeclining(false)}
                            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200 transition cursor-pointer"
                        >
                            {t.collaboration.proposals.back}
                        </button>
                        <BrandActionButton
                            onClick={submitDecline}
                            disabled={isResponding || (!declineReason && !counterOffer.trim())}
                            className="text-sm"
                        >
                            {isResponding ? t.collaboration.proposals.sending : t.collaboration.proposals.sendResponse}
                        </BrandActionButton>
                    </div>
                </div>
            )}

            {/* Trust signals footer */}
            {!isPreview && (
                <TrustSignalsFooter
                    licenseNumber={licenseNumber}
                    lastUpdated={proposal.createdAt}
                />
            )}
        </BrandCard>
    )
}
