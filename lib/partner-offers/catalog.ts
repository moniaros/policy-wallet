/**
 * Partner-offers catalog — the single server-side read path for the
 * partner-benefits program (/benefits, home entry points, and the public
 * marketing seam).
 *
 * Honesty rule (repo law): an offer renders only while BOTH it and its vendor
 * are active and inside the validity window. Empty catalog ⇒ every consumer
 * renders nothing — there is no fallback content, and a DB failure degrades
 * to an empty list, never to stale or invented partners.
 *
 * Cached under the "partner-offers" tag (TTL 300s); /admin/partners saves
 * revalidate the tag so activations land immediately.
 */

import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { deriveProfileTags } from "@/lib/services/gap-engine/recommendation-generator"
import {
    filterByValidity,
    partitionOffersForUser,
    type PartitionedOffers,
    type PartnerOfferView,
} from "@/lib/partner-offers/matching"

export const PARTNER_OFFERS_CACHE_TAG = "partner-offers"
export type { PartnerOfferView, PartitionedOffers }

function localizedField(value: unknown): { el: string; en: string } {
    const record = (value ?? {}) as Record<string, unknown>
    const el = typeof record.el === "string" ? record.el : ""
    const en = typeof record.en === "string" ? record.en : el
    return { el: el || en, en: en || el }
}

/** Uncached loader — exported for tests; consumers use getActivePartnerOffers(). */
export async function loadActivePartnerOffersUncached(): Promise<PartnerOfferView[]> {
    try {
        const rows = await db.partnerOffer.findMany({
            where: { isActive: true, vendor: { isActive: true } },
            include: { vendor: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
        return rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            vendorSlug: row.vendor.slug,
            vendorName: row.vendor.name,
            vendorCategory: row.vendor.category,
            vendorLogoUrl: row.vendor.logoUrl,
            vendorWebsiteUrl: row.vendor.websiteUrl,
            title: localizedField(row.title),
            description: localizedField(row.description),
            offerType: row.offerType as PartnerOfferView["offerType"],
            redemptionMethod: row.redemptionMethod as PartnerOfferView["redemptionMethod"],
            redemptionUrl: row.redemptionUrl,
            redemptionCode: row.redemptionCode,
            redemptionPhone: row.redemptionPhone,
            termsUrl: row.termsUrl,
            includedInTiers: row.includedInTiers,
            profileTags: row.profileTags,
            linesOfBusiness: row.linesOfBusiness,
            validFrom: row.validFrom?.toISOString() ?? null,
            validUntil: row.validUntil?.toISOString() ?? null,
            sortOrder: row.sortOrder,
        }))
    } catch (error) {
        // Fail closed to "no offers" — a DB hiccup must never brick pages,
        // and there is deliberately no synthetic fallback for partners.
        logger("error", "Partner-offer catalog load failed — serving none", { error })
        return []
    }
}

export const getActivePartnerOffers = unstable_cache(
    loadActivePartnerOffersUncached,
    [PARTNER_OFFERS_CACHE_TAG],
    { tags: [PARTNER_OFFERS_CACHE_TAG], revalidate: 300 }
)

/** Currently-valid active offers — the PUBLIC marketing seam. Returns [] when
 *  nothing is live; every marketing consumer must render nothing on []. */
export async function getPublicPartnerOffers(): Promise<PartnerOfferView[]> {
    return filterByValidity(await getActivePartnerOffers(), new Date())
}

/** Tier-partitioned, profile-ranked offers for a signed-in policyholder. */
export async function getOffersForUser(
    userId: string
): Promise<PartitionedOffers & { tier: string }> {
    const [entitlements, profile, offers] = await Promise.all([
        resolveUserEntitlements(userId),
        db.policyholderProfile.findUnique({ where: { userId } }),
        getPublicPartnerOffers(),
    ])
    const tags = deriveProfileTags({
        ownsHome: profile?.ownsHome ?? undefined,
        hasPets: profile?.hasPets ?? undefined,
        vehiclesCount: profile?.vehiclesCount ?? undefined,
        dependentsCount: profile?.dependentsCount ?? undefined,
        employmentStatus: profile?.employmentStatus ?? undefined,
        travelsFrequently: profile?.travelsFrequently ?? undefined,
        hasLoans: profile?.hasLoans ?? undefined,
        mortgageAmount: profile?.mortgageAmount == null ? undefined : Number(profile.mortgageAmount),
    })
    return { tier: entitlements.tier, ...partitionOffersForUser(offers, entitlements.tier, tags) }
}
