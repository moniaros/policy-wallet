"use client"

import { Pause, Play } from "lucide-react"
import { type MarketingLocale } from "@/lib/marketing/positioning"
import { useRotation } from "@/components/growth/use-rotation"

/**
 * Three hero slides, each one benefit the product delivers.
 *
 * WHAT ROTATES AND WHAT DOES NOT. Only the headline and its lead paragraph
 * change. The category chip, both buttons, the value line and the free-tier
 * note sit BELOW this component and never move. That is deliberate: a carousel
 * that swaps the primary action out from under a cursor mid-reach is the
 * classic way these things lose the click they were built to win, and the
 * homepage already fixed a P0 where the CTA moved on interaction. Nothing here
 * is allowed to reintroduce it.
 *
 * WHY THE SLIDES ARE STACKED IN ONE GRID CELL. Every slide occupies the same
 * cell, so the container is always as tall as the LONGEST slide and the height
 * never changes when one advances. A carousel that resizes per slide pushes the
 * rest of the page up and down on a timer, which is both a layout-shift score
 * and a genuinely unpleasant thing to read next to.
 *
 * ACCESSIBILITY IS NOT OPTIONAL HERE. Content that auto-updates for more than
 * five seconds needs a mechanism to pause it — WCAG 2.2.2, and it is Level A,
 * not AA. So:
 *
 *  - an explicit pause/play button, labelled, not a hover-only affordance;
 *  - auto-advance stops on hover AND on keyboard focus anywhere inside;
 *  - `prefers-reduced-motion` disables auto-advance entirely rather than just
 *    shortening the fade — someone who asked for no motion did not ask for
 *    faster motion;
 *  - the live region is `off` while it advances by itself and `polite` once a
 *    person takes control, per the ARIA carousel pattern: announcing every
 *    automatic change would talk over whatever the user is actually doing;
 *  - inactive slides get `inert`, so a screen reader and the tab order see one
 *    headline rather than three.
 *
 * COLOUR COMES FROM TOKENS, INCLUDING THE DARK HALF. Nothing here writes a
 * hex literal or a `dark:` colour twin. `text-brand-accent` is the brand green
 * on the light page and the mint on the dark one because the var flips
 * underneath — and those two are not a style pair, they are a CONTRAST pair:
 * the green measures 2.74:1 on slate-900 and is unusable there. Writing the
 * light half as a token and the dark half as a literal, which is what four
 * sibling landing files still do, buys a governed light theme and an
 * ungoverned dark one; token work gets reviewed in light mode, so that is
 * where drift hides. The values and the measurements live in app/globals.css,
 * which is the only place a colour literal belongs, and
 * tests/unit/token-contrast-contract.test.ts enforces them.
 *
 * (Values are named, not written, in this comment on purpose: the debt guard
 * counts a hex run in prose as a literal, and it is right to.)
 *
 * The inactive dot was the one thing in this file that actually failed. At
 * slate-300 it measured 1.48:1 on white — and slate-600 measured 2.36:1 on the
 * dark page, so it failed harder in the theme nobody was checking. An inactive
 * dot is the only thing telling a reader the control is there, which puts it
 * under SC 1.4.11 at 3:1. It is now --dot-track: 3.61:1 light, 3.75:1 dark.
 * Everything else on this page already passed and was migrated unchanged.
 *
 * THE CLAIMS. Every slide states a benefit the product actually delivers, and
 * the one that depends on a paid plan says so on the slide rather than in a
 * footnote. Nothing here names a competitor, characterises anyone's motives, or
 * quotes a figure a reader cannot check.
 */

const INTERVAL_MS = 7000

/** One ramp for both tags, so the swap can never change how a slide looks. */
const HEADLINE =
    "text-h1 leading-[1.03] font-semibold tracking-[-0.04em] text-balance text-brand-text-primary lg:text-display"

interface Slide {
    id: string
    headline: (locale: MarketingLocale) => React.ReactNode
    lead: (locale: MarketingLocale) => string
    /** Short label for the dot, so the control names its destination. */
    dot: { el: string; en: string }
}

const SLIDES: Slide[] = [
    {
        id: "one-place",
        dot: { el: "Όλα σε ένα σημείο", en: "All in one place" },
        headline: (locale) =>
            locale === "el" ? (
                <>
                    Όλα τα ασφαλιστήρια, από όλες τις εταιρείες,{" "}
                    <span className="text-brand-accent">σε ένα ασφαλές σημείο.</span>
                </>
            ) : (
                <>
                    Every policy, from every company,{" "}
                    <span className="text-brand-accent">in one place.</span>
                </>
            ),
        lead: (locale) =>
            locale === "el"
                ? "Αρκεί να στείλετε ένα αρχείο ή μια φωτογραφία. Τα μαζεύουμε, τα διαβάζουμε και ξέρετε πάντα τι καλύπτει το καθένα και πότε λήγει."
                : "Just send a file or a photo. We gather them, read them, and you always know what each one covers and when it runs out.",
    },
    {
        id: "duplicates",
        dot: { el: "Διπλές καλύψεις και κενά", en: "Duplicates and gaps" },
        headline: (locale) =>
            locale === "el" ? (
                <>
                    Ούτε περισσότερα, ούτε λιγότερα{" "}
                    <span className="text-brand-accent">από όσα χρειάζεστε.</span>
                </>
            ) : (
                <>
                    No more, and no less,{" "}
                    <span className="text-brand-accent">than you actually need.</span>
                </>
            ),
        // Gap and duplicate detection is a Plus feature. Naming the plan is the
        // same rule the rest of the site follows — a benefit promised in the
        // hero and then paywalled is the one thing a first visit cannot afford.
        lead: (locale) =>
            locale === "el"
                ? "Εντοπίστε διπλές καλύψεις που πληρώνετε δύο φορές και ασφαλιστικά κενά που δεν ξέρατε ότι έχετε ή δεν είχατε όταν κάνατε το ασφαλιστήριό σας — με το Family."
                : "Spot cover you are paying for twice, and gaps you did not know you had — with Family.",
    },
    {
        id: "hidden-benefits",
        dot: { el: "Κρυμμένες παροχές", en: "Hidden benefits" },
        headline: (locale) =>
            locale === "el" ? (
                <>
                    Βρείτε τις παροχές που{" "}
                    <span className="text-brand-accent">κρύβονται στα μικρά γράμματα.</span>
                </>
            ) : (
                <>
                    Find the benefits that are{" "}
                    <span className="text-brand-accent">buried in the small print.</span>
                </>
            ),
        lead: (locale) =>
            locale === "el"
                ? "Οδική βοήθεια, ετήσιο check-up, απευθείας πληρωμή νοσοκομείου, επαναπατρισμός: πολλά μπορεί να τα έχετε ήδη. Σας δείχνουμε ποια, με απλά λόγια."
                : "Roadside assistance, an annual check-up, direct hospital billing, repatriation: plenty may already be yours. We show you which, in plain words.",
    },
]

export function HeroSlides({ locale }: { locale: MarketingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    // The rotation + a11y machinery (interval, hover/focus holds, reduced
    // motion, aria-live discipline, inert presence) lives in ONE primitive
    // shared with HookTicker — see components/growth/use-rotation.ts for the
    // reasoning each rule carries. This component keeps only its content and
    // its layout; tests/unit/hero-slides-rotation-regression.test.tsx pins the
    // extraction to byte-identical DOM against pre-refactor baselines.
    const { index, paused, reducedMotion, goTo, togglePaused, rootPauseProps, liveRegion, itemPresence } =
        useRotation({ count: SLIDES.length, intervalMs: INTERVAL_MS })

    return (
        <div
            role="group"
            aria-roledescription={t("καρουζέλ", "carousel")}
            aria-label={t("Τι κάνει το PolicyWallet", "What PolicyWallet does")}
            {...rootPauseProps}
        >
            {/* One grid cell, three slides stacked in it: the box is always as
                tall as the longest slide, so nothing below it moves. */}
            <div className="grid" aria-live={liveRegion}>
                {SLIDES.map((slide, i) => {
                    const active = i === index
                    return (
                        <div
                            key={slide.id}
                            className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${
                                active ? "opacity-100" : "pointer-events-none opacity-0"
                            }`}
                            // aria-hidden + React 19's boolean `inert`: in
                            // the DOM, out of the a11y tree and tab order. The
                            // primitive owns the rule; the spread keeps the
                            // serialized attribute order the baselines pin.
                            {...itemPresence(active)}
                        >
                            {/* Only the visible slide is an <h1>. All three used
                                to be, so the homepage shipped three h1 elements:
                                `inert` and `aria-hidden` keep the other two away
                                from assistive tech and the tab order, but they
                                stay in the DOM, and a crawler counts what is in
                                the DOM. Same classes either way — this changes
                                the document outline, not the design. */}
                            {active ? (
                                <h1 className={HEADLINE}>{slide.headline(locale)}</h1>
                            ) : (
                                <p className={HEADLINE}>{slide.headline(locale)}</p>
                            )}
                            <p className="mx-auto mt-6 max-w-[620px] text-body-lg leading-relaxed text-neutral-600 sm:text-lead dark:text-neutral-300">
                                {slide.lead(locale)}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Dots + the pause control. 44px tall hit areas around a 10px dot,
                so the target clears 2.5.8 without a row of oversized circles. */}
            <div className="mt-8 flex items-center justify-center gap-1">
                {SLIDES.map((slide, i) => (
                    <button
                        key={slide.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={i === index ? "true" : undefined}
                        className="group inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    >
                        <span className="sr-only">{slide.dot[locale]}</span>
                        <span
                            aria-hidden
                            className={`block h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                                i === index
                                    ? "w-7 bg-brand-accent"
                                    : "w-2.5 bg-dot-track group-hover:bg-dot-track-hover"
                            }`}
                        />
                    </button>
                ))}

                {/* Hidden when the OS already asked for no motion: there is
                    nothing left to pause, and a dead control is worse than no
                    control. */}
                {!reducedMotion && (
                    <button
                        type="button"
                        onClick={togglePaused}
                        className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-brand-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    >
                        <span className="sr-only">
                            {paused
                                ? t("Συνέχεια εναλλαγής", "Resume the slideshow")
                                : t("Παύση εναλλαγής", "Pause the slideshow")}
                        </span>
                        {paused ? (
                            <Play aria-hidden className="h-4 w-4" />
                        ) : (
                            <Pause aria-hidden className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
