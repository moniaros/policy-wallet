"use client"

import { useState } from "react"
import type { ReferralsProps } from "./types"
import { useLanguage } from "@/contexts/LanguageContext"

export function Referrals({
    referralLink,
    referrals,
    creditTransactions,
    creditBalance,
    onCopyLink,
}: ReferralsProps) {
    const [copied, setCopied] = useState(false)
    const { t, language } = useLanguage()

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat(language === "el" ? "el-GR" : "en-GB", {
            style: "currency",
            currency: "EUR",
        }).format(price)
    }

    const handleCopyLink = () => {
        onCopyLink?.()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "credited":
                return {
                    label: t.referrals.status.credited,
                    color: "bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-primary/30 dark:border-primary/30",
                }
            case "pending":
                return {
                    label: t.referrals.status.pending,
                    color: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
                }
            default:
                return {
                    label: status,
                    color: "bg-black/5 dark:bg-black text-black/60 dark:text-white/60 border-black/10 dark:border-white/15",
                }
        }
    }

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="lg:col-span-2 relative group">
                    <div className="absolute -inset-0.5 bg-primary/20 rounded-[40px] blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative pw-card pw-pad-roomy h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="w-8 h-px bg-primary" />
                                <span className="text-kicker font-black uppercase tracking-widest text-primary dark:text-mint">{t.referrals.growthNetwork}</span>
                            </div>

                            <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter mb-4">
                                {t.referrals.helpSomeone} <span className="text-muted-foreground italic">{t.referrals.helpSomeoneSubtitle}</span>
                            </h2>
                            <p className="text-black/60 dark:text-white/60 text-sm font-medium mb-8 max-w-xl italic">
                                {t.referrals.shareDesc}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <label className="text-kicker font-black text-muted-foreground uppercase tracking-widest block px-1">{t.referrals.yourLink}</label>
                            <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                <div className="flex-1 px-5 py-3 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl text-xs text-black/70 dark:text-white/70 font-black tracking-tight overflow-hidden text-ellipsis flex items-center">
                                    {referralLink}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className="pw-secondary-button text-kicker uppercase tracking-wider"
                                >
                                    {copied ? t.referrals.copied : t.referrals.copyLink}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        if (typeof navigator !== "undefined" && navigator.share) {
                                            navigator.share({
                                                title: "Join PolicyWallet",
                                                text: "Manage all your insurance policies in one place. Join me on PolicyWallet!",
                                                url: referralLink,
                                            }).catch((err) => console.error("Error sharing", err))
                                        } else {
                                            onCopyLink?.()
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-3 px-5 py-3 bg-primary text-white dark:text-[#1A2420] rounded-xl text-kicker font-black uppercase tracking-wider hover:bg-primary-hover transition-all shadow-lg shadow-primary/25"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    {t.referrals.shareInvite}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-black rounded-[32px] p-8 text-white shadow-2xl shadow-black/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-kicker font-black uppercase tracking-widest text-mint">{t.referrals.creditBalance}</span>
                            </div>
                            <div className="text-4xl font-black tracking-tighter mb-3">
                                {formatPrice(creditBalance)}
                            </div>
                        </div>

                        <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                            <p className="text-kicker font-black uppercase tracking-widest mb-3 text-mint">{t.referrals.valueProp}</p>
                            <p className="text-xs font-medium italic leading-relaxed text-white/80">
                                {t.referrals.valuePropDesc}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="pw-card overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-black/10 dark:border-white/15">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-black/10 dark:bg-white/20" />
                            <h3 className="text-kicker font-black uppercase tracking-widest text-black dark:text-white">{t.referrals.successRegistry}</h3>
                        </div>
                    </div>

                    {referrals.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-20 text-center">
                            <p className="text-muted-foreground text-sm italic font-medium">{t.referrals.noConversions}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10 dark:divide-white/10">
                            {referrals.map((referral) => {
                                const statusBadge = getStatusBadge(referral.status)
                                return (
                                    <div key={referral.referral_id} className="px-8 py-5 hover:bg-black/5 dark:hover:bg-black/80 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-black text-black dark:text-white mb-1 group-hover:text-primary dark:group-hover:text-mint transition-colors">
                                                    {referral.referred_email}
                                                </div>
                                                <div className="text-kicker font-bold text-muted-foreground uppercase tracking-widest">
                                                    {t.referrals.added}: {formatDate(referral.created_at)}
                                                    {referral.credited_at && ` • ${t.referrals.earned}: ${formatDate(referral.credited_at)}`}
                                                </div>
                                            </div>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-kicker font-black uppercase tracking-widest border ${statusBadge.color}`}>
                                                {statusBadge.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="pw-card overflow-hidden">
                    <div className="px-8 py-6 border-b border-black/10 dark:border-white/15">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-black/10 dark:bg-white/20" />
                            <h3 className="text-kicker font-black uppercase tracking-widest text-black dark:text-white">{t.referrals.ledger}</h3>
                        </div>
                    </div>

                    {creditTransactions.length === 0 ? (
                        <div className="p-20 text-center">
                            <p className="text-muted-foreground text-sm italic font-medium">{t.referrals.noActivity}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/5 dark:bg-black">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-kicker font-black text-muted-foreground uppercase tracking-wider">{t.referrals.timestamp}</th>
                                        <th className="px-8 py-4 text-left text-kicker font-black text-muted-foreground uppercase tracking-wider">{t.referrals.event}</th>
                                        <th className="px-8 py-4 text-right text-kicker font-black text-muted-foreground uppercase tracking-wider">{t.referrals.delta}</th>
                                        <th className="px-8 py-4 text-right text-kicker font-black text-muted-foreground uppercase tracking-wider">{t.referrals.final}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                                    {creditTransactions.map((transaction) => (
                                        <tr key={transaction.transaction_id} className="hover:bg-black/5 dark:hover:bg-black/80 transition-all">
                                            <td className="px-8 py-5 whitespace-nowrap text-kicker font-bold text-muted-foreground uppercase tracking-wider">
                                                {formatDate(transaction.created_at)}
                                            </td>
                                            <td className="px-8 py-5 text-xs font-black text-black dark:text-white uppercase tracking-tight">
                                                {transaction.description}
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right">
                                                <span className={`text-xs font-black ${transaction.amount > 0 ? "text-primary dark:text-mint" : "text-muted-foreground"}`}>
                                                    {transaction.amount > 0 ? "+" : ""}{formatPrice(Math.abs(transaction.amount))}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right text-xs font-black text-black dark:text-white">
                                                {formatPrice(transaction.balance_after)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
