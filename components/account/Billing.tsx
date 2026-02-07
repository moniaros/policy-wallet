"use client"

import type { BillingProps } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

export function Billing({
    currentUser,
    currentSubscription,
    currentPlan,
    paymentMethods,
    invoices,
    onDownloadInvoice,
    onAddPaymentMethod,
    onUpdatePaymentMethod,
    onDowngrade,
    onCancel
}: BillingProps) {
    const { t, language } = useLanguage()

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—'
        const date = new Date(dateString)
        return date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const formatPrice = (price: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency
        }).format(price)
    }

    const getCardBrandLabel = (brand: string) => {
        const labels: Record<string, string> = {
            visa: 'Visa',
            mastercard: 'Mastercard',
            amex: 'American Express',
            discover: 'Discover'
        }
        return labels[brand.toLowerCase()] || brand
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return {
                    label: t.billing.statusBadge.paid,
                    color: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/50'
                }
            case 'upcoming':
                return {
                    label: t.billing.statusBadge.upcoming,
                    color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                }
            case 'failed':
                return {
                    label: t.billing.statusBadge.failed,
                    color: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50'
                }
            default:
                return {
                    label: status,
                    color: 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-100 dark:border-stone-700'
                }
        }
    }

    const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default)

    return (
        <div className="max-w-7xl mx-auto py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Subscription Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t.billing.subscriptionStatus}</span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                                <div>
                                    <h2 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">
                                        {currentPlan.name}
                                    </h2>
                                    <p className="text-stone-500 text-sm font-medium italic">
                                        {t.billing.renewsOn} {formatDate(currentSubscription.next_billing_date)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-stone-900 dark:text-white">
                                        {formatPrice(currentPlan.price)}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t.billing.perMonth}</span>
                                </div>
                            </div>

                            {currentSubscription.provider === 'revenue_cat' ? (
                                <div className="mt-8 p-6 bg-teal-50 dark:bg-teal-900/20 rounded-3xl border border-teal-100 dark:border-teal-900/30">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white flex-shrink-0">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2.5" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-teal-900 dark:text-teal-100 mb-1">
                                                {language === 'el' ? 'Διαχείριση μέσω Mobile App' : 'Managed via Mobile App'}
                                            </h4>
                                            <p className="text-[10px] font-medium text-teal-700 dark:text-teal-400 leading-relaxed">
                                                {language === 'el'
                                                    ? 'Η συνδρομή σας πραγματοποιήθηκε μέσω της εφαρμογής. Παρακαλούμε χρησιμοποιήστε το App Store ή το Google Play για διαχείριση ή ακύρωση.'
                                                    : 'Your subscription was made through our mobile app. Please use the App Store or Google Play to manage or cancel your plan.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : currentPlan.price > 0 && (
                                <div className="flex items-center gap-4 pt-8 border-t border-stone-50 dark:border-stone-800">
                                    <button
                                        onClick={() => onDowngrade?.(currentPlan.plan_id)}
                                        className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 hover:dark:bg-teal-500 transition-all shadow-lg shadow-stone-900/10"
                                    >
                                        {t.billing.modifyPlan}
                                    </button>
                                    <button
                                        onClick={() => onCancel?.()}
                                        className="px-6 py-3 text-stone-400 hover:text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        {t.billing.terminateCycle}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invoices Section */}
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden">
                        <div className="px-10 py-8 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-px bg-stone-200" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">{t.billing.invoiceRecords}</h3>
                            </div>
                        </div>

                        {invoices.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-stone-400 text-sm italic font-medium">{t.billing.noInvoices}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-stone-50/50 dark:bg-stone-800/30">
                                        <tr>
                                            <th className="px-10 py-5 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.billing.reference}</th>
                                            <th className="px-10 py-5 text-left text-[10px] font-black text-stone-400 uppercase tracking_widest">{t.billing.issueDate}</th>
                                            <th className="px-10 py-5 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.billing.status}</th>
                                            <th className="px-10 py-5 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.billing.amount}</th>
                                            <th className="px-10 py-5 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">{t.billing.action}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                                        {invoices.map((invoice) => {
                                            const statusBadge = getStatusBadge(invoice.status)
                                            return (
                                                <tr key={invoice.invoice_id} className="hover:bg-stone-50/30 dark:hover:bg-stone-800/20 transition-all group">
                                                    <td className="px-10 py-6 whitespace-nowrap text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                                                        {invoice.invoice_number}
                                                    </td>
                                                    <td className="px-10 py-6 whitespace-nowrap text-xs font-medium text-stone-500 dark:text-stone-400">
                                                        {formatDate(invoice.issued_at)}
                                                    </td>
                                                    <td className="px-10 py-6 whitespace-nowrap text-center">
                                                        <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusBadge.color}`}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 whitespace-nowrap text-right">
                                                        <div className="text-sm font-black text-stone-900 dark:text-white">{formatPrice(invoice.amount_total, invoice.currency)}</div>
                                                        {invoice.credits_applied && (
                                                            <div className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">-{formatPrice(invoice.credits_applied, invoice.currency)} {t.billing.applied}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-10 py-6 whitespace-nowrap text-right">
                                                        {invoice.pdf_url && (
                                                            <button
                                                                onClick={() => onDownloadInvoice?.(invoice.invoice_id)}
                                                                className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 hover:bg-teal-500 hover:text-white transition-all shadow-sm"
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

                {/* Payment Methods Sidebar */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-10 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">{t.billing.paymentMethod}</h3>
                            {defaultPaymentMethod && (
                                <button
                                    onClick={() => onUpdatePaymentMethod?.(defaultPaymentMethod.payment_method_id)}
                                    className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 hover:underline"
                                >
                                    {t.billing.edit}
                                </button>
                            )}
                        </div>

                        {defaultPaymentMethod ? (
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-teal-500/5 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                                <div className="relative flex items-center gap-5">
                                    <div className="w-14 h-10 bg-stone-900 dark:bg-stone-800 rounded-xl flex items-center justify-center text-white border border-white/5 shadow-2xl">
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">
                                            {getCardBrandLabel(defaultPaymentMethod.card_brand || 'visa')} •••• {defaultPaymentMethod.card_last4}
                                        </div>
                                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-0.5">
                                            {t.billing.expires} {defaultPaymentMethod.card_exp_month}/{defaultPaymentMethod.card_exp_year}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => onAddPaymentMethod?.()}
                                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-[32px] hover:border-teal-500/30 hover:bg-teal-50/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:bg-teal-600 group-hover:text-white transition-all mb-4">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 group-hover:text-stone-900">{t.billing.addPaymentSource}</span>
                            </button>
                        )}

                        <div className="mt-10 p-6 bg-stone-50 dark:bg-stone-800/30 rounded-3xl border border-stone-100 dark:border-stone-700">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-stone-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" /></svg>
                                <p className="text-[10px] font-medium text-stone-400 leading-relaxed italic">
                                    {t.billing.securityNote}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
