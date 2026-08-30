"use client"

import { useId, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

/**
 * The segmented control (§5.3): a radiogroup. Arrow keys move between
 * segments, the selected one is `aria-checked`, and the whole group has one
 * tab stop (roving tabindex) — the iOS control's semantics, not its looks only.
 */
export function SegmentedControl<T extends string>({
    label,
    value,
    onChange,
    options,
    className,
}: {
    label: string
    value: T
    onChange: (value: T) => void
    options: ReadonlyArray<{ value: T; label: string }>
    className?: string
}) {
    const groupId = useId()
    const refs = useRef<Array<HTMLButtonElement | null>>([])
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
        if (!delta) return
        e.preventDefault()
        const next = (index + delta + options.length) % options.length
        onChange(options[next].value)
        refs.current[next]?.focus()
    }
    return (
        <div role="radiogroup" aria-label={label} id={groupId} className={cn("inline-grid auto-cols-fr grid-flow-col rounded-g-control bg-surface-sunken p-g-1", className)}>
            {options.map((o, i) => {
                const selected = o.value === value
                return (
                    <button
                        key={o.value}
                        ref={(el) => { refs.current[i] = el }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(o.value)}
                        onKeyDown={(e) => onKeyDown(e, i)}
                        className={cn(
                            "g-row-press min-h-11 rounded-g-control px-g-3 text-g-app-body-sm font-medium transition-colors duration-200 ease-g-out [-webkit-tap-highlight-color:transparent]",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-border-focus",
                            selected ? "bg-surface-raised text-fg-primary shadow-g-raised" : "text-fg-secondary hover:text-fg-primary"
                        )}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}
