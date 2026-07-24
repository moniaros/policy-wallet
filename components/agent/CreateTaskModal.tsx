"use client"

import { useState } from "react"
import { createUserTask } from "@/app/(protected)/tasks/taskActions"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    customerName: string
}

export function CreateTaskModal({ isOpen, onClose, userId, customerName }: CreateTaskModalProps) {
    const { t } = useLanguage()
    const tt = t.agentModals.createTask
    const TASK_TYPES = [
        { value: 'reminder', label: `⏰ ${tt.typeReminder}`, description: tt.typeReminderDesc },
        { value: 'request', label: `📄 ${tt.typeRequest}`, description: tt.typeRequestDesc },
        { value: 'recommendation', label: `💡 ${tt.typeRecommendation}`, description: tt.typeRecommendationDesc },
        { value: 'general', label: `📝 ${tt.typeGeneral}`, description: tt.typeGeneralDesc },
    ]
    const PRIORITIES = [
        { value: 'low', label: tt.priorityLow, color: 'blue' },
        { value: 'medium', label: tt.priorityMedium, color: 'amber' },
        { value: 'high', label: tt.priorityHigh, color: 'red' },
    ]

    const [type, setType] = useState('reminder')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('medium')
    const [dueDate, setDueDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Escape-to-close, focus trap, and focus return.
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const result = await createUserTask({
                userId,
                title,
                description,
                type,
                priority,
                dueDate: dueDate || undefined
            })

            if (result.success) {
                toast.success(tt.taskCreated)
                onClose()
                // Reset form
                setTitle('')
                setDescription('')
                setDueDate('')
            } else {
                toast.error(result.error || tt.createFailed)
            }
        } catch (error) {
            console.error(error)
            toast.error(tt.unexpectedError)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-task-title" tabIndex={-1} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 id="create-task-title" className="text-xl font-bold text-foreground">
                            {tt.titlePrefix} {customerName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {tt.subtitle}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t.common.close}
                        className="p-2 -mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        {TASK_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setType(t.value)}
                                className={`text-left p-3 rounded-xl border transition-all ${type === t.value
                                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white'
                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                    }`}
                            >
                                <div className="font-semibold text-sm text-foreground mb-0.5">{t.label}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                            </button>
                        ))}
                    </div>

                    {/* Title */}
                    <div>
                        <label htmlFor="createtaskmodal-f1" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.titleLabel} <span className="text-red-500">*</span>
                        </label>
                        <input id="createtaskmodal-f1"
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={tt.titlePlaceholder}
                            className="pw-input dark:focus:ring-white"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="createtaskmodal-f2" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.descriptionLabel}
                        </label>
                        <textarea id="createtaskmodal-f2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={tt.descriptionPlaceholder}
                            className="pw-input dark:focus:ring-white resize-none"
                        />
                    </div>

                    {/* Priority & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="createtaskmodal-f3" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                                {tt.priorityLabel}
                            </label>
                            <select id="createtaskmodal-f3"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="pw-input dark:focus:ring-white appearance-none"
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="createtaskmodal-f4" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                                {tt.dueDateLabel}
                            </label>
                            <input id="createtaskmodal-f4"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="pw-input dark:focus:ring-white"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-300 bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            {tt.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3.5 rounded-xl font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {isSubmitting ? tt.creating : tt.createTaskBtn}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
