"use client"

import { useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
    ArrowRight,
    BriefcaseBusiness,
    CalendarClock,
    Car,
    CheckCircle2,
    HeartPulse,
    House,
    TrendingUp,
    UserRound,
    type LucideIcon,
} from "lucide-react"
import { localizeHref, authHref } from "@/lib/seo/locale-links"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { CHIP_GLYPH, STATE_LABELS } from "@/src/design-system/primitives"
import { BrushUnderline, Eyebrow } from "@/src/design-system/layout"

/**
 * The «Για ποιον» tabs (§6): one pill switch, two role cards — copy on the
 * left, a stamped product sample on the right. Grafí tokens throughout;
 * dark mode comes from the token layer.
 *
 * Honesty rules this file carries (see tests/unit/marketing-mock-honesty):
 * no scores, no portfolio sizes, no invented people — lettered clients only;
 * every sample is described to assistive tech as an example AND captioned as
 * one for sighted readers; plan-gated benefits name their plan; statuses use
 * the three-state vocabulary (STATE_LABELS), never a softer «εντάξει».
 */

interface AudienceTabsProps {
    isGreek: boolean
}

const focusRing =
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-border-focus"

const TAB_BASE =
    "inline-flex min-h-11 items-center gap-g-2 rounded-g-pill px-g-5 text-g-body-sm font-semibold " +
    "transition-colors duration-200 [transition-timing-function:var(--ease-out-g)] " + focusRing
const TAB_ACTIVE = "bg-action-primary-bg text-fg-on-brand"
const TAB_IDLE = "text-fg-secondary hover:text-fg-primary"

const PRIMARY_LINK =
    "inline-flex min-h-11 items-center justify-center gap-g-2 rounded-g-pill bg-action-primary-bg px-g-6 py-g-3 " +
    "text-g-body-sm font-semibold text-fg-on-brand transition-colors duration-200 hover:bg-action-primary-hover " +
    "[-webkit-tap-highlight-color:transparent] " + focusRing

export function AudienceTabs({ isGreek }: AudienceTabsProps) {
    const [activeTab, setActiveTab] = useState<"policyholders" | "agents">("policyholders")
    const t = (el: string, en: string) => (isGreek ? el : en)

    const policyholdersTabRef = useRef<HTMLButtonElement | null>(null)
    const agentsTabRef = useRef<HTMLButtonElement | null>(null)
    const tabRefs = { policyholders: policyholdersTabRef, agents: agentsTabRef }

    const phPanelId = "audience-panel-policyholders"
    const agPanelId = "audience-panel-agents"

    /**
     * Arrow keys move the SELECTION and the focus together. The next tab is
     * derived from `activeTab`, never from the button the key fired on: with
     * a roving tabindex, focus stays where it was pressed, so a per-button
     * `current` recomputed from the same constant and every arrow after the
     * first was a no-op (measured; APG tabs pattern requires the pair to move).
     */
    const select = (next: "policyholders" | "agents") => {
        setActiveTab(next)
        tabRefs[next].current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault()
            select(activeTab === "policyholders" ? "agents" : "policyholders")
        }
        if (e.key === "Home") {
            e.preventDefault()
            select("policyholders")
        }
        if (e.key === "End") {
            e.preventDefault()
            select("agents")
        }
    }

    return (
        <div>
            <div className="flex justify-center">
                <div
                    role="tablist"
                    aria-label={t("Επιλογή κοινού", "Audience selection")}
                    className="flex rounded-g-pill border border-border-subtle bg-surface-raised p-g-1"
                >
                    <button
                        type="button"
                        role="tab"
                        ref={policyholdersTabRef}
                        id="audience-tab-policyholders"
                        aria-selected={activeTab === "policyholders" ? "true" : "false"}
                        aria-controls={phPanelId}
                        tabIndex={activeTab === "policyholders" ? 0 : -1}
                        onClick={() => setActiveTab("policyholders")}
                        onKeyDown={handleKeyDown}
                        className={`${TAB_BASE} ${activeTab === "policyholders" ? TAB_ACTIVE : TAB_IDLE}`}
                    >
                        <UserRound aria-hidden className="size-4" />
                        {t("Ιδιώτες", "Individuals")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        ref={agentsTabRef}
                        id="audience-tab-agents"
                        aria-selected={activeTab === "agents" ? "true" : "false"}
                        aria-controls={agPanelId}
                        tabIndex={activeTab === "agents" ? 0 : -1}
                        onClick={() => setActiveTab("agents")}
                        onKeyDown={handleKeyDown}
                        className={`${TAB_BASE} ${activeTab === "agents" ? TAB_ACTIVE : TAB_IDLE}`}
                    >
                        <BriefcaseBusiness aria-hidden className="size-4" />
                        {t("Ασφαλιστές", "Agents")}
                    </button>
                </div>
            </div>

            <div
                role="tabpanel"
                id={phPanelId}
                aria-labelledby="audience-tab-policyholders"
                hidden={activeTab !== "policyholders"}
                className="mt-g-8"
            >
                <PolicyholderPanel isGreek={isGreek} />
            </div>
            <div
                role="tabpanel"
                id={agPanelId}
                aria-labelledby="audience-tab-agents"
                hidden={activeTab !== "agents"}
                className="mt-g-8"
            >
                <AgentPanel isGreek={isGreek} />
            </div>
        </div>
    )
}

/* ─── Shared card pieces ──────────────────────────────────────── */

function RoleCard({ copy, sample }: { copy: ReactNode; sample: ReactNode }) {
    return (
        <article className="rounded-g-lg border border-border-subtle bg-surface-raised p-g-6 md:p-g-8">
            <div className="grid items-center gap-g-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-g-12">
                <div>{copy}</div>
                <div>{sample}</div>
            </div>
        </article>
    )
}

function BenefitList({ items }: { items: string[] }) {
    return (
        <ul className="mt-g-6 flex flex-col gap-g-3">
            {items.map((text) => (
                <li key={text} className="flex items-start gap-g-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-brand" />
                    <span className="text-g-body text-fg-primary">{text}</span>
                </li>
            ))}
        </ul>
    )
}

/**
 * A static phone frame for ONE sample screen. Not `DeviceFrame`: that one
 * cycles screens, and a second rotator on the homepage is forbidden (D-G05).
 * `role="img"` + a plain-language label, so assistive tech hears a
 * description instead of reading the example rows as the visitor's own data.
 */
function PhoneSample({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div
            role="img"
            aria-label={label}
            className="mx-auto w-full max-w-[320px] rounded-[34px] border border-border-strong bg-surface-inverse p-g-2"
        >
            <div className="rounded-[26px] bg-surface-base p-g-3">{children}</div>
        </div>
    )
}

/**
 * StatusChip at phone-row scale. A separate element rather than a className
 * override: `cn()`'s merge does not pair `px-g-2` with `px-g-3`, so the
 * override kept both and the primitive's size won — «Πελάτης Β» truncated
 * beside a 112px chip at 390. Same state tokens, same glyphs, smaller box.
 */
const MINI_CHIP: Record<"covered" | "gap" | "review", string> = {
    covered: "bg-state-covered-fill text-state-covered",
    gap: "border border-state-gap-border bg-state-gap-fill text-state-gap",
    review: "bg-state-review-fill text-state-review",
}
function MiniChip({ state, children }: { state: "covered" | "gap" | "review"; children: ReactNode }) {
    return (
        <span className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-g-pill px-g-2 text-xs font-semibold ${MINI_CHIP[state]}`}>
            <span aria-hidden>{CHIP_GLYPH[state]}</span>
            {children}
        </span>
    )
}

function SampleCaption({ children }: { children: ReactNode }) {
    // Sighted readers get the same "example" framing the role="img" label
    // gives assistive tech — OUTSIDE the image, so it reads as a caption.
    return <p className="mt-g-3 text-center text-g-caption text-fg-secondary">{children}</p>
}

/* ─── Policyholder panel ──────────────────────────────────────── */

function PolicyholderPanel({ isGreek }: { isGreek: boolean }) {
    const t = (el: string, en: string) => (isGreek ? el : en)
    const locale = isGreek ? "el" : "en"

    const benefits = [
        t(
            "Όλες οι ασφάλειές σας — αυτοκίνητο, σπίτι, υγεία — σε μία οθόνη",
            "All your insurance — car, home, health — on one screen",
        ),
        // Reminders start on the Plus plan (Free shows only the date), so the
        // benefit names the plan instead of promising it to everyone.
        t(
            "Υπενθύμιση πριν λήξει κάτι, για να μη μείνετε ακάλυπτοι — από το πλάνο Plus",
            "A reminder before something runs out, so you are never left uncovered — from the Plus plan",
        ),
        // Gap detection is a Family feature — same honesty rule.
        t(
            "Βρίσκουμε κενά που ίσως δεν είδε ούτε ο σύμβουλός σας — με το Family",
            "We find gaps even your own advisor may have missed — with Family",
        ),
    ]

    // Consumer words in the mock («Αυτοκίνητο»); the catalogue keeps «Motor».
    // States through the three-state system — which cover is fine, which one
    // has a hole — never a score.
    const rows: { Icon: LucideIcon; name: string; state: "covered" | "gap" }[] = [
        { Icon: Car, name: t("Αυτοκίνητο", "Car"), state: "covered" },
        { Icon: House, name: t("Σπίτι", "Home"), state: "gap" },
        { Icon: HeartPulse, name: t("Υγεία", "Health"), state: "covered" },
    ]

    return (
        <RoleCard
            copy={
                <>
                    <Eyebrow>{t("Ιδιώτες", "Individuals")}</Eyebrow>
                    <h3 className="mt-g-3 text-balance text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">
                        {t("Για εσάς που θέλετε ", "For those who want ")}
                        <BrushUnderline>
                            <span className="text-fg-brand">{t("ηρεμία", "peace of mind")}</span>
                        </BrushUnderline>
                        {t(", όχι εκπλήξεις.", ", not surprises.")}
                    </h3>
                    <p className="mt-g-4 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {t(
                            "Τέλος το ψάξιμο στα συρτάρια. Όλα τα συμβόλαιά σας, πάντα ενημερωμένα.",
                            "No more digging through drawers. All your policies, always up to date.",
                        )}
                    </p>
                    <BenefitList items={benefits} />
                    {/* Reads PRIMARY_ACTION: this button shares the page with the
                        hero and the closing CTA, and a hard-coded label here once
                        left the homepage making two different primary promises. */}
                    <Link
                        href={authHref("/auth/signup?role=policyholder&source=landing_audience", locale)}
                        className={`mt-g-8 ${PRIMARY_LINK}`}
                    >
                        {pick(PRIMARY_ACTION, locale)}
                        <ArrowRight aria-hidden className="size-4" />
                    </Link>
                </>
            }
            sample={
                <>
                    <PhoneSample
                        label={t(
                            "Παράδειγμα: τρεις ασφάλειες σε μία οθόνη — αυτοκίνητο και υγεία καλύπτονται, στην κατοικία λείπει η κάλυψη πλημμύρας.",
                            "Example: three policies on one screen — car and health are covered, the home is missing flood cover.",
                        )}
                    >
                        <div className="flex items-center justify-between gap-g-2">
                            <p className="text-sm font-semibold text-fg-primary">{t("Τα συμβόλαιά μου", "My policies")}</p>
                            <MiniChip state="gap">1 {t("κενό", "gap")}</MiniChip>
                        </div>
                        <ul className="mt-g-3 flex flex-col gap-g-2">
                            {rows.map((r) => (
                                <li
                                    key={r.name}
                                    className="flex items-center gap-g-2 rounded-g-md border border-border-subtle bg-surface-raised px-g-3 py-g-2"
                                >
                                    <span
                                        className={
                                            r.state === "gap"
                                                ? "flex size-8 shrink-0 items-center justify-center rounded-g-sm bg-state-gap-fill text-state-gap"
                                                : "flex size-8 shrink-0 items-center justify-center rounded-g-sm bg-state-covered-fill text-state-covered"
                                        }
                                    >
                                        <r.Icon aria-hidden className="size-4" />
                                    </span>
                                    <span className="flex-1 text-sm font-medium text-fg-primary">{r.name}</span>
                                    <MiniChip state={r.state}>{pick(STATE_LABELS[r.state], locale)}</MiniChip>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-g-3 flex items-center gap-g-2 rounded-g-md border border-state-gap-border bg-state-gap-fill px-g-3 py-g-2 text-sm font-medium text-state-gap">
                            <span aria-hidden>◆</span>
                            {t("Σπίτι: λείπει κάλυψη πλημμύρας", "Home: missing flood cover")}
                        </p>
                    </PhoneSample>
                    {/* Names the plan: finding the gap is a Family job, and this
                        renders near "free", so an unattributed mock reads as a
                        free-tier promise. */}
                    <SampleCaption>{t("Παράδειγμα αποτελέσματος με το Family.", "Example result with Family.")}</SampleCaption>
                </>
            }
        />
    )
}

/* ─── Agent panel ─────────────────────────────────────────────── */

function AgentPanel({ isGreek }: { isGreek: boolean }) {
    const t = (el: string, en: string) => (isGreek ? el : en)
    const locale = isGreek ? "el" : "en"

    const benefits = [
        t(
            "Όλοι οι πελάτες σας σε μία οθόνη — ποιος λήγει, ποιος έχει κενό",
            "All your clients on one screen — who is running out, who has a gap",
        ),
        t(
            "Προτάσεις για το τι λείπει σε κάθε πελάτη, βγαλμένες από τα ίδια του τα συμβόλαια",
            "Suggestions for what each client is missing, taken from their own policies",
        ),
        t(
            "Στέλνετε 100 αρχεία μαζί και τα διαβάζουμε όλα σε λίγα λεπτά",
            "Send 100 files at once and we read every one of them in minutes",
        ),
    ]

    // Lettered placeholders («Πελάτης Α»), matching AgentWidgets: a mock row
    // needs a label, and an invented surname reads as a real book of business.
    // A client whose cover is fine says so; one with a renewal coming says how
    // many days — never a grade.
    const clients = [
        { initials: t("Α", "A"), name: t("Πελάτης Α", "Client A"), renewal: 7, alert: true },
        { initials: t("Β", "B"), name: t("Πελάτης Β", "Client B"), renewal: 23, alert: false },
        { initials: t("Γ", "C"), name: t("Πελάτης Γ", "Client C"), renewal: 45, alert: false },
        { initials: t("Δ", "D"), name: t("Πελάτης Δ", "Client D"), renewal: 62, alert: true },
    ]

    return (
        <RoleCard
            copy={
                <>
                    <Eyebrow>{t("Ασφαλιστές", "Agents")}</Eyebrow>
                    <h3 className="mt-g-3 text-balance text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary">
                        {t("Δείτε όλο το ", "See your client's whole ")}
                        <BrushUnderline>
                            <span className="text-fg-brand">{t("risk profile", "risk profile")}</span>
                        </BrushUnderline>
                        {t(" του πελάτη σας — όχι μόνο τα συμβόλαιά του.", " — not just their policies.")}
                    </h3>
                    <p className="mt-g-4 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {t(
                            "Συγκεντρώστε τις καλύψεις του πελάτη σε μία ενιαία εικόνα, εντοπίστε κενά και επικαλύψεις και κατανοήστε τι πραγματικά χρειάζεται.",
                            "Bring your client's coverage into one complete view, identify gaps and overlaps, and understand what they actually need.",
                        )}
                    </p>
                    <BenefitList items={benefits} />
                    <Link href={localizeHref("/solutions/agents", locale)} className={`mt-g-8 ${PRIMARY_LINK}`}>
                        {t("Δείτε τι παίρνετε", "See what you get")}
                        <ArrowRight aria-hidden className="size-4" />
                    </Link>
                </>
            }
            sample={
                <>
                    <PhoneSample
                        label={t(
                            "Παράδειγμα: μία οθόνη με τους πελάτες σας, ποιανού η ασφάλεια λήγει σύντομα, και μια πρόταση για το τι λείπει σε έναν από αυτούς.",
                            "Example: one screen with your clients, whose cover runs out soon, and a suggestion for what one of them is missing.",
                        )}
                    >
                        <ul className="flex flex-col gap-g-2">
                            {clients.map((c) => (
                                <li
                                    key={c.name}
                                    className="flex items-center gap-g-2 rounded-g-md border border-border-subtle bg-surface-raised px-g-3 py-g-2"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-g-pill bg-state-covered-fill text-xs font-bold text-fg-brand">
                                        {c.initials}
                                    </span>
                                    <span className="flex-1 truncate text-sm font-medium text-fg-primary">{c.name}</span>
                                    {c.alert ? (
                                        <span
                                            className="inline-flex min-h-7 items-center gap-g-1 rounded-g-pill bg-state-review-fill px-g-2 text-xs font-semibold text-state-review"
                                            style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                                        >
                                            <CalendarClock aria-hidden className="size-3.5" />
                                            {t(`${c.renewal} ημ.`, `${c.renewal}d`)}
                                        </span>
                                    ) : (
                                        <MiniChip state="covered">{pick(STATE_LABELS.covered, locale)}</MiniChip>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-g-3 flex items-center gap-g-2 rounded-g-md bg-state-covered-fill px-g-3 py-g-2 text-sm font-medium text-state-covered">
                            <TrendingUp aria-hidden className="size-4 shrink-0" />
                            {t("Πελάτης Α — του λείπει ασφάλεια ζωής", "Client A — has no life cover")}
                        </p>
                    </PhoneSample>
                    {/* The client names are invented, and this is the line that says so. */}
                    <SampleCaption>
                        {t("Παράδειγμα οθόνης συμβούλου. Τα ονόματα είναι φανταστικά.", "Example advisor screen. The names are fictional.")}
                    </SampleCaption>
                </>
            }
        />
    )
}
