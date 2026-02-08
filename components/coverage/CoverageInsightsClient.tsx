"use client"

import React, { useState } from 'react'
import {
    Shield,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    ArrowRight,
    Lock
} from 'lucide-react'
import { InsightCard, InsightData } from './InsightCard'

interface CoverageInsightsClientProps {
    gaps: any[]
    stats: {
        critical: number
        high: number
        medium: number
        low: number
        healthScore: number
        totalGaps: number
        totalPolicies: number
        totalCoverage: number
    }
    userLanguage: string
    policies?: Array<{
        id: string
        insurerName: string
        lineOfBusiness: { code: string; name: string }
    }>
}

export function CoverageInsightsClient({
    gaps,
    stats,
    userLanguage,
    policies = []
}: CoverageInsightsClientProps) {
    const lang = userLanguage === 'el' ? 'el' : 'en'
    const [hiddenInsights, setHiddenInsights] = useState<Set<string>>(new Set())

    // --- 1. Confidence Logic ---
    const getConfidenceLevel = (score: number) => {
        if (score >= 80) return {
            label: { el: 'ΙΣΧΥΡΗ', en: 'STRONG' },
            desc: { el: 'Η κάλυψή σας είναι ισχυρή. Δεν εντοπίστηκαν σημαντικά κενά.', en: 'Your coverage is strong. No significant gaps detected.' },
            summary: { el: 'Η κάλυψή σας είναι ισχυρή.', en: 'Your coverage is strong.' },
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30'
        }
        if (score >= 50) return {
            label: { el: 'ΕΠΑΡΚΗΣ', en: 'SUFFICIENT' },
            desc: { el: 'Καλύπτεστε στα βασικά, αλλά υπάρχουν 3 σημεία που αξίζει να γνωρίζετε.', en: 'You are covered on basics, but there are 3 points worth knowing.' },
            summary: { el: 'Η κάλυψή σας είναι επαρκής στα βασικά.', en: 'Your coverage is sufficient on basics.' },
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30'
        }
        return {
            label: { el: 'ΑΝΕΠΑΡΚΗΣ', en: 'INSUFFICIENT' },
            desc: { el: 'Υπάρχουν κενά που μπορεί να σας κοστίσουν ακριβά.', en: 'There are gaps that could cost you dearly.' },
            summary: { el: 'Η κάλυψή σας χρειάζεται προσοχή.', en: 'Your coverage needs attention.' },
            color: 'text-red-600',
            bg: 'bg-red-100 dark:bg-red-900/30'
        }
    }

    const confidence = getConfidenceLevel(stats.healthScore)

    // Dynamic Summary Construction
    const visibleGaps = gaps.filter(g => !hiddenInsights.has(g.id))
    const summaryText = visibleGaps.length > 0
        ? `${confidence.summary.el} Υπάρχουν ${visibleGaps.length} σημεία που αξίζει να γνωρίζετε.`
        : `${confidence.summary.el} Δεν εντοπίστηκαν κενά.`

    // --- 2. Data Transformation ---
    const insights: InsightData[] = visibleGaps.map(gap => ({
        id: gap.id,
        type: (gap.policy?.lineOfBusiness || 'other').toLowerCase() as any,
        title: gap.title || 'Gap Detected',
        whyItMatters: gap.description || 'This gap affects your coverage.',
        severity: (gap.severity || 'medium') as any,
        checkedItems: [
            'Όρια κάλυψης συμβολαίου',
            'Νομικές απαιτήσεις',
            'Σενάρια υψηλού κινδύνου'
        ],
        primaryAction: {
            label: 'Κατανόηση επιλογών',
            type: 'primary'
        },
        secondaryActions: [
            { label: 'Συζήτηση με σύμβουλο', type: 'secondary' },
            { label: 'Αγνόηση', type: 'secondary' }
        ],
        microcopy: gap.severity === 'critical' ? 'Συνιστάται άμεση εξέταση' : 'Δεν απαιτείται άμεση ενέργεια',
        isPlusFeature: true // Demo: highlight premium analysis
    }))

    // Handlers
    const handleAction = (type: string, id: string, label: string) => {
        if (label === 'Αγνόηση') {
            setHiddenInsights(prev => new Set(prev).add(id))
            return
        }
        if (type === 'primary') {
            // In a real app, this would perform navigation
            alert(`Opening details for insight: ${id}`)
        } else {
            alert(`Action: ${label} for insight ${id}`)
        }
    }

    // Calculate "What's OK"
    const policiesWithIssues = new Set(gaps.map(g => g.policyId).filter(Boolean))
    const policiesOk = policies.filter(p => !policiesWithIssues.has(p.id))

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* --- 1. Decision Summary --- */}
                <div className="mb-8 text-center">
                    <h1 className="text-xl font-medium text-stone-500 dark:text-stone-400 mb-2">
                        {lang === 'el' ? 'Σύνοψη Κάλυψης' : 'Coverage Summary'}
                    </h1>
                    <p className="text-2xl font-black text-stone-900 dark:text-white leading-tight">
                        {summaryText}
                    </p>
                </div>

                {/* --- 2. Coverage Confidence Indicator --- */}
                <div className={`rounded-3xl p-6 mb-12 flex flex-col items-center text-center ${confidence.bg}`}>
                    <span className={`text-sm font-black uppercase tracking-widest mb-2 ${confidence.color}`}>
                        {confidence.label[lang as 'el' | 'en']}
                    </span>
                    <p className="text-stone-900 dark:text-stone-100 font-medium max-w-sm">
                        {confidence.desc[lang as 'el' | 'en']}
                    </p>
                </div>

                {/* --- 3. What Matters Now (Insights) --- */}
                <div className="mb-12">
                    <h2 className="text-lg font-black text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-stone-900 dark:text-white" />
                        {lang === 'el' ? 'Σημεία που αξίζει να δείτε' : 'Points worth reviewing'}
                    </h2>

                    <div className="space-y-6">
                        {insights.length > 0 ? (
                            insights.slice(0, 3).map((insight) => (
                                <InsightCard
                                    key={insight.id}
                                    insight={insight}
                                    onAction={handleAction}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
                                <Sparkles className="w-8 h-8 text-teal-500 mx-auto mb-3" />
                                <p className="text-stone-900 font-bold">Όλα φαίνονται εντάξει!</p>
                                <p className="text-stone-500 text-sm">Δεν βρέθηκαν σημεία που χρειάζονται την προσοχή σας.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- 4. What's OK (Reassurance) --- */}
                {policiesOk.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 px-2">
                            {lang === 'el' ? 'Τι ελέγξαμε και δεν χρειάζεται ενέργεια' : 'What we checked (No action needed)'}
                        </h3>
                        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
                            {policiesOk.map((policy) => (
                                <div key={policy.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900 dark:text-white text-sm">
                                                {(policy.lineOfBusiness as any)?.name || 'Ασφαλιστήριο'}
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                {policy.insurerName}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-stone-400 bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded">
                                        OK
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- 5. Next Step CTA --- */}
                <div className="pt-8 border-t border-stone-200 dark:border-stone-800 text-center">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-6">
                        {lang === 'el' ? 'Επόμενα βήματα' : 'Next steps'}
                    </h3>
                    <div className="flex flex-col gap-3 max-w-sm mx-auto">
                        <button
                            onClick={() => alert('Flow: Understand All Options')}
                            className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Κατανόηση επιλογών</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={() => alert('Flow: Connect with Advisor')}
                            className="w-full py-4 bg-transparent border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-xl font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                        >
                            Μιλήστε με σύμβουλο
                        </button>
                    </div>
                    <p className="text-xs text-stone-400 mt-6 max-w-xs mx-auto leading-relaxed">
                        Η PolicyWallet δεν λαμβάνει προμήθειες. Οι συμβουλές μας είναι 100% αμερόληπτες.
                    </p>
                </div>

            </div>
        </div>
    )
}
