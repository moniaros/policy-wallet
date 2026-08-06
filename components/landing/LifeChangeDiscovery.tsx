"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import {
    CTA_REASSURANCE,
    LIFE_CHANGE_EFFECTS,
    PRIMARY_ACTION,
    STORY,
    pick,
    type MarketingLocale,
} from "@/lib/marketing/positioning"

/**
 * "What changed?" — the visitor picks the changes that happened to them and
 * discovers, one line at a time, why their cover may no longer fit.
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

    const chosen = LIFE_CHANGE_EFFECTS.filter((entry) => selected.includes(entry.change.en))

    return (
        <section
            id="life-changes"
            aria-labelledby="life-changes-heading"
            className="border-y border-[#E2E8F0] bg-[#F8FAFC] px-6 py-12 lg:px-12 lg:py-16 dark:border-slate-800 dark:bg-slate-900"
        >
            <div className="mx-auto max-w-page space-y-6 text-center">
                <h2
                    id="life-changes-heading"
                    className="text-lead font-semibold text-balance text-[#0F172A] sm:text-title dark:text-white"
                >
                    {t("Κάτι άλλαξε στη ζωή σας φέτος;", "Did something change in your life this year?")}
                </h2>

                <p className="text-body-sm text-[#5B6A7A] dark:text-slate-400">
                    {t("Διαλέξτε ό,τι ισχύει. Θα δείτε τι αλλάζει.", "Pick what applies. You will see what changes.")}
                </p>

                <ul className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    {LIFE_CHANGE_EFFECTS.map((entry) => {
                        const key = entry.change.en
                        const active = selected.includes(key)
                        return (
                            <li key={key}>
                                <button
                                    type="button"
                                    onClick={() => toggle(key)}
                                    aria-pressed={active}
                                    className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-body-sm font-semibold transition-colors ${
                                        active
                                            ? "border-[#29685B] bg-[#29685B] text-white dark:border-[#A7F3D0] dark:bg-[#29685B]"
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
                <ul
                    aria-live="polite"
                    className="mx-auto flex max-w-[640px] flex-col gap-2.5 text-left"
                >
                    {LIFE_CHANGE_EFFECTS.map((entry) => {
                        const key = entry.change.en
                        const active = selected.includes(key)
                        return (
                            <li
                                key={key}
                                hidden={!active}
                                className="flex items-center justify-between gap-4 rounded-2xl border border-[#DCEBDA] bg-white px-4 py-3 dark:border-[#29685B]/40 dark:bg-slate-800"
                            >
                                <span className="text-body text-[#0F172A] dark:text-white">
                                    {pick(entry.effect, locale)}
                                </span>
                                <Link
                                    href={localizeHref(entry.href, locale)}
                                    className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 text-body-sm font-semibold text-[#29685B] underline-offset-4 hover:underline dark:text-[#A7F3D0]"
                                >
                                    {t("Δείτε τι μετράει", "See what matters")}
                                    <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                {/* The argument itself — always readable, with or without JS. */}
                <p className="mx-auto max-w-[560px] text-body-lg text-[#475569] dark:text-slate-300">
                    {pick(STORY.matters, locale)}
                </p>

                {chosen.length > 0 ? (
                    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3 pt-1">
                        <Link
                            href={`/auth/signup?role=policyholder&source=landing_life_changes`}
                            className="pw-primary-button pw-btn-lg w-full sm:w-auto"
                        >
                            {pick(PRIMARY_ACTION, locale)}
                            <ArrowRight aria-hidden className="h-4 w-4" />
                        </Link>
                        <p className="text-body-sm text-[#5B6A7A] dark:text-slate-400">
                            {pick(CTA_REASSURANCE, locale)}
                        </p>
                    </div>
                ) : null}
            </div>
        </section>
    )
}
