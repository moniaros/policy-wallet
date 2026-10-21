import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, BellRing, FileText, Search, ShieldCheck, type LucideIcon } from "lucide-react"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
import { landingContent } from "@/lib/landing/content"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
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
    const { steps } = landingContent.howItWorks

    return (
        <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="scroll-mt-28 lg:scroll-mt-36 [padding-block:var(--space-section)]"
        >
            <div className="mx-auto max-w-[1180px] px-g-6 md:px-g-8">
                <header className="mx-auto max-w-[56ch] text-center">
                    <h2
                        id="how-it-works-heading"
                        className="mt-g-3 text-balance text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                    >
                        {t("Τέσσερα ", "Four ")}
                        {t("απλά", "simple")}
                        {t(" βήματα.", " steps.")}
                    </h2>
                </header>

                <ol className="mt-10 grid gap-x-12 gap-y-4 md:grid-cols-2">
                    {steps.map((step, index) => {
                        const Icon = STEP_ICONS[step.id] ?? FileText
                        const target = STEP_TARGETS[step.id]
                        const stepTitle = pick(step.title, locale)
                        return (
                            <li
                                key={step.id}
                                className="grid grid-cols-[1fr_auto] items-start gap-4 border-t border-border-subtle py-6"
                            >

                                <div className="min-w-0">
                                    <p aria-hidden className="mb-3 text-lg font-semibold text-fg-brand">{String(index + 1).padStart(2, "0")}</p>
                                    <h3 className="text-2xl font-semibold text-fg-primary">{stepTitle}</h3>
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

            </div>
        </section>
    )
}
