"use client"

import { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"

export interface PolicyHeaderMenuItem {
    id: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
    destructive?: boolean
    onSelect: () => void
}

interface PolicyHeaderMenuProps {
    ariaLabel: string
    items: PolicyHeaderMenuItem[]
}

/**
 * Overflow (kebab) menu for the policy hero. Hand-rolled — the design system
 * has no dropdown primitive (only the hand-rolled Modal) — with menu-pattern
 * a11y: Escape/outside-click close and focus return to the trigger.
 */
export function PolicyHeaderMenu({ ariaLabel, items }: PolicyHeaderMenuProps) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return

        const handlePointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    if (items.length === 0) return null

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => setOpen(!open)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
                <MoreVertical className="h-5 w-5" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-12 z-30 min-w-52 overflow-hidden rounded-2xl border border-black/10 bg-white py-1.5 shadow-xl dark:border-white/15 dark:bg-slate-900"
                >
                    {items.map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false)
                                    item.onSelect()
                                }}
                                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                                    item.destructive
                                        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                        : "text-black/75 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                                }`}
                            >
                                {Icon && <Icon className="h-4 w-4" />}
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
