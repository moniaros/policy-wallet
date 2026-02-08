"use client"

import { useState } from "react"
import { submitQuestionnaireResponse } from "@/app/(protected)/tasks/actions"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { CheckCircle2, Save } from "lucide-react"

interface Question {
    id: string
    type: 'text' | 'boolean' | 'number' | 'select'
    label: string
    required?: boolean
    options?: string[]
}

interface QuestionnaireFormProps {
    instanceId: string
    templateName: string
    questions: Question[]
}

export function QuestionnaireForm({ instanceId, templateName, questions }: QuestionnaireFormProps) {
    const { t, language } = useLanguage()
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const router = useRouter()

    const answeredCount = Object.keys(answers).length
    const totalCount = questions.length
    const progress = Math.round((answeredCount / totalCount) * 100)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await submitQuestionnaireResponse(instanceId, answers)
            setIsSuccess(true)
            setTimeout(() => {
                router.push("/tasks")
                router.refresh()
            }, 2000)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full scale-125 animate-pulse" />
                    <CheckCircle2 className="w-12 h-12 text-teal-600 relative z-10" />
                </div>
                <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-2 tracking-tight">
                    {language === 'el' ? 'Ευχαριστούμε!' : 'Thank You!'}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 font-medium">
                    {language === 'el' ? 'Οι απαντήσεις σας υποβλήθηκαν με επιτυχία.' : 'Your responses have been successfully submitted.'}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Progress Header */}
            <div className="bg-white/50 dark:bg-stone-800/50 backdrop-blur-xl rounded-3xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t.tasks.completion}</span>
                        <span className="text-xs font-black text-stone-900 dark:text-white">{progress}%</span>
                    </div>
                    <div className="h-2 bg-stone-100 dark:bg-stone-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-teal-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(20,184,166,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-stone-400">{t.tasks.questions}</span>
                    <span className="text-lg font-black text-stone-900 dark:text-white">{answeredCount}/{totalCount}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-800 rounded-[40px] p-8 md:p-16 border border-stone-200 dark:border-stone-700 shadow-2xl shadow-stone-200/50 dark:shadow-none relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />

                <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-12 tracking-tight flex items-center gap-4">
                    {templateName}
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                </h2>

                <div className="space-y-16">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="group space-y-6 relative">
                            <div className="flex items-start gap-6">
                                <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 flex items-center justify-center text-xs font-black text-stone-400 group-hover:border-teal-500 group-hover:text-teal-500 transition-all duration-300 mt-1">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 space-y-6">
                                    <label className="block text-xl font-bold text-stone-800 dark:text-stone-200 leading-tight tracking-tight">
                                        {q.label}
                                        {q.required && <span className="text-teal-500 ml-1.5">*</span>}
                                    </label>

                                    {q.type === 'boolean' && (
                                        <div className="flex gap-4 max-w-sm">
                                            <button
                                                type="button"
                                                onClick={() => setAnswers({ ...answers, [q.id]: true })}
                                                className={`flex-1 py-5 rounded-2xl font-black text-sm border-2 transition-all duration-300 ${answers[q.id] === true
                                                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white shadow-lg'
                                                    : 'bg-white dark:bg-stone-900 text-stone-400 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
                                                    }`}
                                            >
                                                {t.common.yes.toUpperCase()}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAnswers({ ...answers, [q.id]: false })}
                                                className={`flex-1 py-5 rounded-2xl font-black text-sm border-2 transition-all duration-300 ${answers[q.id] === false
                                                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white shadow-lg'
                                                    : 'bg-white dark:bg-stone-900 text-stone-400 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
                                                    }`}
                                            >
                                                {t.common.no.toUpperCase()}
                                            </button>
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <input
                                            type="text"
                                            required={q.required}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            className="w-full bg-stone-50/50 dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl px-8 py-5 focus:border-teal-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition-all text-stone-900 dark:text-white font-medium placeholder:text-stone-300"
                                            placeholder={t.tasks.typeAnswer}
                                        />
                                    )}

                                    {q.type === 'number' && (
                                        <input
                                            type="number"
                                            required={q.required}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: parseInt(e.target.value) })}
                                            className="w-full max-w-xs bg-stone-50/50 dark:bg-stone-900 border-2 border-stone-100 dark:border-stone-800 rounded-2xl px-8 py-5 focus:border-teal-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition-all text-stone-900 dark:text-white font-medium placeholder:text-stone-300"
                                            placeholder="0"
                                        />
                                    )}

                                    {q.type === 'select' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {q.options?.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                                    className={`py-4 px-6 rounded-2xl text-xs font-black border-2 transition-all duration-300 ${answers[q.id] === opt
                                                        ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/20'
                                                        : 'bg-stone-50/50 dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-500 hover:border-stone-200 dark:hover:border-stone-700'
                                                        }`}
                                                >
                                                    {opt.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 pt-10 border-t border-stone-100 dark:border-stone-700 flex flex-col md:flex-row items-center justify-between gap-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-stone-400 font-bold hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-2 group"
                    >
                        <Save className="w-5 h-5 group-hover:-translate-y-1 transition-transform" strokeWidth={2.5} />
                        {t.tasks.saveForLater}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || progress < 50}
                        className="w-full md:w-auto bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-16 py-6 rounded-[24px] text-lg font-black hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-stone-900/20 dark:shadow-none disabled:opacity-50 disabled:scale-100 group flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.tasks.submitting}
                            </>
                        ) : (
                            <>
                                {t.tasks.completeSubmission}
                                <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
