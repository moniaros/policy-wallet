export const runtime = 'nodejs'

import { requirePayingUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { WalletSummary } from "@/components/coverage/WalletSummary"
import { calculatePortfolioSummary } from "@/lib/policy-status"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react"

export default async function CoveragePage() {
    const { dbUser } = await requirePayingUser()

    const language = dbUser.preferredLanguage === 'el' ? 'el' : 'en'
    const copy = language === 'el'
        ? {
            title: 'Κατανόηση Κάλυψης',
            subtitle: 'Δείτε καθαρά την κατάσταση των συμβολαίων σας και τα επόμενα βήματα.',
            insights: 'Έξυπνες ειδοποιήσεις',
            healthScore: 'Δείκτης υγείας χαρτοφυλακίου',
            recommendations: 'Προτεινόμενες ενέργειες',
            renewalAlert: 'Υπενθύμιση ανανέωσης',
            actionRequired: 'Απαιτείται ενέργεια',
            expiringSoon: 'Συμβόλαια που λήγουν σύντομα',
            allGoodTitle: 'Η κάλυψή σας είναι σε καλή κατάσταση',
            allGoodDesc: 'Όλα τα συμβόλαια είναι ενεργά και δεν απαιτείται άμεση ενέργεια.',
            noPolicies: 'Δεν υπάρχουν ακόμη συμβόλαια',
            noPoliciesDesc: 'Προσθέστε το πρώτο σας συμβόλαιο για να δείτε ανάλυση κάλυψης.',
            addPolicy: 'Προσθήκη ασφαλιστηρίου',
            policies: 'συμβόλαια',
            policy: 'συμβόλαιο',
            activeUpToDate: 'ενεργά και ενημερωμένα',
            reviewRenewals: 'λήγουν σύντομα. Ελέγξτε επιλογές ανανέωσης για να αποφύγετε κενά κάλυψης.',
            needAttention: 'χρειάζονται προσοχή. Συμπληρώστε τα ελλιπή στοιχεία για πλήρη κάλυψη.',
            next30Days: 'λήγουν μέσα στις επόμενες 30 ημέρες. Προχωρήστε σε ανανέωση έγκαιρα.',
        }
        : {
            title: 'Coverage Understanding',
            subtitle: 'Get a clear view of your policy status and your next best actions.',
            insights: 'Smart alerts',
            healthScore: 'Portfolio health score',
            recommendations: 'Recommended actions',
            renewalAlert: 'Renewal alert',
            actionRequired: 'Action required',
            expiringSoon: 'Policies expiring soon',
            allGoodTitle: 'Your coverage is in good shape',
            allGoodDesc: 'All policies are active and no immediate action is required.',
            noPolicies: 'No policies yet',
            noPoliciesDesc: 'Add your first policy to start coverage analysis.',
            addPolicy: 'Add policy',
            policies: 'policies',
            policy: 'policy',
            activeUpToDate: 'active and up to date',
            reviewRenewals: 'expiring soon. Review renewal options to avoid coverage gaps.',
            needAttention: 'need attention. Complete missing information for full coverage.',
            next30Days: 'expire in the next 30 days. Renew early to avoid coverage gaps.',
        }

    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id },
        orderBy: { endDate: 'asc' },
    })

    const summary = calculatePortfolioSummary(policies)
    const healthScore = summary.totalPolicies > 0 ? Math.round((summary.activeCount / summary.totalPolicies) * 100) : 0

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-stone-100">{copy.title}</h1>
                <p className="text-stone-600 dark:text-stone-400">{copy.subtitle}</p>
            </div>

            <WalletSummary summary={summary} />

            {summary.totalPolicies > 0 && (
                <div className="mt-8 space-y-6">
                    <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-teal-600" />
                        {copy.insights}
                    </h2>

                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-stone-900 dark:text-white">{copy.healthScore}</h3>
                            <span className="text-3xl font-black text-teal-600">{healthScore}%</span>
                        </div>
                        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${healthScore}%` }} />
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-400">
                            {summary.activeCount} {language === 'el' ? 'από' : 'of'} {summary.totalPolicies} {copy.policies} {copy.activeUpToDate}.
                        </p>
                    </div>

                    {(summary.expiringSoonCount > 0 || summary.actionNeededCount > 0) && (
                        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
                            <h3 className="text-lg font-bold mb-4 text-stone-900 dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                {copy.recommendations}
                            </h3>
                            <div className="space-y-3">
                                {summary.expiringSoonCount > 0 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">{copy.renewalAlert}</h4>
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            {summary.expiringSoonCount} {summary.expiringSoonCount === 1 ? copy.policy : copy.policies} {copy.reviewRenewals}
                                        </p>
                                    </div>
                                )}
                                {summary.actionNeededCount > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">{copy.actionRequired}</h4>
                                        <p className="text-sm text-red-800 dark:text-red-300">
                                            {summary.actionNeededCount} {summary.actionNeededCount === 1 ? copy.policy : copy.policies} {copy.needAttention}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-6 mt-8">
                {summary.expiringSoonCount > 0 && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">{copy.expiringSoon}</h2>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                            <p className="text-amber-800 dark:text-amber-200">
                                {summary.expiringSoonCount} {summary.expiringSoonCount === 1 ? copy.policy : copy.policies} {copy.next30Days}
                            </p>
                        </div>
                    </div>
                )}

                {summary.expiringSoonCount === 0 && summary.actionNeededCount === 0 && summary.activeCount > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <div>
                                <h3 className="font-semibold text-green-800 dark:text-green-200">{copy.allGoodTitle}</h3>
                                <p className="text-sm text-green-700 dark:text-green-300">{copy.allGoodDesc}</p>
                            </div>
                        </div>
                    </div>
                )}

                {summary.totalPolicies === 0 && (
                    <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg p-8 text-center">
                        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{copy.noPolicies}</h3>
                        <p className="text-stone-600 dark:text-stone-400 mb-4">{copy.noPoliciesDesc}</p>
                        <Link href="/wallet/add" className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                            {copy.addPolicy}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
