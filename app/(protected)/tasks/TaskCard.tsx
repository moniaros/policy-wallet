"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, ClipboardList, Lightbulb, NotebookPen } from "lucide-react"

import type { ActionItem } from "./actions"
import { updateTaskStatus } from "./taskActions"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"

interface TaskCardProps {
    task: ActionItem
}

export function TaskCard({ task }: TaskCardProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { language, t } = useLanguage()
    const roleCopy = getRoleCopy(language)

    const handleMarkDone = async () => {
        setLoading(true)
        try {
            const result = await updateTaskStatus(task.id, "completed")
            if (result.success) {
                toast.success(roleCopy.tasks.completed)
                router.refresh()
            } else {
                toast.error(roleCopy.tasks.updateFailed)
            }
        } catch {
            toast.error(roleCopy.tasks.updateError)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = () => {
        switch (task.type) {
            case "reminder":
                return <Bell className="w-5 h-5" />
            case "request":
                return <ClipboardList className="w-5 h-5" />
            case "recommendation":
                return <Lightbulb className="w-5 h-5" />
            default:
                return <NotebookPen className="w-5 h-5" />
        }
    }

    const getColor = () => {
        switch (task.priority) {
            case "high":
                return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            case "medium":
                return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
            default:
                return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        }
    }

    return (
        <div className="bg-white dark:bg-stone-800 rounded-[32px] p-8 border border-stone-100 dark:border-stone-700 shadow-xl shadow-stone-100/50 dark:shadow-none hover:shadow-2xl transition-all group relative overflow-hidden">
            <div
                className={`absolute top-0 left-0 w-2 h-full opacity-0 group-hover:opacity-100 transition-opacity ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-500" : "bg-blue-500"
                    }`}
            />

            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-stone-50 dark:bg-stone-700">
                            {getIcon()}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getColor()}`}>
                            {(t.tasks.taskTypes?.[task.type as keyof typeof t.tasks.taskTypes] || task.type)} • {(t.tasks.priorities?.[task.priority as keyof typeof t.tasks.priorities] || task.priority)}
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight mb-2">{task.title}</h3>

                    {task.description && (
                        <p className="text-stone-500 dark:text-stone-400 text-lg leading-relaxed mb-4">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                            {task.metadata?.creatorImage ? (
                                <img src={task.metadata.creatorImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                    {task.metadata?.creatorName?.[0] || "A"}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-medium text-stone-500">
                            {roleCopy.tasks.assignedBy} {task.metadata?.creatorName || roleCopy.defaults.agentName} • {new Date(task.createdAt).toLocaleDateString(language === "el" ? "el-GR" : "en-US")}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    {task.actionUrl && (
                        <a
                            href={task.actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-xl text-center font-bold bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-white hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                        >
                            {task.actionLabel || roleCopy.tasks.viewDetails}
                        </a>
                    )}

                    <button
                        onClick={handleMarkDone}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {loading ? roleCopy.tasks.updating : t.tasks.markAsDone}
                    </button>
                </div>
            </div>
        </div>
    )
}

