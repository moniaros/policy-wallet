"use client"

import { useState } from 'react'
import type { ReferralsProps } from './types'

export function Referrals({
    currentUser,
    referralLink,
    referrals,
    creditTransactions,
    creditBalance,
    onShareEmail,
    onShareWhatsApp,
    onCopyLink
}: ReferralsProps) {
    const [copied, setCopied] = useState(false)

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const handleCopyLink = () => {
        onCopyLink?.()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'credited':
                return {
                    label: 'Πιστώθηκε',
                    color: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/50'
                }
            case 'pending':
                return {
                    label: 'Εκκρεμεί',
                    color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                }
            default:
                return {
                    label: status,
                    color: 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-100 dark:border-stone-700'
                }
        }
    }

    return (
        <div className="max-w-7xl mx-auto py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Referral Link Card */}
                <div className="lg:col-span-2 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-teal-500/20 to-amber-500/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-10 shadow-sm h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <span className="w-8 h-px bg-teal-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Growth Network</span>
                            </div>

                            <h2 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-6">
                                Help Someone <span className="text-stone-400 italic">Understand Risk.</span>
                            </h2>
                            <p className="text-stone-500 text-sm font-medium mb-10 max-w-xl italic">
                                Μοιραστείτε το PolicyWallet με φίλους ή πελάτες. Όταν αναβαθμίσουν σε πληρωμένο πλάνο, κερδίζετε πιστώσεις για AI αναλύσεις.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block px-1">Your Personal Invitation Link</label>
                            <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                <div className="flex-1 px-6 py-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl text-xs text-stone-600 dark:text-stone-300 font-black tracking-tight overflow-hidden text-ellipsis flex items-center">
                                    {referralLink}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className="px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 hover:dark:bg-teal-500 transition-all shadow-xl shadow-stone-900/10 active:scale-95"
                                >
                                    {copied ? '✓ Copied' : 'Copy Link'}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        if (typeof navigator !== 'undefined' && navigator.share) {
                                            navigator.share({
                                                title: 'Join PolicyWallet',
                                                text: 'Manage all your insurance policies in one place. Join me on PolicyWallet!',
                                                url: referralLink
                                            }).catch(err => console.error('Error sharing', err))
                                        } else {
                                            onCopyLink?.()
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    Share Invite
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credit Registry Spotlight */}
                <div className="bg-amber-600 rounded-[40px] p-10 text-white shadow-2xl shadow-amber-600/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">Credit Balance</span>
                            </div>
                            <div className="text-5xl font-black tracking-tighter mb-4">
                                €{creditBalance.toFixed(2)}
                            </div>
                        </div>

                        <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-amber-200">Value Proposition</p>
                            <p className="text-xs font-medium italic leading-relaxed text-amber-50/80">
                                "Βοηθήσατε κάποιον — εδώ είναι η αξία πίσω. Οι πιστώσεις δεν λήγουν ποτέ."
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Referral History */}
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
                    <div className="px-10 py-8 border-b border-stone-50 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-stone-200" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Success Registry</h3>
                        </div>
                    </div>

                    {referrals.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-20 text-center">
                            <p className="text-stone-400 text-sm italic font-medium">No conversion events logged yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-50 dark:divide-stone-800">
                            {referrals.map((referral) => {
                                const statusBadge = getStatusBadge(referral.status)
                                return (
                                    <div key={referral.referral_id} className="px-10 py-6 hover:bg-stone-50/30 dark:hover:bg-stone-800/20 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-black text-stone-900 dark:text-stone-100 mb-1 group-hover:text-teal-600 transition-colors">
                                                    {referral.referred_email}
                                                </div>
                                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                    Added: {formatDate(referral.created_at)}
                                                    {referral.credited_at && ` • Earned: ${formatDate(referral.credited_at)}`}
                                                </div>
                                            </div>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusBadge.color}`}>
                                                {statusBadge.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Credit Transactions Ledger */}
                <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden">
                    <div className="px-10 py-8 border-b border-stone-50 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-stone-200" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Transaction Ledger</h3>
                        </div>
                    </div>

                    {creditTransactions.length === 0 ? (
                        <div className="p-20 text-center">
                            <p className="text-stone-400 text-sm italic font-medium">No transactional activity found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50/50 dark:bg-stone-800/30">
                                    <tr>
                                        <th className="px-10 py-5 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-10 py-5 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Event Description</th>
                                        <th className="px-10 py-5 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Delta</th>
                                        <th className="px-10 py-5 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                                    {creditTransactions.map((transaction) => (
                                        <tr key={transaction.transaction_id} className="hover:bg-stone-50/30 dark:hover:bg-stone-800/20 transition-all">
                                            <td className="px-10 py-6 whitespace-nowrap text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                {formatDate(transaction.created_at)}
                                            </td>
                                            <td className="px-10 py-6 text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                                                {transaction.description}
                                            </td>
                                            <td className="px-10 py-6 whitespace-nowrap text-right">
                                                <span className={`text-xs font-black ${transaction.amount > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400'}`}>
                                                    {transaction.amount > 0 ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 whitespace-nowrap text-right text-xs font-black text-stone-900 dark:text-stone-100">
                                                €{transaction.balance_after.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div >
    )
}
