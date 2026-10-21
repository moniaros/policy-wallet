import Link from "next/link"
import styles from "./how-it-works.module.css"
import { howItWorksCopy } from "@/lib/i18n/how-it-works"
import type { ReactNode } from "react"
import { ArrowRight, BellRing, FileText, Search, ShieldCheck, Upload, CalendarDays, MessageCircle, type LucideIcon } from "lucide-react"
import { LandingCtaLink } from "@/components/landing/LandingCtaLink"
import { landingContent } from "@/lib/landing/content"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale, LocalizedText } from "@/types/landing-content"

/**
 * A forest section with four white, illustrated cards, following the owner's
 * Bitpanda reference. Greek remains sentence case in the existing brand face.
 * The diagrams explain operations, not customer results or invented app screens.
 * Titles/descriptions and HowTo structured data retain their shared source.
 * Each card has one real destination; the diagram itself is never interactive.
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

const ARROW_CLASS = styles.action

function StepVisual({ id, locale }: { id: string; locale: LandingLocale }) {
    const copy = howItWorksCopy[locale]
    const Icon = STEP_ICONS[id] ?? FileText
    return (
        <div className={`${styles.visual} ${styles[id]}`} aria-hidden="true">
            {!STEP_TARGETS[id] && <Icon aria-hidden="true" />}
            {id === "step-upload" && <>
                <div className={styles.paper}>
                    <FileText className={styles.documentIcon} strokeWidth={1.3} />
                    <span className={styles.paperTitle}>{copy.document}</span>
                    <span className={styles.fileType}>PDF</span>
                    <div className={styles.lines}><i /><i /><i /></div>
                </div>
                <span className={styles.uploadBadge}><Upload strokeWidth={1.7} /></span>
            </>}
            {id === "step-read" && <div className={styles.reading}>
                <div className={styles.readingHeading}><FileText size={22} /><span>{copy.document}</span></div>
                {[copy.cover, copy.amounts, copy.dates, copy.exclusions].map((label, i) => <div className={styles.readingRow} key={label}>
                    <span>{label}</span><span className={styles.extractedLine} style={{ width: `${46 - i * 6}%` }} />
                </div>)}
                <div className={styles.readingFoot}><Search size={19} /><span>{copy.reading}</span></div>
            </div>}
            {id === "step-act" && <div className={styles.explanation}>
                <span className={styles.explanationIcon}><MessageCircle strokeWidth={1.4} /></span>
                <p>{copy.understand}</p>
                <div className={styles.reviewRow}><Search size={20} /><span>{copy.review}</span></div>
                <div className={styles.reviewRow}><MessageCircle size={20} /><span>{copy.adviser}</span></div>
            </div>}
            {id === "step-monitor" && <div className={styles.calendar}>
                <div className={styles.calendarHeading}><CalendarDays size={22} /><span>{copy.expiry}</span></div>
                <div className={styles.calendarGrid}>{Array.from({ length: 28 }, (_, i) => <span key={i} className={i === 17 ? styles.calendarMarked : undefined}>{i === 17 && <BellRing size={18} />}</span>)}</div>
                <div className={styles.reminder}><BellRing size={18} /><span>{copy.reminders}</span></div>
            </div>}
        </div>
    )
}

/** Wraps the first occurrence of `phrase` in bold brand-green; plain text if absent. */
function renderEmphasis(text: string, phrase: string | undefined): ReactNode {
    if (!phrase) return text
    const at = text.indexOf(phrase)
    if (at < 0) return text
    return (
        <>
            {text.slice(0, at)}
            <strong className="font-semibold">{phrase}</strong>
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
            className={styles.section}
        >
            <div className={styles.container}>
                <header className={styles.heading}>
                    <p className={styles.label}>{pick(landingContent.howItWorks.title, locale)}</p>
                    <h2
                        id="how-it-works-heading"
                        className={styles.title}
                    >
                        {t("Τέσσερα ", "Four ")}
                        {t("απλά", "simple")}
                        {t(" βήματα.", " steps.")}
                    </h2>
                </header>

                <ol className={styles.steps}>
                    {steps.map((step, index) => {
                        const target = STEP_TARGETS[step.id]
                        const stepTitle = pick(step.title, locale)
                        return (
                            <li key={step.id} id={step.id} className={styles.step}>
                                <div className={styles.card}>
                                    <StepVisual id={step.id} locale={locale} />
                                    <div className={styles.cardFooter}>
                                        <h3>{stepTitle}</h3>
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
                                    </div>
                                </div>
                                <div className={styles.caption}>
                                    <span aria-hidden="true" className={styles.number}>{index + 1}</span>
                                    <p>{renderEmphasis(pick(step.description, locale), step.emphasis ? pick(step.emphasis, locale) : undefined)}</p>
                                </div>
                            </li>
                        )
                    })}
                </ol>

            </div>
        </section>
    )
}
