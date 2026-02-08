import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { QuestionnaireForm } from "@/components/tasks/QuestionnaireForm"
import { getTranslations } from "@/lib/i18n"

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { dbUser } = await getAuthenticatedUser()

    const task = await db.questionnaireInstance.findUnique({
        where: { id },
        include: {
            template: true,
            sender: {
                select: { name: true }
            }
        }
    })

    if (!task || task.sentToUserId !== dbUser.id || task.status !== 'pending') {
        notFound()
    }

    const t = getTranslations(dbUser.preferredLanguage as 'en' | 'el' || 'el')

    return (
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
            <div className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1 bg-stone-100 dark:bg-stone-900 text-stone-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-stone-200 dark:border-stone-800">
                        {t.tasks.actionRequired}
                    </div>
                    <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4">
                    {t.tasks.assessingRisk} <span className="text-stone-400 dark:text-stone-500 italic">{t.tasks.riskProfile}</span>
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-lg leading-relaxed max-w-2xl">
                    {t.tasks.helpDetectGaps.replace('{name}', task.sender.name || '')}
                </p>
            </div>

            <QuestionnaireForm
                instanceId={task.id}
                templateName={task.template.name}
                questions={task.template.questions as any}
            />
        </div>
    )
}
