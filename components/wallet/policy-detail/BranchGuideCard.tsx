"use client"

import { useState } from "react"
import { BookOpen, ChevronDown, Eye, Lightbulb, ShieldAlert } from "lucide-react"

/**
 * Editorial "what you should understand about this line of business" guide.
 *
 * Purely presentational: every string arrives already resolved to one language
 * by the caller (from lib/insurance/content + the translation files), so this
 * file stays free of hardcoded user-facing text and lint:i18n-changed stays
 * clean. Collapsed by default — the detail page already has ~15 sections.
 */
export interface BranchGuideGap {
    id: string
    title: string
    description: string
    /** The gap engine actually flagged this concept for this user's portfolio. */
    detected: boolean
}

interface BranchGuideCardProps {
    tagline: string
    shortDescription: string
    whyItMatters: string[]
    whatWeAnalyze: string[]
    howToUseBetter: string[]
    commonGaps: BranchGuideGap[]
    copy: {
        guideTitle: string
        guideWhyItMatters: string
        guideWhatWeAnalyze: string
        guideHowToUseBetter: string
        guideCommonGaps: string
        guideDetectedChip: string
        guideExpand: string
        guideCollapse: string
    }
}

function GuideList({ icon: Icon, title, items }: { icon: typeof Eye; title: string; items: string[] }) {
    if (items.length === 0) return null
    return (
        <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary dark:text-mint" />
                {title}
            </h3>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-black/65 dark:text-white/70">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary dark:bg-mint" />
                        <span className="min-w-0">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function BranchGuideCard({
    tagline,
    shortDescription,
    whyItMatters,
    whatWeAnalyze,
    howToUseBetter,
    commonGaps,
    copy,
}: BranchGuideCardProps) {
    const [open, setOpen] = useState(false)

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-label={open ? copy.guideCollapse : copy.guideExpand}
                className="flex w-full items-start justify-between gap-4 text-left cursor-pointer"
            >
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-body font-semibold text-foreground">
                        <BookOpen className="h-4 w-4 text-primary dark:text-mint" />
                        {copy.guideTitle}
                    </h2>
                    <p className="mt-1.5 text-sm font-semibold text-black dark:text-white">{tagline}</p>
                    {!open && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{shortDescription}</p>
                    )}
                </div>
                <ChevronDown
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 text-black/55 transition-transform dark:text-white/50 ${open ? "rotate-180" : ""}`}
                    aria-hidden
                />
            </button>

            {open && (
                <div className="mt-5 space-y-5 border-t border-black/10 pt-5 dark:border-white/10">
                    <p className="text-xs leading-relaxed text-black/65 dark:text-white/70">{shortDescription}</p>

                    <GuideList icon={ShieldAlert} title={copy.guideWhyItMatters} items={whyItMatters} />
                    <GuideList icon={Eye} title={copy.guideWhatWeAnalyze} items={whatWeAnalyze} />
                    <GuideList icon={Lightbulb} title={copy.guideHowToUseBetter} items={howToUseBetter} />

                    {commonGaps.length > 0 && (
                        <div>
                            <h3 className="mb-2 flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                                <ShieldAlert className="h-3.5 w-3.5 text-primary dark:text-mint" />
                                {copy.guideCommonGaps}
                            </h3>
                            <ul className="space-y-2">
                                {commonGaps.map((gap) => (
                                    <li
                                        key={gap.id}
                                        className={`rounded-xl border px-3 py-2.5 ${
                                            gap.detected
                                                ? "border-amber-200 bg-status-warning-tint/50 dark:border-amber-900/40"
                                                : "border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-xs font-bold text-black dark:text-white">{gap.title}</p>
                                            {gap.detected && (
                                                <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-800/40 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-caption font-semibold text-status-warning">
                                                    {copy.guideDetectedChip}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-black/60 dark:text-white/65">
                                            {gap.description}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
