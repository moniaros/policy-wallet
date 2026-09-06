"use client"

import Link from "next/link"
import { ListChecks, Clock, AlertTriangle } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import type { AgentTaskItem } from "./types"
import { resolveLocale } from "@/lib/i18n/format"

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
        <BrandCard className="pw-pad">
            <CardHead
                icon={ListChecks}
                title={tb.pendingTasks}
                meta={items.length > 0 ? <span className="tabular-nums">{items.length}</span> : undefined}
            />

            {items.length === 0 ? (
                <EmptyState
                    icon={ListChecks}
                    headline={tb.noTasksTitle}
                    description={tb.noTasksDesc}
                    cta={{ label: tb.viewAllTasks, href: "/tasks" }}
                    ctaVariant="soft"
                    className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
                />
            ) : (
                <>
                    <div className="mt-4 space-y-2">
                        {items.map((task) => (
                            <Link
                                key={task.id}
                                href="/tasks"
                                className="pw-subcard flex min-h-11 items-center gap-3 p-3 transition-colors hover:bg-muted"
                            >
                                {task.overdue ? (
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-status-danger" aria-hidden="true" />
                                ) : (
                                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                                    {task.dueDate && (
                                        <p className="text-caption text-muted-foreground">
                                            {new Date(task.dueDate).toLocaleDateString(
                                                resolveLocale(language),
                                                { day: "numeric", month: "short" }
                                            )}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold ${
                                        task.overdue
                                            ? "bg-status-danger-tint text-status-danger"
                                            : "bg-status-warning-tint text-status-warning"
                                    }`}
                                >
                                    {task.overdue ? tb.taskOverdue : tb.taskDueToday}
                                </span>
                            </Link>
                        ))}
                    </div>
                    <Link
                        href="/tasks"
                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 text-caption font-semibold text-primary hover:underline dark:text-mint"
                    >
                        {tb.viewAllTasks}
                    </Link>
                </>
            )}
        </BrandCard>
    )
}
