"use client"

/**
 * REAL app screens for the marketing site.
 *
 * These are the same components the signed-in app renders — the dashboard's
 * overview and attention list, the wallet, the coverage map, the renewals
 * timeline, the advisor's client list — fed fixture data and scaled from their
 * 390px phone layout into a frame. They replace the hand-drawn mocks (a ring,
 * some chips, a fake row list) that showed a product the app does not look
 * like: the public site now shows the app, and a visitor who signs up meets
 * the screen they were promised.
 *
 * Every screen is a SAMPLE and says so. No real insurer is named (the
 * lettered convention «Ασφαλιστική Α» / «Πελάτης Α» the other mocks use),
 * nothing renders a score — the mock-honesty guard
 * (tests/unit/marketing-mock-honesty.test.ts) scans this file. The scaled
 * screen is `inert`, so its links, buttons and count markers never reach a
 * reader or a metric; the frame around it carries the accessible description.
 *
 * MOTION (2026-09-03): a screen behaves like the app it is a picture of. When
 * it becomes the live screen — the hero's frame switching to it, or a static
 * phone scrolling into view — its content pushes in from the right the way a
 * tab switch does while the status bar and tab bar stay put, its cards settle
 * in with a short stagger, its bars fill to their values and its counts tick
 * up, and the tab bar's mark lands on the tab the screen belongs to. One
 * rehearsed sequence per screen, driven by CSS keyframes (`.rs-live`) and two
 * small Web Animations tweens; the global reduced-motion rule flattens the
 * keyframes and the tweens check the preference themselves. Nothing loops;
 * nothing runs off-screen.
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { BatteryFull, LayoutDashboard, Settings, Shield, Users, Wallet, Wifi } from "lucide-react"
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
import { StatusSummary } from "@/components/wallet/StatusSummary"
import { PolicyCard } from "@/components/wallet/PolicyCard"
import type { Policy } from "@/components/wallet/types"
import { ClientCard } from "@/components/agent/ClientCard"
import type { ClientCardData } from "@/components/agent/types"

export type ScreenLocale = "el" | "en"
export type AppTab = "home" | "wallet" | "protection" | "agent" | "settings"

/** The app's phone layout width — every screen is laid out at this width, then scaled. */
const APP_WIDTH = 390
const DAY = 86_400_000
const inDays = (n: number) => new Date(Date.now() + n * DAY)
const ARRIVE = "cubic-bezier(0.16, 1, 0.3, 1)"

function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false
}

/**
 * The entrance, run once each time a screen goes live. Cards are staggered by
 * CSS (`.rs-live .pw-card` reads `--rs-i`); the two things CSS cannot reach —
 * an inline `width: N%` on a bar fill and a number inside a count marker —
 * are tweened here. Everything it touches is already visible in its final
 * state before it runs, so a failed script costs nothing.
 */
function playEntrance(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>(".pw-card").forEach((card, i) => card.style.setProperty("--rs-i", String(i)))
    if (prefersReducedMotion()) return

    // Bars: any inline percentage width inside the screen is a fill.
    root.querySelectorAll<HTMLElement>("[style]").forEach((el, i) => {
        const target = el.style.width
        if (!/%$/.test(target) || typeof el.animate !== "function") return
        el.animate([{ width: "0%" }, { width: target }], {
            duration: 700,
            delay: 420 + Math.min(i, 6) * 60,
            easing: ARRIVE,
            fill: "both",
        })
    })

    // Counts: the first small integer inside each count marker ticks up.
    root.querySelectorAll<HTMLElement>("[data-count]").forEach((marker, i) => {
        const walker = document.createTreeWalker(marker, NodeFilter.SHOW_TEXT)
        let node: Text | null = null
        while (walker.nextNode()) {
            const text = walker.currentNode as Text
            if (/^\s*\d{1,3}\s*$/.test(text.data)) {
                node = text
                break
            }
        }
        if (!node) return
        const final = node.data
        const value = parseInt(final, 10)
        if (!Number.isFinite(value) || value === 0) return
        const start = performance.now() + 260 + Math.min(i, 5) * 70
        const duration = 620
        const step = (now: number) => {
            const p = Math.min(1, Math.max(0, (now - start) / duration))
            const eased = 1 - Math.pow(1 - p, 3)
            node!.data = p >= 1 ? final : String(Math.round(value * eased))
            if (p < 1) requestAnimationFrame(step)
        }
        node.data = "0"
        requestAnimationFrame(step)
    })
}

/**
 * Lays a real 390px app screen out at full size and scales it to whatever
 * width its frame gives it — so the type, spacing and cards are the app's
 * own, not a redrawing. Wraps the screen in the app's phone chrome (status
 * bar, the real tab bar with the screen's tab marked). The scaled tree is
 * `inert`: it is a picture of the product, and its controls must not be
 * reachable.
 *
 * `active` says the screen is the live one (the hero's frame passes it);
 * left undefined, the screen goes live the first time it scrolls into view.
 * `fixed` fills the frame's own height (a phone), pinning the tab bar to the
 * bottom; otherwise the screen is as tall as its content.
 */
export function AppScreen({
    locale,
    children,
    className,
    defaultScale = 0.72,
    minHeight,
    active,
    fixed = false,
    chrome = "app",
    tab = "home",
}: {
    /** The page's locale — the screen's copy follows it, never the visitor's stored app preference. */
    locale: ScreenLocale
    children: ReactNode
    className?: string
    /** Used for the first paint, before the frame is measured. */
    defaultScale?: number
    minHeight?: number
    active?: boolean
    fixed?: boolean
    /** "app": status bar + tab bar (the policyholder app); "bar": status bar only; "none". */
    chrome?: "app" | "bar" | "none"
    tab?: AppTab
}) {
    const outer = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(defaultScale)
    const [height, setHeight] = useState<number | undefined>(undefined)
    const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined)
    const [live, setLive] = useState(active === true)

    useEffect(() => {
        const o = outer.current
        const i = inner.current
        if (!o || !i) return
        const measure = () => {
            const s = o.clientWidth / APP_WIDTH
            setScale(s)
            if (fixed) setInnerHeight(Math.round(o.clientHeight / s))
            else setHeight(Math.round(i.offsetHeight * s))
        }
        measure()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(measure)
        ro.observe(o)
        ro.observe(i)
        return () => ro.disconnect()
    }, [fixed])

    // Live when told so, or the first time the screen is on screen.
    useEffect(() => {
        if (active !== undefined) {
            setLive(active)
            return
        }
        const o = outer.current
        if (!o || typeof IntersectionObserver === "undefined") {
            setLive(true)
            return
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLive(true)
                    io.disconnect()
                }
            },
            { threshold: 0.35 }
        )
        io.observe(o)
        return () => io.disconnect()
    }, [active])

    useEffect(() => {
        if (!live || !inner.current) return
        playEntrance(inner.current)
    }, [live])

    return (
        <div
            ref={outer}
            className={cn("relative w-full overflow-hidden", fixed && "h-full", className)}
            style={{ height: fixed ? undefined : height, minHeight }}
        >
            <div
                ref={inner}
                inert
                className={cn(
                    "rs-screen pw-app-canvas absolute left-0 top-0 flex flex-col font-sans text-foreground [&_*]:pointer-events-none",
                    live && "rs-live"
                )}
                style={{ width: APP_WIDTH, height: innerHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
                {/* The app's components read the language context and the
                    translations dictionary, which the public layouts do not
                    mount — so the screen brings its own, pinned to the page. */}
                <LanguageProvider initialLanguage={locale} pinned>
                    <TranslationsProvider>
                        {chrome !== "none" && <PhoneStatusBar />}
                        <div className={cn("rs-content min-h-0 p-3", fixed && "flex-1 overflow-hidden")}>{children}</div>
                        {chrome === "app" && <PhoneTabBar locale={locale} active={tab} />}
                    </TranslationsProvider>
                </LanguageProvider>
            </div>
        </div>
    )
}

/** A phone's status bar — the part of the picture that says "this is a phone". */
function PhoneStatusBar() {
    return (
        <div className="flex items-center justify-between px-5 pb-1 pt-3 text-caption font-semibold text-foreground" aria-hidden="true">
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-1.5">
                <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                    <rect x="0" y="6" width="2.5" height="4" rx="0.6" />
                    <rect x="3.75" y="4" width="2.5" height="6" rx="0.6" />
                    <rect x="7.5" y="2" width="2.5" height="8" rx="0.6" />
                    <rect x="11.25" y="0" width="2.5" height="10" rx="0.6" />
                </svg>
                <Wifi className="h-3.5 w-3.5" strokeWidth={2.5} />
                <BatteryFull className="h-4 w-4" strokeWidth={2} />
            </span>
        </div>
    )
}

/**
 * The policyholder app's tab bar, as AppShell renders it on a phone: five
 * tabs, the active one a 3px mark above a semibold caption. The mark draws
 * in with the entrance (`.rs-mark`), so a screen change reads as navigation.
 */
function PhoneTabBar({ locale, active }: { locale: ScreenLocale; active: AppTab }) {
    const t = getTranslations(locale)
    const tabs: Array<{ id: AppTab; label: string; Icon: typeof Wallet }> = [
        { id: "home", label: t.nav.home, Icon: LayoutDashboard },
        { id: "wallet", label: t.nav.walletShort, Icon: Wallet },
        { id: "protection", label: t.nav.protectionShort, Icon: Shield },
        { id: "agent", label: t.nav.agentShort, Icon: Users },
        { id: "settings", label: t.userMenu.settings, Icon: Settings },
    ]
    return (
        <div className="mt-auto border-t border-border bg-card px-2 pb-3 pt-1" aria-hidden="true">
            <div className="flex">
                {tabs.map(({ id, label, Icon }) => {
                    const isActive = id === active
                    return (
                        <div
                            key={id}
                            className={cn(
                                "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 pt-1.5",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {isActive && (
                                <span className="rs-mark absolute left-1/2 top-0 h-[3px] w-7 origin-center -translate-x-1/2 rounded-b-full bg-primary" />
                            )}
                            <Icon className="h-6 w-6" strokeWidth={isActive ? 2.25 : 1.75} />
                            <span className={cn("whitespace-nowrap text-caption", isActive ? "font-semibold" : "font-medium")}>
                                {label}
                            </span>
                        </div>
                    )
                })}
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
            ruleId: "sample-home",
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
            ruleId: "sample-motor",
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
                        counts={{ legislative: 0, contractual: 0, market: 0, underReview: 2 }}
                        labels={{
                            kicker: home.gapsKicker,
                            noGaps: home.noGaps,
                            provenance: {
                                legislative: t.provenance.legislative,
                                contractual: t.provenance.contractual,
                                market: t.provenance.market,
                            },
                            underReviewOmitted: t.provenance.underReviewSummaryOmitted,
                            underReviewLink: t.provenance.underReviewLink,
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

/** The wallet: the overview row and the policy cards, as the wallet renders them on a phone. */
export function WalletScreen({ locale }: { locale: ScreenLocale }) {
    const tr = (el: string, en: string) => (locale === "el" ? el : en)
    const policy = (id: string, insurer: string, lob: Policy["lineOfBusiness"], days: number, number: string): Policy => ({
        id,
        policyNumber: number,
        insurerName: insurer,
        insurerLogo: null,
        lineOfBusiness: lob,
        status: "active",
        startDate: inDays(days - 365).toISOString(),
        endDate: inDays(days).toISOString(),
        lastUpdated: inDays(-3).toISOString(),
        sharedWithAgents: [],
        coverageHighlights: [],
        documents: [],
        verified: true,
    })
    // Lettered insurers: a real company's name under invented cover is a claim about that company.
    const policies = [
        policy("sample-motor", tr("Ασφαλιστική Α", "Insurer A"), "motor", 18, "PW-2026-0412"),
        policy("sample-home", tr("Ασφαλιστική Β", "Insurer B"), "home", 74, "PW-2026-0587"),
        policy("sample-health", tr("Ασφαλιστική Α", "Insurer A"), "health", 140, "PW-2026-0733"),
    ]
    return (
        <div>
            <StatusSummary activeCount={2} expiringCount={1} attentionCount={0} totalPolicies={3} totalPremium={1284} />
            <div className="space-y-3">
                {policies.map((p) => (
                    <PolicyCard key={p.id} policy={p} onView={() => {}} />
                ))}
            </div>
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
