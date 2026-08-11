"use client"

import { useId, type ReactNode } from "react"

/**
 * The toggle switch.
 *
 * The app had exactly one — hand-rolled inline in the account settings tab, with
 * the track, the knob, the ARIA and the 22px translate all written by hand at the
 * call site. Every future toggle would have copied it. This is that control,
 * extracted, with the two things the original lacked: a pending state (a
 * preference write is a server round-trip, and a switch that does not move until
 * the response lands reads as broken) and a description that is programmatically
 * tied to the switch rather than sitting beside it.
 *
 * `checked` is the RENDERED state — pass the optimistic value while a write is in
 * flight, not the server value, or the knob snaps back under the user's finger.
 */

interface SwitchProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    /** Visible label. Also the accessible name. */
    label: string
    /** One line explaining what this switch actually does. */
    description?: ReactNode
    /** Optional glyph rendered in a chip to the left of the label. */
    icon?: ReactNode
    disabled?: boolean
    /** A write is in flight — dims the row and blocks re-entry, keeps the knob moved. */
    pending?: boolean
    className?: string
}

export function Switch({
    checked,
    onCheckedChange,
    label,
    description,
    icon,
    disabled = false,
    pending = false,
    className = "",
}: SwitchProps) {
    const labelId = useId()
    const descId = `${labelId}-desc`
    const locked = disabled || pending

    return (
        <div
            className={`flex min-h-11 items-start justify-between gap-4 py-3 ${pending ? "opacity-70" : ""} ${className}`}
        >
            <div className="flex min-w-0 flex-1 items-start gap-3">
                {icon && (
                    <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint"
                    >
                        {icon}
                    </span>
                )}
                <span className="min-w-0">
                    <span id={labelId} className="block text-sm font-semibold text-black dark:text-white">
                        {label}
                    </span>
                    {description && (
                        <span id={descId} className="mt-0.5 block text-caption leading-snug text-muted-foreground">
                            {description}
                        </span>
                    )}
                </span>
            </div>

            {/* The 44px target is the padded wrapper, not the 44×24 track — a
                switch that looks like a switch but is only 24px tall fails the
                touch floor on a phone. */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={labelId}
                aria-describedby={description ? descId : undefined}
                disabled={locked}
                onClick={() => onCheckedChange(!checked)}
                className="-mr-1.5 grid h-11 w-14 shrink-0 place-items-center rounded-xl transition disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                {/* The OFF track is a mid grey, not a faint one: WCAG 2.2 1.4.11
                    wants 3:1 for the control against its background, and the
                    black/10 the original used sits at 1.4:1 — invisible on a
                    bright phone screen. Colour is never the only cue; the knob
                    position and aria-checked carry the state too. */}
                <span
                    aria-hidden="true"
                    className={`relative block h-6 w-11 rounded-full transition-colors ${
                        checked ? "bg-primary" : "bg-black/45 dark:bg-white/40"
                    }`}
                >
                    <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] duration-200 ${
                            checked ? "left-6" : "left-1"
                        }`}
                    />
                </span>
            </button>
        </div>
    )
}
