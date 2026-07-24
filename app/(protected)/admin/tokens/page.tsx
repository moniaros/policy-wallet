"use client"

import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TokenAnalyticsDashboard } from '@/components/admin/TokenAnalyticsDashboard'

export default function AdminTokensPage() {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {language === 'el' ? 'Διαχείριση Tokens' : 'Token Management'} {/* i18n-hardcoded-ignore — admin-only internal tooling, already bilingual inline */}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-500">
                        {language === 'el'
                            ? 'Παρακολουθήστε τη χρήση, το κόστος και τα περιθώρια κέρδους των AI υπηρεσιών'
                            : 'Monitor usage, costs, and profit margins of AI services'} {/* i18n-hardcoded-ignore — admin-only internal tooling */}
                    </p>
                </div>

                <TokenAnalyticsDashboard language={language} />
            </div>
        </div>
    )
}
