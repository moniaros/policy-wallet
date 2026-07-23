"use client"

import { useLanguage } from '@/contexts/LanguageContext'
import { WarningIcon, InfoIcon, LightBulbIcon, PlusIcon } from '@/components/icons/PolicyIcons'

export interface GapRecommendation {
    gapType: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    estimatedCost?: number
    icon?: string
}

interface GapRecommendationCardProps {
    gap: GapRecommendation
    onAddCoverage?: () => void
}

/** Card copy in the `{el, en}[language]` shape used across the gaps components. */
const COPY = {
    highPriority: { el: 'Υψηλή Προτεραιότητα', en: 'High Priority' },
    mediumPriority: { el: 'Μέτρια Προτεραιότητα', en: 'Medium Priority' },
    lowPriority: { el: 'Χαμηλή Προτεραιότητα', en: 'Low Priority' },
    estimatedFrom: { el: 'Εκτιμώμενο κόστος από', en: 'Estimated from' },
    perYear: { el: '/έτος', en: '/year' },
    addCoverageFor: { el: 'Προσθήκη κάλυψης για', en: 'Add coverage for' },
    addCoverage: { el: 'Προσθήκη Κάλυψης', en: 'Add Coverage' },
} as const

export function GapRecommendationCard({ gap, onAddCoverage }: GapRecommendationCardProps) {
    const { language } = useLanguage()
    const lang = language as 'el' | 'en'

    const getPriorityStyles = () => {
        switch (gap.priority) {
            case 'high':
                return {
                    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
                    icon: <WarningIcon className="w-6 h-6 text-red-600 dark:text-red-400" />,
                    label: COPY.highPriority[lang]
                }
            case 'medium':
                return {
                    container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                    icon: <InfoIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
                    label: COPY.mediumPriority[lang]
                }
            case 'low':
                return {
                    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                    icon: <LightBulbIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                    label: COPY.lowPriority[lang]
                }
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-GB', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const styles = getPriorityStyles()

    return (
        <div className={`border-2 rounded-2xl p-4 ${styles.container}`}>
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center">
                    {gap.icon || styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-stone-900 dark:text-white mb-1">
                        {gap.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full ${styles.badge}`}>
                        {styles.label}
                    </span>
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-stone-700 dark:text-stone-300 mb-3">
                {gap.description}
            </p>

            {/* Estimated Cost */}
            {gap.estimatedCost && (
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
                    {COPY.estimatedFrom[lang]} <span className="font-bold">{formatCurrency(gap.estimatedCost)}</span>{COPY.perYear[lang]}
                </p>
            )}

            {/* Action Button */}
            <button
                onClick={onAddCoverage}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] ${gap.priority === 'high'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : gap.priority === 'medium'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                aria-label={`${COPY.addCoverageFor[lang]} ${gap.title}`}
            >
                <PlusIcon className="w-5 h-5" />
                {COPY.addCoverage[lang]}
            </button>
        </div>
    )
}
