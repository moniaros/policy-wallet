import * as React from "react"
import { cn } from "@/lib/utils"

export interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** `soft` is the sunken nested surface — a tile INSIDE a card, never a card in a card. */
    tone?: "default" | "soft"
}

/**
 * The agent surface's card, on the app's one card recipe (Direction A,
 * 2026-09-03). It used to be its own white rectangle with a hairline and a
 * shadow (`--brand-surface-card`), so the advisor's cards and the
 * policyholder's cards read as two products on one shell.
 */
export function BrandCard({ className, tone = "default", ...props }: BrandCardProps) {
    return <div className={cn(tone === "default" ? "pw-card" : "pw-subcard", className)} {...props} />
}
