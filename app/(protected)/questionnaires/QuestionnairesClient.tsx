"use client"

import { useId, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import {
    ClipboardList, Plus, Trash2, GripVertical, Eye, Send,
    Sparkles, CheckCircle2, Clock, FileQuestion,
    AlertCircle, X
} from "lucide-react"
import type { TemplateData, InstanceData, TemplateQuestion } from "./actions"
import { createTemplate, updateTemplate, deleteTemplate, analyzeQuestionnaireResponse } from "./actions"
import { EmptyState } from "@/components/ui/EmptyState"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { toast } from "sonner"
import { useDialog } from "@/hooks/useDialog"
import { TableShell } from "@/components/ui/TableShell"

import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
const copy = {
    en: {
        kicker: "QUESTIONNAIRES",
        title: "Questionnaire Manager",
        subtitle: "Create templates, track sent questionnaires, and analyze customer responses.",
        templates: "Templates",
        sent: "Sent Questionnaires",
        createNew: "Create Template",
        system: "System",
        custom: "Custom",
        questions: "questions",
        sentCount: "sent",
        editTemplate: "Edit",
        moreQuestions: "+{n} more",
        namePlaceholder: "e.g. Annual coverage check",
        errorNameRequired: "Give the template a name",
        errorAddQuestion: "Add at least one question",
        errorQuestionText: "Every question needs its text",
        deleteTemplate: "Delete",
        deleteTemplateTitle: "Delete this template?",
        deleteTemplateBody: "The template is removed from your library. Questionnaires already sent keep their answers.",
        deleteTemplateFailed: "The template could not be deleted. Please try again.",
        saveTemplateFailed: "The template could not be saved. Please try again.",
        templateName: "Template Name",
        lob: "Line of Business",
        addQuestion: "Add Question",
        questionLabel: "Question text (EN)",
        questionLabelEl: "Question text (EL)",
        questionType: "Type",
        removeQuestion: "Remove question",
        markRequired: "Required question",
        required: "Required",
        optional: "Optional",
        options: "Options (comma-separated)",
        optionsEl: "Options EL (comma-separated)",
        save: "Save Template",
        cancel: "Cancel",
        customer: "Customer",
        sortLabel: "Sort",
        defaultOrder: "Default order",
        template: "Template",
        status: "Status",
        sentAt: "Sent",
        pending: "Pending",
        completed: "Completed",
        analyze: "AI Analysis",
        noTemplates: "No templates yet",
        noTemplatesDesc: "Build a reusable questionnaire to capture client needs and detect coverage gaps faster.",
        noInstances: "No sent questionnaires yet",
        noInstancesDesc: "Send a questionnaire from a client's profile to start collecting responses here.",
        viewClients: "View clients",
        analysisTitle: "Response Analysis",
        needs: "Needs Identified",
        recommendations: "Recommendations",
        missingCoverage: "Missing Coverage",
        answers: "Answers",
        essential: "Essential",
        text: "Text",
        number: "Number",
        boolean: "Yes/No",
        select: "Dropdown",
    },
    el: {
        kicker: "ΕΡΩΤΗΜΑΤΟΛΟΓΙΑ",
        title: "Διαχείριση ερωτηματολογίων",
        subtitle: "Δημιουργήστε πρότυπα, παρακολουθήστε και αναλύστε απαντήσεις πελατών.",
        templates: "Πρότυπα",
        sent: "Απεσταλμένα",
        createNew: "Νέο πρότυπο",
        system: "Σύστημα",
        custom: "Προσαρμοσμένο",
        questions: "ερωτήσεις",
        sentCount: "αποστολές",
        editTemplate: "Επεξεργασία",
        moreQuestions: "+{n} ακόμη",
        namePlaceholder: "π.χ. Ετήσιος έλεγχος κάλυψης",
        errorNameRequired: "Δώστε ένα όνομα στο πρότυπο",
        errorAddQuestion: "Προσθέστε τουλάχιστον μία ερώτηση",
        errorQuestionText: "Κάθε ερώτηση χρειάζεται κείμενο",
        deleteTemplate: "Διαγραφή",
        deleteTemplateTitle: "Διαγραφή του προτύπου;",
        deleteTemplateBody: "Το πρότυπο αφαιρείται από τη βιβλιοθήκη σας. Τα ερωτηματολόγια που έχουν ήδη σταλεί διατηρούν τις απαντήσεις τους.",
        deleteTemplateFailed: "Το πρότυπο δεν διαγράφηκε. Δοκιμάστε ξανά.",
        saveTemplateFailed: "Το πρότυπο δεν αποθηκεύτηκε. Δοκιμάστε ξανά.",
        templateName: "Όνομα προτύπου",
        lob: "Κλάδος ασφάλισης",
        addQuestion: "Προσθήκη ερώτησης",
        questionLabel: "Κείμενο ερώτησης (EN)",
        questionLabelEl: "Κείμενο ερώτησης (EL)",
        questionType: "Τύπος",
        removeQuestion: "Αφαίρεση ερώτησης",
        markRequired: "Υποχρεωτική ερώτηση",
        required: "Υποχρεωτικό",
        optional: "Προαιρετικό",
        options: "Επιλογές (χωρισμένες με κόμμα)",
        optionsEl: "Επιλογές EL (χωρισμένες με κόμμα)",
        save: "Αποθήκευση",
        cancel: "Ακύρωση",
        customer: "Πελάτης",
        sortLabel: "Ταξινόμηση",
        defaultOrder: "Προεπιλεγμένη σειρά",
        template: "Πρότυπο",
        status: "Κατάσταση",
        sentAt: "Αποστολή",
        pending: "Αναμονή",
        completed: "Ολοκληρωμένο",
        analyze: "Ανάλυση AI",
        noTemplates: "Δεν υπάρχουν πρότυπα",
        noTemplatesDesc: "Δημιουργήστε ένα επαναχρησιμοποιήσιμο ερωτηματολόγιο για να καταγράφετε ανάγκες πελατών και να εντοπίζετε κενά κάλυψης πιο γρήγορα.",
        noInstances: "Δεν υπάρχουν απεσταλμένα ερωτηματολόγια",
        noInstancesDesc: "Στείλτε ένα ερωτηματολόγιο από το προφίλ ενός πελάτη για να αρχίσετε να συλλέγετε απαντήσεις εδώ.",
        viewClients: "Προβολή πελατών",
        analysisTitle: "Ανάλυση απαντήσεων",
        needs: "Αναγνωρισμένες ανάγκες",
        recommendations: "Συστάσεις",
        missingCoverage: "Ελλείψεις κάλυψης",
        answers: "Απαντήσεις",
        essential: "Απαραίτητο",
        text: "Κείμενο",
        number: "Αριθμός",
        boolean: "Ναι/Όχι",
        select: "Λίστα",
    },
}

const LOB_OPTIONS = [
    { value: "motor", label: "Motor", labelEl: "Αυτοκίνητο" },
    { value: "home", label: "Home", labelEl: "Κατοικία" },
    { value: "health", label: "Health", labelEl: "Υγεία" },
    { value: "life", label: "Life", labelEl: "Ζωή" },
    { value: "pet", label: "Pet", labelEl: "Κατοικίδιο" },
    { value: "travel", label: "Travel", labelEl: "Ταξίδι" },
    { value: "liability", label: "Liability", labelEl: "Ευθύνη" },
    { value: "other", label: "Other", labelEl: "Άλλο" },
]

interface Props {
    templates: TemplateData[]
    instances: InstanceData[]
}

type QSortKey = "customer" | "template" | "status" | "sentAt"

// State pills on the status TOKENS, the state as a word: no palette literals,
// no CSS uppercase (Greek capitals drop the tonos).
const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold"

export function QuestionnairesClient({ templates, instances }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const [tab, setTab] = useState<"templates" | "sent">("templates")
    const [showBuilder, setShowBuilder] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)


    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is, with its ONE primary action to the
                    right. The «ΕΡΩΤΗΜΑΤΟΛΟΓΙΑ» eyebrow is gone: the heading carries
                    its own weight, and CSS uppercase strips the tonos off Greek. */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.title}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setShowBuilder(true); setEditingId(null) }}
                        className="pw-primary-button"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t.createNew}
                    </button>
                </div>

                {/* View switch on the segmented recipe — aria-pressed drives the
                    active look, so the visual cannot disagree with what assistive
                    tech is told. A view is switched with a segment; an action is a
                    pill. */}
                <div className="pw-segmented pw-scroll-strip">
                    <button
                        type="button"
                        onClick={() => setTab("templates")}
                        aria-pressed={tab === "templates"}
                        className="pw-segment"
                    >
                        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.templates}
                        <span className="tabular-nums font-medium">{templates.length}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("sent")}
                        aria-pressed={tab === "sent"}
                        className="pw-segment"
                    >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.sent}
                        <span className="tabular-nums font-medium">{instances.length}</span>
                    </button>
                </div>

                {/* Builder modal */}
                {showBuilder && (
                    <TemplateBuilder
                        t={t}
                        language={language}
                        editingTemplate={editingId ? templates.find((tp) => tp.id === editingId) : undefined}
                        onClose={() => { setShowBuilder(false); setEditingId(null) }}
                    />
                )}

                {/* Templates tab */}
                {tab === "templates" && (
                    <TemplatesGrid
                        templates={templates}
                        t={t}
                        language={language}
                        onEdit={(id) => { setEditingId(id); setShowBuilder(true) }}
                        onCreate={() => { setShowBuilder(true); setEditingId(null) }}
                    />
                )}

                {/* Sent tab */}
                {tab === "sent" && (
                    <SentList instances={instances} t={t} language={language} />
                )}
            </div>
        </div>
    )
}

// ── Templates Grid ──

function TemplatesGrid({ templates, t, language, onEdit, onCreate }: {
    templates: TemplateData[]
    t: typeof copy.en
    language: string
    onEdit: (id: string) => void
    onCreate: () => void
}) {
    // Deleting a template used to be a single unconfirmed click with no pending
    // state and no error surface — irreversible and silent on failure. Routed
    // through the shared ConfirmDialog, which owns the pending state and blocks
    // a double-fire while the action is in flight.
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        try {
            // deleteTemplate RETURNS { error } for a refused delete (system
            // template, or one owned by another advisor) rather than throwing.
            // Only the throw was handled, so a refusal looked like success: the
            // dialog closed and the template stayed in the list unexplained.
            const result = await deleteTemplate(id)
            if (result && "error" in result && result.error) {
                toast.error(String(result.error))
                return
            }
            setPendingDeleteId(null)
        } catch {
            toast.error(t.deleteTemplateFailed)
        }
    }

    if (templates.length === 0) {
        return (
            <EmptyState
                icon={FileQuestion}
                headline={t.noTemplates}
                description={t.noTemplatesDesc}
                cta={{ label: t.createNew, onClick: onCreate }}
            />
        )
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
                /* One white card per template: the template as the card head with
                   its kind as the meta pill, facts as a caption, the first
                   questions as a list, and — for a custom template — the row
                   actions as ALWAYS-VISIBLE soft pills. They used to appear only
                   on hover, which a touch user never gets and a keyboard user
                   reached blind. */
                <div key={tpl.id} className="pw-card pw-pad flex flex-col">
                    <CardHead
                        icon={ClipboardList}
                        title={tpl.name}
                        meta={
                            <span className={`${pill} bg-muted text-foreground`}>
                                {tpl.isSystem ? t.system : t.custom}
                            </span>
                        }
                    />
                    <p className="mt-2 text-caption text-muted-foreground">
                        {normalizeBranch(tpl.lineOfBusiness).label[language === 'el' ? 'el' : 'en']} · {tpl.questions.length} {t.questions} · {tpl.instanceCount} {t.sentCount}
                    </p>

                    {/* Question preview */}
                    <div className="mt-3 flex-1">
                        <ol className="space-y-1.5">
                            {tpl.questions.slice(0, 3).map((q, i) => (
                                <li key={i} className="flex items-center gap-2 text-caption text-muted-foreground">
                                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md bg-muted text-caption font-semibold tabular-nums text-foreground" aria-hidden="true">
                                        {i + 1}
                                    </span>
                                    <span className="truncate">{language === "el" && q.labelEl ? q.labelEl : q.label}</span>
                                </li>
                            ))}
                        </ol>
                        {tpl.questions.length > 3 && (
                            <p className="mt-1.5 pl-7 text-caption text-muted-foreground">{t.moreQuestions.replace("{n}", String(tpl.questions.length - 3))}</p>
                        )}
                    </div>

                    {!tpl.isSystem && (
                        <div className="mt-4 flex gap-2 border-t border-border pt-3">
                            <button
                                type="button"
                                onClick={() => onEdit(tpl.id)}
                                className="pw-soft-button flex-1"
                            >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                {t.editTemplate}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingDeleteId(tpl.id)}
                                aria-label={`${t.deleteTemplate}: ${tpl.name}`}
                                className="pw-soft-button h-11 w-11 px-0 text-status-danger"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
            ))}
            <ConfirmDialog
                open={pendingDeleteId !== null}
                onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}
                title={t.deleteTemplateTitle}
                description={t.deleteTemplateBody}
                confirmLabel={t.deleteTemplate}
                destructive
                onConfirm={() => handleDelete(pendingDeleteId!)}
            />
        </div>
    )
}

// ── Template Builder ──

function TemplateBuilder({ t, language, editingTemplate, onClose }: {
    t: typeof copy.en
    language: string
    editingTemplate?: TemplateData
    onClose: () => void
}) {
    const [name, setName] = useState(editingTemplate?.name || "")
    // Mounted only while open, so the trap is unconditional here.
    const builderDialogRef = useDialog<HTMLDivElement>(onClose)
    const builderTitleId = useId()
    const [lob, setLob] = useState(editingTemplate?.lineOfBusiness || "motor")
    const [questions, setQuestions] = useState<TemplateQuestion[]>(
        editingTemplate?.questions || []
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: `q${questions.length + 1}`,
                type: "text",
                label: "",
                labelEl: "",
                required: false,
            },
        ])
    }

    const updateQuestion = (index: number, field: string, value: any) => {
        const updated = [...questions]
        ;(updated[index] as any)[field] = value
        setQuestions(updated)
    }

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!name.trim()) return setError(t.errorNameRequired)
        if (questions.length === 0) return setError(t.errorAddQuestion)
        if (questions.some((q) => !q.label.trim())) return setError(t.errorQuestionText)

        setSaving(true)
        setError("")

        // Normalize IDs
        const normalized = questions.map((q, i) => ({ ...q, id: `q${i + 1}` }))

        try {
            const result = editingTemplate
                ? await updateTemplate(editingTemplate.id, { name, lineOfBusiness: lob, questions: normalized })
                : await createTemplate({ name, lineOfBusiness: lob, questions: normalized })

            if (result.error) {
                setError(result.error)
                return
            }
            onClose()
        } catch {
            // setSaving(false) used to sit after a bare await, so a transport
            // failure pinned the builder on "Saving…" with the advisor's whole
            // template still unsaved in the form.
            setError(t.saveTemplateFailed)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div
                ref={builderDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={builderTitleId}
                tabIndex={-1}
                className="pw-card relative mb-16 w-full max-w-2xl shadow-xl"
            >
                <div className="pw-pad">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id={builderTitleId} className="text-title font-semibold text-foreground">
                            {editingTemplate ? t.editTemplate : t.createNew}
                        </h2>
                        <button type="button" onClick={onClose} aria-label={t.cancel} className="pw-soft-button h-11 w-11 shrink-0 px-0">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="qtpl-name" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.templateName}</label>
                            <input
                                id="qtpl-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pw-input"
                                placeholder={t.namePlaceholder}
                            />
                        </div>
                        <div>
                            <label htmlFor="qtpl-lob" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.lob}</label>
                            <select
                                id="qtpl-lob"
                                value={lob}
                                onChange={(e) => setLob(e.target.value)}
                                className="pw-input"
                            >
                                {LOB_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {language === "el" ? o.labelEl : o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Questions — each one a sub-card inside the dialog card. */}
                    <div className="mt-6 space-y-3">
                        {questions.map((q, i) => (
                            <div key={i} className="pw-subcard p-3 sm:p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <span className="text-caption font-semibold text-muted-foreground">
                                        Q{i + 1}
                                    </span>
                                    <div className="flex-1" />
                                    <select
                                        aria-label={`${t.questionType} — Q${i + 1}`}
                                        value={q.type}
                                        onChange={(e) => updateQuestion(i, "type", e.target.value)}
                                        className="pw-input pw-input-sm w-auto"
                                    >
                                        <option value="text">{t.text}</option>
                                        <option value="number">{t.number}</option>
                                        <option value="boolean">{t.boolean}</option>
                                        <option value="select">{t.select}</option>
                                    </select>
                                    {/* A toggle, not a status: the pressed state is the
                                        ink pill, and the word changes with it, so the
                                        state never rests on colour alone. */}
                                    <button
                                        type="button"
                                        aria-pressed={q.required}
                                        aria-label={`${t.markRequired} — Q${i + 1}`}
                                        onClick={() => updateQuestion(i, "required", !q.required)}
                                        className={`pw-soft-button ${q.required ? "bg-foreground text-background" : ""}`}
                                    >
                                        {q.required ? t.required : t.optional}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`${t.removeQuestion} — Q${i + 1}`}
                                        onClick={() => removeQuestion(i)}
                                        className="pw-soft-button h-11 w-11 px-0 text-status-danger"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <input
                                        type="text"
                                        value={q.label}
                                        aria-label={`${t.questionLabel} — Q${i + 1}`}
                                        onChange={(e) => updateQuestion(i, "label", e.target.value)}
                                        placeholder={t.questionLabel}
                                        className="pw-input pw-input-sm"
                                    />
                                    <input
                                        type="text"
                                        value={q.labelEl || ""}
                                        aria-label={`${t.questionLabelEl} — Q${i + 1}`}
                                        onChange={(e) => updateQuestion(i, "labelEl", e.target.value)}
                                        placeholder={t.questionLabelEl}
                                        className="pw-input pw-input-sm"
                                    />
                                </div>

                                {q.type === "select" && (
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <input
                                            type="text"
                                            value={q.options?.map((o) => o.label).join(", ") || ""}
                                            aria-label={`${t.options} — Q${i + 1}`}
                                            onChange={(e) => {
                                                const labels = e.target.value.split(",").map((s) => s.trim())
                                                updateQuestion(i, "options", labels.map((l, idx) => ({
                                                    label: l,
                                                    labelEl: q.options?.[idx]?.labelEl || "",
                                                    value: l.toLowerCase().replace(/\s+/g, "_"),
                                                })))
                                            }}
                                            placeholder={t.options}
                                            className="pw-input pw-input-sm"
                                        />
                                        <input
                                            type="text"
                                            value={q.options?.map((o) => o.labelEl || "").join(", ") || ""}
                                            aria-label={`${t.optionsEl} — Q${i + 1}`}
                                            onChange={(e) => {
                                                const labelsEl = e.target.value.split(",").map((s) => s.trim())
                                                updateQuestion(i, "options", (q.options || []).map((o, idx) => ({
                                                    ...o,
                                                    labelEl: labelsEl[idx] || "",
                                                })))
                                            }}
                                            placeholder={t.optionsEl}
                                            className="pw-input pw-input-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addQuestion}
                        className="pw-soft-button mt-4 w-full"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t.addQuestion}
                    </button>

                    {error && (
                        <p role="alert" className="mt-4 flex items-center gap-1 text-caption font-semibold text-status-danger">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {error}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 border-t border-border px-4 py-4 sm:px-6">
                    <button type="button" onClick={onClose} className="pw-soft-button flex-1">
                        {t.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        aria-busy={saving}
                        className="pw-primary-button flex-[2]"
                    >
                        {saving ? "..." : t.save}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Sent Questionnaires List ──

function SentList({ instances, t, language }: {
    instances: InstanceData[]
    t: typeof copy.en
    language: string
}) {
    const { t: gt } = useLanguage()
    const { sort, toggle, setSort } = useTableSort<QSortKey>()
    const sortedInstances = useMemo(
        () => applySort<InstanceData, QSortKey>(instances, sort, {
        customer: (r) => r.customerName,
            template: (r) => r.templateName,
            status: (r) => r.status,
            sentAt: (r) => (r.sentAt ? new Date(r.sentAt) : null),
        }),
        [instances, sort]
    )
    const [analysisData, setAnalysisData] = useState<any>(null)
    const analysisDialogRef = useDialog<HTMLDivElement>(() => setAnalysisData(null), Boolean(analysisData))
    const analysisTitleId = useId()
    const [analyzingId, setAnalyzingId] = useState<string | null>(null)

    const handleAnalyze = async (instanceId: string) => {
        setAnalyzingId(instanceId)
        const result = await analyzeQuestionnaireResponse(instanceId)
        if (!("error" in result)) {
            setAnalysisData(result)
        }
        setAnalyzingId(null)
    }

    if (instances.length === 0) {
        return (
            <EmptyState
                icon={Send}
                headline={t.noInstances}
                description={t.noInstancesDesc}
                cta={{ label: t.viewClients, href: "/customers" }}
            />
        )
    }

    return (
        <>
            <div className="pw-card overflow-hidden">
                <div className="pw-pad pb-0">
                    <CardHead
                        icon={Send}
                        title={t.sent}
                        meta={<span className="tabular-nums">{instances.length}</span>}
                    />
                    {/* thead is sr-only below lg, so the column headers cannot be used
                        on a phone — this drives the same sort state. */}
                    <MobileSortControl
                        sort={sort}
                        onSort={toggle}
                        onClear={() => setSort(null)}
                        columns={[{ key: "customer", label: t.customer }, { key: "template", label: t.template }, { key: "status", label: t.status }, { key: "sentAt", label: t.sentAt }]}
                        label={t.sortLabel}
                        defaultLabel={t.defaultOrder}
                        className="mt-3"
                    />
                </div>
                <TableShell label={t.sent}>
                <table className="pw-stacked-table w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={t.customer} align="left" />
                            <SortableColumn columnKey="template" sort={sort} onSort={toggle} label={t.template} align="left" />
                            <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={t.status} align="left" />
                            <SortableColumn columnKey="sentAt" sort={sort} onSort={toggle} label={t.sentAt} align="left" />
                            <th className="px-4 py-3 text-right text-caption font-semibold text-muted-foreground">
                                <span className="sr-only">{gt.common.actions}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInstances.map((inst) => (
                            <tr key={inst.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                                <td data-label={t.customer} className="px-4 py-3 font-semibold text-foreground">{inst.customerName}</td>
                                <td data-label={t.template} className="px-4 py-3 text-muted-foreground">{inst.templateName}</td>
                                <td data-label={t.status} className="px-4 py-3">
                                    {inst.status === "completed" ? (
                                        <span className={`${pill} bg-status-success-tint text-status-success`}>
                                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {t.completed}
                                        </span>
                                    ) : (
                                        <span className={`${pill} bg-status-warning-tint text-status-warning`}>
                                            <Clock className="h-3 w-3" aria-hidden="true" /> {t.pending}
                                        </span>
                                    )}
                                </td>
                                <td data-label={t.sentAt} className="px-4 py-3 text-caption text-muted-foreground">
                                    {new Date(inst.sentAt).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {inst.status === "completed" && inst.responseCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleAnalyze(inst.id)}
                                            disabled={analyzingId === inst.id}
                                            aria-busy={analyzingId === inst.id}
                                            className="pw-soft-button disabled:pointer-events-none disabled:opacity-60"
                                        >
                                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                                            {analyzingId === inst.id ? "..." : t.analyze}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </TableShell>
            </div>

            {/* Analysis modal */}
            {analysisData && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAnalysisData(null)} />
                    <div
                        ref={analysisDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={analysisTitleId}
                        tabIndex={-1}
                        className="pw-card relative mb-16 w-full max-w-2xl shadow-xl"
                    >
                        <div className="pw-pad">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <CardHead icon={Sparkles} title={t.analysisTitle} id={analysisTitleId} />
                                    <p className="mt-1 pl-12 text-caption text-muted-foreground">{analysisData.customerName} · {analysisData.templateName}</p>
                                </div>
                                <button type="button" aria-label={t.cancel} onClick={() => setAnalysisData(null)} className="pw-soft-button h-11 w-11 shrink-0 px-0">
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Answer summary — each answer a sub-card row. */}
                            <section className="mt-6">
                                <h3 className="text-caption font-semibold text-muted-foreground">{t.answers}</h3>
                                <dl className="mt-3 space-y-2">
                                    {analysisData.answerSummary.map((a: any, i: number) => (
                                        <div key={i} className="pw-subcard flex items-start justify-between gap-4 p-3">
                                            <dt className="text-caption text-muted-foreground">{a.question}</dt>
                                            <dd className="flex-shrink-0 text-right text-caption font-semibold text-foreground">{String(a.answer)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            {/* Needs */}
                            <section className="mt-6">
                                <h3 className="text-caption font-semibold text-muted-foreground">{t.needs}</h3>
                                <ul className="mt-3 space-y-2">
                                    {analysisData.needsIdentified.map((n: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" aria-hidden="true" />
                                            {n}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* Recommendations */}
                            <section className="mt-6">
                                <h3 className="text-caption font-semibold text-muted-foreground">{t.recommendations}</h3>
                                <ul className="mt-3 space-y-2">
                                    {analysisData.recommendations.map((r: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-mint" aria-hidden="true" />
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* Missing coverage */}
                            {analysisData.missingCoverage.length > 0 && (
                                <section className="mt-6">
                                    <h3 className="text-caption font-semibold text-muted-foreground">{t.missingCoverage}</h3>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {analysisData.missingCoverage.map((mc: any, i: number) => (
                                            <span key={i} className={`${pill} ${mc.essential
                                                ? "bg-status-danger-tint text-status-danger"
                                                : "bg-muted text-foreground"
                                                }`}>
                                                {mc.label}
                                                {mc.essential && <span className="ml-1">({t.essential})</span>}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
