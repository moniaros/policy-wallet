"use client"

import { Bell } from "lucide-react"

import { formatPolicyDate, type PolicyRenewalEntry } from "@/lib/wallet/policy-detail"

interface RenewalRemindersListProps {
    renewals: PolicyRenewalEntry[]
    locale: string
    copy: {
        title: string
        periodEnding: string
        daysBeforeExpiry: string
        statuses: Record<string, string>
    }
}

// Status pipeline: pending → contacted → renewed / lapsed / cancelled.
const STATUS_CHIP: Record<string, string> = {
    pending: "bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-900/30 dark:text-blue-300",
    contacted: "bg-[#FEF3C7] text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300",
    renewed: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    lapsed: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300",
    cancelled: "bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-900/30 dark:text-red-300",
}

/**
 * Reminder trail for this policy's renewal cycles: which nudges were sent,
 * how many days before expiry, and where each cycle ended up.
 */
export function RenewalRemindersList({ renewals, locale, copy }: RenewalRemindersListProps) {
    if (renewals.length === 0) return null

    return (
        <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
            <h3 className="mb-3 text-kicker font-black uppercase tracking-widest text-black/50 dark:text-white/55">
                {copy.title}
            </h3>
            <ul className="space-y-2">
                {renewals.map((renewal) => {
                    const chip = STATUS_CHIP[renewal.status] || STATUS_CHIP.pending
                    const statusLabel = copy.statuses[renewal.status] || renewal.status
                    return (
                        <li
                            key={renewal.id}
                            className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 dark:border-white/15 dark:bg-white/5"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-black dark:text-white">
                                    {copy.periodEnding} {formatPolicyDate(renewal.policyEndDate, locale)}
                                </p>
                                <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${chip}`}>
                                    {statusLabel}
                                </span>
                            </div>
                            {renewal.remindersSent.length > 0 && (
                                <ul className="mt-1.5 space-y-1">
                                    {renewal.remindersSent.map((reminder, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/60"
                                        >
                                            <Bell className="h-3 w-3 flex-shrink-0 text-primary dark:text-mint" />
                                            {reminder.milestone} {copy.daysBeforeExpiry} · {formatPolicyDate(reminder.sentAt, locale)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
