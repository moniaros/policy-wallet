export const runtime = 'nodejs'

import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { QuestionnaireForm } from "@/components/tasks/QuestionnaireForm"
import { CheckCircle2 } from "lucide-react"
import { getTranslations } from "@/lib/i18n"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

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
    const lang = resolveUserLanguage(dbUser.preferredLanguage)
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
            <div className="pw-page-shell">
                <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                    <section className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15" aria-hidden="true">
                            <CheckCircle2 className="h-7 w-7 text-primary dark:text-mint" />
                        </span>
                        <h1 className="mt-4 text-title font-semibold text-foreground">{instance.template.name}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{t.agentUi.responsesSubmitted}</p>
                        <Link href="/protection" className="pw-primary-button mt-5">
                            {t.tasks.viewCoverageInsights}
                        </Link>
                    </section>
                </div>
            </div>
        )
    }

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.tasks.actionCenter}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.tasks.manageTasks}</p>
                </div>
                <QuestionnaireForm
                    instanceId={instance.id}
                    templateName={instance.template.name}
                    questions={questions}
                />
            </div>
        </div>
    )
}
