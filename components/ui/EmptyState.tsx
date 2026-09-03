"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ShieldCheck, Car, Home, Sparkles, CalendarClock } from "lucide-react"

/**
 * Shared premium empty state — the single pattern for "nothing here yet"
 * surfaces, styled after the public-site widget language (deep green
 * primary, soft tints, white rounded-2xl card, pill CTA, mint dark mode).
 *
 * All copy arrives pre-resolved: i18n stays at the call sites (t.*,
 * roleCopy.*, or file-local COPY objects) so this component holds zero
 * user-facing literals.
 */

export interface EmptyStateProps {
    icon: LucideIcon
    headline: string
    description: string
    cta?: {
        label: string
        onClick?: () => void
        href?: string
    }
    /** Faux example content rendered in a dashed frame above the CTA. */
    preview?: React.ReactNode
    /** Small pill label over the preview frame, e.g. "Example". */
    previewLabel?: string
    /** Trust/security microcopy rendered under the CTA. */
    trust?: string
    /** Extra content below everything (e.g. an inline input flow). */
    secondary?: React.ReactNode
    /**
     * Heading level for the headline. Defaults to `h3`, which is right when the
     * empty state sits inside a page that already has its own `<h1>` — the
     * common case. Pass `h1` when the empty state IS the whole page, otherwise
     * that route ships with no `<h1>` and its first heading at level 3.
     * Purely semantic: the visual styling is identical at every level.
     */
    headingLevel?: "h1" | "h2" | "h3"
    className?: string
}

export function EmptyState({
    icon: Icon,
    headline,
    description,
    cta,
    preview,
    previewLabel,
    trust,
    secondary,
    headingLevel: Heading = "h3",
    className = "",
}: EmptyStateProps) {
    const ctaClasses =
        "pw-primary-button cursor-pointer"

    return (
        <div
            className={`pw-card flex flex-col items-center px-6 py-10 text-center sm:px-8 sm:py-12 ${className}`}
        >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                <Icon className="h-7 w-7 text-primary dark:text-mint" />
            </div>

            <Heading className="mt-5 text-title font-semibold tracking-tight text-foreground">
                {headline}
            </Heading>
            <p className="mt-2 max-w-md text-body leading-relaxed text-muted-foreground">
                {description}
            </p>

            {preview && (
                <div className="pw-subcard relative mt-7 w-full max-w-sm p-4 pt-5">
                    {previewLabel && (
                        <span className="absolute -top-2.5 left-4 rounded-full border border-border bg-card px-2 py-0.5 text-caption font-semibold text-muted-foreground">
                            {previewLabel}
                        </span>
                    )}
                    {/* No opacity here: this preview teaches the user what the feature will
                        show, so it is informational content and must meet AA. The
                        opacity-80 that used to be here multiplied against every
                        colour inside and pushed the sample rows to ~3.6:1. The
                        "example" framing is already carried by previewLabel and the
                        dashed container. */}
                    <div className="pointer-events-none select-none space-y-2">
                        {preview}
                    </div>
                </div>
            )}

            {cta && (
                cta.href ? (
                    <Link href={cta.href} className={`mt-7 ${ctaClasses}`}>
                        {cta.label}
                    </Link>
                ) : (
                    <button type="button" onClick={cta.onClick} className={`mt-7 ${ctaClasses}`}>
                        {cta.label}
                    </button>
                )
            )}

            {trust && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden="true" />
                    {trust}
                </p>
            )}

            {secondary && <div className="mt-6 w-full max-w-sm">{secondary}</div>}
        </div>
    )
}

/* ── Mini preview rows (faux example content, marketing-widget style) ── */

export function PolicyPreviewRow({
    name,
    meta,
    statusLabel,
    warn = false,
    icon: Icon = Car,
}: {
    name: string
    meta: string
    statusLabel: string
    warn?: boolean
    icon?: LucideIcon
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
            <div
                className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${warn ? "bg-[#FEF3C7] dark:bg-amber-900/30" : "bg-primary-soft dark:bg-primary/15"}`}
            >
                <Icon className={`h-4 w-4 ${warn ? "text-[#92400E] dark:text-amber-200" : "text-primary dark:text-mint"}`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-body-sm font-semibold text-foreground">{name}</p>
                <p className="text-caption text-muted-foreground">{meta}</p>
            </div>
            <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${
                    warn
                        ? "bg-[#FEF3C7] dark:bg-amber-900/30 text-[#92400E] dark:text-amber-200"
                        : "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint"
                }`}
            >
                {statusLabel}
            </span>
        </div>
    )
}

export function CustomerPreviewRow({
    name,
    meta,
    initial,
    healthy = true,
}: {
    name: string
    meta: string
    initial: string
    healthy?: boolean
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary text-body-sm font-bold text-primary-foreground">
                {initial}
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-body-sm font-semibold text-foreground">{name}</p>
                <p className="text-caption text-muted-foreground">{meta}</p>
            </div>
            <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${healthy ? "bg-primary dark:bg-mint" : "bg-[#F59E0B]"}`}
            />
        </div>
    )
}

export function RenewalPreviewRow({
    name,
    meta,
    daysLabel,
}: {
    name: string
    meta: string
    daysLabel: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                <CalendarClock className="h-4 w-4 text-primary dark:text-mint" />
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-body-sm font-semibold text-foreground">{name}</p>
                <p className="text-caption text-muted-foreground">{meta}</p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-[#FEF3C7] dark:bg-amber-900/30 px-2 py-0.5 text-caption font-semibold text-[#92400E] dark:text-amber-200">
                {daysLabel}
            </span>
        </div>
    )
}

export function RecommendationPreviewCard({
    title,
    meta,
    urgencyLabel,
}: {
    title: string
    meta: string
    urgencyLabel: string
}) {
    return (
        <div className="rounded-xl bg-card p-3 text-left shadow-sm">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                <p className="flex-1 truncate text-body-sm font-semibold text-foreground">{title}</p>
                <span className="flex-shrink-0 rounded-full bg-[#FEF3C7] dark:bg-amber-900/30 px-2 py-0.5 text-caption font-semibold text-[#92400E] dark:text-amber-200">
                    {urgencyLabel}
                </span>
            </div>
            <p className="mt-1.5 text-caption leading-relaxed text-muted-foreground">{meta}</p>
        </div>
    )
}

export { Car as PolicyPreviewCarIcon, Home as PolicyPreviewHomeIcon }
