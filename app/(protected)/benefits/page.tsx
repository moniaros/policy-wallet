export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { getOffersForUser } from "@/lib/partner-offers/catalog"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"
import { LockedInsightPreview } from "@/components/monetization/LockedInsightPreview"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { Gift, Phone, ExternalLink, Ticket } from "lucide-react"

type Lang = "el" | "en"
type BenefitsCopy = ReturnType<typeof getTranslations>["benefits"]

/**
 * One offer, one white card on the canvas: the card head names the offer
 * and carries its kind as a neutral pill, the vendor is the caption under
 * it, and the redemption actions are soft pills. Cards rather than sunken
 * tiles because a grey pill on a grey tile is invisible, and there is no
 * white pill variant in the system.
 */
function OfferCard({
    offer,
    lang,
    t,
    locked = false,
}: {
    offer: PartnerOfferView
    lang: Lang
    t: BenefitsCopy
    locked?: boolean
}) {
    const offerTypeLabel = t.offerTypes[offer.offerType]
    return (
        <article className="pw-card pw-pad flex h-full flex-col gap-3">
            <CardHead
                as="h3"
                icon={Gift}
                title={offer.title[lang]}
                meta={
                    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-caption font-semibold text-foreground">
                        {offerTypeLabel}
                    </span>
                }
            />
            <p className="text-caption text-muted-foreground">{offer.vendorName}</p>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{offer.description[lang]}</p>
            {!locked && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {offer.redemptionMethod === "link" && offer.redemptionUrl && (
                        <a
                            href={offer.redemptionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pw-soft-button"
                        >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            {t.visitPartner}
                        </a>
                    )}
                    {offer.redemptionMethod === "code" && offer.redemptionCode && (
                        <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground">
                            <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            {t.useCode}:{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption text-foreground">
                                {offer.redemptionCode}
                            </code>
                        </span>
                    )}
                    {offer.redemptionMethod === "phone" && offer.redemptionPhone && (
                        <a
                            href={`tel:${offer.redemptionPhone.replace(/ /g, "")}`}
                            className="pw-soft-button"
                        >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            {t.callToRedeem}
                        </a>
                    )}
                    {offer.termsUrl && (
                        <a
                            href={offer.termsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex min-h-11 items-center text-caption text-muted-foreground hover:underline"
                        >
                            {t.terms}
                        </a>
                    )}
                </div>
            )}
        </article>
    )
}

export default async function BenefitsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang: Lang = dbUser.preferredLanguage === "en" ? "en" : "el"
    const t = getTranslations(lang).benefits
    const { unlocked, locked } = await getOffersForUser(dbUser.id)

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* The page names itself on the canvas, the way every Direction A
                    surface does — no glyph in the heading. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                </div>

                {unlocked.length === 0 && locked.length === 0 && (
                    <div className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                        <span className="pw-card-chip" aria-hidden="true">
                            <Gift className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <p className="mt-4 text-title font-semibold tracking-tight text-foreground">{t.emptyTitle}</p>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t.emptyBody}</p>
                    </div>
                )}

                {unlocked.length > 0 && (
                    <section aria-labelledby="benefits-included" className="space-y-3">
                        <h2 id="benefits-included" className="text-title font-semibold tracking-tight text-foreground">
                            {t.includedBadge}
                        </h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {unlocked.map((offer) => (
                                <OfferCard key={offer.id} offer={offer} lang={lang} t={t} />
                            ))}
                        </div>
                    </section>
                )}

                {locked.length > 0 && (
                    <section aria-labelledby="benefits-locked" className="space-y-3">
                        <div className="min-w-0">
                            <h2 id="benefits-locked" className="text-title font-semibold tracking-tight text-foreground">
                                {t.lockedTitle}
                            </h2>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.lockedSubtitle}</p>
                        </div>
                        <LockedInsightPreview
                            featureKey="partner_offers"
                            triggerSource="benefits_page"
                            returnTo="/benefits"
                        >
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {locked.map((offer) => (
                                    <OfferCard key={offer.id} offer={offer} lang={lang} t={t} locked />
                                ))}
                            </div>
                        </LockedInsightPreview>
                    </section>
                )}

                {(unlocked.length > 0 || locked.length > 0) && (
                    <p className="text-caption text-muted-foreground">{t.partnerDisclosure}</p>
                )}
            </div>
        </div>
    )
}
