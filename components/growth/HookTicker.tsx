"use client"

import Link from "next/link"
import { ArrowRight, Pause, Play } from "lucide-react"
import { type MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"
import { GROWTH_HOOKS } from "@/lib/growth/hooks"
import { useRotation } from "@/components/growth/use-rotation"

/**
 * The growth-hook ticker (GROWTH-HOOKS-01). Renders the live B2C hooks from
 * the canonical register — `lib/growth/hooks.ts`, itself guarded against
 * drifting from docs/growth/HOOKS.md — as questions a reader can check
 * against their own policy, each linking to the guide that answers it.
 * Copy is NEVER written inline here; the register decides.
 *
 * TWO RENDER MODES, both required regardless of surface:
 *
 *  - "static": all hooks stacked, no motion, no controls. The homepage always
 *    takes this mode: `HeroSlides` already rotates there and a second rotator
 *    on one page is forbidden (D-G05 — the duplicate-action class arriving on
 *    the marketing surface).
 *  - "rotating": one hook at a time on the shared `useRotation` primitive —
 *    the machinery extracted from HeroSlides, with its pause semantics,
 *    aria-live discipline and inert handling intact. Used on /guides, which
 *    carries no other rotator. Under `prefers-reduced-motion` this mode
 *    RENDERS THE STATIC STACK: someone who asked for no motion gets the
 *    content, not a frozen carousel with a dead pause button.
 *
 * Layout notes carried from the hero's fixed P0: rotating items stack in ONE
 * grid cell so the container is always as tall as the longest hook and
 * nothing below moves on a timer. Every interactive target is at least
 * 44x44px (min-h-11 links, h-11 w-11 dots and pause), with no hover-only
 * affordance — touch parity at every width.
 */

const INTERVAL_MS = 7000

const LINK_CLASSES =
    "group inline-flex min-h-11 items-center gap-2 text-body-lg font-medium leading-snug text-[#0F172A] transition-colors hover:text-[#29685B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:text-white dark:hover:text-[#A7F3D0] dark:focus-visible:outline-[#A7F3D0]"

interface HookTickerProps {
    locale: MarketingLocale
    mode: "static" | "rotating"
    className?: string
}

export function HookTicker({ locale, mode, className }: HookTickerProps) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const rotation = useRotation({
        count: GROWTH_HOOKS.length,
        intervalMs: INTERVAL_MS,
        enabled: mode === "rotating",
    })

    // The static stack is not a fallback — it is the primary rendering for
    // the homepage and the reduced-motion rendering everywhere.
    const isStatic = mode === "static" || rotation.reducedMotion

    const hookLink = (hook: (typeof GROWTH_HOOKS)[number]) => (
        <Link
            href={localizeHref(hook.guideHref, locale)}
            data-hook-id={hook.id}
            className={LINK_CLASSES}
        >
            <span>{hook.line[locale]}</span>
            <ArrowRight
                aria-hidden
                className="h-4 w-4 flex-shrink-0 text-[#29685B] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-[#A7F3D0]"
            />
        </Link>
    )

    if (isStatic) {
        return (
            <section
                aria-label={t("Ερωτήσεις για τη δική σας κάλυψη", "Questions about your own cover")}
                data-growth="hook-ticker"
                data-mode="static"
                className={className}
            >
                <p className="mb-4 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                    {t("Από τους οδηγούς μας", "From our guides")}
                </p>
                <ul className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                    {GROWTH_HOOKS.map((hook) => (
                        <li key={hook.id} className="py-2.5">
                            {hookLink(hook)}
                        </li>
                    ))}
                </ul>
            </section>
        )
    }

    const { index, paused, goTo, togglePaused, rootPauseProps, liveRegion, itemPresence } = rotation

    return (
        <section
            aria-label={t("Ερωτήσεις για τη δική σας κάλυψη", "Questions about your own cover")}
            data-growth="hook-ticker"
            data-mode="rotating"
            className={className}
        >
            <div
                role="group"
                aria-roledescription={t("καρουζέλ", "carousel")}
                aria-label={t("Ερωτήσεις από τους οδηγούς μας", "Questions from our guides")}
                {...rootPauseProps}
            >
                <p className="mb-4 text-caption font-semibold tracking-widest uppercase text-[#29685B] dark:text-[#A7F3D0]">
                    {t("Από τους οδηγούς μας", "From our guides")}
                </p>

                {/* One grid cell: the strip is always as tall as the LONGEST
                    hook, so the list below never moves on a timer. */}
                <div className="grid" aria-live={liveRegion}>
                    {GROWTH_HOOKS.map((hook, i) => {
                        const active = i === index
                        return (
                            <div
                                key={hook.id}
                                className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${
                                    active ? "opacity-100" : "pointer-events-none opacity-0"
                                }`}
                                {...itemPresence(active)}
                            >
                                {hookLink(hook)}
                            </div>
                        )
                    })}
                </div>

                {/* Dots + the visible pause control (WCAG 2.2.2 — Level A, and
                    deliberately not a hover-only affordance). 44px hit areas.
                    This branch never renders under reduced motion, so the
                    control can never be the dead kind. */}
                <div className="mt-3 flex items-center gap-1">
                    {GROWTH_HOOKS.map((hook, i) => (
                        <button
                            key={hook.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-current={i === index ? "true" : undefined}
                            className="group inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:focus-visible:outline-[#A7F3D0]"
                        >
                            <span className="sr-only">{hook.line[locale]}</span>
                            <span
                                aria-hidden
                                className={`block h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                                    i === index
                                        ? "w-7 bg-[#29685B] dark:bg-[#A7F3D0]"
                                        : "w-2.5 bg-[#CBD5E1] group-hover:bg-[#94A3B8] dark:bg-slate-600 dark:group-hover:bg-slate-500"
                                }`}
                            />
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={togglePaused}
                        className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#5B6A7A] transition-colors hover:text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:text-slate-400 dark:hover:text-white dark:focus-visible:outline-[#A7F3D0]"
                    >
                        <span className="sr-only">
                            {paused
                                ? t("Συνέχεια εναλλαγής", "Resume the rotation")
                                : t("Παύση εναλλαγής", "Pause the rotation")}
                        </span>
                        {paused ? (
                            <Play aria-hidden className="h-4 w-4" />
                        ) : (
                            <Pause aria-hidden className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </section>
    )
}
