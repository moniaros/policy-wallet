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
 * **It runs on CSS, not JavaScript, and that is the point.** It used to be a
 * client component holding the selection in React state, which meant the chips
 * were painted long before they worked: measured against production, 843ms on
 * fast 4G with 4x CPU throttling and 2,420ms on slow 4G with 6x — a visitor
 * tapping the page's primary control in that window got nothing. Now each chip
 * is a real checkbox and the reveal is a `:has()` rule, so it responds on the
 * first paint, works with JavaScript disabled, and ships no JS at all.
 *
 * Design notes that are easy to undo by accident:
 *
 * - The reveal rules live inside `@supports selector(:has(*))`. A browser
 *   without `:has()` therefore shows **every** effect line rather than none —
 *   degraded to a plain list, never to a dead control. Do not lift the rules
 *   out of that block.
 * - Every effect line is in the server HTML from the first byte, so a raw-HTML
 *   reader gets the whole argument without the interaction. Note the honest
 *   limit: a crawler that *renders* the page sees only what is selected, the
 *   same as a person. The chip labels, the invitation and STORY.matters below
 *   carry the argument for those readers.
 * - The chips are checkboxes with real labels, so keyboard and screen-reader
 *   users get multi-select semantics for free; the revealed lines sit in a
 *   polite live region, and going from `display:none` to `display:flex` is an
 *   insertion into the accessibility tree, which is what gets announced.
 * - The copy states FACTS about the reader's situation, never a capability of
 *   ours, so no line needs a plan attribution.
 */
export function LifeChangeDiscovery({ locale }: { locale: MarketingLocale }) {
    const isGreek = locale === "el"
    const t = (el: string, en: string) => (isGreek ? el : en)

    // One rule per chip. Written out here rather than as Tailwind variants
    // because the selector has to reach across two lists, and Tailwind cannot
    // emit classes whose names are built at runtime.
    // Two more rules live here rather than as Tailwind variants: the dot is a
    // DESCENDANT of the label, so `peer-checked:` (a sibling combinator) can
    // never reach it, and stacking `forced-colors:` on `peer-checked:` leaves
    // the emitted selector up to variant ordering. Both are spelled out.
    const revealCss = `@supports selector(:has(*)){
#life-changes [data-lc-effect]{display:none}
${LIFE_CHANGE_EFFECTS.map(
    (_, i) => `#life-changes:has(#lc-${i}:checked) [data-lc-effect="${i}"]{display:flex}`
).join("\n")}
}
#life-changes input:checked+label .lc-dot{background:#A7F3D0}
@media (forced-colors:active){#life-changes input:checked+label{border-width:3px;border-style:double}}`

    return (
        <section
            id="life-changes"
            aria-labelledby="life-changes-heading"
            className="mt-5 scroll-mt-28 sm:mt-7 lg:scroll-mt-36"
        >
            <style dangerouslySetInnerHTML={{ __html: revealCss }} />

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
                {LIFE_CHANGE_EFFECTS.map((entry, i) => (
                    <li key={entry.change.en}>
                        {/* The checkbox is the state. It stays focusable — the
                            focus ring is drawn on the label beside it. */}
                        <input type="checkbox" id={`lc-${i}`} className="peer sr-only" />
                        <label
                            htmlFor={`lc-${i}`}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 text-body-sm font-semibold text-[#334155] transition-colors select-none hover:border-[#29685B]/40 peer-checked:border-[#29685B] peer-checked:bg-[#29685B] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#29685B] sm:px-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:peer-checked:border-[#A7F3D0] dark:peer-checked:bg-[#29685B]"
                        >
                            <span
                                aria-hidden
                                className="lc-dot h-1.5 w-1.5 rounded-full bg-[#CBD5E1] transition-colors dark:bg-slate-600"
                            />
                            {pick(entry.change, locale)}
                        </label>
                    </li>
                ))}
            </ul>

            {/* Every line ships in the HTML; the CSS above unhides the picked one. */}
            <ul aria-live="polite" className="mt-4 flex max-w-[560px] flex-col gap-2.5">
                {LIFE_CHANGE_EFFECTS.map((entry, i) => (
                    <li
                        key={entry.change.en}
                        data-lc-effect={i}
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
                ))}
            </ul>

            {/* The argument itself — always readable, with or without JS. */}
            <p className="mt-5 max-w-[520px] text-body-lg leading-relaxed text-[#475569] sm:text-lead dark:text-slate-300">
                {pick(STORY.matters, locale)}
            </p>
        </section>
    )
}
