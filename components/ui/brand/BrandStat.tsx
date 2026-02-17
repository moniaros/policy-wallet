import * as React from "react"
import { cn } from "@/lib/utils"

export interface BrandStatProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    label: string
}

export function BrandStat({ value, label, className, ...props }: BrandStatProps) {
    return (
        <div className={cn("rounded-xl border border-[var(--brand-border-subtle)] bg-[var(--brand-surface-card)] p-4", className)} {...props}>
            <p className="text-3xl font-bold text-[var(--brand-text-primary)]">{value}</p>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">{label}</p>
        </div>
    )
}
