"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getPolicyAccess } from "@/lib/policy-access"
import { athensDate } from "@/lib/wellness/nudges"
import { reminderWindow } from "@/lib/wellness/checkup-benefit"
import { ASSESSMENT_QUESTIONS, HEALTH_CONSENT_VERSION, isCompleteAnswers, scoreAssessment, type Answers } from "@/lib/wellness/scoring"

/**
 * Every export here is a public endpoint: the subject is the session, never a
 * parameter, and every write is the person's own record (spec v2 §9,
 * prevention brief 2026-09-24).
 */
const IntentInput = z.object({
    policyId: z.string().min(1),
    choice: z.enum(["considering", "done", "not_relevant", "later", "clear"]),
    /** YYYY-MM-DD, required for «later»: tomorrow … twelve months ahead. */
    remindAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/**
 * Prevention brief P1: the person's own choice about a check-up benefit.
 * «Done» asks for nothing medical — no result, no date of the visit.
 */
export async function setCheckupIntent(input: z.infer<typeof IntentInput>) {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = IntentInput.safeParse(input)
    if (!parsed.success) return { error: "INVALID" as const }
    const { policyId, choice, remindAt } = parsed.data

    // The benefit belongs to the policy OWNER: a family member or an advisor
    // who can read the policy does not record someone else's health intent.
    const access = await getPolicyAccess(policyId, { id: dbUser.id, roles: dbUser.roles })
    if (!access.exists || !access.isOwner) return { error: "NOT_FOUND" as const }

    let remindDate: Date | null = null
    if (choice === "later") {
        const window = reminderWindow()
        if (!remindAt || remindAt < window.min || remindAt > window.max) return { error: "INVALID_DATE" as const }
        remindDate = new Date(`${remindAt}T00:00:00Z`)
    }

    const year = Number(athensDate().slice(0, 4))
    const now = new Date()
    const data = {
        status: choice === "done" ? "completed" : "available",
        completedAt: choice === "done" ? now : null,
        intent: choice === "done" || choice === "clear" ? null : choice,
        intentAt: choice === "clear" ? null : now,
        remindAt: remindDate,
        remindedAt: null,
    }
    await db.healthBenefitUsage.upsert({
        where: { userId_policyKey_benefit_year: { userId: dbUser.id, policyKey: policyId, benefit: "annual_checkup", year } },
        create: { userId: dbUser.id, policyKey: policyId, benefit: "annual_checkup", year, ...data },
        update: data,
    })
    // One pending reminder per benefit: a date still waiting on last year's
    // row is superseded by this choice, not sent alongside it.
    await db.healthBenefitUsage.updateMany({
        where: { userId: dbUser.id, policyKey: policyId, benefit: "annual_checkup", year: { not: year }, remindedAt: null, remindAt: { not: null } },
        data: { remindAt: null },
    })
    revalidatePath("/wellness")
    revalidatePath("/dashboard")
    return { ok: true as const, year }
}

/** Opt in or out of the ONE daily habit push. The in-app card needs no opt-in. */
export async function setDailyNudgeOptIn(on: boolean) {
    const { dbUser } = await getAuthenticatedUser()
    const value = on === true
    await db.userNotificationSettings.upsert({
        where: { userId: dbUser.id },
        create: { userId: dbUser.id, dailyNudgeOptIn: value },
        update: { dailyNudgeOptIn: value },
    })
    revalidatePath("/wellness")
    return { ok: true as const, on: value }
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
