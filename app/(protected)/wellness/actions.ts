"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { ASSESSMENT_QUESTIONS, HEALTH_CONSENT_VERSION, isCompleteAnswers, scoreAssessment, type Answers } from "@/lib/wellness/scoring"
import { PREVENTIVE_ITEMS } from "@/lib/wellness/preventive"

/**
 * Every export here is a public endpoint: the subject is the session, never a
 * parameter, and every write is the person's own Art. 9 record (spec v2 §9).
 */
const BenefitInput = z.object({
    policyId: z.string().min(1).nullable(),
    benefit: z.string().min(1).max(40),
    year: z.number().int().min(2020).max(2100),
    status: z.enum(["available", "scheduled", "completed", "archived"]),
    note: z.string().trim().max(200).optional(),
})

export async function setBenefitStatus(input: z.infer<typeof BenefitInput>) {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = BenefitInput.safeParse(input)
    if (!parsed.success) return { error: "INVALID" as const }
    const { policyId, benefit, year, status, note } = parsed.data
    const calendarIds = new Set(PREVENTIVE_ITEMS.map((i) => i.id))
    if (benefit !== "annual_checkup" && !calendarIds.has(benefit)) return { error: "INVALID" as const }
    if (policyId) {
        // The policy named must be the person's own health policy.
        const owned = await db.policy.findFirst({ where: { id: policyId, ownerUserId: dbUser.id }, select: { id: true } })
        if (!owned) return { error: "NOT_FOUND" as const }
    }
    const policyKey = policyId ?? ""
    await db.healthBenefitUsage.upsert({
        where: { userId_policyKey_benefit_year: { userId: dbUser.id, policyKey, benefit, year } },
        create: { userId: dbUser.id, policyKey, benefit, year, status, note: note || null, completedAt: status === "completed" ? new Date() : null },
        update: { status, note: note || null, completedAt: status === "completed" ? new Date() : null },
    })
    revalidatePath("/wellness")
    revalidatePath("/dashboard")
    return { ok: true as const }
}

const AnswersInput = z.object({
    consent: z.literal(true),
    answers: z.record(z.string(), z.string()),
})

export async function submitHealthAssessment(input: { consent: boolean; answers: Record<string, string> }) {
    const { dbUser } = await getAuthenticatedUser()
    // Explicit consent is the precondition, checked before anything is read.
    const parsed = AnswersInput.safeParse(input)
    if (!parsed.success) return { error: "CONSENT_REQUIRED" as const }
    const known = new Set<string>(ASSESSMENT_QUESTIONS.map((q) => q.id))
    const answers: Answers = Object.fromEntries(Object.entries(parsed.data.answers).filter(([k]) => known.has(k)))
    if (!isCompleteAnswers(answers)) return { error: "INCOMPLETE" as const }
    const scores = scoreAssessment(answers)
    await db.healthRiskAssessment.create({
        data: { userId: dbUser.id, consentVersion: HEALTH_CONSENT_VERSION, answers, scores: scores as unknown as Prisma.InputJsonValue },
    })
    revalidatePath("/wellness")
    return { ok: true as const, scores }
}

/** The person withdraws: every assessment row goes, at once. */
export async function deleteHealthAssessments() {
    const { dbUser } = await getAuthenticatedUser()
    await db.healthRiskAssessment.deleteMany({ where: { userId: dbUser.id } })
    revalidatePath("/wellness")
    return { ok: true as const }
}
