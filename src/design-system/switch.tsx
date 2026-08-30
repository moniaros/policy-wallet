"use client"

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The switch (§5.3), iOS proportions (51×31, 27px knob), on the token layer.
 * Ported from components/ui/form/Switch.tsx — the 44px target is the padded
 * wrapper; `pending` keeps the knob where the finger left it while a write is
 * in flight; the OFF track measures ≥ 3:1 against the surface (border-strong
 * over surface-sunken carries it, never colour alone: aria-checked and the
 * knob position carry the state too).
 */
export function Switch({
    checked,
    onCheckedChange,
    label,
    description,
    disabled = false,
    pending = false,
    className,
}: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    label: string
    description?: ReactNode
    disabled?: boolean
    pending?: boolean
    className?: string
}) {
    const labelId = useId()
    const descId = `${labelId}-desc`
    const locked = disabled || pending
    return (
        <div className={cn("flex min-h-11 items-start justify-between gap-g-4 py-g-2", pending && "opacity-70", className)}>
            <span className="min-w-0">
                <span id={labelId} className="block text-g-app-body font-semibold text-fg-primary">{label}</span>
                {description && <span id={descId} className="mt-g-1 block text-g-app-body-sm text-fg-secondary">{description}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={labelId}
                aria-describedby={description ? descId : undefined}
                aria-busy={pending || undefined}
                disabled={locked}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "-me-g-1 grid h-11 w-16 shrink-0 place-items-center rounded-g-control transition disabled:cursor-not-allowed [-webkit-tap-highlight-color:transparent]",
                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus"
                )}
            >
                <span
                    aria-hidden
                    className={cn(
                        "relative block h-[31px] w-[51px] rounded-g-pill border transition-colors duration-[var(--dur-base)] ease-g-out",
                        checked ? "border-action-primary-bg bg-action-primary-bg" : "border-border-strong bg-surface-sunken"
                    )}
                >
                    <span
                        className={cn(
                            "absolute top-[1px] size-[27px] rounded-g-pill bg-surface-raised shadow-g-raised transition-[inset-inline-start] duration-[var(--dur-base)] ease-g-spring",
                            checked ? "start-[21px]" : "start-[1px]"
                        )}
                    />
                </span>
            </button>
        </div>
    )
}
