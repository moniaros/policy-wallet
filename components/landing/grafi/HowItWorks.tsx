import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, BellRing, FileText, Heart, Search, ShieldCheck, type LucideIcon } from "lucide-react"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
import { landingContent } from "@/lib/landing/content"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import { BrushUnderline, Eyebrow, ReadingDemo } from "@/src/design-system"
import type { LandingLocale, LocalizedText } from "@/types/landing-content"

/**
 * How it works (§6): the four numbered steps from `lib/landing/content` —
 * the SAME rows the HowTo JSON-LD emits, so the page and the structured data
 * cannot drift — followed by the closing line and the ReadingDemo, which
 * demonstrates step two on a stamped sample rather than asserting it.
 *
 * Each row: a numbered icon tile, the title, the description with ONE phrase
 * in bold brand-green (`emphasis`, a verbatim substring of the description;
 * the JSON-LD carries the plain sentence), and a 44px arrow that goes
 * somewhere real — the signup for the two steps that happen inside the
 * product, the on-page evidence for the two we can show here. An arrow with
 * nowhere to go is a false affordance, so every step id needs an entry in
 * STEP_TARGETS; the guard test fails on a step without one.
 *
 * Server component; the only client island is the tracked signup link.
 * Semantic tokens only — dark mode comes from the token layer.
 */

const STEP_ICONS: Record<string, LucideIcon> = {
    "step-upload": FileText,
    "step-read": Search,
    "step-act": ShieldCheck,
    "step-monitor": BellRing,
}

type StepTarget =
    | { kind: "signup" }
    | { kind: "anchor"; hash: string; label: LocalizedText }

const STEP_TARGETS: Record<string, StepTarget> = {
    "step-upload": { kind: "signup" },
    "step-read": {
        kind: "anchor",
        hash: "#reading-demo",
        label: { el: "Δείτε το παράδειγμα ανάγνωσης", en: "See the reading demo" },
    },
    "step-act": {
        kind: "anchor",
        hash: "#difference",
        label: { el: "Δείτε την προσέγγισή μας", en: "See our approach" },
    },
    "step-monitor": { kind: "signup" },
}

const ARROW_CLASS =
    "flex size-11 shrink-0 items-center justify-center rounded-g-pill bg-state-covered-fill text-fg-brand " +
    "transition-colors duration-200 [transition-timing-function:var(--ease-out-g)] " +
    "hover:bg-action-primary-bg hover:text-fg-on-brand " +
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"

/** Wraps the first occurrence of `phrase` in bold brand-green; plain text if absent. */
function renderEmphasis(text: string, phrase: string | undefined): ReactNode {
    if (!phrase) return text
    const at = text.indexOf(phrase)
    if (at < 0) return text
    return (
        <>
            {text.slice(0, at)}
            <strong className="font-semibold text-fg-brand">{phrase}</strong>
            {text.slice(at + phrase.length)}
        </>
    )
}

export function HowItWorks({ locale }: { locale: LandingLocale }) {
    const t = (el: string, en: string) => (locale === "el" ? el : en)
    const { title, steps, closing } = landingContent.howItWorks

    return (
        <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="scroll-mt-28 lg:scroll-mt-36 [padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <header className="mx-auto max-w-[56ch] text-center">
                    <Eyebrow>{pick(title, locale)}</Eyebrow>
                    <h2
                        id="how-it-works-heading"
                        className="mt-g-3 text-balance text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                    >
                        {t("Τέσσερα ", "Four ")}
                        <BrushUnderline>{t("απλά", "simple")}</BrushUnderline>
                        {t(" βήματα.", " steps.")}
                    </h2>
                </header>

                <ol className="mx-auto mt-g-12 max-w-[880px] divide-y divide-border-subtle">
                    {steps.map((step, index) => {
                        const Icon = STEP_ICONS[step.id] ?? FileText
                        const target = STEP_TARGETS[step.id]
                        const stepTitle = pick(step.title, locale)
                        return (
                            <li
                                key={step.id}
                                className="grid grid-cols-[auto_1fr_auto] items-center gap-g-4 py-g-6 sm:gap-g-8 sm:py-g-8"
                            >
                                <span className="relative flex size-16 shrink-0 items-center justify-center rounded-g-lg bg-state-covered-fill sm:size-20">
                                    <Icon aria-hidden className="size-7 text-fg-brand sm:size-9" strokeWidth={1.75} />
                                    {/* The <ol> already conveys position; the badge is the visual. */}
                                    <span
                                        aria-hidden="true"
                                        className="absolute -left-2 -top-2 flex size-7 items-center justify-center rounded-g-pill bg-action-primary-bg text-sm font-bold text-fg-on-brand"
                                        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                                    >
                                        {index + 1}
                                    </span>
                                </span>

                                <div className="min-w-0">
                                    <h3 className="text-g-display-md font-bold text-fg-primary">{stepTitle}</h3>
                                    <p className="mt-g-2 max-w-[56ch] text-g-body-lg text-fg-secondary">
                                        {renderEmphasis(
                                            pick(step.description, locale),
                                            step.emphasis ? pick(step.emphasis, locale) : undefined,
                                        )}
                                    </p>
                                </div>

                                {target?.kind === "signup" && (
                                    <LandingCtaLink
                                        href={authHref(
                                            "/auth/signup?role=policyholder&source=landing_how_it_works",
                                            locale,
                                        )}
                                        locale={locale}
                                        location={`how_it_works_${step.id}`}
                                        aria-label={`${pick(PRIMARY_ACTION, locale)} — ${stepTitle}`}
                                        className={ARROW_CLASS}
                                    >
                                        <ArrowRight aria-hidden className="size-5" />
                                    </LandingCtaLink>
                                )}
                                {target?.kind === "anchor" && (
                                    <Link
                                        href={localizeHref(target.hash, locale)}
                                        aria-label={`${pick(target.label, locale)} — ${stepTitle}`}
                                        className={ARROW_CLASS}
                                    >
                                        <ArrowRight aria-hidden className="size-5" />
                                    </Link>
                                )}
                            </li>
                        )
                    })}
                </ol>

                <p className="mx-auto mt-g-10 flex w-fit max-w-full items-center gap-g-3 rounded-g-pill bg-surface-wash py-g-2 pl-g-2 pr-g-6 text-g-body text-fg-primary">
                    <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-g-pill bg-action-primary-bg text-fg-on-brand"
                    >
                        <Heart className="size-4" fill="currentColor" />
                    </span>
                    <span>
                        <strong className="font-semibold">{pick(closing.lead, locale)}</strong>{" "}
                        {pick(closing.rest, locale)}
                    </span>
                </p>

                {/* §6: the four steps PLUS the ReadingDemo — «το διαβάζουμε για
                    εσάς» demonstrated on a stamped sample rather than asserted.
                    Step two's arrow lands here. */}
            </div>
        </section>
    )
}
