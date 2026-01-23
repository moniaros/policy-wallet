"use client"

import { useState } from "react"
import { createUserTask } from "@/app/(protected)/tasks/taskActions"
import { toast } from "sonner"

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    customerName: string
}

const TASK_TYPES = [
    { value: 'reminder', label: '⏰ Reminder', description: 'Schedule a time-sensitive reminder' },
    { value: 'request', label: '📄 Request', description: 'Ask for documents or information' },
    { value: 'recommendation', label: '💡 Recommendation', description: 'Suggest an improvement' },
    { value: 'general', label: '📝 General', description: 'General task or note' },
]

const PRIORITIES = [
    { value: 'low', label: 'Low', color: 'blue' },
    { value: 'medium', label: 'Medium', color: 'amber' },
    { value: 'high', label: 'High', color: 'red' },
]

export function CreateTaskModal({ isOpen, onClose, userId, customerName }: CreateTaskModalProps) {
    const [type, setType] = useState('reminder')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('medium')
    const [dueDate, setDueDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

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
                toast.success("Task created successfully")
                onClose()
                // Reset form
                setTitle('')
                setDescription('')
                setDueDate('')
            } else {
                toast.error(result.error || "Failed to create task")
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="border-b border-stone-100 dark:border-stone-800 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                            Create Task for {customerName}
                        </h2>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                            Add an item to their Action Center
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 transition-colors"
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
                                        ? 'border-stone-900 dark:border-white bg-stone-50 dark:bg-stone-800 ring-1 ring-stone-900 dark:ring-white'
                                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                                    }`}
                            >
                                <div className="font-semibold text-sm text-stone-900 dark:text-white mb-0.5">{t.label}</div>
                                <div className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">{t.description}</div>
                            </button>
                        ))}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Renew Driving License"
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Add details about what needs to be done..."
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all resize-none"
                        />
                    </div>

                    {/* Priority & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all appearance-none"
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3.5 rounded-xl font-bold text-white bg-stone-900 dark:bg-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
