"use client"

import React, { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import {
    AlertTriangle,
    BadgeCheck,
    Check,
    ChevronDown,
    ChevronUp,
    Flag,
    Info,
    Pencil,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge"
import { SourceSnippetBox } from "@/components/ui/SourceSnippetBox"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { formatDocumentDate, parseDocumentDate, toIsoDateString } from "@/lib/dates/document-date"
import { formatExtractedAmount } from "@/lib/i18n/amount-format"
import { confirmPolicyReview, flagPolicyExtraction } from "@/app/(protected)/wallet/actions"
import {
    confidenceLevel,
    sumInsuredLabel,
    type PolicyReviewData,
} from "@/lib/wallet/policy-review"

type EditableField =
    | "insurerName"
    | "policyNumber"
    | "lineOfBusiness"
    | "issueDate"
    | "startDate"
    | "endDate"
    | "renewalDate"
    | "premiumAmount"
    | "premiumFrequency"
    | "sumInsured"

interface PolicyReviewScreenProps {
    data: PolicyReviewData
    insurers: { id: string; name: string }[]
    types: { id: string; name: string; slug: string }[]
    /** Called after a successful confirm (and by "skip for now"). */
    onDone: () => void
    /** Re-run analysis after a flag — shown only when provided. */
}

const CHIP_FIELDS: EditableField[] = [
    "insurerName",
    "policyNumber",
    "lineOfBusiness",
    "startDate",
    "endDate",
    "premiumAmount",
    "issueDate",
    "premiumFrequency",
    "renewalDate",
]


export function PolicyReviewScreen({ data, insurers, types, onDone }: PolicyReviewScreenProps) {
    const { t, language } = useLanguage()
    const reviewCopy = t.wallet.review
    const [isPending, startTransition] = useTransition()
    const [edits, setEdits] = useState<Partial<Record<EditableField, string>>>({})
    const [editingField, setEditingField] = useState<EditableField | null>(null)
    const [flagOpen, setFlagOpen] = useState(false)
    const [flagReason, setFlagReason] = useState("")
    const [flagged, setFlagged] = useState(data.reviewState === "flagged")
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ coverages: true })
    // Fields whose parse/cross-check failed that the user explicitly skipped.
    const [skippedFields, setSkippedFields] = useState<Partial<Record<EditableField, boolean>>>({})
    const [confirmAttempted, setConfirmAttempted] = useState(false)

    const locale = language === "el" ? "el-GR" : "en-GB"
    const pick = (obj: { en: string; el: string } | undefined) =>
        obj ? obj[language === "el" ? "el" : "en"] || obj.en : ""

    const lobLabel = (slug: string) =>
        (t.policyTypes as Record<string, string>)[slug] || slug

    const statusLabel = useMemo(() => {
        const key = data.status === "action_needed" ? "actionNeeded" : data.status
        return (t.policyStatus as Record<string, string>)[key] || data.status
    }, [data.status, t])

    const frequencyLabels: Record<string, string> = {
        annual: reviewCopy.frequencyAnnual,
        semiannual: reviewCopy.frequencySemiAnnual,
        quarterly: reviewCopy.frequencyQuarterly,
        monthly: reviewCopy.frequencyMonthly,
        one_off: reviewCopy.frequencyOneOff,
    }

    const chipLabels = {
        high: reviewCopy.confidenceHigh,
        medium: reviewCopy.confidenceMedium,
        low: reviewCopy.confidenceLow,
        notFound: reviewCopy.notFound,
    }

    // parseDocumentDate handles ISO, DD-MM-YYYY and Greek month phrases;
    // anything unparseable renders as null (never the literal "Invalid Date").
    const formatDate = (iso: string | null) => formatDocumentDate(iso, locale)
    const formatMoney = (amount: number | null) =>
        amount !== null
            ? new Intl.NumberFormat(locale, { style: "currency", currency: data.premiumCurrency || "EUR" }).format(amount)
            : null

    // Date edit inputs are type="date" — they need yyyy-MM-dd or nothing.
    const isoDateInput = (value: string | null | undefined): string =>
        toIsoDateString(parseDocumentDate(value)) || ""

    // Effective (post-edit) value for display; raw values feed the inputs.
    const rawValue = (field: EditableField): string => {
        if (edits[field] !== undefined) return edits[field] as string
        switch (field) {
            case "insurerName": return data.insurerName || ""
            case "policyNumber": return data.policyNumber || ""
            case "lineOfBusiness": return data.lineOfBusiness || ""
            case "issueDate": return isoDateInput(data.issueDate)
            case "startDate": return isoDateInput(data.startDate)
            case "endDate": return isoDateInput(data.endDate)
            case "renewalDate": return isoDateInput(data.renewalDate)
            case "premiumAmount": return data.premiumAmount !== null ? String(data.premiumAmount) : ""
            case "premiumFrequency": return data.premiumFrequency || ""
            case "sumInsured": return data.sumInsured ? String(data.sumInsured.value) : ""
        }
    }

    const displayValue = (field: EditableField): string | null => {
        const raw = rawValue(field)
        if (!raw) return null
        switch (field) {
            case "lineOfBusiness": return lobLabel(raw)
            case "issueDate":
            case "startDate":
            case "endDate":
            case "renewalDate": return formatDate(raw)
            case "premiumAmount": return formatMoney(Number(raw))
            case "sumInsured": return formatMoney(Number(raw))
            case "premiumFrequency": return frequencyLabels[raw] || raw
            default: return raw
        }
    }

    const setEdit = (field: EditableField, value: string) =>
        setEdits((prev) => ({ ...prev, [field]: value }))

    // Deterministically flagged date fields: parse failed or the value
    // disagrees with the cited snippet. Confidence is invalidated for them
    // and confirm requires a fill or an explicit skip.
    const isFieldFlagged = (field: EditableField): boolean => {
        const flags = data.fieldFlags?.[field]
        return Boolean(flags && (flags.parseFailed || flags.sourceMismatch))
    }
    const blockedFields = (["issueDate", "startDate", "endDate", "renewalDate"] as EditableField[])
        .filter((field) => isFieldFlagged(field) && edits[field] === undefined && !skippedFields[field])

    const handleConfirm = () => {
        // No silent confirmation of parse-failed fields: highlight and scroll
        // to the first one; the user fills it or explicitly skips it.
        if (blockedFields.length > 0) {
            setConfirmAttempted(true)
            toast.error(reviewCopy.confirmBlockedNotice)
            document
                .getElementById(`review-field-${blockedFields[0]}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            return
        }
        startTransition(async () => {
            const payload: Record<string, unknown> = {}
            for (const [field, value] of Object.entries(edits)) {
                if (value === undefined || value === "") continue
                if (field === "premiumAmount" || field === "sumInsured") payload[field] = Number(value)
                else payload[field] = value
            }
            const result = await confirmPolicyReview(data.id, payload)
            if (result && "error" in result) {
                toast.error(mapWalletErrorToMessage(result.error, t, "updatePolicy"))
                return
            }
            toast.success(reviewCopy.success)
            onDone()
        })
    }

    const handleFlag = () => {
        startTransition(async () => {
            const result = await flagPolicyExtraction(data.id, flagReason)
            if (result && "error" in result) {
                toast.error(mapWalletErrorToMessage(result.error, t, "generic"))
                return
            }
            setFlagged(true)
            setFlagOpen(false)
            toast.success(reviewCopy.flagSubmitted)
        })
    }

    const inputClasses = "pw-input pw-input-sm dark:focus:border-mint"

    const renderEditor = (field: EditableField) => {
        const commonProps = {
            autoFocus: true,
            value: rawValue(field),
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setEdit(field, e.target.value),
            className: inputClasses,
        }
        if (field === "lineOfBusiness") {
            return (
                <select {...commonProps}>
                    {types.map((type) => (
                        <option key={type.id} value={type.slug}>
                            {lobLabel(type.slug)}
                        </option>
                    ))}
                </select>
            )
        }
        if (field === "premiumFrequency") {
            return (
                <select {...commonProps}>
                    <option value="" />
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            )
        }
        if (field === "issueDate" || field === "startDate" || field === "endDate" || field === "renewalDate") {
            return <input type="date" {...commonProps} />
        }
        if (field === "premiumAmount" || field === "sumInsured") {
            return <input type="number" min="0" step="0.01" {...commonProps} />
        }
        if (field === "insurerName") {
            return (
                <>
                    <input type="text" list="review-insurers" {...commonProps} />
                    <datalist id="review-insurers">
                        {insurers.map((insurer) => (
                            <option key={insurer.id} value={insurer.name} />
                        ))}
                    </datalist>
                </>
            )
        }
        return <input type="text" {...commonProps} />
    }

    const renderFieldRow = (
        field: EditableField,
        label: string,
        sublabel?: string,
    ) => {
        const value = displayValue(field)
        const isEditing = editingField === field
        const isDirty = edits[field] !== undefined
        const score = data.fieldConfidence?.[field]
        const missing = !value || data.missingCriticalFields.includes(field)
        const source = data.fieldSources?.[field]
        // Failed parse / snippet mismatch invalidates the AI confidence —
        // the badge must never say "Υψηλή βεβαιότητα" over a broken value.
        const fieldFlagged = isFieldFlagged(field) && !isDirty
        const isSkipped = Boolean(skippedFields[field])
        const isBlocking = confirmAttempted && fieldFlagged && !isSkipped

        return (
            <div
                key={field}
                id={`review-field-${field}`}
                className={`flex items-start gap-3 py-3.5 ${
                    isBlocking ? "rounded-xl px-3 ring-2 ring-amber-400/70 dark:ring-amber-500/60" : ""
                }`}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {label}
                        </p>
                        {CHIP_FIELDS.includes(field) && !isDirty && (
                            fieldFlagged ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-kicker font-semibold text-[#92400E] dark:bg-amber-900/30 dark:text-amber-300">
                                    <AlertTriangle className="h-3 w-3" />
                                    {reviewCopy.confidenceInvalidated}
                                </span>
                            ) : (
                                <ConfidenceBadge score={score} missing={missing} labels={chipLabels} />
                            )
                        )}
                        {isDirty && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-kicker font-semibold text-[#166534] dark:bg-primary/15 dark:text-mint">
                                <Check className="h-3 w-3" />
                                {reviewCopy.edit}
                            </span>
                        )}
                        {fieldFlagged && isSkipped && !isDirty && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-kicker font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {reviewCopy.skippedChip}
                            </span>
                        )}
                    </div>
                    {sublabel && (
                        <p className="mt-0.5 text-kicker text-slate-500 dark:text-slate-400">{sublabel}</p>
                    )}
                    {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                            {renderEditor(field)}
                            <button
                                type="button"
                                onClick={() => setEditingField(null)}
                                aria-label={reviewCopy.confirm}
                                className="flex-shrink-0 rounded-xl bg-primary p-2 text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <p className={`mt-0.5 text-sm font-medium ${value && !fieldFlagged ? "text-slate-900 dark:text-white" : "text-slate-500 italic"}`}>
                            {fieldFlagged ? reviewCopy.fieldValueFillIn : value || reviewCopy.fieldValueMissing}
                        </p>
                    )}
                    {fieldFlagged && !isSkipped && !isEditing && (
                        <button
                            type="button"
                            onClick={() => setSkippedFields((prev) => ({ ...prev, [field]: true }))}
                            className="mt-1.5 text-micro font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
                        >
                            {reviewCopy.skipField}
                        </button>
                    )}
                    {source && !isEditing && (
                        <SourceSnippetBox
                            snippet={source.snippet}
                            page={source.page}
                            labels={{ fromDocument: reviewCopy.sourceFromDocument, pageAbbrev: reviewCopy.sourcePageAbbrev }}
                            className="mt-2"
                        />
                    )}
                </div>
                {!isEditing && (
                    <button
                        type="button"
                        onClick={() => setEditingField(field)}
                        aria-label={`${reviewCopy.editField}: ${label}`}
                        className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
                            fieldFlagged
                                ? "bg-amber-100 text-[#92400E] hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        )
    }

    const renderListSection = (
        id: string,
        title: string,
        count: number,
        children: React.ReactNode,
    ) => {
        if (count === 0) return null
        const open = Boolean(openSections[id])
        return (
            <div key={id} className="border-t border-slate-100 py-3 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => setOpenSections((prev) => ({ ...prev, [id]: !open }))}
                    className="flex w-full items-center gap-2 text-left"
                >
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {title}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-kicker font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {count}
                    </span>
                    <span className="ml-auto text-slate-500 dark:text-slate-400">
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                </button>
                {open && <div className="mt-3 space-y-2">{children}</div>}
            </div>
        )
    }

    const riskStyles: Record<string, string> = {
        critical: "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20",
        warning: "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20",
        info: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-black text-primary dark:bg-primary/15 dark:text-mint">
                    {(data.insurerName || lobLabel(data.lineOfBusiness) || "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                            {data.insurerName || lobLabel(data.lineOfBusiness)}
                        </h2>
                        {data.verified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {lobLabel(data.lineOfBusiness)}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {statusLabel}
                        </span>
                    </div>
                </div>
                {data.overallConfidence !== null && (
                    <div className="flex-shrink-0 text-right">
                        <p className="text-kicker font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {reviewCopy.overallConfidence}
                        </p>
                        <p className={`text-lg font-black ${confidenceLevel(data.overallConfidence) === "high" ? "text-primary dark:text-mint" : confidenceLevel(data.overallConfidence) === "medium" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
                            {Math.round(data.overallConfidence)}%
                        </p>
                    </div>
                )}
            </div>

            {/* AI-mistake microcopy */}
            <div className="rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-[#92400E] dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {reviewCopy.aiMistakeNotice}
                </p>
                <div className="mt-1.5 pl-5">
                    <AiDisclaimer variant="inline" />
                </div>
            </div>

            {/* Editable field rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {renderFieldRow("insurerName", reviewCopy.insurer)}
                {renderFieldRow("lineOfBusiness", reviewCopy.policyType)}
                {renderFieldRow("policyNumber", t.wallet.policyNumber)}
                {renderFieldRow("issueDate", reviewCopy.issueDate)}
                {renderFieldRow("startDate", reviewCopy.startDate)}
                {renderFieldRow("endDate", reviewCopy.endDate)}
                {renderFieldRow("renewalDate", reviewCopy.renewalDate)}
                {renderFieldRow("sumInsured", reviewCopy.sumInsured, sumInsuredLabel(data.sumInsured?.label, language === "el" ? "el" : "en") || undefined)}
                {renderFieldRow("premiumAmount", reviewCopy.premium)}
                {renderFieldRow("premiumFrequency", reviewCopy.premiumFrequency)}
            </div>

            {/* Coverage summary */}
            {data.coverageSummary && (
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/40">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary dark:text-mint" />
                        {reviewCopy.coverageType}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {data.coverageSummary}
                    </p>
                </div>
            )}

            {/* Extracted list sections */}
            <div>
                {renderListSection("coverages", reviewCopy.mainCoverages, data.coverages.length, (
                    data.coverages.map((coverage, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                                    {coverage.name}
                                </p>
                                {coverage.limit && (
                                    <span className="flex-shrink-0 text-xs font-bold text-primary dark:text-mint">
                                        {formatExtractedAmount(coverage.limit, language === "el" ? "el" : "en")}
                                    </span>
                                )}
                            </div>
                            {(pick(coverage.explanation) || coverage.description) && (
                                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    {pick(coverage.explanation) || coverage.description}
                                </p>
                            )}
                        </div>
                    ))
                ))}

                {renderListSection("exclusions", reviewCopy.exclusionsTitle, data.exclusions.length, (
                    data.exclusions.map((exclusion, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                            <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{exclusion}</p>
                        </div>
                    ))
                ))}

                {renderListSection("perks", reviewCopy.perksTitle, data.perksAndBenefits.length, (
                    data.perksAndBenefits.map((perk, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" />
                                <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                                    {pick(perk.name)}
                                </p>
                                {perk.usageLimit && (
                                    <span className="flex-shrink-0 text-kicker font-semibold text-slate-500 dark:text-slate-400">
                                        {formatExtractedAmount(perk.usageLimit, language === "el" ? "el" : "en")}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                {pick(perk.description)}
                            </p>
                        </div>
                    ))
                ))}

                {renderListSection("conditions", reviewCopy.conditionsTitle, data.notableConditions.length, (
                    data.notableConditions.map((condition, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm text-slate-700 dark:text-slate-300">{pick(condition.summary)}</p>
                                {condition.value && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-kicker font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        {formatExtractedAmount(condition.value, language === "el" ? "el" : "en")}
                                    </span>
                                )}
                                {condition.userActionRequired && (
                                    <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-kicker font-bold uppercase tracking-wider text-[#92400E] dark:bg-amber-900/30 dark:text-amber-400">
                                        {reviewCopy.actionRequired}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                ))}

                {renderListSection("finePrint", reviewCopy.finePrintTitle, data.finePrintClauses.length, (
                    data.finePrintClauses.map((clause, i) => (
                        <div key={i} className={`rounded-xl border p-3 ${riskStyles[clause.riskLevel] || riskStyles.info}`}>
                            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
                                {pick(clause.impactSummary) || clause.clause}
                            </p>
                        </div>
                    ))
                ))}
            </div>

            {/* Flag panel */}
            {flagOpen && !flagged && (
                <div className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <textarea
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        placeholder={reviewCopy.flagReasonPlaceholder}
                        rows={2}
                        maxLength={500}
                        className={`${inputClasses} resize-none`}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleFlag}
                            disabled={isPending}
                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                            {reviewCopy.flagSubmit}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFlagOpen(false)}
                            className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t.common.cancel}
                        </button>
                    </div>
                </div>
            )}

            {flagged && (
                <div className="rounded-2xl border border-amber-200 bg-[#FEF3C7]/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-[#92400E] dark:text-amber-400">
                        <Flag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        {reviewCopy.flagSubmitted}
                    </p>
                </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
                <p className="text-center text-micro text-slate-500 dark:text-slate-400">
                    {reviewCopy.aiMistakeNotice}
                </p>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="pw-primary-button w-full uppercase tracking-widest shadow-primary/25"
                >
                    <span className="flex items-center justify-center gap-2">
                        <Check className="h-5 w-5" />
                        {reviewCopy.confirm}
                    </span>
                </button>

                {!flagged && !flagOpen && (
                    <button
                        type="button"
                        onClick={() => setFlagOpen(true)}
                        className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Flag className="h-4 w-4" />
                            {reviewCopy.flagCta}
                        </span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={onDone}
                    className="text-xs text-slate-500 dark:text-slate-400 underline transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                    {reviewCopy.skipForNow}
                </button>
            </div>
        </div>
    )
}
