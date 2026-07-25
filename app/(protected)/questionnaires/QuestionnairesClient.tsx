"use client"

import { useId, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import {
    ClipboardList, Plus, Trash2, GripVertical, Eye, Send,
    Sparkles, ChevronDown, CheckCircle2, Clock, FileQuestion,
    AlertCircle, X
} from "lucide-react"
import type { TemplateData, InstanceData, TemplateQuestion } from "./actions"
import { createTemplate, updateTemplate, deleteTemplate, analyzeQuestionnaireResponse } from "./actions"
import { EmptyState } from "@/components/ui/EmptyState"
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
        deleteTemplate: "Delete",
        templateName: "Template Name",
        lob: "Line of Business",
        addQuestion: "Add Question",
        questionLabel: "Question text (EN)",
        questionLabelEl: "Question text (EL)",
        questionType: "Type",
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
        title: "Διαχείριση Ερωτηματολογίων",
        subtitle: "Δημιουργήστε πρότυπα, παρακολουθήστε και αναλύστε απαντήσεις πελατών.",
        templates: "Πρότυπα",
        sent: "Απεσταλμένα",
        createNew: "Νέο Πρότυπο",
        system: "Σύστημα",
        custom: "Προσαρμοσμένο",
        questions: "ερωτήσεις",
        sentCount: "αποστολές",
        editTemplate: "Επεξεργασία",
        deleteTemplate: "Διαγραφή",
        templateName: "Όνομα Προτύπου",
        lob: "Κλάδος Ασφάλισης",
        addQuestion: "Προσθήκη Ερώτησης",
        questionLabel: "Κείμενο ερώτησης (EN)",
        questionLabelEl: "Κείμενο ερώτησης (EL)",
        questionType: "Τύπος",
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
        analysisTitle: "Ανάλυση Απαντήσεων",
        needs: "Αναγνωρισμένες Ανάγκες",
        recommendations: "Συστάσεις",
        missingCoverage: "Ελλείψεις Κάλυψης",
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

export function QuestionnairesClient({ templates, instances }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const [tab, setTab] = useState<"templates" | "sent">("templates")
    const [showBuilder, setShowBuilder] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)


    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-page-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
                    <div>
                        <span className="pw-kicker inline-block mb-2">{t.kicker}</span>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                            {t.title}
                        </h1>
                        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
                            {t.subtitle}
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowBuilder(true); setEditingId(null) }}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" />
                        {t.createNew}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-8 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setTab("templates")}
                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === "templates" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                    >
                        <ClipboardList className="w-3.5 h-3.5 inline mr-1.5" />
                        {t.templates} ({templates.length})
                    </button>
                    <button
                        onClick={() => setTab("sent")}
                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === "sent" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                    >
                        <Send className="w-3.5 h-3.5 inline mr-1.5" />
                        {t.sent} ({instances.length})
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
    const handleDelete = async (id: string) => {
        await deleteTemplate(id)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
                <div key={tpl.id} className="pw-card pw-pad group">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <span className={`text-kicker font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${tpl.isSystem
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint"
                                }`}>
                                {tpl.isSystem ? t.system : t.custom}
                            </span>
                        </div>
                        {!tpl.isSystem && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(tpl.id)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:text-slate-400"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(tpl.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-400 hover:text-red-700"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{tpl.name}</h4>
                    <p className="text-kicker font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                        {normalizeBranch(tpl.lineOfBusiness).label[language === 'el' ? 'el' : 'en']} · {tpl.questions.length} {t.questions} · {tpl.instanceCount} {t.sentCount}
                    </p>

                    {/* Question preview */}
                    <div className="space-y-1.5">
                        {tpl.questions.slice(0, 3).map((q, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-kicker font-bold flex-shrink-0">
                                    {i + 1}
                                </span>
                                <span className="truncate">{language === "el" && q.labelEl ? q.labelEl : q.label}</span>
                            </div>
                        ))}
                        {tpl.questions.length > 3 && (
                            <p className="text-kicker text-slate-500 dark:text-slate-400 pl-6">+{tpl.questions.length - 3} more...</p>
                        )}
                    </div>
                </div>
            ))}
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
        if (!name.trim()) return setError("Name is required")
        if (questions.length === 0) return setError("Add at least one question")
        if (questions.some((q) => !q.label.trim())) return setError("All questions need text")

        setSaving(true)
        setError("")

        // Normalize IDs
        const normalized = questions.map((q, i) => ({ ...q, id: `q${i + 1}` }))

        const result = editingTemplate
            ? await updateTemplate(editingTemplate.id, { name, lineOfBusiness: lob, questions: normalized })
            : await createTemplate({ name, lineOfBusiness: lob, questions: normalized })

        setSaving(false)
        if (result.error) {
            setError(result.error)
        } else {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={onClose} />
            <div
                ref={builderDialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 mb-16"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {editingTemplate ? t.editTemplate : t.createNew}
                        </h3>
                        <button onClick={onClose} aria-label={t.cancel} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-kicker font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t.templateName}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pw-input"
                                placeholder="My Custom Template"
                            />
                        </div>
                        <div>
                            <label className="block text-kicker font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t.lob}</label>
                            <select
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

                    {/* Questions */}
                    <div className="space-y-4 mb-6">
                        {questions.map((q, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <GripVertical className="w-4 h-4 text-slate-300" />
                                    <span className="text-kicker font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                        Q{i + 1}
                                    </span>
                                    <div className="flex-1" />
                                    <select
                                        value={q.type}
                                        onChange={(e) => updateQuestion(i, "type", e.target.value)}
                                        className="pw-input pw-input-sm"
                                    >
                                        <option value="text">{t.text}</option>
                                        <option value="number">{t.number}</option>
                                        <option value="boolean">{t.boolean}</option>
                                        <option value="select">{t.select}</option>
                                    </select>
                                    <button
                                        onClick={() => updateQuestion(i, "required", !q.required)}
                                        className={`px-2 py-1 rounded-lg text-kicker font-black uppercase tracking-widest ${q.required
                                            ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20"
                                            : "bg-slate-100 text-slate-600 dark:bg-slate-700"
                                            }`}
                                    >
                                        {q.required ? t.required : t.optional}
                                    </button>
                                    <button
                                        onClick={() => removeQuestion(i)}
                                        className="p-1 rounded-lg hover:bg-red-50 text-slate-500 dark:text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={q.label}
                                        onChange={(e) => updateQuestion(i, "label", e.target.value)}
                                        placeholder={t.questionLabel}
                                        className="pw-input pw-input-sm"
                                    />
                                    <input
                                        type="text"
                                        value={q.labelEl || ""}
                                        onChange={(e) => updateQuestion(i, "labelEl", e.target.value)}
                                        placeholder={t.questionLabelEl}
                                        className="pw-input pw-input-sm"
                                    />
                                </div>

                                {q.type === "select" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        <input
                                            type="text"
                                            value={q.options?.map((o) => o.label).join(", ") || ""}
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
                        onClick={addQuestion}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {t.addQuestion}
                    </button>

                    {error && (
                        <p className="mt-4 text-xs text-red-700 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-700 rounded-b-3xl">
                    <button onClick={onClose} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
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
            <div className="pw-card">
                {/* thead is sr-only below lg, so the column headers cannot be used
                    on a phone — this drives the same sort state. */}
                <MobileSortControl
                    sort={sort}
                    onSort={toggle}
                    onClear={() => setSort(null)}
                    columns={[{ key: "customer", label: t.customer }, { key: "template", label: t.template }, { key: "status", label: t.status }, { key: "sentAt", label: t.sentAt }]}
                    label={t.sortLabel}
                    defaultLabel={t.defaultOrder}
                    className="mb-3"
                />
                <TableShell label={t.sent}>
                <table className="pw-stacked-table w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                            <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={t.customer} align="left" className="pb-3" />
                            <SortableColumn columnKey="template" sort={sort} onSort={toggle} label={t.template} align="left" className="pb-3" />
                            <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={t.status} align="left" className="pb-3" />
                            <SortableColumn columnKey="sentAt" sort={sort} onSort={toggle} label={t.sentAt} align="left" className="pb-3" />
                            <th className="text-right text-kicker font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest p-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInstances.map((inst) => (
                            <tr key={inst.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td data-label={t.customer} className="p-4 font-bold text-slate-900 dark:text-white">{inst.customerName}</td>
                                <td data-label={t.template} className="p-4 text-slate-600 dark:text-slate-400">{inst.templateName}</td>
                                <td data-label={t.status} className="p-4">
                                    {inst.status === "completed" ? (
                                        <span className="inline-flex items-center gap-1 text-kicker font-black text-[#166534] bg-primary-soft dark:bg-primary/15 dark:text-mint px-2.5 py-1 rounded-full uppercase tracking-widest">
                                            <CheckCircle2 className="w-3 h-3" /> {t.completed}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-kicker font-black text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                            <Clock className="w-3 h-3" /> {t.pending}
                                        </span>
                                    )}
                                </td>
                                <td data-label={t.sentAt} className="p-4 text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(inst.sentAt).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")}
                                </td>
                                <td className="p-4 text-right">
                                    {inst.status === "completed" && inst.responseCount > 0 && (
                                        <button
                                            onClick={() => handleAnalyze(inst.id)}
                                            disabled={analyzingId === inst.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-kicker font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                                        >
                                            <Sparkles className="w-3 h-3" />
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
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setAnalysisData(null)} />
                    <div
                        ref={analysisDialogRef}
                        role="dialog"
                        aria-modal="true"
                        tabIndex={-1}
                        className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 mb-16"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{t.analysisTitle}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{analysisData.customerName} · {analysisData.templateName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setAnalysisData(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Answer summary */}
                            <div className="mb-6">
                                <h4 className="text-kicker font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t.answers}</h4>
                                <div className="space-y-2">
                                    {analysisData.answerSummary.map((a: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 dark:border-slate-800">
                                            <span className="text-xs text-slate-600 dark:text-slate-400">{a.question}</span>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white text-right flex-shrink-0">{String(a.answer)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Needs */}
                            <div className="mb-6">
                                <h4 className="text-kicker font-black text-amber-700 uppercase tracking-widest mb-3">{t.needs}</h4>
                                <div className="space-y-2">
                                    {analysisData.needsIdentified.map((n: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="mb-6">
                                <h4 className="text-kicker font-black text-primary dark:text-mint uppercase tracking-widest mb-3">{t.recommendations}</h4>
                                <div className="space-y-2">
                                    {analysisData.recommendations.map((r: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-primary dark:text-mint flex-shrink-0 mt-0.5" />
                                            {r}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Missing coverage */}
                            {analysisData.missingCoverage.length > 0 && (
                                <div>
                                    <h4 className="text-kicker font-black text-red-700 uppercase tracking-widest mb-3">{t.missingCoverage}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisData.missingCoverage.map((mc: any, i: number) => (
                                            <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold ${mc.essential
                                                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                }`}>
                                                {mc.label}
                                                {mc.essential && <span className="ml-1 text-kicker">({t.essential})</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
