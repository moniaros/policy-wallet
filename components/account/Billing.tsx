"use client"

import type { BillingProps } from "./types"
import { useLanguage } from "@/contexts/LanguageContext"
import { TokenUsageCard } from "./TokenUsageCard"

const BILLING_COPY = {
    managePayments: { el: "Διαχείριση πληρωμών", en: "Manage payments" },
    annualNudgeTitle: { el: "Πέρασε σε ετήσιο πλάνο", en: "Switch to annual billing" },
    annualNudgeBody: {
        el: "Με ετήσια χρέωση πληρώνεις 10 μήνες αντί για 12 — 2 μήνες δωρεάν.",
        en: "Annual billing costs 10 months instead of 12 — 2 months free.",
    },
    annualNudgeCta: { el: "Αλλαγή σε ετήσιο", en: "Switch to annual" },
    rcTitle: { el: "Διαχείριση μέσω Mobile App", en: "Managed via Mobile App" },
    rcBody: {
        el: "Η συνδρομή σας πραγματοποιήθηκε μέσω της εφαρμογής. Παρακαλούμε χρησιμοποιήστε το App Store ή το Google Play για διαχείριση ή ακύρωση.",
        en: "Your subscription was made through our mobile app. Please use the App Store or Google Play to manage or cancel your plan.",
    },
} as const

function pickCopy(pair: { el: string; en: string }, language: string) {
    return language === "el" ? pair.el : pair.en
}

export function Billing({
    currentSubscription,
    currentPlan,
    paymentMethods,
    invoices,
    onDownloadInvoice,
    onAddPaymentMethod,
    onUpdatePaymentMethod,
    onDowngrade,
    onCancel,
    onOpenPortal,
    onSwitchToAnnual,
}: BillingProps) {
    const { t, language } = useLanguage()

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-"
        const date = new Date(dateString)
        return date.toLocaleDateString(language === "el" ? "el-GR" : "en-US", { day: "numeric", month: "short", year: "numeric" })
    }

    const formatPrice = (price: number, currency: string = "EUR") => {
        return new Intl.NumberFormat(language === "el" ? "el-GR" : "en-US", {
            style: "currency",
            currency,
        }).format(price)
    }

    const getCardBrandLabel = (brand: string) => {
        const labels: Record<string, string> = {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            discover: "Discover",
        }
        return labels[brand.toLowerCase()] || brand
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid":
                return {
                    label: t.billing.statusBadge.paid,
                    color: "bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-primary/30 dark:border-primary/30",
                }
            case "upcoming":
                return {
                    label: t.billing.statusBadge.upcoming,
                    color: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
                }
            case "failed":
                return {
                    label: t.billing.statusBadge.failed,
                    color: "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50",
                }
            default:
                return {
                    label: status,
                    color: "bg-black/5 dark:bg-black text-black/60 dark:text-white/60 border-black/10 dark:border-white/15",
                }
        }
    }

    const defaultPaymentMethod = paymentMethods.find((pm) => pm.is_default)

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="pw-card p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center text-primary dark:text-mint">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/60">{t.billing.subscriptionStatus}</span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter mb-2">
                                        {currentPlan.name}
                                    </h2>
                                    <p className="text-black/60 dark:text-white/60 text-sm font-medium italic">
                                        {t.billing.renewsOn} {formatDate(currentSubscription.next_billing_date)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-black dark:text-white">
                                        {formatPrice(currentPlan.price)}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/60">{t.billing.perMonth}</span>
                                </div>
                            </div>

                            {currentSubscription.provider === "revenue_cat" ? (
                                <div className="mt-8 p-6 bg-primary-tint dark:bg-primary/15 rounded-3xl border border-primary/30 dark:border-primary/30">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white dark:text-[#1A2420] flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2.5" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-primary dark:text-mint mb-1">
                                                {pickCopy(BILLING_COPY.rcTitle, language)}
                                            </h4>
                                            <p className="text-[10px] font-medium text-primary dark:text-mint leading-relaxed">
                                                {pickCopy(BILLING_COPY.rcBody, language)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : currentPlan.price > 0 && (
                                <div className="flex items-center gap-4 pt-8 border-t border-black/10 dark:border-white/15">
                                    <button
                                        onClick={() => onDowngrade?.(currentPlan.plan_id)}
                                        className="px-5 py-2.5 bg-primary text-white dark:text-[#1A2420] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                                    >
                                        {t.billing.modifyPlan}
                                    </button>
                                    {onOpenPortal && (
                                        <button
                                            onClick={() => onOpenPortal()}
                                            className="px-5 py-2.5 border border-black/15 dark:border-white/20 text-black/70 dark:text-white/75 rounded-xl text-[10px] font-black uppercase tracking-wider hover:border-primary/40 hover:text-primary dark:hover:text-mint transition-all"
                                        >
                                            {pickCopy(BILLING_COPY.managePayments, language)}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onCancel?.()}
                                        className="px-5 py-2.5 text-black/45 dark:text-white/60 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        {t.billing.terminateCycle}
                                    </button>
                                </div>
                            )}

                            {/* Annual-savings nudge: paid monthly plan, Stripe-managed */}
                            {onSwitchToAnnual &&
                                currentPlan.price > 0 &&
                                currentPlan.billing_interval === "month" &&
                                currentSubscription.provider !== "revenue_cat" && (
                                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border border-primary/25 bg-primary-tint p-5 dark:bg-primary/10">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-primary dark:text-mint">
                                                {pickCopy(BILLING_COPY.annualNudgeTitle, language)}
                                            </h4>
                                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-black/60 dark:text-white/65">
                                                {pickCopy(BILLING_COPY.annualNudgeBody, language)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onSwitchToAnnual()}
                                            className="px-5 py-2.5 bg-primary text-white dark:text-[#1A2420] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-hover transition-all"
                                        >
                                            {pickCopy(BILLING_COPY.annualNudgeCta, language)}
                                        </button>
                                    </div>
                                )}
                        </div>
                    </div>

                    <div className="pw-card overflow-hidden">
                        <div className="px-8 py-6 border-b border-black/10 dark:border-white/15 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-px bg-black/10 dark:bg-white/20" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.billing.invoiceRecords}</h3>
                            </div>
                        </div>

                        {invoices.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-black/45 dark:text-white/60 text-sm italic font-medium">{t.billing.noInvoices}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-black/5 dark:bg-black">
                                        <tr>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-wider">{t.billing.reference}</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-wider">{t.billing.issueDate}</th>
                                            <th className="px-8 py-4 text-center text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-wider">{t.billing.status}</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-wider">{t.billing.amount}</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-wider">{t.billing.action}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/10 dark:divide-white/10">
                                        {invoices.map((invoice) => {
                                            const statusBadge = getStatusBadge(invoice.status)
                                            return (
                                                <tr key={invoice.invoice_id} className="hover:bg-black/5 dark:hover:bg-black/80 transition-all group">
                                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-black dark:text-white uppercase tracking-tight">
                                                        {invoice.invoice_number}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-xs font-medium text-black/60 dark:text-white/60">
                                                        {formatDate(invoice.issued_at)}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-center">
                                                        <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusBadge.color}`}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                                        <div className="text-sm font-black text-black dark:text-white">{formatPrice(invoice.amount_total, invoice.currency)}</div>
                                                        {invoice.credits_applied && (
                                                            <div className="text-[9px] font-bold text-primary dark:text-mint uppercase tracking-widest">-{formatPrice(invoice.credits_applied, invoice.currency)} {t.billing.applied}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                                        {invoice.pdf_url && (
                                                            <button
                                                                onClick={() => onDownloadInvoice?.(invoice.invoice_id)}
                                                                className="w-8 h-8 rounded-lg bg-black/5 dark:bg-black flex items-center justify-center text-black/45 dark:text-white/60 hover:bg-primary hover:text-white dark:hover:text-[#1A2420] transition-all"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="pw-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.billing.paymentMethod}</h3>
                            {defaultPaymentMethod && (
                                <button
                                    onClick={() => onUpdatePaymentMethod?.(defaultPaymentMethod.payment_method_id)}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary dark:text-mint hover:underline"
                                >
                                    {t.billing.edit}
                                </button>
                            )}
                        </div>

                        {defaultPaymentMethod ? (
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-primary/5 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                <div className="relative flex items-center gap-5">
                                    <div className="w-14 h-10 bg-black dark:bg-black rounded-xl flex items-center justify-center text-white border border-white/5 shadow-2xl">
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-black dark:text-white uppercase tracking-tight">
                                            {getCardBrandLabel(defaultPaymentMethod.card_brand || "visa")} •••• {defaultPaymentMethod.card_last4}
                                        </div>
                                        <div className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-widest mt-0.5">
                                            {t.billing.expires} {defaultPaymentMethod.card_exp_month}/{defaultPaymentMethod.card_exp_year}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => onAddPaymentMethod?.()}
                                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/10 dark:border-white/15 rounded-[32px] hover:border-primary/35 hover:bg-primary/10 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-black flex items-center justify-center text-black/45 dark:text-white/60 group-hover:bg-primary group-hover:text-white dark:group-hover:text-[#1A2420] transition-all mb-4">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white">{t.billing.addPaymentSource}</span>
                            </button>
                        )}

                        <div className="mt-10 p-6 bg-black/5 dark:bg-black rounded-3xl border border-black/10 dark:border-white/15">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-black/35 dark:text-white/55 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" /></svg>
                                <p className="text-[10px] font-medium text-black/45 dark:text-white/60 leading-relaxed italic">
                                    {t.billing.securityNote}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI token usage + top-up */}
                    <TokenUsageCard language={language === "el" ? "el" : "en"} />
                </div>
            </div>
        </div>
    )
}
