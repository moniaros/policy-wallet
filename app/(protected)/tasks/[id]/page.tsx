export const runtime = 'nodejs'

import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { QuestionnaireForm } from "@/components/tasks/QuestionnaireForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { getTranslations } from "@/lib/i18n"

interface TemplateQuestionOption {
    label: string
    labelEl?: string
    value: string
}

interface TemplateQuestion {
    id: string
    type: 'text' | 'number' | 'boolean' | 'select'
    label: string
    labelEl?: string
    required?: boolean
    options?: TemplateQuestionOption[]
}

/**
 * Answer a single questionnaire the customer was sent. Previously this route
 * ignored its [id] param and re-rendered the tasks list, so the questionnaire
 * form was unreachable — a questionnaire an agent sent was a dead link. It now
 * resolves the instance, enforces recipient-ownership, and renders the form.
 */
export default async function TaskDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as 'en' | 'el') || 'el'
    const t = getTranslations(lang)

    const instance = await db.questionnaireInstance.findUnique({
        where: { id },
        select: {
            id: true,
            status: true,
            sentToUserId: true,
            template: { select: { name: true, questions: true } },
        },
    })

    // Only the intended recipient may answer their own questionnaire; anything
    // else (missing, or someone else's) is a 404.
    if (!instance || instance.sentToUserId !== dbUser.id) notFound()

    const rawQuestions = Array.isArray(instance.template.questions)
        ? (instance.template.questions as unknown as TemplateQuestion[])
        : []

    // Resolve each question to the recipient's language for the client form,
    // which takes a flat { id, type, label, options: string[] } shape.
    const questions = rawQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        label: lang === 'el' && q.labelEl ? q.labelEl : q.label,
        required: q.required,
        options: q.options?.map((o) => (lang === 'el' && o.labelEl ? o.labelEl : o.label)),
    }))

    if (instance.status === 'completed') {
        return (
            <div className="min-h-screen bg-transparent">
                <PageHeader title={instance.template.name} subtitle={t.tasks.manageTasks} />
                <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
                    <p className="text-lg font-semibold text-foreground">{t.agentUi.responsesSubmitted}</p>
                    <Link
                        href="/protection"
                        className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-sm font-black text-primary-foreground transition-transform hover:scale-[1.02]"
                    >
                        {t.tasks.viewCoverageInsights}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent">
            <PageHeader title={t.tasks.actionCenter} subtitle={t.tasks.manageTasks} />
            <div className="max-w-4xl mx-auto px-4 py-8">
                <QuestionnaireForm
                    instanceId={instance.id}
                    templateName={instance.template.name}
                    questions={questions}
                />
            </div>
        </div>
    )
}
