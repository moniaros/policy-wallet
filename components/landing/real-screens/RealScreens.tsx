"use client"

/**
 * REAL app screens for the marketing site.
 *
 * These are the same components the signed-in app renders — the dashboard's
 * overview and attention list, the renewals timeline, the coverage map, the
 * advisor's client list — fed fixture data and scaled from their 390px phone
 * layout into a frame. They replace the hand-drawn mocks (a ring, some chips,
 * a fake row list) that showed a product the app does not look like: the
 * public site now shows the app, and a visitor who signs up meets the screen
 * they were promised.
 *
 * Every screen is a SAMPLE and says so. No real insurer is named, no person is
 * invented (the advisor's clients are «Πελάτης Α/Β/Γ», the lettered convention
 * the other mocks use), and nothing renders a score — the mock-honesty guard
 * (tests/unit/marketing-mock-honesty.test.ts) scans this file. The scaled
 * screen is `inert`, so its links, buttons and count markers never reach a
 * reader or a metric; the frame around it carries the accessible description.
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { getTranslations } from "@/lib/i18n"
import { formatDate } from "@/lib/i18n/format"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { ProtectionStatusHero } from "@/components/dashboard/home/ProtectionStatusHero"
import { AttentionList, type AttentionItem } from "@/components/dashboard/home/AttentionList"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { RenewalsTimelineCard, type RenewalItem } from "@/components/dashboard/home/RenewalsTimelineCard"
import { BranchCoverageMap, type CoverageMapEntry } from "@/components/branches/BranchCoverageMap"
import { ClientCard } from "@/components/agent/ClientCard"
import type { ClientCardData } from "@/components/agent/types"

export type ScreenLocale = "el" | "en"

/** The app's phone layout width — every screen is laid out at this width, then scaled. */
const APP_WIDTH = 390
const DAY = 86_400_000
const inDays = (n: number) => new Date(Date.now() + n * DAY)

/**
 * Lays a real 390px app screen out at full size and scales it to whatever
 * width its frame gives it — so the type, spacing and cards are the app's
 * own, not a redrawing. The scaled tree is `inert`: it is a picture of the
 * product, and its controls must not be reachable.
 */
export function AppScreen({
    locale,
    children,
    className,
    defaultScale = 0.72,
    minHeight,
}: {
    /** The page's locale — the screen's copy follows it, never the visitor's stored app preference. */
    locale: ScreenLocale
    children: ReactNode
    className?: string
    /** Used for the first paint, before the frame is measured. */
    defaultScale?: number
    minHeight?: number
}) {
    const outer = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(defaultScale)
    const [height, setHeight] = useState<number | undefined>(undefined)

    useEffect(() => {
        const o = outer.current
        const i = inner.current
        if (!o || !i) return
        const measure = () => {
            const s = o.clientWidth / APP_WIDTH
            setScale(s)
            setHeight(Math.round(i.offsetHeight * s))
        }
        measure()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(measure)
        ro.observe(o)
        ro.observe(i)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={outer} className={cn("relative w-full overflow-hidden", className)} style={{ height, minHeight }}>
            <div
                ref={inner}
                inert
                className="pw-app-canvas absolute left-0 top-0 p-3 font-sans text-foreground [&_*]:pointer-events-none"
                style={{ width: APP_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
                {/* The app's components read the language context and the
                    translations dictionary, which the public layouts do not
                    mount — so the screen brings its own, pinned to the page. */}
                <LanguageProvider initialLanguage={locale} pinned>
                    <TranslationsProvider>{children}</TranslationsProvider>
                </LanguageProvider>
            </div>
        </div>
    )
}

/** A static phone around one real screen; the frame carries the description. */
export function StaticPhone({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div
            role="img"
            aria-label={label}
            className={cn("mx-auto w-full max-w-[320px] rounded-[34px] border border-border-strong bg-surface-inverse p-g-2", className)}
        >
            <div className="overflow-hidden rounded-[26px] bg-surface-base">{children}</div>
        </div>
    )
}

/** The line that says a screen is a sample. Sentence case: CSS capitals strip Greek accents. */
export function SampleStamp({ locale, className }: { locale: ScreenLocale; className?: string }) {
    return (
        <p className={cn("text-center text-g-caption text-fg-secondary", className)}>
            {locale === "el" ? "Δείγμα — όχι πραγματικό ασφαλιστήριο" : "Sample — not a real policy"}
        </p>
    )
}

/* ── Screens ──────────────────────────────────────────────────────────── */

/** The dashboard: the facts row and what needs attention. */
export function DashboardScreen({ locale }: { locale: ScreenLocale }) {
    const t = getTranslations(locale)
    const home = t.dashboard.home
    const tr = (el: string, en: string) => (locale === "el" ? el : en)
    const facts = [
        { kind: "total", count: 3, label: home.factTotalMany.replace("{count}", "3") },
        { kind: "expiringSoon", count: 1, label: home.factExpiringOne },
    ]
    const items: AttentionItem[] = [
        {
            id: "sample-home",
            title: tr("Κατοικία: ο σεισμός δεν καλύπτεται", "Home: earthquake is not covered"),
            reason: tr(
                "Το ασφαλιστήριο κατοικίας δεν περιλαμβάνει σεισμό — ρωτήστε τον ασφαλιστή σας πριν την ανανέωση.",
                "The home policy does not include earthquake — ask your insurer before renewing."
            ),
            urgency: "high",
            urgencyLabel: home.recPriorityHigh,
            timingLabel: null,
        },
        {
            id: "sample-motor",
            title: tr("Αυτοκίνητο: ανανέωση σε 18 ημέρες", "Motor: renewal in 18 days"),
            reason: tr(
                "Ελέγξτε ότι οι ίδιες καλύψεις και απαλλαγές ισχύουν και στη νέα περίοδο.",
                "Check that the same covers and excesses carry into the new term."
            ),
            urgency: "medium",
            urgencyLabel: home.recPriorityMedium,
            timingLabel: home.attentionTimingWeeks,
        },
    ]
    return (
        <div className="space-y-3">
            <ProtectionStatusHero
                hasPolicies
                facts={facts}
                areasLine={home.heroAreasMany.replace("{count}", "2")}
                openRecommendationCount={2}
                language={locale}
                labels={{
                    kicker: home.heroKicker,
                    meta: home.overviewMeta,
                    cta: home.heroCta,
                    emptyTitle: home.heroEmptyTitle,
                    emptyBody: home.heroEmptyBody,
                    emptyCta: home.heroEmptyCta,
                }}
            />
            <AttentionList
                items={items}
                totalCount={2}
                language={locale}
                tally={
                    <CoverageGapsWidget
                        variant="embedded"
                        counts={{ critical: 0, high: 1, medium: 1, low: 0 }}
                        labels={{
                            kicker: home.gapsKicker,
                            noGaps: home.noGaps,
                            severity: {
                                critical: home.severityCritical,
                                high: home.severityHigh,
                                medium: home.severityMedium,
                                low: home.severityLow,
                            },
                            note: null,
                            groupLabel: home.severityGroupLabel,
                        }}
                    />
                }
                labels={{
                    kicker: home.attentionKicker,
                    viewAll: home.viewAllActions,
                    emptyTitle: home.attentionEmptyTitle,
                    emptyBody: home.attentionEmptyBody,
                    priorityNote: home.recPriorityNote,
                }}
            />
        </div>
    )
}

/** The renewals timeline: three sample terms, each with its own bar. */
export function RenewalsScreen({ locale }: { locale: ScreenLocale }) {
    const home = getTranslations(locale).dashboard.home
    const item = (id: string, lob: string, days: number, pct: number): RenewalItem => {
        const branch = normalizeBranch(lob)
        const end = inDays(days)
        const start = inDays(days - 365)
        const checkpoints = days <= 30 ? 2 : 0
        return {
            id,
            insurerName: null,
            icon: getBranchIcon(branch.id),
            titleLabel: home.renewalInDays.replace("{type}", branch.label[locale]).replace("{days}", String(days)),
            endDateLabel: formatDate(end, locale),
            days,
            premiumLabel: null,
            checkpointCount: checkpoints,
            checkpointLabel: checkpoints ? home.renewalCheckpointsMany.replace("{count}", String(checkpoints)) : null,
            policyRef: null,
            assetLabel: null,
            showPolicyRef: false,
            termProgressPct: pct,
            termStartLabel: formatDate(start, locale),
            termAria: home.renewalTermAria
                .replace("{start}", formatDate(start, locale))
                .replace("{end}", formatDate(end, locale)),
        }
    }
    return (
        <RenewalsTimelineCard
            items={[item("sample-motor", "motor", 18, 95), item("sample-home", "home", 74, 80), item("sample-health", "health", 140, 62)]}
            totalCount={3}
            hasPolicies
            showUpgradeTeaser={false}
            labels={{
                kicker: home.renewalTimeline,
                policiesSuffixOne: home.policiesSuffixOne,
                policiesSuffix: home.policiesSuffix,
                trackExpirationsTitle: home.trackExpirationsTitle,
                trackExpirationsBody: home.trackExpirationsBody,
                noExpirationsTitle: home.noExpirationsTitle,
                noExpirationsBody: home.noExpirationsBody,
            }}
        />
    )
}

/** The coverage map: which lines are held, which one needs attention. */
export function CoverageMapScreen({ locale }: { locale: ScreenLocale }) {
    const t = getTranslations(locale)
    const home = t.dashboard.home
    const status = t.branches
    const entry = (lob: string, state: CoverageMapEntry["state"], stateLabel: string): CoverageMapEntry => {
        const branch = normalizeBranch(lob)
        return { id: branch.id, icon: getBranchIcon(branch.id), label: branch.label[locale], state, stateLabel }
    }
    return (
        <BranchCoverageMap
            entries={[
                entry("motor", "covered", status.statusCovered),
                entry("home", "attention", status.statusAttention),
                entry("health", "covered", status.statusCovered),
                entry("life", "not_held", status.statusNotHeld),
                entry("travel", "neutral", status.statusNeutral),
                entry("pet", "neutral", status.statusNeutral),
            ]}
            labels={{ kicker: home.coverageMapKicker, viewAll: home.viewAllBranches }}
        />
    )
}

/** The advisor's client list — the real row component, lettered placeholders, no score shown. */
export function AdvisorScreen({ locale }: { locale: ScreenLocale }) {
    const tr = (el: string, en: string) => (locale === "el" ? el : en)
    const client = (
        id: string,
        letter: string,
        policyCount: number,
        relationshipHealth: number,
        nextActionLabel: string | null,
        gapCount: number
    ): ClientCardData => ({
        id,
        relationshipId: `rel-${id}`,
        name: tr("Πελάτης", "Client"),
        surname: letter,
        email: `${id}@example.com`,
        policyCount,
        healthScore: relationshipHealth,
        urgencyTier: nextActionLabel ? "needs_attention" : "on_track",
        nextActionDue: nextActionLabel ? inDays(7).toISOString() : null,
        nextActionLabel,
        activationStatus: "activated",
        protectionScore: null,
        gapCount,
    })
    const clients = [
        client("sample-a", tr("Α", "A"), 3, 82, tr("Ανανέωση σε 7 ημέρες", "Renewal in 7 days"), 1),
        client("sample-b", tr("Β", "B"), 2, 90, null, 0),
        client("sample-c", tr("Γ", "C"), 1, 88, null, 0),
    ]
    return (
        <div className="space-y-2">
            {clients.map((c) => (
                <ClientCard key={c.id} client={c} onClick={() => {}} />
            ))}
        </div>
    )
}
