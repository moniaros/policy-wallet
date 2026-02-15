"use client"

import { ArrowRight, Briefcase } from "lucide-react"

import { updateAgentProfile } from "@/app/onboarding/agent/actions"
import { useSession } from "next-auth/react"
import { useState } from "react"

interface StepProps {
    onNext: () => void
}

export function AgentWelcomeStep({ onNext }: StepProps) {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [agencyName, setAgencyName] = useState("Test Agency Local")
    const [title, setTitle] = useState("")

    const handleNext = async () => {
        if (!session?.user?.id) return

        setIsLoading(true)
        const result = await updateAgentProfile(session.user.id, {
            agencyName,
            // title is not in schema yet, adding just agencyName
        })

        setIsLoading(false)
        if (result.success) {
            onNext()
        }
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
                <Briefcase className="w-8 h-8 text-white" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Let's set up your office.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Define your professional profile to build trust with clients and enable branded reports.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Professional Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Senior Insurance Advisor"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agency Name</label>
                        <input
                            type="text"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "Saving..." : <><span className="mr-1">Start Setup</span> <ArrowRight className="w-5 h-5" /></>}
            </button>
        </div>
    )
}
