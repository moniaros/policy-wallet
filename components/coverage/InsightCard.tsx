import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { SeverityCaveat } from "@/components/gaps/SeverityCaveat"
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

/* Branch icons come from lib/insurance/branch-icons — the same source the
   wallet, policy table and branch pages use. A private map here meant a life
   policy wore a Landmark in the wallet and a Shield on this screen, and health
   changed between HeartPulse and Heart depending on which card you looked at. */

/**
 * The same four priority tiers the rest of the product uses.
 *
 * These read "Low risk" / "High risk" — literal risk grades — on the very page
 * whose own note says the priorities "are not a definitive risk assessment".
 * The product disclaimed risk assessment in one paragraph and graded risk in the
 * badge beside it. The gap engine produces a profile-based priority; that is
 * what the badge says now.
 */
// One neutral shape for every finding. Severity carries no colour, no chip
// and no emphasis anywhere (PW-TRANSPARENCY-02 B1); the provenance label the
// caller passes as `microcopy` is the only class a card shows.
const NEUTRAL_CONFIG = {
    color: 'text-black/75 dark:text-white/80',
    bg: 'bg-black/5 dark:bg-white/10',
    border: 'border-black/10 dark:border-white/15',
    accent: 'bg-black/35'
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
    const config = NEUTRAL_CONFIG
    // Held on an object: a bare `const Icon = getBranchIcon(...)` reads as
    // creating a component during render to react-hooks/static-components.
    // Same shape PolicyCard uses.
    const glyph = { Icon: getBranchIcon(insight.type) }

    return (
        <div className="pw-card relative overflow-hidden">

            <div className="p-5">
                <div className="flex items-start gap-3 mb-5">
                    <div className="pw-card-chip" aria-hidden="true">
                        <glyph.Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-caption font-semibold text-muted-foreground">
                                {normalizeBranch(insight.type).label[language === 'el' ? 'el' : 'en']}
                            </span>
                            {insight.isPlusFeature && (
                                <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary dark:bg-primary/15 dark:text-mint">
                                    <Lock className="w-3 h-3" />
                                    PLUS
                                </span>
                            )}
                        </div>
                        <h3 className="text-body-lg font-semibold leading-snug tracking-tight text-foreground">{insight.title}</h3>
                    </div>
                </div>

                {insight.isPlusFeature ? (
                    <div className="pw-subcard space-y-3 px-4 py-5 text-center">
                        <Lock className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">
                            {language === 'el'
                                ? 'Αναβάθμισε για να δεις ανάλυση και προτεινόμενες ενέργειες.'
                                : 'Upgrade to see the full analysis and recommended actions.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="pw-subcard p-3">
                            <div className="flex gap-2.5">
                                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div>
                                    <span className="mb-1 block text-caption font-semibold text-muted-foreground">
                                        {COPY.whyItMatters[language]}
                                    </span>
                                    <p className="text-sm leading-relaxed text-foreground">{insight.whyItMatters}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <span className="mb-2 block text-caption font-semibold text-muted-foreground">
                                {COPY.whatWeChecked[language]}
                            </span>
                            <div className="space-y-2">
                                {insight.checkedItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 text-sm text-foreground/80">
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
                            className="pw-soft-button w-full cursor-pointer !justify-between"
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
                                    className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-3 text-caption font-semibold transition-colors ${idx === 0
                                        ? 'border border-border bg-card text-foreground hover:bg-muted'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        {insight.microcopy && (
                            <div className="flex justify-center">
                                <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-caption font-medium text-muted-foreground">
                                    <Shield className="w-3 h-3" />
                                    {insight.microcopy}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {insight.isPlusFeature && (
                <div className="flex justify-center border-t border-border bg-muted/60 px-5 py-2">
                    <span className="text-caption font-semibold text-muted-foreground">
                        {COPY.plusFeature[language]}
                    </span>
                </div>
            )}
            {/* The card prints a verdict word — "Critical priority" — so it carries
                the sentence saying what that word is worth. `lang` is passed
                explicitly: this component takes `language` as a prop and must not
                depend on a LanguageProvider being above it. */}
            <div className="px-5 pb-4">
                <SeverityCaveat lang={language === "el" ? "el" : "en"} className="mt-0" />
            </div>
        </div>
    )
}
