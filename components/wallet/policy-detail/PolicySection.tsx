"use client"

import { useEffect, useId, useState } from "react"
import { ChevronDown } from "lucide-react"

/**
 * ONE section of the policy page, and the page's ONE navigation system.
 *
 * The page previously carried three at once — a 14-pill anchor strip, the
 * analysis tab strip, and the coverage tab strip — plus the app shell's bottom
 * bar, so "where am I" had four competing answers and none of them survived
 * 320px in Greek. With six sections under a persistent head, nothing is more
 * than one tap away and there is nothing left to jump TO: the strip existed to
 * navigate a page that no longer has twenty stops.
 *
 * Disclosure, not tabs, for two reasons beyond count. Tabs assert that their
 * contents are alternatives — «Καλύπτεται» / «Δεν καλύπτεται» are not
 * alternatives, they are two halves of one answer, and splitting them let a
 * reader leave believing they had seen the coverage when they had seen half of
 * it. And collapsed-by-default is what makes the page's length a function of
 * what the reader opened rather than of how much the product has to say.
 *
 * `defaultOpen` is state-driven by the caller, never a fixed preference: the
 * section the head points at opens itself, so the one action in the head lands
 * on content rather than on another closed row.
 *
 * Accessibility: a real `<button>` with `aria-expanded` / `aria-controls`
 * against a labelled region, so the disclosure is announced as one. The header
 * is the tap target and is 44px+ at every width by construction.
 */
export interface PolicySectionProps {
    /** Stable id — also the anchor the head's actions target. */
    id: string
    title: string
    /** One-line count/summary shown on the closed row, e.g. «4 καλύψεις». */
    summary?: string | null
    icon?: React.ReactNode
    defaultOpen?: boolean
    /**
     * Set when the head's one action names THIS section. `defaultOpen` cannot
     * do it: the action is taken after mount, and initial state is read once.
     * Opening is one-way — a reader who then closes the section keeps it closed
     * (re-opening what someone just dismissed is the component arguing with
     * them).
     */
    forceOpen?: boolean
    children: React.ReactNode
}

export function PolicySection({
    id,
    title,
    summary,
    icon,
    defaultOpen = false,
    forceOpen = false,
    children,
}: PolicySectionProps) {
    const [open, setOpen] = useState(defaultOpen || forceOpen)
    const panelId = useId()

    useEffect(() => {
        if (forceOpen) setOpen(true)
    }, [forceOpen])

    return (
        <section id={id} className="scroll-mt-20 border-b border-black/10 dark:border-white/12">
            <h2>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex min-h-[56px] w-full items-center gap-3 py-4 text-left transition-colors hover:text-primary dark:hover:text-mint"
                >
                    {icon && <span className="shrink-0 text-primary dark:text-mint" aria-hidden>{icon}</span>}
                    <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold leading-snug text-black dark:text-white">
                            {title}
                        </span>
                        {summary && (
                            <span className="mt-0.5 block text-sm leading-snug text-black/60 dark:text-white/60">
                                {summary}
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        className={`h-5 w-5 shrink-0 text-black/40 transition-transform dark:text-white/40 ${open ? "rotate-180" : ""}`}
                        aria-hidden
                    />
                </button>
            </h2>
            {/* Unmounted when closed, not hidden: a closed section must not
                contribute its facts to the page — otherwise every duplicate-fact
                and tap-target measurement counts content no reader can see, and
                the guards would be auditing the DOM instead of the product. */}
            {open && (
                <div id={panelId} role="region" aria-label={title} className="pb-6">
                    {children}
                </div>
            )}
        </section>
    )
}
