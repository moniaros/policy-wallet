"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import {
    applyAdminEditsToConfidence,
    parseInsurerCreateForm,
    parseInsurerForm,
} from "@/lib/insurers/validation"

function revalidateInsurerSurfaces(insurerId?: string) {
    revalidatePath("/admin/insurers")
    if (insurerId) revalidatePath(`/admin/insurers/${insurerId}`)
}

function rethrowNameConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("An insurer with that name already exists.")
    }
    throw error
}

export async function createInsurer(formData: FormData) {
    const admin = await verifyAdminRole()
    const input = parseInsurerCreateForm(formData)

    let insurerId: string
    try {
        const insurer = await db.insurer.create({ data: input })
        insurerId = insurer.id
    } catch (error) {
        rethrowNameConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "CREATE_INSURER",
        `Created insurer: ${input.name}`,
        { insurerId, insurerName: input.name }
    )
    revalidateInsurerSurfaces(insurerId)
    redirect(`/admin/insurers/${insurerId}`)
}

export async function updateInsurer(formData: FormData) {
    const admin = await verifyAdminRole()
    const insurerId = String(formData.get("insurerId") ?? "")
    const existing = await db.insurer.findUnique({ where: { id: insurerId } })
    if (!existing) throw new Error("Insurer not found")

    const input = parseInsurerForm(formData)
    const fieldConfidence = applyAdminEditsToConfidence(existing.fieldConfidence, existing, input)
    try {
        await db.insurer.update({
            where: { id: insurerId },
            data: {
                ...input,
                hqAddress: input.hqAddress ?? Prisma.DbNull,
                fieldConfidence: fieldConfidence ?? Prisma.DbNull,
            },
        })
    } catch (error) {
        rethrowNameConflict(error)
    }

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_INSURER",
        `Updated insurer ${input.name} (active: ${existing.isActive} → ${input.isActive})`,
        { insurerId, insurerName: input.name, slug: existing.slug }
    )
    revalidateInsurerSurfaces(insurerId)
    redirect(`/admin/insurers/${insurerId}?saved=1`)
}
