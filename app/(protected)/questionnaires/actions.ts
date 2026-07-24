"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { isAgentRole } from "@/lib/auth/require-agent"
import { resolveAgentEntitlements } from "@/lib/subscription-entitlements"
import { branchFamilyId } from "@/lib/insurance/taxonomy"

// ── Types ──

export interface TemplateQuestion {
    id: string
    type: "text" | "number" | "boolean" | "select"
    label: string
    labelEl?: string
    required: boolean
    options?: { label: string; labelEl?: string; value: string }[]
}

export interface TemplateData {
    id: string
    name: string
    lineOfBusiness: string
    questions: TemplateQuestion[]
    isSystem: boolean
    isActive: boolean
    instanceCount: number
    createdAt: string
}

export interface InstanceData {
    id: string
    templateName: string
    customerName: string
    status: string
    sentAt: string
    completedAt: string | null
    responseCount: number
    answers: Record<string, unknown> | null
}

// ── Template CRUD ──

export async function getTemplates(): Promise<TemplateData[]> {
    const { dbUser } = await getAuthenticatedUser()

    const templates = await db.questionnaireTemplate.findMany({
        where: {
            OR: [
                { isSystem: true },
                { createdByUserId: dbUser.id },
            ],
            isActive: true,
        },
        include: {
            _count: { select: { instances: true } },
        },
        orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    })

    return templates.map((t) => ({
        id: t.id,
        name: t.name,
        lineOfBusiness: t.lineOfBusiness,
        questions: t.questions as unknown as TemplateQuestion[],
        isSystem: t.isSystem,
        isActive: t.isActive,
        instanceCount: t._count.instances,
        createdAt: t.createdAt.toISOString(),
    }))
}

export async function createTemplate(data: {
    name: string
    lineOfBusiness: string
    questions: TemplateQuestion[]
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!isAgentRole(dbUser.roles)) return { error: "Unauthorized" }

    if (!data.name || !data.lineOfBusiness || data.questions.length === 0) {
        return { error: "Name, line of business, and at least one question required" }
    }

    // Enforce the tier cap on custom templates (agent_free = 0, Starter = 5,
    // Pro/Agency = unlimited). Was previously unenforced — free agents could
    // create unlimited templates despite a cap of 0.
    const { questionnaireTemplates: cap } = (await resolveAgentEntitlements(dbUser.id)).limits
    if (cap !== null) {
        const existing = await db.questionnaireTemplate.count({
            where: { createdByUserId: dbUser.id, isSystem: false },
        })
        if (existing >= cap) {
            return {
                error:
                    cap === 0
                        ? "Custom questionnaire templates require the Starter plan or higher."
                        : `You've reached your plan's limit of ${cap} custom templates. Upgrade for more.`,
            }
        }
    }

    await db.questionnaireTemplate.create({
        data: {
            name: data.name,
            lineOfBusiness: data.lineOfBusiness,
            questions: data.questions as any,
            isSystem: false,
            createdByUserId: dbUser.id,
        },
    })

    revalidatePath("/questionnaires")
    return { success: true }
}

export async function updateTemplate(
    templateId: string,
    data: { name?: string; lineOfBusiness?: string; questions?: TemplateQuestion[] }
) {
    const { dbUser } = await getAuthenticatedUser()

    const template = await db.questionnaireTemplate.findUnique({ where: { id: templateId } })
    if (!template) return { error: "Template not found" }
    if (template.isSystem) return { error: "Cannot edit system templates" }
    if (template.createdByUserId !== dbUser.id) return { error: "Permission denied" }

    await db.questionnaireTemplate.update({
        where: { id: templateId },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.lineOfBusiness && { lineOfBusiness: data.lineOfBusiness }),
            ...(data.questions && { questions: data.questions as any }),
            version: { increment: 1 },
        },
    })

    revalidatePath("/questionnaires")
    return { success: true }
}

export async function deleteTemplate(templateId: string) {
    const { dbUser } = await getAuthenticatedUser()

    const template = await db.questionnaireTemplate.findUnique({ where: { id: templateId } })
    if (!template) return { error: "Template not found" }
    if (template.isSystem) return { error: "Cannot delete system templates" }
    if (template.createdByUserId !== dbUser.id) return { error: "Permission denied" }

    // Soft delete — just deactivate
    await db.questionnaireTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
    })

    revalidatePath("/questionnaires")
    return { success: true }
}

// ── Instance tracking ──

export async function getSentQuestionnaires(): Promise<InstanceData[]> {
    const { dbUser } = await getAuthenticatedUser()

    const instances = await db.questionnaireInstance.findMany({
        where: { sentByUserId: dbUser.id },
        include: {
            template: { select: { name: true } },
            receiver: { select: { name: true } },
            responses: { select: { answers: true } },
        },
        orderBy: { sentAt: "desc" },
        take: 50,
    })

    return instances.map((i) => ({
        id: i.id,
        templateName: i.template.name,
        customerName: i.receiver.name || "Unknown",
        status: i.status,
        sentAt: i.sentAt.toISOString(),
        completedAt: i.completedAt?.toISOString() || null,
        responseCount: i.responses.length,
        answers: i.responses.length > 0 ? (i.responses[0].answers as Record<string, unknown>) : null,
    }))
}

// ── AI response analysis ──

export async function analyzeQuestionnaireResponse(instanceId: string) {
    const { dbUser } = await getAuthenticatedUser()

    const instance = await db.questionnaireInstance.findUnique({
        where: { id: instanceId },
        include: {
            template: true,
            receiver: { select: { name: true } },
            responses: { orderBy: { submittedAt: "desc" }, take: 1 },
            relationship: { select: { policyholderUserId: true } },
        },
    })

    if (!instance) return { error: "Instance not found" }
    if (instance.sentByUserId !== dbUser.id) return { error: "Permission denied" }
    if (instance.responses.length === 0) return { error: "No responses yet" }

    const questions = instance.template.questions as unknown as TemplateQuestion[]
    const answers = instance.responses[0].answers as Record<string, string>
    const customerName = instance.receiver.name || "Customer"
    const lob = instance.template.lineOfBusiness

    // Build structured summary from answers
    const answerSummary = questions.map((q) => ({
        question: q.label,
        answer: answers[q.id] ?? "Not answered",
        type: q.type,
        required: q.required,
    }))

    // Run cross-sell analysis for the customer
    const { analyzePortfolioGaps } = await import("@/lib/services/cross-sell.service")

    // Get customer's existing LoB — ONLY from policies this agent may see.
    // The unscoped query read the customer's entire portfolio; the complement
    // ("missing lines") let the agent infer holdings the customer never shared.
    const { getAgentPolicyVisibilityWhere } = await import("@/lib/agent-visibility")
    const customerPolicies = await db.policy.findMany({
        where: {
            ownerUserId: instance.relationship.policyholderUserId,
            ...(await getAgentPolicyVisibilityWhere(dbUser.id)),
        },
        select: { lineOfBusiness: true },
    })
    const existingLobs = [...new Set(customerPolicies.map((p) => p.lineOfBusiness.toLowerCase()))]
    const missingLines = analyzePortfolioGaps(existingLobs)

    // Build AI-like analysis summary (deterministic for now — can be wired to LLM later)
    const needsIdentified: string[] = []
    const recommendations: string[] = []

    // Analyze based on LoB-specific patterns
    for (const item of answerSummary) {
        if (item.answer === "true" || item.answer === "yes") {
            if (item.question.toLowerCase().includes("claim") || item.question.toLowerCase().includes("ζημι")) {
                needsIdentified.push(`Has recent claims history — review current coverage limits`)
            }
            if (item.question.toLowerCase().includes("pre-existing") || item.question.toLowerCase().includes("προϋπάρχ")) {
                needsIdentified.push(`Pre-existing conditions disclosed — ensure coverage includes them`)
            }
            if (item.question.toLowerCase().includes("earthquake") || item.question.toLowerCase().includes("σεισμ")) {
                needsIdentified.push(`Earthquake coverage needed — critical for Greek properties`)
            }
            if (item.question.toLowerCase().includes("flood") || item.question.toLowerCase().includes("πλημμύρ")) {
                needsIdentified.push(`Property in flood-risk zone — requires enhanced coverage`)
            }
        }
    }

    // Add cross-sell recommendations
    for (const ml of missingLines.slice(0, 3)) {
        recommendations.push(`Missing ${ml.label.en} coverage — ${ml.reason.en}`)
    }

    // Add LoB-specific recommendations
    if (branchFamilyId(lob) === "motor") {
        const coverageQ = answerSummary.find((a) => a.question.toLowerCase().includes("coverage type"))
        if (coverageQ && (coverageQ.answer === "third_party" || coverageQ.answer === "none")) {
            recommendations.push("Currently on basic/no coverage — strong upgrade opportunity")
        }
    }

    if (branchFamilyId(lob) === "health") {
        const budgetQ = answerSummary.find((a) => a.question.toLowerCase().includes("budget"))
        if (budgetQ && budgetQ.answer === "high") {
            recommendations.push("High budget preference — present premium plan options")
        }
    }

    return {
        customerName,
        templateName: instance.template.name,
        lineOfBusiness: lob,
        answerSummary,
        needsIdentified: needsIdentified.length > 0 ? needsIdentified : ["No critical needs flagged from responses"],
        recommendations: recommendations.length > 0 ? recommendations : ["Follow up to discuss policy options"],
        missingCoverage: missingLines.map((ml) => ({ lob: ml.lob, label: ml.label.en, essential: ml.essential })),
    }
}
