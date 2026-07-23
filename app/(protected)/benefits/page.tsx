export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { getOffersForUser } from "@/lib/partner-offers/catalog"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"
import { LockedInsightPreview } from "@/components/monetization/LockedInsightPreview"
import { Gift, Phone, ExternalLink, Ticket } from "lucide-react"

type Lang = "el" | "en"
type BenefitsCopy = ReturnType<typeof getTranslations>["benefits"]

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
        <div className="pw-card pw-pad flex flex-col gap-3 h-full">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {offer.vendorName}
                    </p>
                    <h3 className="text-base font-semibold text-foreground mt-0.5">
                        {offer.title[lang]}
                    </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint whitespace-nowrap">
                    {offerTypeLabel}
                </span>
            </div>
            <p className="text-sm text-muted-foreground flex-1">{offer.description[lang]}</p>
            {!locked && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    {offer.redemptionMethod === "link" && offer.redemptionUrl && (
                        <a
                            href={offer.redemptionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            {t.visitPartner}
                        </a>
                    )}
                    {offer.redemptionMethod === "code" && offer.redemptionCode && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                            <Ticket className="w-4 h-4 text-primary" />
                            {t.useCode}:{" "}
                            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                                {offer.redemptionCode}
                            </code>
                        </span>
                    )}
                    {offer.redemptionMethod === "phone" && offer.redemptionPhone && (
                        <a
                            href={`tel:${offer.redemptionPhone.replace(/ /g, "")}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                            <Phone className="w-4 h-4" />
                            {t.callToRedeem}
                        </a>
                    )}
                    {offer.termsUrl && (
                        <a
                            href={offer.termsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline"
                        >
                            {t.terms}
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}

export default async function BenefitsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang: Lang = dbUser.preferredLanguage === "en" ? "en" : "el"
    const t = getTranslations(lang).benefits
    const { unlocked, locked } = await getOffersForUser(dbUser.id)

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2.5">
                    <Gift className="w-7 h-7 text-primary" />
                    {t.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
            </div>

            {unlocked.length === 0 && locked.length === 0 && (
                <div className="pw-card pw-pad-roomy text-center">
                    <p className="text-lg font-semibold text-foreground">{t.emptyTitle}</p>
                    <p className="text-sm text-muted-foreground mt-2">{t.emptyBody}</p>
                </div>
            )}

            {unlocked.length > 0 && (
                <section className="mb-10">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                        {t.includedBadge}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unlocked.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} lang={lang} t={t} />
                        ))}
                    </div>
                </section>
            )}

            {locked.length > 0 && (
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-foreground mb-1">{t.lockedTitle}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{t.lockedSubtitle}</p>
                    <LockedInsightPreview
                        featureKey="partner_offers"
                        triggerSource="benefits_page"
                        returnTo="/benefits"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {locked.map((offer) => (
                                <OfferCard key={offer.id} offer={offer} lang={lang} t={t} locked />
                            ))}
                        </div>
                    </LockedInsightPreview>
                </section>
            )}

            {(unlocked.length > 0 || locked.length > 0) && (
                <p className="text-xs text-muted-foreground">{t.partnerDisclosure}</p>
            )}
        </div>
    )
}
