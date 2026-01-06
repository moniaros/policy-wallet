import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { GapList } from "@/components/gaps/GapList"
import { detectGapsForUser, createGapInstances } from "@/lib/gap-detection"

export default async function CoverageInsightsPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect("/auth/signin")
    }

    // 1. Detect gaps for the user
    const detectedGaps = await detectGapsForUser(session.user.id)

    // 2. Create gap instances in the DB (won't duplicate existing ones)
    if (detectedGaps.length > 0) {
        await createGapInstances(detectedGaps)
    }

    // 3. Fetch all current gap instances for this user's policies
    const gapInstances = await db.gapInstance.findMany({
        where: {
            policy: {
                ownerUserId: session.user.id
            },
            status: {
                in: ['detected', 'acknowledged', 'open']
            }
        },
        include: {
            definition: true
        },
        orderBy: {
            severity: 'asc' // Critical first usually if mapped properly, but let's stick to detectedAt for now or severity
        }
    })

    // Grouping for some stats
    const criticalGaps = gapInstances.filter(g => g.severity === 'critical').length
    const highGaps = gapInstances.filter(g => g.severity === 'high').length

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
            <div className="relative mb-20 overflow-hidden bg-stone-900 dark:bg-stone-950 rounded-[40px] p-8 md:p-16 text-white shadow-2xl">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-10 h-0.5 bg-teal-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500">Intelligence Report</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[0.9]">
                            Your Coverage <br />
                            <span className="text-stone-500 italic">Analyzed.</span>
                        </h1>
                        <p className="text-stone-400 text-lg max-w-xl leading-relaxed">
                            Our proprietary engine scanned your entire portfolio. We identified {gapInstances.length} areas where your protection could be optimized.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-stone-800/50 backdrop-blur-md border border-stone-700/50 p-6 rounded-[32px]">
                            <span className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Critical</span>
                            <span className="text-4xl font-black text-red-500">{criticalGaps}</span>
                        </div>
                        <div className="bg-stone-800/50 backdrop-blur-md border border-stone-700/50 p-6 rounded-[32px]">
                            <span className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">High Risk</span>
                            <span className="text-4xl font-black text-amber-500">{highGaps}</span>
                        </div>
                        <div className="bg-stone-800/50 backdrop-blur-md border border-stone-700/50 p-6 rounded-[32px] col-span-2">
                            <span className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Health Score</span>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-black transition-all">
                                    {Math.max(0, 100 - (criticalGaps * 20 + highGaps * 10))}%
                                </span>
                                <span className="text-stone-500 text-xs font-bold mb-1">Portfolio Rating</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-24">
                <section>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight mb-2">Detected Gaps</h2>
                            <p className="text-stone-500 font-medium">Prioritize these actions to minimize your exposure.</p>
                        </div>
                        <div className="px-5 py-2 bg-stone-100 dark:bg-stone-900 text-stone-500 text-xs font-black uppercase tracking-widest rounded-full border border-stone-200 dark:border-stone-800">
                            {gapInstances.length} Points of Interest
                        </div>
                    </div>

                    <GapList gaps={gapInstances} />
                </section>

                <section className="bg-stone-50 dark:bg-stone-900/50 rounded-[48px] p-12 lg:p-20 border border-stone-100 dark:border-stone-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 blur-[100px] rounded-full" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                        <div>
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4 block">Engine Methodology</span>
                            <h3 className="text-4xl font-black text-stone-900 dark:text-white mb-8 tracking-tighter">Precision in Every Byte.</h3>

                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="shrink-0 w-12 h-12 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-700 font-black">01</div>
                                    <div>
                                        <h4 className="font-black text-stone-900 dark:text-white mb-1">Protection Benchmarks</h4>
                                        <p className="text-stone-500 text-sm leading-relaxed">We compare your active coverage against hundreds of risk models tailored to your specific life stage and location.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="shrink-0 w-12 h-12 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-700 font-black">02</div>
                                    <div>
                                        <h4 className="font-black text-stone-900 dark:text-white mb-1">Severity Weighting</h4>
                                        <p className="text-stone-500 text-sm leading-relaxed">Risks are weighted by potential financial impact, ensuring you focus on what matters most for your wealth preservation.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="shrink-0 w-12 h-12 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-900 dark:text-white shadow-sm border border-stone-100 dark:border-stone-700 font-black">03</div>
                                    <div>
                                        <h4 className="font-black text-stone-900 dark:text-white mb-1">Human-in-the-Loop</h4>
                                        <p className="text-stone-500 text-sm leading-relaxed">Our AI suggestions are verified by senior advisors once you acknowledge them, providing a hybrid path to safety.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center lg:justify-end">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-teal-500/20 blur-3xl rounded-full group-hover:bg-teal-500/30 transition-all duration-700" />
                                <div className="relative w-80 h-80 bg-stone-900 dark:bg-stone-800 rounded-[64px] flex items-center justify-center text-teal-500 border border-stone-700 dark:border-stone-600 shadow-2xl transition-transform duration-700 hover:rotate-2 hover:scale-105">
                                    <svg className="w-40 h-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div className="absolute -bottom-6 -right-6 bg-white dark:bg-stone-900 p-6 rounded-[32px] shadow-xl border border-stone-100 dark:border-stone-700 text-stone-900 dark:text-white">
                                        <span className="block text-[8px] font-black uppercase tracking-[0.2em] mb-1">Secure Scan</span>
                                        <span className="text-xs font-black">256-bit Encrypted</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
