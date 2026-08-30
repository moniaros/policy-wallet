"use client"

import { type ReactNode } from "react"

interface SettingRowProps {
    label: string
    /** The current value, or an explanation when there isn't one. */
    value?: ReactNode
    /** Extra context under the value — a consequence, a caveat, a reset date. */
    hint?: ReactNode
    /** Right-hand control: an Edit button, a link, a badge. */
    action?: ReactNode
    /** Renders the value in the muted "not set yet" style. */
    muted?: boolean
    className?: string
}

/**
 * A read-only settings row: label, current value, one action.
 *
 * Stacks under `sm` rather than squeezing a value and a button onto a 320px
 * line — the previous version put both on one row and the value truncated
 * before the button did.
 */
export function SettingRow({ label, value, hint, action, muted = false, className = "" }: SettingRowProps) {
    return (
        <div
            className={`flex min-h-11 flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
        >
            <div className="min-w-0">
                <p className="text-g-app-caption font-medium text-fg-secondary">{label}</p>
                {value !== undefined && (
                    <p
                        className={`mt-0.5 text-g-app-body-sm [overflow-wrap:anywhere] ${
                            muted ? "text-fg-secondary" : "font-semibold text-fg-primary"
                        }`}
                    >
                        {value}
                    </p>
                )}
                {hint && <p className="mt-1 text-g-app-caption leading-snug text-fg-secondary">{hint}</p>}
            </div>
            {action && <div className="shrink-0 sm:pl-4">{action}</div>}
        </div>
    )
}
