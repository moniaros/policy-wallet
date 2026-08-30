"use client"

/**
 * Grafí product-expressive components — these carry the brand. All sample
 * content is stamped as sample; nothing here may imply a real household.
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { StatusChip } from "./primitives"

/* ── ProtectionRing ─────────────────────────────────────────────────── */
/**
 * The household coverage summary. Three arcs — covered / gap / review — on the
 * state tokens, with a text legend so colour never carries alone. `review`
 * renders even at zero so the legend always teaches the third state.
 */
export function ProtectionRing({
    covered,
    gap,
    review,
    label,
    className,
}: {
    covered: number
    gap: number
    review: number
    label: string
    className?: string
}) {
    const total = Math.max(covered + gap + review, 1)
    const C = 2 * Math.PI * 54
    const seg = (n: number) => (n / total) * C
    let offset = 0
    const arcs = [
        { n: covered, cls: "stroke-state-covered" },
        { n: gap, cls: "stroke-state-gap" },
        { n: review, cls: "stroke-state-review" },
    ].map((a) => {
        const dash = `${Math.max(seg(a.n) - 4, 0)} ${C}`
        const el = { ...a, dash, off: -offset }
        offset += seg(a.n)
        return el
    })
    return (
        <figure className={cn("flex items-center gap-g-6", className)}>
            <svg viewBox="0 0 128 128" className="size-32" role="img" aria-label={label}>
                <circle cx="64" cy="64" r="54" className="stroke-border-subtle" strokeWidth="12" fill="none" />
                {arcs.map((a, i) => (
                    <circle
                        key={i}
                        cx="64" cy="64" r="54" fill="none" strokeWidth="12" strokeLinecap="round"
                        className={a.cls}
                        strokeDasharray={a.dash}
                        strokeDashoffset={a.off}
                        transform="rotate(-90 64 64)"
                    />
                ))}
                <text x="64" y="60" textAnchor="middle" className="fill-fg-primary text-[1.6rem] font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                    {covered}/{total}
                </text>
                <text x="64" y="78" textAnchor="middle" className="fill-fg-secondary text-[0.6rem]">
                    {label}
                </text>
            </svg>
            <figcaption className="flex flex-col gap-g-2 text-sm">
                <StatusChip state="covered">{covered} καλυμμένα</StatusChip>
                <StatusChip state="gap">{gap} κενά</StatusChip>
                <StatusChip state="review">{review} για έλεγχο</StatusChip>
            </figcaption>
        </figure>
    )
}

/* ── PolicyStrip ────────────────────────────────────────────────────── */
export interface PolicyStripItem {
    name: string
    state: "covered" | "gap" | "review"
}
export function PolicyStrip({ items, className }: { items: PolicyStripItem[]; className?: string }) {
    return (
        <ul className={cn("flex flex-wrap gap-g-2", className)}>
            {items.map((p) => (
                <li key={p.name}>
                    <StatusChip state={p.state}>{p.name}</StatusChip>
                </li>
            ))}
        </ul>
    )
}

/* ── DeviceFrame ────────────────────────────────────────────────────── */
/**
 * iPhone-proportioned frame with dot navigation and auto-cycling that stops
 * off-screen, on hover/focus, and entirely under prefers-reduced-motion —
 * where it renders the FIRST screen statically with the dots still operable.
 * The a11y machinery mirrors components/growth/use-rotation.ts's rules; kept
 * local because the cycle here is a visual demo, not a headline.
 */
export function DeviceFrame({
    screens,
    interval = 4500,
    className,
}: {
    screens: { id: string; label: string; content: ReactNode }[]
    interval?: number
    className?: string
}) {
    const [index, setIndex] = useState(0)
    const [reduced, setReduced] = useState(false)
    const [inView, setInView] = useState(true)
    const hold = useRef(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const q = window.matchMedia("(prefers-reduced-motion: reduce)")
        const apply = () => setReduced(q.matches)
        apply(); q.addEventListener("change", apply)
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 })
        if (ref.current) io.observe(ref.current)
        return () => { q.removeEventListener("change", apply); io.disconnect() }
    }, [])

    useEffect(() => {
        if (reduced || !inView) return
        const t = window.setInterval(() => {
            if (!hold.current) setIndex((i) => (i + 1) % screens.length)
        }, interval)
        return () => window.clearInterval(t)
    }, [reduced, inView, interval, screens.length])

    return (
        <div
            ref={ref}
            className={cn("flex flex-col items-center gap-g-4", className)}
            onMouseEnter={() => (hold.current = true)}
            onMouseLeave={() => (hold.current = false)}
            onFocusCapture={() => (hold.current = true)}
            onBlurCapture={() => (hold.current = false)}
        >
            <div className="w-[248px] rounded-[38px] border border-border-strong bg-surface-inverse p-g-2 shadow-g-overlay">
                <div className="relative aspect-[9/19] overflow-hidden rounded-[30px] bg-surface-base" aria-live={reduced ? undefined : "off"}>
                    {screens.map((s, i) => (
                        <div
                            key={s.id}
                            aria-hidden={i !== index}
                            // reduced motion: no fade, first screen static
                            className={cn(
                                "absolute inset-0 p-g-4 transition-opacity duration-[450ms] [transition-timing-function:var(--ease-out-g)] motion-reduce:transition-none",
                                i === index ? "opacity-100" : "pointer-events-none opacity-0"
                            )}
                        >
                            {s.content}
                        </div>
                    ))}
                </div>
            </div>
            <div role="tablist" aria-label="Οθόνες εφαρμογής" className="flex gap-g-1">
                {screens.map((s, i) => (
                    <button
                        key={s.id}
                        role="tab"
                        aria-selected={i === index}
                        onClick={() => setIndex(i)}
                        className="grid size-11 place-items-center rounded-g-pill focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"
                    >
                        <span className="sr-only">{s.label}</span>
                        <span aria-hidden className={cn("block h-2 rounded-g-pill transition-all duration-200 motion-reduce:transition-none", i === index ? "w-6 bg-fg-brand" : "w-2 bg-border-strong")} />
                    </button>
                ))}
            </div>
        </div>
    )
}
