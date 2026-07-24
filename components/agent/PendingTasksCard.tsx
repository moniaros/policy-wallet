"use client"

import Link from "next/link"
import { ListChecks, Clock, AlertTriangle } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentTaskItem } from "./types"

interface PendingTasksCardProps {
    items: AgentTaskItem[]
}

/**
 * Real pending tasks assigned to the agent (due today or overdue), driven by
 * actual UserTask rows — not a re-slice of the synthetic action queue.
 */
export function PendingTasksCard({ items }: PendingTasksCardProps) {
    const { language, t } = useLanguage()
    const tb = t.agentDashboard

    return (
        <BrandCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary dark:text-mint" />
                <h2 className="text-base font-bold text-foreground">{tb.pendingTasks}</h2>
                {items.length > 0 && (
                    <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">({items.length})</span>
                )}
            </div>

            {items.length === 0 ? (
                <EmptyState
                    icon={ListChecks}
                    headline={tb.noTasksTitle}
                    description={tb.noTasksDesc}
                    cta={{ label: tb.viewAllTasks, href: "/tasks" }}
                    className="border-0 px-0 py-6 shadow-none"
                />
            ) : (
                <>
                    <div className="space-y-2">
                        {items.map((task) => (
                            <Link
                                key={task.id}
                                href="/tasks"
                                className="flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 transition hover:bg-neutral-100 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                            >
                                {task.overdue ? (
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
                                ) : (
                                    <Clock className="h-4 w-4 shrink-0 text-primary dark:text-mint" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                                    {task.dueDate && (
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(task.dueDate).toLocaleDateString(
                                                language === "el" ? "el-GR" : "en-GB",
                                                { day: "numeric", month: "short" }
                                            )}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wide ${
                                        task.overdue
                                            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                    }`}
                                >
                                    {task.overdue ? tb.taskOverdue : tb.taskDueToday}
                                </span>
                            </Link>
                        ))}
                    </div>
                    <Link
                        href="/tasks"
                        className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-medium text-primary hover:underline dark:text-mint"
                    >
                        {tb.viewAllTasks}
                    </Link>
                </>
            )}
        </BrandCard>
    )
}
