import * as React from "react"
import { cn } from "@/lib/utils"

export interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
    tone?: "default" | "soft"
}

export function BrandCard({ className, tone = "default", ...props }: BrandCardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border shadow-sm",
                tone === "default"
                    ? "bg-[var(--brand-surface-card)] border-[var(--brand-border-subtle)]"
                    : "bg-[var(--brand-surface-elevated)] border-[var(--brand-border-subtle)]",
                className
            )}
            {...props}
        />
    )
}
