import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createInsurer(formData: FormData) {
    const name = formData.get("name") as string
    if (!name) return

    await db.insurer.create({
        data: { name }
    })

    revalidatePath("/admin/insurers")
}

export async function createInsuranceType(formData: FormData) {
    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    if (!name || !slug) return

    await db.insuranceType.create({
        data: { name, slug }
    })

    revalidatePath("/admin/types")
}
