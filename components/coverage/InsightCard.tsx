import { CheckCircle2, ChevronRight, Info, Shield, Car, HeartPulse, Home, Briefcase, Lock } from 'lucide-react'

export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface InsightAction {
    label: string
    type: 'primary' | 'secondary'
    action?: string
}

export interface InsightData {
    id: string
    type: 'motor' | 'health' | 'home' | 'life' | 'other'
    title: string
    whyItMatters: string
    severity: InsightSeverity
    checkedItems: string[]
    primaryAction: InsightAction
    secondaryActions: InsightAction[]
    microcopy?: string
    isPlusFeature?: boolean
}

interface InsightCardProps {
    insight: InsightData
    onAction: (actionType: string, insightId: string, actionLabel: string) => void
    language?: 'el' | 'en'
    collapsed?: boolean
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    motor: Car,
    health: HeartPulse,
    home: Home,
    life: Shield,
    other: Briefcase,
}

const SEVERITY_CONFIG = {
    low: {
        label: { en: 'Low Risk', el: '?aµ???? ???d????' },
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-100 dark:border-blue-800',
        accent: 'bg-blue-500'
    },
    medium: {
        label: { en: 'Attention Needed', el: '????e? ???s????' },
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-100 dark:border-amber-800',
        accent: 'bg-amber-500'
    },
    high: {
        label: { en: 'High Risk', el: '?????? ???d????' },
        color: 'text-orange-700 dark:text-orange-300',
        bg: 'bg-orange-50 dark:bg-orange-900/30',
        border: 'border-orange-100 dark:border-orange-800',
        accent: 'bg-orange-500'
    },
    critical: {
        label: { en: 'Critical Gap', el: '???s?µ? ?e??' },
        color: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-900/30',
        border: 'border-rose-100 dark:border-rose-800',
        accent: 'bg-rose-500'
    }
}

export function InsightCard({ insight, onAction, language = 'el', collapsed = false }: InsightCardProps) {
    void collapsed
    const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
    const Icon = TYPE_ICONS[insight.type] || TYPE_ICONS.other

    return (
        <div className={`relative bg-white dark:bg-stone-900 rounded-2xl border transition-all duration-300 hover:shadow-lg group overflow-hidden ${config.border} border-l-4 cursor-pointer`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

            <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 shadow-sm border border-stone-100 dark:border-stone-700">
                        <Icon className="w-6 h-6 text-stone-600 dark:text-stone-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                                {insight.type.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                                {config.label[language]}
                            </span>
                            {insight.isPlusFeature && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-100 dark:border-violet-800 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    PLUS
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 dark:text-white leading-tight">
                            {insight.title}
                        </h3>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="relative overflow-hidden bg-stone-50/80 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                                    {language === 'el' ? 'G?at? ??e? s?µas?a' : 'Why this matters'}
                                </span>
                                <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed font-medium">
                                    {insight.whyItMatters}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-3">
                            {language === 'el' ? '?? e????aµe' : 'What we checked'}
                        </span>
                        <div className="space-y-2">
                            {insight.checkedItems.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2.5 text-sm text-stone-600 dark:text-stone-400 group/item">
                                    <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="group-hover/item:text-stone-900 dark:group-hover/item:text-stone-200 transition-colors">
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => onAction('primary', insight.id, insight.primaryAction.label)}
                                className="w-full flex items-center justify-between px-5 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all group/btn"
                            >
                                <span>{insight.primaryAction.label}</span>
                                <span className="bg-white/20 dark:bg-stone-900/10 rounded-full p-1 group-hover/btn:bg-white/30 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                {insight.secondaryActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onAction('secondary', insight.id, action.label)}
                                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-colors border ${idx === 0
                                                ? 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300'
                                                : 'bg-transparent border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
                                            }`}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {insight.microcopy && (
                            <div className="mt-4 flex justify-center">
                                <span className="text-[10px] font-medium text-stone-400 bg-stone-50 dark:bg-stone-800/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" />
                                    {insight.microcopy}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {insight.isPlusFeature && (
                <div className="bg-stone-50 dark:bg-stone-800/30 px-6 py-2 border-t border-stone-100 dark:border-stone-800 flex justify-center">
                    <span className="text-[10px] font-bold text-stone-400">
                        {language === 'el' ? '?????µ??? a????s? d?a??s?µ? se Plus/Pro' : 'Advanced analysis available on Plus/Pro'}
                    </span>
                </div>
            )}
        </div>
    )
}

