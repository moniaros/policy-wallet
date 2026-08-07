"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { LIFE_CHANGE_EFFECTS, STORY, pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * "What changed?" — the visitor picks the changes that happened to them and
 * discovers, one line at a time, why their cover may no longer fit.
 *
 * This is the first screen, not a mid-page band: the headline asks whether your
 * insurance knows your life changed, and this answers it with the visitor's own
 * answer instead of a paragraph about us. It carries no CTA of its own — the
 * hero owns the single tracked button directly below.
 *
 * Design notes that are easy to undo by accident:
 *
 * - EVERY effect line is in the server HTML from the first byte. Selecting a
 *   chip only flips the `hidden` attribute, so crawlers and AI readers get the
 *   whole story without running the interaction, and the section still reads
 *   as a complete argument with JavaScript off.
 * - The chips are real <button>s with `aria-pressed`, so keyboard and screen
 *   reader users get the same experience; the revealed lines live in a polite
 *   live region so a selection is announced rather than silently appearing.
 * - No animation library: the reveal is a CSS transition on the list, which
 *   keeps this off the critical JS path.
 * - The copy states FACTS about the reader's situation, never a capability of
 *   ours, so no line needs a plan attribution.
 */
export function LifeChangeDiscovery({ locale }: { locale: MarketingLocale }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)
    const [selected, setSelected] = useState<string[]>([])

    const toggle = (key: string) =>
        setSelected((current) =>
            current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
        )

    return (
        <section
            id="life-changes"
            aria-labelledby="life-changes-heading"
            className="mt-5 scroll-mt-28 sm:mt-7 lg:scroll-mt-36"
        >
            {/* The H1 above already asks the question; this is the invitation. */}
            <h2
                id="life-changes-heading"
                className="mb-3 text-body-lg font-semibold text-[#0F172A] sm:text-lead dark:text-white"
            >
                {t("Διαλέξτε τι άλλαξε φέτος.", "Pick what changed this year.")}
            </h2>

            {/* Narrower on phones: at 320px the column is 272px wide and every
                Greek phrase claimed a row of its own. The label keeps its 13px
                and the target keeps its 44px — only the padding gives way. */}
            <ul className="flex flex-wrap gap-2 sm:gap-3">
                {LIFE_CHANGE_EFFECTS.map((entry) => {
                    const key = entry.change.en
                    const active = selected.includes(key)
                    return (
                        <li key={key}>
                            <button
                                type="button"
                                onClick={() => toggle(key)}
                                aria-pressed={active}
                                className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-body-sm font-semibold transition-colors sm:px-4 ${
                                    active
                                        ? "border-[#29685B] bg-[#29685B] text-white forced-colors:border-[3px] forced-colors:border-double dark:border-[#A7F3D0] dark:bg-[#29685B]"
                                        : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#29685B]/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                }`}
                            >
                                <span
                                    aria-hidden
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                        active ? "bg-[#A7F3D0]" : "bg-[#CBD5E1] dark:bg-slate-600"
                                    }`}
                                />
                                {pick(entry.change, locale)}
                            </button>
                        </li>
                    )
                })}
            </ul>

            {/* Every line ships in the HTML; selection only unhides one. */}
            <ul aria-live="polite" className="mt-4 flex max-w-[560px] flex-col gap-2.5">
                {LIFE_CHANGE_EFFECTS.map((entry) => {
                    const key = entry.change.en
                    const active = selected.includes(key)
                    return (
                        <li
                            key={key}
                            hidden={!active}
                            className="flex flex-col items-start gap-2 rounded-2xl border border-[#DCEBDA] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-[#29685B]/40 dark:bg-slate-800"
                        >
                            <span className="text-body text-[#0F172A] dark:text-white">
                                {pick(entry.effect, locale)}
                            </span>
                            <Link
                                href={localizeHref(entry.href, locale)}
                                className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 text-body-sm font-semibold text-[#29685B] underline-offset-4 hover:underline dark:text-[#A7F3D0]"
                            >
                                {t("Δείτε τι μετράει", "See what matters")}
                                {/* Six links otherwise share one accessible
                                    name; the change makes each unique. */}
                                <span className="sr-only"> — {pick(entry.change, locale)}</span>
                                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                            </Link>
                        </li>
                    )
                })}
            </ul>

            {/* The argument itself — always readable, with or without JS. */}
            <p className="mt-5 max-w-[520px] text-body-lg leading-relaxed text-[#475569] sm:text-lead dark:text-slate-300">
                {pick(STORY.matters, locale)}
            </p>
        </section>
    )
}
