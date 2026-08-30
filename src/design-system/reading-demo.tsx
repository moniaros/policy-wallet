"use client"

import { useEffect, useRef, useState } from "react"
import { READING_DEMO_STRINGS, READING_DEMO_TABS } from "@/lib/marketing/reading-demo"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { StatusChip } from "./primitives"
import { cn } from "@/lib/utils"

/**
 * ReadingDemo (§4.7) — the interactive sample-policy analysis, and the page's
 * clearest statement of what the product actually does.
 *
 * Choreography (`scan-read`, §4.5): pick a sample, a sweep passes over the
 * document lines (~950ms), then the result rows rise in with a 70ms stagger —
 * capped at four steps, which is also why every sample has exactly four
 * findings. `aria-live` announces completion; a replay control re-runs it.
 *
 * Under `prefers-reduced-motion` there is no sweep and no stagger: the final
 * state renders immediately, complete. The «ΔΕΙΓΜΑ» stamp is permanent and
 * outside the animated region, so no state ever hides it.
 *
 * Keyboard: real roving-tabindex tabs — Arrow keys move AND select (the
 * results are static content, so select-on-focus costs nothing), Home/End
 * jump. Focus stays on the tablist; the sweep is decorative and inert.
 */
export function ReadingDemo({ locale, className }: { locale: MarketingLocale; className?: string }) {
    const [active, setActive] = useState(0)
    const [run, setRun] = useState(0)
    const [done, setDone] = useState(false)
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const reduced = useRef(false)

    useEffect(() => {
        reduced.current =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    }, [])

    useEffect(() => {
        if (reduced.current) {
            setDone(true)
            return
        }
        setDone(false)
        const timer = setTimeout(() => setDone(true), 950)
        return () => clearTimeout(timer)
    }, [active, run])

    const tab = READING_DEMO_TABS[active]
    const S = READING_DEMO_STRINGS

    const onKeyDown = (e: React.KeyboardEvent) => {
        const last = READING_DEMO_TABS.length - 1
        let next: number | null = null
        if (e.key === "ArrowRight") next = active === last ? 0 : active + 1
        else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1
        else if (e.key === "Home") next = 0
        else if (e.key === "End") next = last
        if (next !== null) {
            e.preventDefault()
            setActive(next)
            tabRefs.current[next]?.focus()
        }
    }

    return (
        <div className={cn("rounded-g-lg border border-border-subtle bg-surface-raised p-g-5 sm:p-g-6", className)}>
            <div
                role="tablist"
                aria-label={pick(S.tablistLabel, locale)}
                onKeyDown={onKeyDown}
                className="flex flex-wrap gap-g-2"
            >
                {READING_DEMO_TABS.map((t, i) => (
                    <button
                        key={t.id}
                        ref={(el) => { tabRefs.current[i] = el }}
                        role="tab"
                        id={`rdemo-tab-${t.id}`}
                        aria-selected={i === active}
                        aria-controls={`rdemo-panel-${t.id}`}
                        tabIndex={i === active ? 0 : -1}
                        onClick={() => setActive(i)}
                        className={cn(
                            "min-h-11 rounded-g-pill px-g-5 text-g-body-sm font-semibold transition-colors",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border-focus",
                            i === active
                                ? "bg-action-primary-bg text-fg-on-brand"
                                : "border border-border-strong text-fg-secondary hover:text-fg-primary"
                        )}
                    >
                        {pick(t.label, locale)}
                    </button>
                ))}
            </div>

            <div
                role="tabpanel"
                id={`rdemo-panel-${tab.id}`}
                aria-labelledby={`rdemo-tab-${tab.id}`}
                className="mt-g-5 grid gap-g-5 md:grid-cols-2"
            >
                {/* The sample document, with the sweep passing over it. */}
                <div className="relative overflow-hidden rounded-g-md border border-border-subtle bg-surface-sunken p-g-5">
                    <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-secondary">
                        {pick(S.stamp, locale)}
                    </p>
                    <ul className="mt-g-4 space-y-g-3">
                        {tab.docLines.map((line, i) => (
                            <li key={i} className="truncate font-mono text-g-caption text-fg-secondary">
                                {pick(line, locale)}
                            </li>
                        ))}
                    </ul>
                    {!done && (
                        <div aria-hidden className="g-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-16" />
                    )}
                </div>

                {/* Findings. aria-live announces completion; rows stagger in. */}
                <div aria-live="polite">
                    {done ? (
                        <>
                            <p className="sr-only">{pick(S.doneAnnouncement, locale)}</p>
                            <ul key={`${tab.id}-${run}`} className="space-y-g-3">
                                {tab.results.map((r, i) => (
                                    <li
                                        key={i}
                                        className="g-row-in flex items-start gap-g-3"
                                        style={{ animationDelay: `${Math.min(i, 3) * 70}ms` }}
                                    >
                                        <StatusChip state={r.state} className="flex-none">
                                            {pick(S.stateLabels[r.state], locale)}
                                        </StatusChip>
                                        <span className="text-g-body-sm text-fg-primary">{pick(r.text, locale)}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={() => setRun((n) => n + 1)}
                                className="mt-g-5 min-h-11 rounded-g-pill border border-border-strong px-g-5 text-g-body-sm font-semibold text-fg-secondary transition-colors hover:text-fg-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                            >
                                {pick(S.replay, locale)}
                            </button>
                        </>
                    ) : (
                        <p className="text-g-body-sm text-fg-secondary">{pick(S.scanning, locale)}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
