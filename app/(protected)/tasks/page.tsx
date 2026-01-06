import { getPendingQuestionnaires } from "./actions"
import Link from "next/link"

export default async function TasksPage() {
    const pendingTasks = await getPendingQuestionnaires()

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <header className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-1 bg-stone-900 dark:bg-white rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Action Center</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Daily <span className="text-stone-400 dark:text-stone-500 italic">Review</span>
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl leading-relaxed">
                        Improve your coverage score by completing these small requests from your dedicated insurance advisor.
                    </p>
                </header>

                {pendingTasks.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-3xl p-6 flex items-center gap-6">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Attention</span>
                            <span className="text-lg font-black text-amber-900 dark:text-amber-100">{pendingTasks.length} Pending Actions</span>
                        </div>
                    </div>
                )}
            </div>

            {pendingTasks.length === 0 ? (
                <div className="bg-white dark:bg-stone-800 rounded-[40px] p-20 text-center border border-stone-100 dark:border-stone-700 shadow-xl shadow-stone-100/50 dark:shadow-none">
                    <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 rounded-[32px] flex items-center justify-center mx-auto mb-8 relative">
                        <div className="absolute inset-0 bg-teal-500/10 blur-xl rounded-full" />
                        <svg className="w-10 h-10 text-teal-600 dark:text-teal-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-3 tracking-tight">Everything is perfect!</h2>
                    <p className="text-stone-500 dark:text-stone-400 max-w-xs mx-auto text-sm leading-relaxed">You&apos;ve completed all outstanding requests. We&apos;ll notify you when new insights are available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {pendingTasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-white dark:bg-stone-800 rounded-[36px] p-8 md:p-10 border border-stone-100 dark:border-stone-700 shadow-xl shadow-stone-100/50 dark:shadow-none hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 group relative overflow-hidden"
                        >
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-700 flex items-center justify-center">
                                            {task.template.lineOfBusiness === 'motor' ? (
                                                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth="2" /></svg>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                                            {task.template.lineOfBusiness} Questionnaire
                                        </span>
                                    </div>

                                    <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight mb-4 group-hover:text-amber-600 transition-colors">
                                        {task.template.name}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-900/50 pr-4 pl-1.5 py-1.5 rounded-full border border-stone-100 dark:border-stone-700">
                                            <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                                                {task.sender.image ? (
                                                    <img src={task.sender.image} alt={task.sender.name || ''} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-black text-[10px] text-stone-500">
                                                        {task.sender.name?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 italic">{task.sender.name}</span>
                                        </div>
                                        <span className="text-xs text-stone-400 font-medium">
                                            Received {new Date(task.sentAt).toLocaleDateString('el-GR')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3">
                                    <Link
                                        href={`/tasks/${task.id}`}
                                        className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-10 py-5 rounded-2xl text-sm font-black hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-all text-center shadow-xl shadow-stone-900/10 hover:shadow-amber-500/30 active:scale-95"
                                    >
                                        START ASSESSMENT
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
