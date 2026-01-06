import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { QuestionnaireForm } from "@/components/tasks/QuestionnaireForm"

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return null

    const task = await db.questionnaireInstance.findUnique({
        where: { id },
        include: {
            template: true,
            sender: {
                select: { name: true }
            }
        }
    })

    if (!task || task.sentToUserId !== session.user.id || task.status !== 'pending') {
        notFound()
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
            <div className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1 bg-stone-100 dark:bg-stone-900 text-stone-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-stone-200 dark:border-stone-800">
                        Action Required
                    </div>
                    <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4">
                    Assessing your <span className="text-stone-400 dark:text-stone-500 italic">Risk Profile</span>
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-lg leading-relaxed max-w-2xl">
                    By providing these details, you help <span className="font-bold text-stone-900 dark:text-white underline decoration-teal-500/30 underline-offset-4">{task.sender.name}</span> detect hidden insurance gaps and optimize your coverage.
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
