"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"
import { MedicScorecard } from "@/components/agent/MedicScorecard"
import {
    logOpportunityNote,
    suggestQualificationFromNotes,
    applyQualificationSuggestions,
    patchOpportunityMedic,
} from "@/app/(protected)/agent/actions"
import type { MedicData } from "@/lib/medic/types"
import type { MedicPatch } from "@/lib/medic/patch"
import type { QualificationSuggestions } from "@/lib/medic/suggest"

interface OpportunityUpdateModalProps {
    isOpen: boolean
    onClose: () => void
    opportunity: {
        id: string
        customerName: string
        title: string
        status: string
        notes?: string
        /** MEDIC qualification snapshot (read view — blueprint §F). */
        medic?: MedicData | null
    }
    onUpdate: (opportunityId: string, status: string, notes: string, nextActionDate?: string) => Promise<void>
}

export function OpportunityUpdateModal({ isOpen, onClose, opportunity, onUpdate }: OpportunityUpdateModalProps) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const tt = t.agentModals.opportunityUpdate
    const OPPORTUNITY_STATUSES = [
        { value: 'open', label: tt.statusOpen, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-2 border-amber-500' },
        { value: 'contacted', label: tt.statusContacted, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500' },
        { value: 'quoted', label: tt.statusQuoted, color: 'bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border-2 border-primary' },
        { value: 'won', label: tt.statusWon, color: 'bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-2 border-primary' },
        { value: 'lost', label: tt.statusLost, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-500' },
        { value: 'on_hold', label: tt.statusOnHold, color: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-2 border-neutral-400' },
    ]

    const [status, setStatus] = useState(opportunity.status)
    const [notes, setNotes] = useState(opportunity.notes || '')
    const [nextActionDate, setNextActionDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    // Discovery-note capture (MEDIC note create-path) — separate from the
    // status form so a note never rides along with an accidental status change.
    const [noteDraft, setNoteDraft] = useState('')
    const [savingNote, setSavingNote] = useState(false)

    const handleLogNote = async () => {
        if (!noteDraft.trim()) return
        setSavingNote(true)
        const res = await logOpportunityNote(opportunity.id, noteDraft)
        setSavingNote(false)
        if (res && 'success' in res && res.success) {
            setNoteDraft('')
            toast.success(tt.logNoteSaved)
        } else {
            toast.error(tt.logNoteError)
        }
    }

    // suggestQualification (§I): AI proposes, the advisor confirms each row.
    const [suggesting, setSuggesting] = useState(false)
    const [suggestions, setSuggestions] = useState<QualificationSuggestions | null>(null)
    const [rejected, setRejected] = useState<Set<string>>(new Set())
    const [applying, setApplying] = useState(false)
    const [medicView, setMedicView] = useState<MedicData | null>(opportunity.medic ?? null)

    const handleSuggest = async () => {
        setSuggesting(true)
        setSuggestions(null)
        const res = await suggestQualificationFromNotes(opportunity.id)
        setSuggesting(false)
        if (res && 'success' in res && res.success) {
            const s = res.suggestions
            if (s.stakeholders.length === 0 && s.criteria.length === 0 && !s.pain) {
                toast.info(tt.suggestNone)
            } else {
                setSuggestions(s)
                setRejected(new Set())
            }
        } else if (res && 'error' in res && res.error === 'NO_NOTES') {
            toast.info(tt.suggestNoNotes)
        } else {
            toast.error(tt.suggestError)
        }
    }

    const handleApplySuggestions = async () => {
        if (!suggestions) return
        const accepted: QualificationSuggestions = {
            stakeholders: suggestions.stakeholders.filter((_, i) => !rejected.has(`s${i}`)),
            criteria: suggestions.criteria.filter((_, i) => !rejected.has(`c${i}`)),
            pain: suggestions.pain && !rejected.has('pain') ? suggestions.pain : null,
        }
        setApplying(true)
        const res = await applyQualificationSuggestions(opportunity.id, accepted)
        setApplying(false)
        if (res && 'success' in res && res.success) {
            setSuggestions(null)
            setMedicView(res.medic as MedicData)
            toast.success(tt.suggestApplied)
        } else {
            toast.error(tt.suggestError)
        }
    }

    // §F inline fields: € value-at-risk + stakeholder identification.
    const handleMedicPatch = async (patch: MedicPatch) => {
        const res = await patchOpportunityMedic(opportunity.id, patch)
        if (res && 'success' in res && res.success) {
            setMedicView(res.medic as MedicData)
        } else {
            toast.error(tt.scPatchError)
        }
    }

    const stanceLabel: Record<string, string> = {
        economic_buyer: tt.stanceEconomicBuyer,
        champion: tt.stanceChampion,
        influencer: tt.stanceInfluencer,
        blocker: tt.stanceBlocker,
    }

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await onUpdate(opportunity.id, status, notes, nextActionDate || undefined)
            onClose()
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    component: 'OpportunityUpdateModal',
                    opportunityId: opportunity.id
                }
            })
            toast.error(tt.updateError)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="opportunity-update-title" tabIndex={-1} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 id="opportunity-update-title" className="text-2xl font-bold text-foreground">
                                {tt.title}
                            </h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {opportunity.customerName} • {opportunity.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label={t.common.close}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* MEDIC scorecard — read view, progressive disclosure */}
                    <details className="group">
                        <summary className="cursor-pointer list-none text-sm font-bold text-neutral-700 dark:text-neutral-300">
                            <span className="group-open:hidden">{tt.scorecardShow}</span>
                            <span className="hidden group-open:inline">{tt.scorecardHide}</span>
                            <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">{tt.scorecardTitle}</span>
                        </summary>
                        <div className="mt-2">
                            <MedicScorecard
                                medic={medicView}
                                copy={{
                                    scorecardTitle: tt.scorecardTitle,
                                    scorecardHint: tt.scorecardHint,
                                    scorecardEmpty: tt.scorecardEmpty,
                                    dimMetrics: tt.dimMetrics,
                                    dimEconomicBuyer: tt.dimEconomicBuyer,
                                    dimDecisionCriteria: tt.dimDecisionCriteria,
                                    dimDecisionProcess: tt.dimDecisionProcess,
                                    dimIdentifyPain: tt.dimIdentifyPain,
                                    dimChampion: tt.dimChampion,
                                    ratingMissing: tt.ratingMissing,
                                    ratingPartial: tt.ratingPartial,
                                    ratingSolid: tt.ratingSolid,
                                    qualifiedYes: tt.qualifiedYes,
                                    qualifiedNo: tt.qualifiedNo,
                                    complianceClear: tt.complianceClear,
                                    complianceOpen: tt.complianceOpen,
                                    scValueAtRisk: tt.scValueAtRisk,
                                    scSave: tt.scSave,
                                    scAddEb: tt.scAddEb,
                                    scEbNamePlaceholder: tt.scEbNamePlaceholder,
                                    scIdentified: tt.scIdentified,
                                }}
                                onPatch={handleMedicPatch}
                            />
                        </div>
                    </details>

                    {/* suggestQualification (§I): AI proposes rows with verbatim
                        evidence; the advisor unchecks rejects and applies. */}
                    <div>
                        <button
                            type="button"
                            onClick={handleSuggest}
                            disabled={suggesting}
                            className="pw-secondary-button pw-btn-sm disabled:opacity-50"
                        >
                            {suggesting ? tt.suggesting : tt.suggestCta}
                        </button>
                        {suggestions && (
                            <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
                                <p className="mb-2 text-xs text-black/60 dark:text-white/65">{tt.suggestReview}</p>
                                <ul className="space-y-2">
                                    {suggestions.stakeholders.map((s, i) => (
                                        <li key={`s${i}`} className="flex items-start gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                id={`sug-s${i}`}
                                                checked={!rejected.has(`s${i}`)}
                                                onChange={() => setRejected((prev) => {
                                                    const next = new Set(prev)
                                                    if (next.has(`s${i}`)) next.delete(`s${i}`)
                                                    else next.add(`s${i}`)
                                                    return next
                                                })}
                                                className="mt-0.5"
                                            />
                                            <label htmlFor={`sug-s${i}`} className="min-w-0 flex-1 cursor-pointer">
                                                <span className="font-semibold text-black dark:text-white">{s.name}</span>{" "}
                                                <span className="text-black/60 dark:text-white/60">— {stanceLabel[s.stance] ?? s.stance}</span>
                                                <span className="mt-0.5 block text-black/55 dark:text-white/55">
                                                    {tt.suggestEvidence}: «{s.evidenceSnippet}»
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                    {suggestions.criteria.map((c, i) => (
                                        <li key={`c${i}`} className="flex items-start gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                id={`sug-c${i}`}
                                                checked={!rejected.has(`c${i}`)}
                                                onChange={() => setRejected((prev) => {
                                                    const next = new Set(prev)
                                                    if (next.has(`c${i}`)) next.delete(`c${i}`)
                                                    else next.add(`c${i}`)
                                                    return next
                                                })}
                                                className="mt-0.5"
                                            />
                                            <label htmlFor={`sug-c${i}`} className="min-w-0 flex-1 cursor-pointer">
                                                <span className="font-semibold text-black dark:text-white">{tt.suggestCriterionLabel}:</span>{" "}
                                                <span className="text-black/70 dark:text-white/70">{c.label}</span>
                                                <span className="mt-0.5 block text-black/55 dark:text-white/55">
                                                    {tt.suggestEvidence}: «{c.evidenceSnippet}»
                                                </span>
                                            </label>
                                        </li>
                                    ))}
                                    {suggestions.pain && (
                                        <li className="flex items-start gap-2 text-xs">
                                            <input
                                                type="checkbox"
                                                id="sug-pain"
                                                checked={!rejected.has('pain')}
                                                onChange={() => setRejected((prev) => {
                                                    const next = new Set(prev)
                                                    if (next.has('pain')) next.delete('pain')
                                                    else next.add('pain')
                                                    return next
                                                })}
                                                className="mt-0.5"
                                            />
                                            <label htmlFor="sug-pain" className="min-w-0 flex-1 cursor-pointer">
                                                <span className="font-semibold text-black dark:text-white">{tt.suggestPainLabel}:</span>{" "}
                                                <span className="text-black/70 dark:text-white/70">{suggestions.pain.summary}</span>
                                                <span className="mt-0.5 block text-black/55 dark:text-white/55">
                                                    {tt.suggestEvidence}: «{suggestions.pain.evidenceSnippet}»
                                                </span>
                                            </label>
                                        </li>
                                    )}
                                </ul>
                                <button
                                    type="button"
                                    onClick={handleApplySuggestions}
                                    disabled={applying}
                                    className="pw-primary-button pw-btn-sm mt-3 disabled:opacity-50"
                                >
                                    {applying ? tt.suggestApplying : tt.suggestApply}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Log note — the MEDIC discovery capture path. Separate
                        button, never submits the status form. */}
                    <div>
                        <label htmlFor="opp-log-note" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.logNoteLabel}
                        </label>
                        <div className="flex gap-2">
                            <textarea
                                id="opp-log-note"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder={tt.logNotePlaceholder}
                                rows={2}
                                className="pw-input flex-1 resize-none"
                            />
                            <button
                                type="button"
                                onClick={handleLogNote}
                                disabled={savingNote || !noteDraft.trim()}
                                className="pw-secondary-button pw-btn-sm self-end disabled:opacity-50"
                            >
                                {savingNote ? tt.logNoteSaving : tt.logNoteCta}
                            </button>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.statusLabel}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {OPPORTUNITY_STATUSES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setStatus(s.value)}
                                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${status === s.value
                                            ? s.color
                                            : 'bg-neutral-50 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.notesLabel}
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="pw-input dark:focus:border-mint"
                            placeholder={tt.notesPlaceholder}
                        />
                    </div>

                    {/* Next Action Date */}
                    <div>
                        <label htmlFor="nextActionDate" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.nextActionLabel}
                        </label>
                        <input
                            type="date"
                            id="nextActionDate"
                            value={nextActionDate}
                            onChange={(e) => setNextActionDate(e.target.value)}
                            className="pw-input dark:focus:border-mint"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                        >
                            {tt.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="pw-primary-button flex-1 shadow-primary/25"
                        >
                            {isSubmitting ? tt.updating : tt.updateBtn}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
