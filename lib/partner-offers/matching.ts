/**
 * Pure partner-offer matching/partition logic — no server imports so it
 * unit-tests without mocking. lib/partner-offers/catalog.ts wraps this with
 * the DB + cache.
 */

export interface PartnerOfferView {
    id: string
    slug: string
    vendorSlug: string
    vendorName: string
    vendorCategory: string
    vendorLogoUrl: string | null
    vendorWebsiteUrl: string | null
    title: { el: string; en: string }
    description: { el: string; en: string }
    offerType: "free_service" | "discount" | "gift"
    redemptionMethod: "link" | "code" | "phone"
    redemptionUrl: string | null
    redemptionCode: string | null
    redemptionPhone: string | null
    termsUrl: string | null
    includedInTiers: string[]
    profileTags: string[]
    linesOfBusiness: string[]
    /** ISO timestamps (serializable) — null = unbounded. */
    validFrom: string | null
    validUntil: string | null
    sortOrder: number
}

/** Validity is evaluated at REQUEST time (the cache stores all active offers). */
export function filterByValidity(offers: PartnerOfferView[], now: Date): PartnerOfferView[] {
    return offers.filter((offer) => {
        if (offer.validFrom && now < new Date(offer.validFrom)) return false
        if (offer.validUntil && now >= new Date(offer.validUntil)) return false
        return true
    })
}

function tagMatchCount(offer: PartnerOfferView, userTags: string[]): number {
    return offer.profileTags.filter((tag) => userTags.includes(tag)).length
}

export interface PartitionedOffers {
    /** Included in the user's tier — redeemable now. Ordered by profile-tag
     *  relevance, then sortOrder. */
    unlocked: PartnerOfferView[]
    /** Active offers the user's tier does NOT include — the upgrade teaser
     *  set. Same ordering. */
    locked: PartnerOfferView[]
}

export function partitionOffersForUser(
    offers: PartnerOfferView[],
    tier: string,
    userTags: string[]
): PartitionedOffers {
    const byRelevance = (a: PartnerOfferView, b: PartnerOfferView) =>
        tagMatchCount(b, userTags) - tagMatchCount(a, userTags) ||
        a.sortOrder - b.sortOrder ||
        a.slug.localeCompare(b.slug)

    const unlocked = offers.filter((o) => o.includedInTiers.includes(tier)).sort(byRelevance)
    const locked = offers.filter((o) => !o.includedInTiers.includes(tier)).sort(byRelevance)
    return { unlocked, locked }
}
