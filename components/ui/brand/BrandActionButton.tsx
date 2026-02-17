import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface BrandActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "primary" | "secondary"
}

export function BrandActionButton({
    asChild = false,
    variant = "primary",
    className,
    ...props
}: BrandActionButtonProps) {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-accent-primary)]",
                variant === "primary"
                    ? "bg-[var(--brand-accent-cta)] text-white hover:brightness-95"
                    : "border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface-elevated)]",
                className
            )}
            {...props}
        />
    )
}
