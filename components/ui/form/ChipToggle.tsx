"use client"

import type { ReactNode } from "react"

/**
 * A multi-select chip — the "select all that apply" control.
 *
 * The shipped instances were `<label>` wrappers around an `sr-only` checkbox at
 * `px-3 py-1.5 text-xs`, which is roughly a 28px target. The base-layer 44px
 * floor in globals.css cannot reach these: it applies to button/input/select/
 * textarea, and the tappable element here is the LABEL. So they stayed small
 * even after the floor landed — and on the risk profile they carry chronic
 * conditions and family medical history, which is not somewhere to make people
 * aim carefully.
 *
 * The sr-only checkbox is kept rather than swapped for a `role="checkbox"` div:
 * it is already focusable, already announces its checked state, and already
 * works with the space bar. What it lacked was a visible focus ring, since the
 * input itself is invisible — `has-[:focus-visible]` puts that on the chip.
 */

export type ChipAccent = "primary" | "warning"

const SELECTED: Record<ChipAccent, string> = {
    primary: "border-primary bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
    warning: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
}

const UNSELECTED =
    "border-black/10 text-black/60 dark:border-white/15 dark:text-white/60 hover:border-black/25 dark:hover:border-white/30"

interface ChipToggleProps {
    label: ReactNode
    checked: boolean
    onChange: (checked: boolean) => void
    accent?: ChipAccent
    name?: string
    disabled?: boolean
}

export function ChipToggle({
    label,
    checked,
    onChange,
    accent = "primary",
    name,
    disabled,
}: ChipToggleProps) {
    return (
        <label
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-caption font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#29685B] dark:has-[:focus-visible]:outline-[#A7F3D0] ${checked ? SELECTED[accent] : UNSELECTED} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
            <input
                type="checkbox"
                name={name}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
            />
            {label}
        </label>
    )
}
