import { Metadata } from 'next'
import AgentOnboardingFlow from './AgentOnboardingFlow'
import { LeftColumnContent } from './LeftColumnContent'

export const metadata: Metadata = {
    title: 'Agent Setup | PolicyWallet',
    description: 'Professional setup for insurance agents.',
}

export default function AgentOnboardingPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
            {/* Left Column: Value Prop & Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 z-0 opacity-20">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <h1 className="text-2xl font-bold tracking-tight">PolicyWallet <span className="text-emerald-400">Pro</span></h1>
                </div>

                <div className="relative z-10 max-w-lg">
                    <LeftColumnContent />
                </div>

                <div className="relative z-10 text-sm text-slate-500">
                    © 2026 PolicyWallet Pro
                </div>
            </div>

            {/* Right Column: Interactive Flow */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                <AgentOnboardingFlow />
            </div>
        </div>
    )
}
