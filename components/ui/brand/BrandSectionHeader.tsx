import * as React from "react"
import { cn } from "@/lib/utils"

export interface BrandSectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    subtitle?: string
    align?: "left" | "center"
}

export function BrandSectionHeader({ title, subtitle, align = "left", className, ...props }: BrandSectionHeaderProps) {
    return (
        <div className={cn(align === "center" ? "text-center" : "text-left", className)} {...props}>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--brand-text-primary)]">{title}</h2>
            {subtitle ? <p className="mt-3 text-base text-[var(--brand-text-muted)]">{subtitle}</p> : null}
        </div>
    )
}
