"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/contexts/LanguageContext"
import { useIsMobile } from "@/hooks/useResponsive"
import { PlanGate } from "@/components/ui/PlanGate"
import type { Policy } from "@/components/wallet/types"
import {
    X,
    ChevronDown,
    BadgeCheck,
    Shield,
    Banknote,
    FileText,
    Sparkles,
    Pencil,
    Share2,
    RefreshCw,
    Trash2,
    Calendar,
    AlertTriangle,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface PolicyDetailSheetProps {
    isOpen: boolean
    onClose: () => void
    policy: (Policy & { gapCount?: number }) | null
    userPlan: 'free' | 'plus' | 'pro'
    onEdit?: (policyId: string) => void
    onShare?: (policyId: string) => void
    onDelete?: (policyId: string) => void
    onRunAnalysis?: (policyId: string) => void
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
}: {
    title: string
    icon: React.ElementType
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="border-t border-black/5 dark:border-white/10">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-black/40 dark:text-white/40" />
                    <span className="text-sm font-bold text-black/80 dark:text-white/80">{title}</span>
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-black/30 dark:text-white/30" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-5">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeExpiry(endDate: string | null, locale: 'el' | 'en'): string {
    if (!endDate) return '-'
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    if (days <= 0) return locale === 'el' ? 'Έληξε' : 'Expired'
    if (days <= 60) return locale === 'el' ? `σε ${days} ημέρες` : `in ${days} days`
    return new Date(endDate).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US')
}

function getStatusStyle(status: string) {
    switch (status) {
        case 'active': return 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint'
        case 'expiring_soon': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        case 'action_needed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        case 'analyzing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse'
        case 'cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PolicyDetailSheet({
    isOpen,
    onClose,
    policy,
    userPlan,
    onEdit,
    onShare,
    onDelete,
    onRunAnalysis,
}: PolicyDetailSheetProps) {
    const [mounted, setMounted] = useState(false)
    const { t, language } = useLanguage()
    const isMobile = useIsMobile()
    const copy = (t.wallet as any)?.detailSheet || {}
    const locale = language === 'el' ? 'el-GR' : 'en-US'

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!mounted) return null

    const localizedLob = policy
        ? t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
        : ''

    const isPendingInsurer = !policy?.insurerName || policy.insurerName === '__PENDING_EXTRACTION__'
    const displayInsurer = isPendingInsurer ? localizedLob : policy?.insurerName || ''

    const formatCurrency = (amount: number, currency: string = 'EUR') =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

    // Mobile: bottom sheet. Desktop: right panel.
    const panelVariants = isMobile
        ? { hidden: { y: '100%' }, visible: { y: 0 }, exit: { y: '100%' } }
        : { hidden: { x: '100%' }, visible: { x: 0 }, exit: { x: '100%' } }

    const panelClassName = isMobile
        ? 'fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900'
        : 'fixed top-0 right-0 bottom-0 z-50 w-full max-w-[480px] overflow-y-auto bg-white shadow-2xl dark:bg-slate-900'

    return createPortal(
        <AnimatePresence>
            {isOpen && policy && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm dark:bg-black/60"
                    />

                    {/* Panel */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={panelVariants}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={panelClassName}
                    >
                        {/* Drag handle (mobile) */}
                        {isMobile && (
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="h-1 w-10 rounded-full bg-black/15 dark:bg-white/20" />
                            </div>
                        )}

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t.common?.close || 'Close'}
                            className="absolute right-4 top-4 z-10 rounded-full bg-black/5 p-2 text-black/50 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-white/50 dark:hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* ── Section 1: Header (always visible) ── */}
                        <div className="px-6 pb-5 pt-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-black text-primary dark:bg-primary/15 dark:text-mint">
                                    {displayInsurer[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="truncate text-lg font-bold text-black dark:text-white">
                                            {displayInsurer}
                                        </h2>
                                        {policy.verified && (
                                            <BadgeCheck className="h-4 w-4 shrink-0 text-primary dark:text-mint" />
                                        )}
                                    </div>
                                    <p className="text-sm text-black/50 dark:text-white/50">{localizedLob}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(policy.status)}`}>
                                    {t.policyStatus?.[policy.status as keyof typeof t.policyStatus] || policy.status}
                                </span>
                                <span className="text-xs text-black/40 dark:text-white/40">
                                    {formatRelativeExpiry(policy.endDate, language as 'el' | 'en')}
                                </span>
                            </div>
                        </div>

                        {/* ── Section 2: Coverage Details ── */}
                        {(policy.coverageHighlights?.length > 0 || policy.aiInsights?.exclusions?.length) && (
                            <CollapsibleSection title={copy.coverageDetails || "Coverage Details"} icon={Shield}>
                                {policy.coverageHighlights?.length > 0 && (
                                    <ul className="space-y-1.5">
                                        {policy.coverageHighlights.map((h, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-black/70 dark:text-white/70">
                                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary dark:bg-mint" />
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {policy.aiInsights?.exclusions?.length ? (
                                    <div className="mt-3">
                                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
                                            {t.policyCard?.whatsNotCovered || "What's not covered"}
                                        </p>
                                        <ul className="space-y-1.5">
                                            {policy.aiInsights.exclusions.map((e, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-red-500/80 dark:text-red-400/80">
                                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                    {e}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </CollapsibleSection>
                        )}

                        {/* ── Section 3: Premium & Payment ── */}
                        {policy.premiumAmount != null && policy.premiumAmount > 0 && (
                            <CollapsibleSection title={copy.premiumPayment || "Premium & Payment"} icon={Banknote}>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-black/40 dark:text-white/40">{t.wallet?.premium || 'Annual premium'}</p>
                                        <p className="text-2xl font-bold text-black dark:text-white">
                                            {formatCurrency(policy.premiumAmount, policy.premiumCurrency || 'EUR')}
                                        </p>
                                    </div>
                                    {policy.aiInsights?.premiumBenchmark && (
                                        <PlanGate userPlan={userPlan} requiredPlan="plus" featureLabel={copy.premiumPayment || "Premium benchmark"}>
                                            <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-black/50 dark:text-white/50">{t.policyCard?.localAvg || 'Local avg.'}</span>
                                                    <span className="font-semibold text-black dark:text-white">
                                                        {formatCurrency(policy.aiInsights.premiumBenchmark.localAverage)}
                                                    </span>
                                                </div>
                                                {policy.aiInsights.premiumBenchmark.savingsPotential > 0 && (
                                                    <p className="mt-1 text-xs font-semibold text-[#166534] dark:text-mint">
                                                        {(t.policyCard as any)?.savingsPotential || 'Potential savings'}: {formatCurrency(policy.aiInsights.premiumBenchmark.savingsPotential)}
                                                    </p>
                                                )}
                                            </div>
                                        </PlanGate>
                                    )}
                                </div>
                            </CollapsibleSection>
                        )}

                        {/* ── Section 4: Documents ── */}
                        {policy.documents?.length > 0 && (
                            <CollapsibleSection title={copy.documents || "Documents"} icon={FileText}>
                                <ul className="space-y-2">
                                    {policy.documents.map(doc => (
                                        <li key={doc.id}>
                                            <a
                                                href={`/wallet/${policy.id}`}
                                                className="flex items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2.5 text-sm transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/10"
                                            >
                                                <FileText className="h-4 w-4 shrink-0 text-black/40 dark:text-white/40" />
                                                <span className="flex-1 truncate font-medium text-black/80 dark:text-white/80">
                                                    {doc.fileName}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </CollapsibleSection>
                        )}

                        {/* ── Section 5: AI Insights (plan-gated) ── */}
                        <CollapsibleSection title={copy.aiInsights || "AI Insights"} icon={Sparkles}>
                            <PlanGate userPlan={userPlan} requiredPlan="plus" featureLabel={copy.aiInsights || "AI Insights"}>
                                <div className="space-y-3">
                                    {(policy as any).gapCount > 0 ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                                {(policy as any).gapCount} {t.wallet?.mobileCard?.gaps || 'coverage gaps found'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#166534] dark:text-mint">
                                            {language === 'el' ? 'Η κάλυψή σας φαίνεται καλή' : 'Your coverage looks good'}
                                        </p>
                                    )}
                                </div>
                            </PlanGate>
                        </CollapsibleSection>

                        {/* ── Action Bar ── */}
                        <div className="sticky bottom-0 border-t border-black/5 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/95">
                            <div className="flex items-center gap-2">
                                {onEdit && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(policy.id)}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-bold text-black/70 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {copy.edit || t.common?.edit || 'Edit'}
                                    </button>
                                )}
                                {onShare && (
                                    <button
                                        type="button"
                                        onClick={() => onShare(policy.id)}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-bold text-black/70 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        {copy.share || 'Share'}
                                    </button>
                                )}
                                {onRunAnalysis && (
                                    <button
                                        type="button"
                                        onClick={() => onRunAnalysis(policy.id)}
                                        aria-label={t.wallet?.aiAnalysis || 'Run analysis'}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white dark:text-[#1A2420] transition-colors hover:bg-primary-hover"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        aria-label={t.common?.delete || 'Delete'}
                                        onClick={() => {
                                            if (confirm(t.toast?.confirmDelete || 'Delete this policy?')) {
                                                onDelete(policy.id)
                                                onClose()
                                            }
                                        }}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-500 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
