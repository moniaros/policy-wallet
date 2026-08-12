import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { localizeHref } from "@/lib/seo/locale-links"
import { LIFE_CHANGE_EFFECTS, pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * "What changed?" — the visitor picks the changes that happened to them and
 * discovers, one line at a time, why their cover may no longer fit.
 *
 * This is the first screen, not a mid-page band: the headline asks whether your
 * insurance knows your life changed, and this answers it with the visitor's own
 * answer instead of a paragraph about us. It carries no CTA of its own — the
 * hero owns the single tracked button directly below.
 *
 * **The reveal must not push that button away.** Each effect used to be a
 * bordered card carrying its own 44px link, so the section grew ~120px per
 * selection: measured at 390x844, the hero CTA sat at y=591 unselected, 935 at
 * three chips and 1333 at six — the visitor who engaged MOST was the one who
 * could no longer see the thing to do next, and what filled the space was six
 * near-identical links leaving the page. Each effect is now a single quiet row
 * and the six links are one link under the group, so the whole set costs less
 * than half of what three used to. If a future change gives these rows chrome
 * or a per-row action again, re-measure the CTA at six selections before
 * shipping it.
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
 *   same as a person. The chip labels, the invitation, and the STORY.matters
 *   paragraph the hero renders below the CTA carry the argument for those
 *   readers.
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
    //
    // The scroll-margin that keeps a focused control out from under the fixed
    // header is NOT here: it belongs to every focusable on the page, not just
    // these, and lives once in WorldClassLanding.
    const revealCss = `@supports selector(:has(*)){
#life-changes [data-lc-effect]{display:none}
${LIFE_CHANGE_EFFECTS.map(
    (_, i) => `#life-changes:has(#lc-${i}:checked) [data-lc-effect="${i}"]{display:flex}`
).join("\n")}
#life-changes .lc-more{display:none}
#life-changes:has(input:checked) .lc-more{display:inline-flex}
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
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 text-body-sm font-semibold text-[#334155] transition-colors select-none hover:border-[#29685B]/40 peer-checked:border-[#29685B] peer-checked:bg-[#29685B] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#29685B] sm:px-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:peer-checked:border-[#A7F3D0] dark:peer-checked:bg-[#29685B] dark:peer-focus-visible:outline-[#A7F3D0]"
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

            {/* Every line ships in the HTML; the CSS above unhides the picked one.
                Quiet rows, not cards: this is the consequence of the visitor's
                own answer, and it sits between them and the button. A row costs
                one line of text — the card chrome and the per-row link that used
                to live here cost roughly three. */}
            <ul aria-live="polite" className="mt-4 flex max-w-[560px] flex-col gap-1.5">
                {LIFE_CHANGE_EFFECTS.map((entry, i) => (
                    <li
                        key={entry.change.en}
                        data-lc-effect={i}
                        /* `flex` is for the no-`:has()` fallback, where the ID
                           rules above never apply and this class governs. */
                        className="flex items-start gap-2.5 py-1 text-body text-[#0F172A] dark:text-white"
                    >
                        <span
                            aria-hidden
                            className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]"
                        />
                        <span>{pick(entry.effect, locale)}</span>
                    </li>
                ))}
            </ul>

            {/* One way out, not six. Six per-row links all read "Δείτε τι
                μετράει", all left the page, and all sat between the visitor and
                the primary action; the branch index is where a curious reader
                actually wants to land.

                It appears only once something is selected: before that it
                explains nothing, and an always-on link costs ~52px of the
                distance between the headline and the button for every visitor,
                including the ones who never touch a chip. */}
            <Link
                href={localizeHref("/product", locale)}
                className="lc-more mt-2 inline-flex min-h-11 items-center gap-1 text-body-sm font-semibold text-[#29685B] underline-offset-4 hover:underline dark:text-[#A7F3D0]"
            >
                {t("Δείτε τι μετράει", "See what matters")}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
        </section>
    )
}
