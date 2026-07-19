"use server"

import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { parseOfferForm, parseVendorForm } from "@/lib/partner-offers/validation"

// NOT exported ("use server" files may only export async actions); the shared
// definition for consumers lives in lib/partner-offers (PR 3b's catalog).
const PARTNER_OFFERS_CACHE_TAG = "partner-offers"

function revalidatePartnerSurfaces(vendorId?: string) {
    revalidateTag(PARTNER_OFFERS_CACHE_TAG, "max")
    revalidatePath("/admin/partners")
    if (vendorId) revalidatePath(`/admin/partners/${vendorId}`)
}

function rethrowSlugConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("That slug is already in use — slugs are permanent identifiers, pick another.")
    }
    throw error
}

export async function createVendor(formData: FormData) {
    const admin = await verifyAdminRole()
    const input = parseVendorForm(formData)

    let vendorId: string
    try {
        const vendor = await db.partnerVendor.create({ data: input })
        vendorId = vendor.id
    } catch (error) {
        rethrowSlugConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CREATE_PARTNER_VENDOR",
        `Created partner vendor ${input.slug}${input.isActive ? " (ACTIVE)" : ""}`,
        { vendorId, slug: input.slug }
    )
    revalidatePartnerSurfaces(vendorId)
    redirect(`/admin/partners/${vendorId}`)
}

export async function updateVendor(formData: FormData) {
    const admin = await verifyAdminRole()
    const vendorId = String(formData.get("vendorId") ?? "")
    const existing = await db.partnerVendor.findUnique({ where: { id: vendorId } })
    if (!existing) throw new Error("Vendor not found")

    const input = parseVendorForm(formData)
    try {
        await db.partnerVendor.update({ where: { id: vendorId }, data: input })
    } catch (error) {
        rethrowSlugConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_PARTNER_VENDOR",
        `Updated partner vendor ${input.slug} (active: ${existing.isActive} → ${input.isActive})`,
        { vendorId, slug: input.slug }
    )
    revalidatePartnerSurfaces(vendorId)
    redirect(`/admin/partners/${vendorId}?saved=1`)
}

export async function createOffer(formData: FormData) {
    const admin = await verifyAdminRole()
    const vendorId = String(formData.get("vendorId") ?? "")
    const vendor = await db.partnerVendor.findUnique({ where: { id: vendorId } })
    if (!vendor) throw new Error("Vendor not found")

    const input = parseOfferForm(formData)
    try {
        await db.partnerOffer.create({ data: { ...input, vendorId } })
    } catch (error) {
        rethrowSlugConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CREATE_PARTNER_OFFER",
        `Created offer ${input.slug} for vendor ${vendor.slug}${input.isActive ? " (ACTIVE)" : ""}`,
        { vendorId, offerSlug: input.slug }
    )
    revalidatePartnerSurfaces(vendorId)
    redirect(`/admin/partners/${vendorId}?saved=1`)
}

export async function updateOffer(formData: FormData) {
    const admin = await verifyAdminRole()
    const offerId = String(formData.get("offerId") ?? "")
    const existing = await db.partnerOffer.findUnique({ where: { id: offerId } })
    if (!existing) throw new Error("Offer not found")

    const input = parseOfferForm(formData)
    try {
        await db.partnerOffer.update({ where: { id: offerId }, data: input })
    } catch (error) {
        rethrowSlugConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_PARTNER_OFFER",
        `Updated offer ${input.slug} (active: ${existing.isActive} → ${input.isActive})`,
        { offerId, vendorId: existing.vendorId, offerSlug: input.slug }
    )
    revalidatePartnerSurfaces(existing.vendorId)
    redirect(`/admin/partners/${existing.vendorId}?saved=1`)
}
