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
        label: { en: 'Low risk', el: 'Χαμηλός κίνδυνος' },
        color: 'text-black/75 dark:text-white/80',
        bg: 'bg-black/5 dark:bg-white/10',
        border: 'border-black/10 dark:border-white/15',
        accent: 'bg-black/35'
    },
    medium: {
        label: { en: 'Attention needed', el: 'Χρειάζεται έλεγχος' },
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-100 dark:border-amber-800',
        accent: 'bg-amber-500'
    },
    high: {
        label: { en: 'High risk', el: 'Υψηλός κίνδυνος' },
        color: 'text-orange-700 dark:text-orange-300',
        bg: 'bg-orange-50 dark:bg-orange-900/30',
        border: 'border-orange-100 dark:border-orange-800',
        accent: 'bg-orange-500'
    },
    critical: {
        label: { en: 'Critical gap', el: 'Κρίσιμο κενό' },
        color: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-100 dark:border-red-800',
        accent: 'bg-red-500'
    }
}

/** Section labels, in the same `{en, el}[language]` shape as SEVERITY_CONFIG above
 *  (this component takes `language` as a prop rather than reading the context). */
const COPY = {
    whyItMatters: { en: 'Why this matters', el: 'Γιατί έχει σημασία' },
    whatWeChecked: { en: 'What we checked', el: 'Τι ελέγξαμε' },
    plusFeature: { en: 'Full analysis available on Plus/Pro', el: 'Πλήρης ανάλυση διαθέσιμη σε Plus/Pro' },
} as const

export function InsightCard({ insight, onAction, language = 'el', collapsed = false }: InsightCardProps) {
    void collapsed
    const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
    const Icon = TYPE_ICONS[insight.type] || TYPE_ICONS.other

    return (
        <div className={`relative bg-white dark:bg-black rounded-2xl border transition-all duration-200 hover:shadow-md overflow-hidden ${config.border} border-l-4 shadow-sm`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

            <div className="p-5">
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0 border border-black/10 dark:border-white/15">
                        <Icon className="w-5 h-5 text-black/65 dark:text-white/75" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-kicker font-semibold uppercase tracking-widest text-black/50 dark:text-white/60">
                                {insight.type.toUpperCase()}
                            </span>
                            <span className={`text-kicker font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                                {config.label[language]}
                            </span>
                            {insight.isPlusFeature && (
                                <span className="text-kicker font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border border-primary/30 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    PLUS
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-black dark:text-white leading-tight">{insight.title}</h3>
                    </div>
                </div>

                {insight.isPlusFeature ? (
                    <div className="rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 px-4 py-5 text-center space-y-3">
                        <Lock className="w-6 h-6 mx-auto text-black/35 dark:text-white/40" />
                        <p className="text-sm text-black/55 dark:text-white/60">
                            {language === 'el'
                                ? 'Αναβάθμισε για να δεις ανάλυση και προτεινόμενες ενέργειες.'
                                : 'Upgrade to see the full analysis and recommended actions.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/10 dark:border-white/15">
                            <div className="flex gap-2.5">
                                <Info className="w-4 h-4 text-black/45 dark:text-white/55 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="text-kicker font-semibold text-black/45 dark:text-white/55 uppercase tracking-widest block mb-1">
                                        {COPY.whyItMatters[language]}
                                    </span>
                                    <p className="text-black/80 dark:text-white/80 text-sm leading-relaxed">{insight.whyItMatters}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <span className="text-kicker font-semibold text-black/45 dark:text-white/55 uppercase tracking-widest block mb-2">
                                {COPY.whatWeChecked[language]}
                            </span>
                            <div className="space-y-2">
                                {insight.checkedItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 text-sm text-black/70 dark:text-white/70">
                                        <div className="w-5 h-5 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-mint" />
                                        </div>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => onAction('primary', insight.id, insight.primaryAction.label)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-primary text-white dark:text-[#1A2420] rounded-xl text-sm font-semibold shadow-sm hover:bg-primary-hover transition-colors cursor-pointer"
                        >
                            <span>{insight.primaryAction.label}</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            {insight.secondaryActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onAction('secondary', insight.id, action.label)}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${idx === 0
                                        ? 'bg-white dark:bg-black border-black/15 dark:border-white/20 text-black dark:text-white'
                                        : 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/15 text-black/60 dark:text-white/60'
                                        }`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        {insight.microcopy && (
                            <div className="flex justify-center">
                                <span className="text-kicker font-medium text-black/45 dark:text-white/55 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" />
                                    {insight.microcopy}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {insight.isPlusFeature && (
                <div className="bg-black/5 dark:bg-white/10 px-5 py-2 border-t border-black/10 dark:border-white/15 flex justify-center">
                    <span className="text-kicker font-semibold text-black/45 dark:text-white/55">
                        {COPY.plusFeature[language]}
                    </span>
                </div>
            )}
        </div>
    )
}
