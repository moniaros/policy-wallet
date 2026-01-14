import { Policy } from './types'
import { QrCode, Shield, Zap, Home, Heart } from 'lucide-react'

interface WalletPassPreviewProps {
    policy: Policy
    holderName: string
    plateNumber?: string
}

export function WalletPassPreview({ policy, holderName, plateNumber }: WalletPassPreviewProps) {
    const getGradient = (type: string) => {
        switch (type) {
            case 'health':
                return 'from-rose-500 via-pink-600 to-purple-700'
            case 'home':
                return 'from-emerald-500 via-teal-600 to-cyan-700'
            case 'motor':
                return 'from-blue-600 via-indigo-700 to-slate-800'
            default:
                return 'from-stone-700 via-stone-800 to-stone-900'
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'health':
                return <Heart className="w-6 h-6 text-white/90" />
            case 'home':
                return <Home className="w-6 h-6 text-white/90" />
            case 'motor':
                return <Zap className="w-6 h-6 text-white/90" />
            default:
                return <Shield className="w-6 h-6 text-white/90" />
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        const d = new Date(dateStr)
        return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`
    }

    return (
        <div className="perspective-1000 w-full max-w-sm mx-auto">
            <div className={`
                relative aspect-[1.586/1] w-full rounded-2xl p-6 shadow-2xl overflow-hidden
                bg-gradient-to-br ${getGradient(policy.lineOfBusiness)}
                text-white transition-transform hover:scale-105 duration-300
                border border-white/10
            `}>
                {/* Background Patterns */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                {/* Glass sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                {/* Card Content */}
                <div className="relative h-full flex flex-col justify-between z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                {getTypeIcon(policy.lineOfBusiness)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight tracking-wide text-shadow-sm">
                                    {policy.insurerName}
                                </h3>
                                <p className="text-[10px] font-medium tracking-widest uppercase opacity-80">
                                    {policy.lineOfBusiness} Protection
                                </p>
                            </div>
                        </div>
                        {/* EMV Chip Simulation */}
                        <div className="w-10 h-8 rounded bg-gradient-to-br from-amber-200 to-amber-400 border border-amber-500/50 relative overflow-hidden opacity-90">
                            <div className="absolute inset-0 border-[0.5px] border-black/20 rounded-sm" />
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20" />
                            <div className="absolute left-1/3 top-0 h-full w-[1px] bg-black/20" />
                            <div className="absolute right-1/3 top-0 h-full w-[1px] bg-black/20" />
                        </div>
                    </div>

                    {/* Middle: Policy Number & Plate */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">Policy Number</p>
                                <p className="font-mono text-xl tracking-widest text-shadow-sm">
                                    {policy.policyNumber}
                                </p>
                            </div>

                            {plateNumber && (
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">Plate No</p>
                                    <div className="flex items-center gap-1 justify-end">
                                        <span className="bg-blue-700 text-white text-[8px] font-bold px-1 rounded-sm border border-blue-800 shadow-sm">GR</span>
                                        <p className="font-mono text-lg font-bold tracking-wider text-shadow-sm">
                                            {plateNumber}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!plateNumber && (
                                <svg className="w-6 h-6 text-white/50" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.3" />
                                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest opacity-60 font-semibold mb-0.5">Card Holder</p>
                            <p className="font-medium tracking-wide text-sm truncate max-w-[140px]">
                                {holderName.toUpperCase()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest opacity-60 font-semibold mb-0.5">Expires</p>
                            <p className="font-mono font-medium tracking-wide text-sm">
                                {formatDate(policy.endDate)}
                            </p>
                        </div>
                        <div className="hidden sm:block">
                            <QrCode className="w-8 h-8 text-white/80" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Reflection effect */}
            <div className="mx-auto w-[90%] h-4 bg-black/20 blur-xl rounded-full mt-2" />
        </div>
    )
}
