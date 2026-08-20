"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Car, Clock, Heart, Home, ShieldCheck } from "lucide-react"
import { PRODUCT_DISPLAY_HOST } from "@/lib/seo/site"

interface PolicyWalletWidgetProps {
    isGreek: boolean
}

/**
 * The hero illustration: what PolicyWallet gives back after it has read your
 * policies. Four things it deliberately does NOT do:
 *
 *  - **It shows no score.** Every tile used to carry a percentage under a
 *    progress bar, headlined by "Protection Score: 84%". A stranger cannot
 *    check any of those numbers, and a two-digit grade is what every fintech
 *    dashboard leads with — so it read as decoration, not evidence. What is
 *    left is the thing a person actually wants: which cover is fine, which one
 *    has a hole, and what the hole is.
 *  - **It names no real insurer.** It used to label fabricated policies with
 *    "Interamerican", "Εθνική" and "Eurolife". Putting invented data under a
 *    real company's trademark, in a product shot, is a claim about that
 *    company we have no right to make. The tiles now carry no brand at all.
 *  - **It does not lie to a screen reader.** The whole mock is one
 *    `role="img"` with a plain-language alternative, so assistive technology
 *    hears "this is an illustration of the result" instead of reading
 *    fabricated policy data as though it were the user's own.
 *  - **It does not move for people who asked it not to.** Every entrance
 *    transition is disabled under `prefers-reduced-motion`.
 */
export function PolicyWalletWidget({ isGreek }: PolicyWalletWidgetProps) {
    const [loaded, setLoaded] = useState(false)
    const t = (el: string, en: string) => (isGreek ? el : en)

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 350)
        return () => clearTimeout(timer)
    }, [])

    const covers = [
        {
            Icon: Car,
            name: t("Αυτοκίνητο", "Car"),
            note: t("Καλυμμένο", "Covered"),
            status: t("Εντάξει", "All good"),
            type: "ok" as const,
        },
        {
            Icon: Home,
            name: t("Σπίτι", "Home"),
            note: t("Λείπει κάλυψη πλημμύρας", "Flood cover is missing"),
            status: t("Κενό", "Gap"),
            type: "gap" as const,
        },
        {
            Icon: Heart,
            name: t("Υγεία", "Health"),
            note: t("Καλυμμένο", "Covered"),
            status: t("Εντάξει", "All good"),
            type: "ok" as const,
        },
    ]

    // Counted off the tiles below, so the summary can never drift from what the
    // illustration actually shows.
    const okCount = covers.filter((cover) => cover.type === "ok").length

    // One sentence that carries the same information as the whole illustration.
    // It names the plan for the same reason the caption below does: finding the
    // gap is a PolicyWallet Plus job, and this mock sits beside a free-tier
    // promise.
    const alternative = t(
        "Παράδειγμα αποτελέσματος με το PolicyWallet Plus: το αυτοκίνητο και η υγεία είναι καλυμμένα, ενώ στο σπίτι λείπει η κάλυψη πλημμύρας και το συμβόλαιο λήγει σε 14 μέρες.",
        "Example result with PolicyWallet Plus: car and health are covered, while the home is missing flood cover and that policy runs out in 14 days.",
    )

    // Entrance transitions are cosmetic. Everything is readable at rest, so
    // reduced-motion users get the final state immediately.
    const reveal = (delayMs: number) => ({
        className: `transition-all duration-500 motion-reduce:transition-none ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        } motion-reduce:translate-y-0 motion-reduce:opacity-100`,
        style: { transitionDelay: `${delayMs}ms` },
    })

    return (
        <div className="mx-auto w-full max-w-[480px] lg:mr-0 lg:ml-auto">
            <div role="img" aria-label={alternative} className="relative px-5 pb-8 pt-5">
                <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.09),0_0_0_1px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
                    {/* Browser bar */}
                    <div className="flex items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                            <span className="h-3 w-3 rounded-full bg-[#28CA41]" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1 truncate rounded-md border border-[#E2E8F0] bg-white px-3 py-1 font-mono text-micro text-[#5B6A7A] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                            {`${PRODUCT_DISPLAY_HOST}/wallet`}
                        </div>
                    </div>

                    <div className="p-5">
                        {/* Header */}
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-body-sm font-semibold text-[#0F172A] dark:text-white">
                                    {t("Η εικόνα ρίσκου σας", "Your risk picture")}
                                </p>
                                <p className="text-micro text-[#5B6A7A] dark:text-slate-400">
                                    {t("3 ασφάλειες, 1 κενό", "3 policies, 1 gap")}
                                </p>
                            </div>
                            {/* A count, not a score. The chip used to read "84%",
                                which was a number nobody could check and which read
                                like every other fintech health grade. This one is
                                the tiles below, added up. */}
                            <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 dark:border-[#29685B]/50 dark:bg-[#29685B]/15">
                                <ShieldCheck className="h-3 w-3 text-[#29685B] dark:text-[#A7F3D0]" />
                                <span className="text-micro font-semibold text-[#29685B] dark:text-[#A7F3D0]">
                                    {t(
                                        `${okCount} στα ${covers.length} εντάξει`,
                                        `${okCount} of ${covers.length} all good`,
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Cover tiles */}
                        <div className="space-y-2">
                            {covers.map((cover, index) => {
                                const anim = reveal(index * 100 + 400)
                                return (
                                    <div
                                        key={cover.name}
                                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                                            cover.type === "gap"
                                                ? "border-[#FDE68A] dark:border-amber-500/40"
                                                : "border-[#E2E8F0] dark:border-slate-800"
                                        } ${anim.className}`}
                                        style={anim.style}
                                    >
                                        <div
                                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                                cover.type === "gap"
                                                    ? "bg-[#FEF3C7] dark:bg-amber-900/30"
                                                    : "bg-[#F0FDF4] dark:bg-[#29685B]/15"
                                            }`}
                                        >
                                            <cover.Icon
                                                className={`h-5 w-5 ${
                                                    cover.type === "gap"
                                                        ? "text-[#92400E] dark:text-amber-200"
                                                        : "text-[#29685B] dark:text-[#A7F3D0]"
                                                }`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-center justify-between gap-2">
                                                <span className="truncate text-body-sm font-semibold text-[#0F172A] dark:text-white">
                                                    {cover.name}
                                                </span>
                                                <span
                                                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-kicker font-semibold ${
                                                        cover.type === "gap"
                                                            ? "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-500/15 dark:text-amber-200"
                                                            : "bg-[#F0FDF4] text-[#166534] dark:bg-[#29685B]/15 dark:text-[#A7F3D0]"
                                                    }`}
                                                >
                                                    {cover.status}
                                                </span>
                                            </div>
                                            <p className="truncate text-micro text-[#5B6A7A] dark:text-slate-400">
                                                {cover.note}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* The finding */}
                        <div
                            className={`mt-3 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 dark:border-amber-500/40 dark:bg-amber-500/10 ${reveal(900).className}`}
                            style={reveal(900).style}
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#92400E] dark:text-amber-200" />
                            <div className="min-w-0 flex-1">
                                <p className="text-caption font-semibold text-[#92400E] dark:text-amber-200">
                                    {t("Βρήκαμε ένα κενό", "We found a gap")}
                                </p>
                                <p className="text-micro leading-snug text-[#92400E] dark:text-amber-200">
                                    {t(
                                        "Το σπίτι σας δεν καλύπτεται για πλημμύρα.",
                                        "Your home is not covered for flooding.",
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating: analysis finished. Even inside a mock, a duration
                    reads as a speed claim — the only claim the site makes is
                    "minutes", so the chip states completion, not a stopwatch. */}
                <div
                    className={`absolute top-0 right-0 flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-md dark:border-slate-800 dark:bg-slate-900 ${reveal(1100).className}`}
                    style={reveal(1100).style}
                >
                    <span className="h-2 w-2 rounded-full bg-[#29685B] dark:bg-[#A7F3D0]" />
                    <span className="text-micro text-[#5B6A7A] dark:text-slate-400">
                        {t("Η ανάλυση ολοκληρώθηκε", "Analysis complete")}
                    </span>
                </div>

                {/* Floating: renewal warning */}
                <div
                    className={`absolute bottom-0 left-0 flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-white px-3 py-1.5 shadow-md dark:border-amber-500/40 dark:bg-slate-900 ${reveal(1300).className}`}
                    style={reveal(1300).style}
                >
                    <Clock className="h-3.5 w-3.5 text-[#92400E] dark:text-amber-200" />
                    <span className="text-micro font-semibold text-[#92400E] dark:text-amber-200">
                        {t("Λήγει σε 14 μέρες", "Runs out in 14 days")}
                    </span>
                </div>
            </div>

            {/* Finding the gap is a PolicyWallet Plus job — Free and Starter
                both sit at zero gap analyses. This mock renders in the hero,
                inches from the free-tier reassurance line, so it has to say whose result
                it is or it reads as a free-tier promise. It sits OUTSIDE the
                role="img" wrapper so assistive tech hears it as a caption
                rather than having it swallowed by the image label. */}
            <p className="text-center text-micro text-[#5B6A7A] dark:text-slate-400">
                {t(
                    "Παράδειγμα αποτελέσματος με το PolicyWallet Plus.",
                    "Example result with PolicyWallet Plus.",
                )}
            </p>
        </div>
    )
}
