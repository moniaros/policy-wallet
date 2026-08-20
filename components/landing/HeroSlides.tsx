"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { type MarketingLocale } from "@/lib/marketing/positioning"

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
 * THE CLAIMS. Every slide states a benefit the product actually delivers, and
 * the one that depends on a paid plan says so on the slide rather than in a
 * footnote. Nothing here names a competitor, characterises anyone's motives, or
 * quotes a figure a reader cannot check.
 */

const INTERVAL_MS = 7000

/** One ramp for both tags, so the swap can never change how a slide looks. */
const HEADLINE =
    "text-h1 leading-[1.03] font-semibold tracking-[-0.04em] text-balance text-[#0F172A] lg:text-display dark:text-white"

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
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">σε ένα ασφαλές σημείο.</span>
                </>
            ) : (
                <>
                    Every policy, from every company,{" "}
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">in one place.</span>
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
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">από όσα χρειάζεστε.</span>
                </>
            ) : (
                <>
                    No more, and no less,{" "}
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">than you actually need.</span>
                </>
            ),
        // Gap and duplicate detection is a Plus feature. Naming the plan is the
        // same rule the rest of the site follows — a benefit promised in the
        // hero and then paywalled is the one thing a first visit cannot afford.
        lead: (locale) =>
            locale === "el"
                ? "Εντοπίστε διπλές καλύψεις που πληρώνετε δύο φορές και ασφαλιστικά κενά που δεν ξέρατε ότι έχετε ή δεν είχατε όταν κάνατε το συμβόλαιο σας— με το PolicyWallet Plus."
                : "Spot cover you are paying for twice, and gaps you did not know you had — with PolicyWallet Plus.",
    },
    {
        id: "hidden-benefits",
        dot: { el: "Κρυμμένες παροχές", en: "Hidden benefits" },
        headline: (locale) =>
            locale === "el" ? (
                <>
                    Βρείτε τις παροχές που{" "}
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">κρύβονται στα μικρά γράμματα.</span>
                </>
            ) : (
                <>
                    Find the benefits that are{" "}
                    <span className="text-[#29685B] dark:text-[#A7F3D0]">buried in the small print.</span>
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
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    const [tookControl, setTookControl] = useState(false)
    const [reducedMotion, setReducedMotion] = useState(false)
    const hovering = useRef(false)
    const focused = useRef(false)

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        const apply = () => setReducedMotion(query.matches)
        apply()
        query.addEventListener("change", apply)
        return () => query.removeEventListener("change", apply)
    }, [])

    const autoplaying = !paused && !reducedMotion

    useEffect(() => {
        if (!autoplaying) return
        const timer = window.setInterval(() => {
            if (hovering.current || focused.current) return
            setIndex((i) => (i + 1) % SLIDES.length)
        }, INTERVAL_MS)
        return () => window.clearInterval(timer)
    }, [autoplaying])

    const goTo = (next: number) => {
        setTookControl(true)
        setIndex(next)
    }

    return (
        <div
            role="group"
            aria-roledescription={t("καρουζέλ", "carousel")}
            aria-label={t("Τι κάνει το PolicyWallet", "What PolicyWallet does")}
            onMouseEnter={() => (hovering.current = true)}
            onMouseLeave={() => (hovering.current = false)}
            onFocusCapture={() => (focused.current = true)}
            onBlurCapture={() => (focused.current = false)}
        >
            {/* One grid cell, three slides stacked in it: the box is always as
                tall as the longest slide, so nothing below it moves. */}
            <div className="grid" aria-live={autoplaying && !tookControl ? "off" : "polite"}>
                {SLIDES.map((slide, i) => {
                    const active = i === index
                    return (
                        <div
                            key={slide.id}
                            className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${
                                active ? "opacity-100" : "pointer-events-none opacity-0"
                            }`}
                            aria-hidden={!active}
                            // React 19 passes `inert` through as a real boolean
                            // attribute. The empty-string spread this replaced
                            // was the pre-19 workaround and React logged it on
                            // every render: "Received an empty string for a
                            // boolean attribute".
                            inert={!active}
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
                            <p className="mx-auto mt-6 max-w-[620px] text-body-lg leading-relaxed text-[#475569] sm:text-lead dark:text-slate-300">
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
                        className="group inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:focus-visible:outline-[#A7F3D0]"
                    >
                        <span className="sr-only">{slide.dot[locale]}</span>
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

                {/* Hidden when the OS already asked for no motion: there is
                    nothing left to pause, and a dead control is worse than no
                    control. */}
                {!reducedMotion && (
                    <button
                        type="button"
                        onClick={() => setPaused((p) => !p)}
                        className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#5B6A7A] transition-colors hover:text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29685B] dark:text-slate-400 dark:hover:text-white dark:focus-visible:outline-[#A7F3D0]"
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
