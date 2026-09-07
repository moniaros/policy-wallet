import Link from "next/link"
import {
    ArrowRight,
    CalendarX2,
    Clock3,
    Euro,
    Eye,
    FileSearch,
    ShieldCheck,
    ShieldQuestion,
    TriangleAlert,
    Upload,
    type LucideIcon,
} from "lucide-react"

import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import type { Language } from "@/lib/i18n"
import type { PremiumExclusionPart } from "@/lib/wallet/premium-exclusion-note"
import { CardHead } from "./CardHead"

/**
 * fact.kind → the PLAN's registered count key (lib/instrumentation/count-keys.ts).
 * The first instrumentation pass stamped the raw kind (`portfolio.total`),
 * which coined five keys the plan never agreed — and an unregistered key is
 * exactly how the vocabulary forks (INSTRUMENTATION-PLAN.md, Naming).
 */
/** B4: the set each fact counts — where its door leads. */
const FACT_HREF: Record<string, string> = {
    total: "/wallet",
    expired: "/wallet",
    expiringSoon: "#renewals",
    neverAnalysed: "/wallet",
    analysisFailed: "/wallet",
    unassessed: "/protection?lens=branch",
    premiumNoAmount: "/wallet",
}

const KIND_COUNT_KEY: Record<string, string> = {
    total: "portfolio.policyCount",
    expired: "portfolio.expiredCount",
    expiringSoon: "portfolio.expiringCount",
    neverAnalysed: "portfolio.neverAnalysedCount",
    analysisFailed: "portfolio.failedCount",
    unassessed: "portfolio.unassessedCount",
}

/**
 * Phone-only glyphs for the ink pill's discs (the Steady layer, DESIGN.md →
 * "The phone layer"). Decorative: aria-hidden, and display:none from lg up,
 * where the cells are the plain facts row.
 */
const KIND_ICON: Record<string, LucideIcon> = {
    expired: CalendarX2,
    expiringSoon: Clock3,
    neverAnalysed: FileSearch,
    analysisFailed: TriangleAlert,
    unassessed: ShieldQuestion,
}

/*
 * Cell recipes.
 *
 * ONE viewport boundary (lg). Below it the FIRST fact is the headline number
 * and the rest ride in one ink pill — number · words, a white glyph disc
 * each — which is how the reference states a total and its parts. From lg
 * every item is the same fact cell: caption above, metric below, an optional
 * note beneath (DESIGN.md → "The Words Over The Number Rule", "Fact cell").
 *
 * From lg the CARD's width — not the viewport — steps the columns, through
 * container queries (@md = 28rem, @xl = 36rem; QuickActions and the branch
 * map already work this way). The overview card sits beside the rail: at a
 * 1024px viewport it is 314px inside, NARROWER than on a phone, and at 1440px
 * still under 700px. Binding seven equal columns to the viewport (the first
 * cut) split that into ~45–97px cells and wrapped the longest label seven
 * lines deep. 2 → 3 → 4 columns as the card widens; "grids start at one or two
 * columns and step up" (DESIGN.md → Responsive).
 *
 * The caption box reserves two 12px lines (min-h-9 = 36px, text bottom-
 * aligned), the metric is 20px: every cell in a row is 60px tall, so the
 * metrics share one baseline by construction and hairlines span whole rows.
 * `order-*` rather than flex-col-reverse at lg so the note can sit third; DOM
 * order stays number → words → note, the sentence a screen reader hears.
 */
const ROW = "mt-5 flex flex-col gap-4 font-normal lg:grid lg:grid-cols-2 lg:gap-x-0 lg:gap-y-4 lg:@md:grid-cols-3 lg:@xl:grid-cols-4"
const LEAD_CELL = "flex min-w-0 flex-col-reverse gap-1 hover:underline lg:flex-col lg:justify-start lg:pr-4"
const LEAD_NUMBER = "text-display font-semibold leading-none tracking-tight text-foreground tabular-nums lg:order-2 lg:text-title"
const LEAD_LABEL = "block text-body leading-snug text-muted-foreground lg:order-1 lg:flex lg:min-h-9 lg:items-end lg:text-caption lg:leading-normal"
const PILL = "flex flex-wrap items-center gap-1 rounded-3xl bg-foreground p-1.5 lg:contents"
/* 44px by construction below lg: py-2 + the 28px disc; no negative margins
   (the earlier negative-vertical-margin trick held the height without growing
   the layout, and every pill overlapped its neighbour's hit area by 2px —
   overlappingHitAreas). */
const CELL = "flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-background/10 py-2 pl-1.5 pr-3.5 text-background hover:underline lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:rounded-none lg:bg-transparent lg:py-0 lg:pl-4 lg:pr-4 lg:text-foreground"
const DISC = "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-foreground lg:hidden"
const NUMBER = "text-body font-semibold leading-none tabular-nums lg:order-2 lg:text-title lg:tracking-tight lg:text-foreground"
const LABEL = "text-caption leading-snug lg:order-1 lg:flex lg:min-h-9 lg:items-end lg:leading-normal lg:text-muted-foreground"
const NOTE = "sr-only lg:not-sr-only lg:order-3 lg:text-caption lg:leading-normal lg:text-muted-foreground"

/*
 * Hairlines between cells of the SAME ROW only, from lg (DESIGN.md → Density:
 * "a divider at a wrapped row's start would be a line with nothing to its
 * left"). The lead is a child of the h2 while the other items are children of
 * the `lg:contents` pill, so `nth-child` counts from two origins; the row
 * start is derived from the item's index across ALL items instead, per column
 * step. The three container ranges are disjoint, so no rule overrides another.
 */
const EDGE = {
    hair2: "lg:@max-md:border-l lg:@max-md:border-border",
    start2: "lg:@max-md:pl-0",
    hair3: "lg:@md:@max-xl:border-l lg:@md:@max-xl:border-border",
    start3: "lg:@md:@max-xl:pl-0",
    hair4: "lg:@xl:border-l lg:@xl:border-border",
    start4: "lg:@xl:pl-0",
}
const cellEdge = (i: number) =>
    [i % 2 ? EDGE.hair2 : EDGE.start2, i % 3 ? EDGE.hair3 : EDGE.start3, i % 4 ? EDGE.hair4 : EDGE.start4].join(" ")

/**
 * «12 ασφαλιστήρια» → lead «12», rest «ασφαλιστήρια», so the number can be
 * set large and the words small WITHOUT changing the element's text: the
 * span's textContent stays the whole fact («12 ασφαλιστήρια»), which is what
 * the count scan and protection-score-honesty read. A label that does not
 * lead with its count (a future language, say) renders whole.
 */
/** The ONE render of the premium footprint on the page — a fact, not a count (it is a sum). */
const PREMIUM_FACT_KEY = "portfolio.totalAnnualPremium"

/**
 * The premium caption is a sentence tail like every other caption («ασφαλιστήρια»,
 * «έχει λήξει»), so its first letter is lowered here, in code. The CSS
 * `first-letter:lowercase` it used to carry stops applying from lg, where the label
 * is a flex container (::first-letter targets block containers) — the round-one
 * crops showed «Συνολικό» beside «ασφαλιστήρια».
 */
function lowerFirst(label: string): string {
    return label ? label.charAt(0).toLocaleLowerCase("el") + label.slice(1) : label
}

function splitFact(label: string, count: number): { lead: string; rest: string } | null {
    const prefix = `${count} `
    return label.startsWith(prefix) ? { lead: String(count), rest: label.slice(prefix.length) } : null
}

type Fact = { kind: string; count: number; label: string; note?: string }

/**
 * The dashboard's dominant element: what the wallet contains, right now.
 *
 * THE PROTECTION SCORE IS GONE — REMOVED FROM THE PRODUCT, NOT PARKED.
 *
 * This surface used to carry the number, a ring, a delta and four states of
 * score logic. The score was a weighted average of coverage BREADTH presented
 * as a protection verdict; its severities are unvalidated pending underwriter
 * review, and its fallback returned 100 for a portfolio nothing had ever
 * analysed. Removed Aug 2026 (run PW-MOBILE-TRANSFORM-01, halt H-001, owner
 * decision). `tests/unit/score-containment.test.ts` fails if any customer
 * surface renders the value again — do not reintroduce it here.
 *
 * Two states remain, because the wallet has two honest answers:
 *
 *  - `empty` — no policies. An invitation, never a verdict.
 *  - facts   — THE HEADLINE: a composition of counts — «12 ασφαλιστήρια ·
 *              3 λήγουν σύντομα · 2 δεν έχουν αναλυθεί» — resolved by
 *              lib/dashboard/portfolio-summary.ts. Every part is a count of
 *              something in the wallet, so unlike «Καλή κάλυψη» it cannot be
 *              a false statement about a customer's protection.
 *
 * Direction A (2026-09-03, re-laid 2026-09-07): the headline is a grid of
 * fact cells that steps with the card's width, but the h2 still IS the facts:
 * the cells are links inside it, so the heading reads «12 ασφαλιστήρια 3
 * λήγουν … » exactly as before. The premium footprint is the last cell (it
 * left the portfolio card, so it renders once), with what the total leaves
 * out stated under the grid.
 *
 * Server component — every string arrives pre-resolved.
 */
export function ProtectionStatusHero({
    hasPolicies,
    facts,
    areasLine,
    openRecommendationCount,
    premium = null,
    language,
    labels,
}: {
    hasPolicies: boolean
    /**
     * One entry per stated fact, so each can be marked with `data-count`.
     * `note` is the optional qualifier beneath the cell («χωρίς ορισμένους
     * ελέγχους κλάδου» under «2 δεν αξιολογήθηκαν») — visible from lg, read
     * by screen readers everywhere.
     */
    facts: Fact[]
    /** "{count} areas may need review"; null when none. */
    areasLine: string | null
    /** The count behind `areasLine`, for `data-count`. */
    openRecommendationCount: number
    /**
     * The audited premium footprint, when the wallet has one — the ONE render
     * of portfolio.totalAnnualPremium on the page. `excludedParts` are the
     * policies the total could not count, one part per non-zero count.
     */
    premium?: { value: string; label: string; excludedParts: PremiumExclusionPart[] } | null
    language: Language
    labels: {
        kicker: string
        /**
         * The footer's «Έλεγχος της προστασίας μου». Optional since the story
         * home (2026-09-07): there the attention card owns the door to
         * /protection, and two doors to one page in different words is the
         * duplicate-action defect this page measured live.
         */
        cta?: string
        emptyTitle: string
        emptyBody: string
        emptyCta: string
        /** Right-hand meta of the card head; optional so older callers still type. */
        meta?: string
    }
}) {
    if (!hasPolicies) {
        return (
            <section className="pw-card pw-pad-roomy" aria-labelledby="protection-status-heading">
                <CardHead as="p" icon={Eye} title={labels.kicker} />
                <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <ShieldCheck className="h-7 w-7 text-primary dark:text-mint" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 id="protection-status-heading" className="text-title font-semibold text-foreground">
                            {labels.emptyTitle}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {labels.emptyBody}
                        </p>
                    </div>
                </div>
                <Link
                    href="/wallet/add"
                    data-action="upload"
                    className="pw-primary-button mt-5 inline-flex min-h-11 items-center gap-2"
                >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {labels.emptyCta}
                </Link>
            </section>
        )
    }

    // Every item of the row in one list, so each knows its index (the hairline
    // rule) and the premium markup exists once.
    const items: Array<{ key: string; index: number; fact: Fact } | { key: string; index: number; premium: NonNullable<typeof premium> }> = facts.map((fact, index) => ({ key: fact.kind, index, fact }))
    if (premium) items.push({ key: "premium", index: items.length, premium })

    const renderFactBody = (fact: Fact, lead: boolean) => {
        const parts = splitFact(fact.label, fact.count)
        const Glyph = lead ? null : KIND_ICON[fact.kind] ?? null
        if (!parts) return <span className="text-body font-semibold">{fact.label}</span>
        return (
            <>
                {Glyph && (
                    <span aria-hidden="true" className={DISC}>
                        <Glyph className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                )}
                {/* Visual order is words-over-number (order-*) from lg; DOM order
                    stays «count words note», so the text reads «12 ασφαλιστήρια»
                    to every reader. */}
                <span className={lead ? LEAD_NUMBER : NUMBER}>{parts.lead}</span>{" "}
                {/* Lowercase-initial on purpose: the labels are the tails of the
                    facts sentence («5 έχουν λήξει»), and CSS capitalisation under
                    lang="el" strips the tonos («Εχουν»). */}
                <span className={lead ? LEAD_LABEL : LABEL}>{parts.rest}</span>
                {fact.note && (
                    <>
                        {" "}
                        <span className={NOTE}>{fact.note}</span>
                    </>
                )}
            </>
        )
    }

    return (
        <section className="pw-card pw-pad @container" aria-labelledby="protection-status-heading">
            <CardHead as="p" icon={Eye} title={labels.kicker} meta={labels.meta} />

            {/* THE HEADLINE IS THE FACTS, not a grade.

                This was a 96px ring with a number inside it and a verdict word
                beside it — «Καλή κάλυψη» over a single never-analysed policy,
                «Χρειάζεται βελτίωση» over a wallet with no cover at all. The
                cells below say what the wallet contains, which is what the
                reader came for and what cannot be wrong. */}
            <h2 id="protection-status-heading" className={ROW}>
                {items.map((item) => {
                    if ("fact" in item && item.index === 0) {
                        return (
                            <Link
                                key={item.key}
                                href={FACT_HREF[item.fact.kind] ?? "/wallet"}
                                data-count={KIND_COUNT_KEY[item.fact.kind] ?? `portfolio.${item.fact.kind}`}
                                className={`${LEAD_CELL} ${cellEdge(0)}`}
                            >
                                {renderFactBody(item.fact, true)}
                            </Link>
                        )
                    }
                    // The pill opens on the second item and closes after the last —
                    // one wrapper, rendered once, holding every non-headline cell;
                    // `lg:contents` dissolves it so the cells are the grid's own
                    // children from lg.
                    if (item.index === 1) {
                        return (
                            <span key="facts-pill" className={PILL}>
                                {items.slice(1).map((inner) =>
                                    "fact" in inner ? (
                                        <Link
                                            key={inner.key}
                                            href={FACT_HREF[inner.fact.kind] ?? "/wallet"}
                                            data-count={KIND_COUNT_KEY[inner.fact.kind] ?? `portfolio.${inner.fact.kind}`}
                                            className={`${CELL} ${cellEdge(inner.index)}`}
                                        >
                                            {renderFactBody(inner.fact, false)}
                                        </Link>
                                    ) : (
                                        <span key="premium" data-fact={PREMIUM_FACT_KEY} className={`${CELL} ${cellEdge(inner.index)}`}>
                                            <span aria-hidden="true" className={DISC}>
                                                <Euro className="h-3.5 w-3.5" strokeWidth={2} />
                                            </span>
                                            <span className={NUMBER}>{inner.premium.value}</span>{" "}
                                            <span className={LABEL}>{lowerFirst(inner.premium.label)}</span>
                                        </span>
                                    )
                                )}
                            </span>
                        )
                    }
                    return null
                })}
            </h2>

            {/* What the total leaves out: one line per part, each a plain running-
                text link (the WCAG 2.5.8 inline exception). The earlier inline-flex
                44px boxes inside a caption line overhung the cells above and each
                other — the hit-area overlaps the harness recorded. */}
            {premium && premium.excludedParts.length > 0 && (
                <div className="mt-3 space-y-1">
                    {premium.excludedParts.map((part) => (
                        <p key={part.countKey} className="text-caption leading-normal text-muted-foreground">
                            <Link href="/wallet" data-count={part.countKey} className="hover:underline">
                                {part.label}
                            </Link>
                        </p>
                    ))}
                </div>
            )}

            {(areasLine || labels.cta) && (
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    {areasLine ? (
                        <Link
                            href="#attention"
                            className="flex min-h-11 items-center gap-2 text-sm text-foreground hover:underline"
                            data-count="recommendation.openCount"
                        >
                            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" aria-hidden="true" />
                            {areasLine}
                        </Link>
                    ) : (
                        <span />
                    )}
                    {labels.cta && (
                        <Link
                            href="/protection"
                            data-action="reviewCoverage"
                            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline dark:text-mint sm:self-auto"
                        >
                            {labels.cta}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            )}

            {/* The disclaimer belongs to the AI-derived line, not to the counts:
                stamping «12 ασφαλιστήρια» as AI output would be its own small
                dishonesty. */}
            {areasLine && <AiDisclaimer language={language} variant="inline" className="mt-2" />}
        </section>
    )
}
