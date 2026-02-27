"use client"

import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon,
    ScaleIcon, DocumentIcon, PawIcon, BriefcaseIcon, ChevronRightIcon
} from '@/components/icons/PolicyIcons'
import { Sparkles } from 'lucide-react'

interface MobilePolicyCardProps {
    policy: Policy
    variant?: 'hero' | 'compact'
    onView?: () => void
    onShare?: () => void
    onAddToWallet?: () => void
    onViewDocuments?: () => void
}

export function MobilePolicyCard({ policy, variant = 'compact', onView }: MobilePolicyCardProps) {
    const { t, language } = useLanguage()

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return '-'
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getDaysUntilExpiry = () => {
        if (!policy.endDate) return null
        const now = new Date()
        const end = new Date(policy.endDate)
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    const getPolicyIcon = () => {
        const iconClass = 'w-7 h-7 text-[#1FDC86]'
        switch (policy.lineOfBusiness) {
            case 'motor':
                return <CarIcon className={iconClass} />
            case 'health':
                return <HeartIcon className={iconClass} />
            case 'home':
                return <HomeIcon className={iconClass} />
            case 'life':
                return <ShieldIcon className={iconClass} />
            case 'travel':
                return <PlaneIcon className={iconClass} />
            case 'liability':
                return <ScaleIcon className={iconClass} />
            case 'pet':
                return <PawIcon className={iconClass} />
            case 'professional':
                return <BriefcaseIcon className={iconClass} />
            default:
                return <DocumentIcon className={iconClass} />
        }
    }

    const getCoverageAmount = () => {
        if (policy.acordData && typeof policy.acordData === 'object') {
            const data = policy.acordData as any
            return data.coverageAmount || data.sumInsured || null
        }
        return null
    }

    const getPremiumAmount = () => {
        const data = policy.acordData as any
        const aiPremium = data?.policy?.premium?.amount
        if (aiPremium) return Number(aiPremium)
        return Number(policy.premiumAmount?.toString() || 0)
    }

    const getGapCount = () => {
        return (policy as any).gapCount || 0
    }

    const getStatusBadge = () => {
        if (policy.status === 'active') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#1FDC86]/12 dark:bg-[#1FDC86]/15 text-[#19b870] dark:text-[#7de8ba] border border-[#1FDC86]/30 dark:border-[#1FDC86]/35 rounded-full">{t.policyStatus.active}</span>
        }
        if (policy.status === 'expiring_soon') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">{t.policyStatus.expiringSoon}</span>
        }
        if (policy.status === 'action_needed') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">{t.policyStatus.actionNeeded}</span>
        }
        if (policy.status === 'cancelled') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-black text-black/65 dark:text-white/70 border border-black/10 dark:border-white/15 rounded-full">{t.policyStatus.cancelled}</span>
        }
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-black text-black/65 dark:text-white/70 border border-black/10 dark:border-white/15 rounded-full">{language === 'el' ? 'Ελλιπές' : 'Incomplete'}</span>
    }

    const daysLeft = getDaysUntilExpiry()
    const coverageAmount = getCoverageAmount()
    const premiumAmount = getPremiumAmount()
    const gapCount = getGapCount()

    if (variant === 'hero') {
        return (
            <div
                className="relative bg-gradient-to-br from-white to-black/5 dark:from-black dark:to-[#111111] border border-black/10 dark:border-white/15 rounded-3xl p-5 shadow-sm"
                role="article"
                aria-label={`${policy.insurerName} ${language === 'el' ? 'συμβόλαιο' : 'policy'} ${policy.policyNumber}`}
            >
                <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-11 h-11 bg-black/5 dark:bg-black rounded-xl flex items-center justify-center border border-black/10 dark:border-white/15">
                        {getPolicyIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-black dark:text-white truncate">{policy.insurerName}</h3>
                        <p className="text-xs font-mono text-black/55 dark:text-white/65 truncate">{policy.policyNumber}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {getStatusBadge()}
                    {gapCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            {gapCount} {language === 'el' ? 'κενά' : 'gaps'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {coverageAmount && (
                        <div className="bg-white dark:bg-black rounded-xl p-3 border border-black/10 dark:border-white/15">
                            <p className="text-xs text-black/55 dark:text-white/65 mb-1">{language === 'el' ? 'Κάλυψη' : 'Coverage'}</p>
                            <p className="text-base font-bold text-black dark:text-white">{formatCurrency(coverageAmount)}</p>
                        </div>
                    )}
                    {premiumAmount > 0 && (
                        <div className="bg-white dark:bg-black rounded-xl p-3 border border-black/10 dark:border-white/15">
                            <p className="text-xs text-black/55 dark:text-white/65 mb-1">{language === 'el' ? 'Ασφάλιστρο' : 'Premium'}</p>
                            <p className="text-base font-bold text-[#19b870] dark:text-[#7de8ba]">{formatCurrency(premiumAmount)}</p>
                        </div>
                    )}
                    <div className="bg-white dark:bg-black rounded-xl p-3 border border-black/10 dark:border-white/15">
                        <p className="text-xs text-black/55 dark:text-white/65 mb-1">{language === 'el' ? 'Λήξη' : 'Expires'}</p>
                        <p className="text-base font-bold text-black dark:text-white">{formatDate(policy.endDate)}</p>
                    </div>
                </div>

                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                    <div className={`mb-4 p-3 rounded-xl border ${daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>
                        <p className="text-xs font-bold">
                            {daysLeft === 0
                                ? (language === 'el' ? 'Λήγει σήμερα' : 'Expires today')
                                : daysLeft === 1
                                    ? (language === 'el' ? 'Λήγει αύριο' : 'Expires tomorrow')
                                    : `${daysLeft} ${language === 'el' ? 'ημέρες απομένουν' : 'days remaining'}`}
                        </p>
                    </div>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onView?.()
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer"
                >
                    {language === 'el' ? 'Προβολή λεπτομερειών' : 'View details'}
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        )
    }

    return (
        <div
            onClick={onView}
            className="relative bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4 transition-all cursor-pointer active:scale-[0.98]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView?.()
                }
            }}
            aria-label={`${policy.insurerName} ${language === 'el' ? 'συμβόλαιο' : 'policy'} ${policy.policyNumber}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-black/5 dark:bg-black rounded-lg flex items-center justify-center mt-0.5 border border-black/10 dark:border-white/15">
                    {getPolicyIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-black dark:text-white truncate">{policy.insurerName}</h4>
                            <p className="text-xs font-mono text-black/55 dark:text-white/65 truncate">{policy.policyNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {getStatusBadge()}
                            {gapCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {gapCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-black/65 dark:text-white/70">
                        {premiumAmount > 0 && <span className="font-bold text-[#19b870] dark:text-[#7de8ba]">{formatCurrency(premiumAmount)}</span>}
                        {premiumAmount > 0 && <span>•</span>}
                        <span>{language === 'el' ? 'Λήγει' : 'Expires'} {formatDate(policy.endDate)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
