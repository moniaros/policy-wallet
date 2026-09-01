"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { resolveSentence, resolveSource, resolveWhyYou } from "@/lib/app/render-copy"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/app/navigation"
import { planTierName } from "@/lib/subscription-copy"
import { DISMISS_REASONS, type RenderableFinding, type DismissReason } from "@/lib/app/finding"
import type { SeeModel } from "@/lib/app/see-model"
import type { FindingKind, Tier } from "@/lib/app/state"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection } from "@/src/design-system/app-layout"
import { buttonClassName } from "@/src/design-system/primitives"
import { FindingCard, ActionRow, ActionRowList, TierHeader, PlatformNote, type FindingCardLabels } from "@/src/design-system/app"
import { dismissFinding } from "./actions"
import { QuickStart } from "@/components/onboarding/QuickStart"
import { submitQuickStart } from "@/app/(protected)/protection/quick-start-actions"

const TIERS: readonly Tier[] = ["now", "month", "later"]
export type SeeFilter = "all" | FindingKind

/**
 * /see — «Να δείτε» (§8.2). Three tiers, one list, one finding type: `now`
 * and `month` render the full card (sentence · source · why-you · three
 * actions), `later` the compact row. Nothing generic can reach this screen —
 * every item passed the gate in lib/app/finding.ts. Sections: now · month ·
 * later · memory · note (≤ 5).
 */
export function SeeScreen({ model, filter = "all" }: { model: SeeModel; filter?: SeeFilter }) {
    const { t, language: lang } = useLanguage()
    const router = useRouter()
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const openHref = (f: RenderableFinding) => (f.object.policyId ? `${PRIMARY_NAV[2].href}/${f.object.policyId}` : PRIMARY_NAV[2].href)
    const adviserHref = SECONDARY_NAV.find((e) => e.id === "adviser")?.href ?? "/adviser"
    const helpHref = (f: RenderableFinding) => `${adviserHref}/help/${encodeURIComponent(f.hash)}`
    const seeHref = PRIMARY_NAV[1].href

    const labels: FindingCardLabels = {
        kind: "",
        sourceLabel: t.app.finding.sourceLabel,
        open: t.app.finding.open,
        help: t.app.finding.help,
        dismiss: t.app.finding.dismiss,
        dismissTitle: t.app.finding.dismissTitle,
        dismissConfirm: t.app.finding.dismissConfirm,
        close: t.app.shell.close,
        cancel: t.app.finding.cancel,
        reasons: DISMISS_REASONS.map((value) => ({ value, label: t.app.finding.reasons[value] })),
    }

    const visible = (f: RenderableFinding) => filter === "all" || f.kind === filter
    const tiers = Object.fromEntries(TIERS.map((tier) => [tier, model.tiers[tier].filter(visible)])) as Record<Tier, RenderableFinding[]>
    const total = TIERS.reduce((n, tier) => n + tiers[tier].length, 0)

    const onDismiss = model.dismissalsOn
        ? (f: RenderableFinding) => async (reason: DismissReason) => {
              const result = await dismissFinding({ hash: f.hash, reason })
              if (result.ok) {
                  toast.success(t.app.see.dismissed)
                  trackJourneyEvent("finding.dismissed", { finding_id: f.id, reason })
                  router.refresh()
              } else {
                  toast.error(t.app.see.dismissFailed)
              }
          }
        : undefined

    const filters: ReadonlyArray<{ id: SeeFilter; label: string }> = [
        { id: "all", label: t.app.see.filterAll },
        { id: "gap", label: t.app.finding.kind.gap },
        { id: "review", label: t.app.finding.kind.review },
        { id: "expiry", label: t.app.finding.kind.expiry },
    ]

    return (
        <>
            <div data-wide className="hidden" />
            <LargeTitleNav title={t.app.see.title} brand={brand} subtitle={formatPlural(t.app.see.tierCounts, { now: model.tiers.now.length, month: model.tiers.month.length, later: model.tiers.later.length }, lang)} />
            <div className="px-g-4 pt-g-2 tablet:px-0">
                <ul aria-label={t.app.see.filterLabel} className="pw-scroll-strip flex gap-g-2 overflow-x-auto pb-g-1">
                    {filters.map((f) => (
                        <li key={f.id} className="shrink-0">
                            <Link href={f.id === "all" ? seeHref : `${seeHref}?state=${f.id}`} aria-current={filter === f.id ? "true" : undefined} className={buttonClassName({ variant: filter === f.id ? "primary" : "secondary", size: "sm" })}>
                                {f.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {total === 0 ? (
                <AppSection id="empty">
                    <p className="text-g-app-body text-fg-primary">{t.app.see.empty}</p>
                    {model.nextExpiryDays !== null && <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{formatPlural(t.app.see.emptyNext, { count: model.nextExpiryDays }, lang)}</p>}
                </AppSection>
            ) : (
                TIERS.map((tier) => {
                    const items = tiers[tier]
                    if (items.length === 0) return null
                    return (
                        <AppSection id={tier} key={tier}>
                            <TierHeader id={`tier-${tier}`} title={t.app.tier[tier].title} definition={t.app.tier[tier].definition} count={items.length} />
                            {tier === "later" ? (
                                <ActionRowList label={t.app.tier.later.title}>
                                    {items.map((f) => (
                                        <ActionRow key={f.id} kind={f.kind} sentence={resolveSentence(f, lang, t)} source={resolveSource(f, lang, t)} trailing={typeof f.daysUntilExpiry === "number" ? formatPlural(t.app.finding.daysUntil, { count: f.daysUntilExpiry }, lang) : undefined} href={openHref(f)} />
                                    ))}
                                </ActionRowList>
                            ) : (
                                <ul aria-labelledby={`tier-${tier}`} className="flex flex-col gap-g-3 desk:grid desk:grid-cols-2 desk:items-start">
                                    {items.map((f) => (
                                        <li key={f.id}>
                                            <FindingCard
                                                finding={f}
                                                sentence={resolveSentence(f, lang, t)}
                                                sourceLine={resolveSource(f, lang, t)}
                                                whyYou={resolveWhyYou(f, lang, t)}
                                                trailing={typeof f.daysUntilExpiry === "number" ? formatPlural(t.app.finding.daysUntil, { count: f.daysUntilExpiry }, lang) : undefined}
                                                openHref={openHref(f)}
                                                helpHref={helpHref(f)}
                                                onDismiss={onDismiss?.(f)}
                                                labels={{ ...labels, kind: t.app.finding.kind[f.kind] }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </AppSection>
                    )
                })
            )}

            <AppSection id="memory">
                {model.quickStart && <div className="mb-g-4"><QuickStart questions={model.quickStart.questions} language={lang} onSubmit={submitQuickStart} /></div>}
                <ul className="flex flex-col gap-g-2 text-g-app-body-sm text-fg-secondary">
                    {model.dismissalsOn && <li>{model.dismissedCount > 0 ? `${formatPlural(t.app.see.dismissedCount, { count: model.dismissedCount }, lang)}. ${t.app.see.dismissedMemory}` : t.app.see.dismissedMemory}</li>}
                    {model.gapsNotChecked && model.gapDetectionTier && <li>{formatPlural(t.app.see.notChecked, { plan: planTierName(model.gapDetectionTier, lang) }, lang)}</li>}
                    {model.expiredLabels.length > 0 && <li>{formatPlural(t.app.see.expiredNote, { labels: model.expiredLabels.join(", ") }, lang)}</li>}
                </ul>
            </AppSection>

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} extra={`${t.app.see.noteGap} ${t.app.see.noteOrder}`} />
            </AppSection>
        </>
    )
}
