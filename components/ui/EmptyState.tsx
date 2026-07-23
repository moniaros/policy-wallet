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
    className = "",
}: EmptyStateProps) {
    const ctaClasses =
        "inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"

    return (
        <div
            className={`flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#111111] ${className}`}
        >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                <Icon className="h-7 w-7 text-primary dark:text-mint" />
            </div>

            <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                {headline}
            </h3>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#475569] dark:text-white/65">
                {description}
            </p>

            {preview && (
                <div className="relative mt-7 w-full max-w-sm rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-white/15 dark:bg-white/5">
                    {previewLabel && (
                        <span className="absolute -top-2.5 left-4 rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#64748B] dark:border-white/15 dark:bg-black dark:text-white/60">
                            {previewLabel}
                        </span>
                    )}
                    <div className="pointer-events-none select-none space-y-2 opacity-80">
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
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#64748B] dark:text-white/50">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary dark:text-mint" />
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
        <div className="flex items-center gap-3 rounded-xl border border-transparent bg-white p-3 shadow-sm dark:bg-black">
            <div
                className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] ${warn ? "bg-[#FEF3C7]" : "bg-primary-soft dark:bg-primary/15"}`}
            >
                <Icon className={`h-4 w-4 ${warn ? "text-[#B45309]" : "text-primary dark:text-mint"}`} />
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
                <p className="text-[11px] text-[#64748B] dark:text-white/55">{meta}</p>
            </div>
            <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    warn
                        ? "bg-[#FEF3C7] text-[#B45309]"
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
        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-black">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
                {initial}
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
                <p className="text-[11px] text-[#64748B] dark:text-white/55">{meta}</p>
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
        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-black">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-primary-soft dark:bg-primary/15">
                <CalendarClock className="h-4 w-4 text-primary dark:text-mint" />
            </div>
            <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
                <p className="text-[11px] text-[#64748B] dark:text-white/55">{meta}</p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#B45309]">
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
        <div className="rounded-xl bg-white p-3 text-left shadow-sm dark:bg-black">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                <p className="flex-1 truncate text-[13px] font-semibold text-foreground">{title}</p>
                <span className="flex-shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#B45309]">
                    {urgencyLabel}
                </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#64748B] dark:text-white/55">{meta}</p>
        </div>
    )
}

export { Car as PolicyPreviewCarIcon, Home as PolicyPreviewHomeIcon }
