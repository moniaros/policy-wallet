"use client"

import { useState } from 'react'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon,
    ScaleIcon, DocumentIcon, PawIcon, BriefcaseIcon, ChevronRightIcon
} from '@/components/icons/PolicyIcons'

interface MobilePolicyCardProps {
    policy: Policy
    variant?: 'hero' | 'compact'
    onView?: () => void
    onShare?: () => void
    onAddToWallet?: () => void
    onViewDocuments?: () => void
}

export function MobilePolicyCard({
    policy,
    variant = 'compact',
    onView,
    onShare,
    onAddToWallet,
    onViewDocuments
}: MobilePolicyCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const { t, language } = useLanguage()

    // Format date based on locale
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    // Format currency
    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return '—'
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    // Calculate days until expiry
    const getDaysUntilExpiry = () => {
        if (!policy.endDate) return null
        const now = new Date()
        const end = new Date(policy.endDate)
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diff
    }

    const daysLeft = getDaysUntilExpiry()

    // Status badge styling
    const getStatusBadge = () => {
        switch (policy.status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.active}
                    </span>
                )
            case 'expiring_soon':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.expiringSoon}
                    </span>
                )
            case 'incomplete':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full"></span>
                        Incomplete
                    </span>
                )
            case 'action_needed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.actionNeeded}
                    </span>
                )
            default:
                return null
        }
    }

    // Get policy type icon
    const getPolicyIcon = () => {
        const lob = policy.lineOfBusiness as string
        const iconClass = "w-8 h-8 text-teal-600 dark:text-teal-400"

        switch (lob) {
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

    // Extract coverage amount from ACORD data
    const getCoverageAmount = () => {
        if (policy.acordData && typeof policy.acordData === 'object') {
            const data = policy.acordData as any
            return data.coverageAmount || data.sumInsured || null
        }
        return null
    }

    const coverageAmount = getCoverageAmount()

    // Hero card variant (large, detailed)
    if (variant === 'hero') {
        return (
            <div
                className="relative bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 border-2 border-stone-200 dark:border-stone-700 rounded-3xl p-6 shadow-lg"
                role="article"
                aria-label={`${policy.insurerName} ${language === 'el' ? 'συμβόλαιο' : 'policy'} ${policy.policyNumber}`}
            >
                {/* Status indicator line at top */}
                <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${policy.status === 'active' ? 'bg-teal-500' :
                    policy.status === 'expiring_soon' ? 'bg-amber-500' :
                        policy.status === 'action_needed' ? 'bg-red-500' :
                            'bg-stone-300 dark:bg-stone-600'
                    }`} />

                {/* Header: Icon + Insurer + Policy Number */}
                <div className="flex items-start gap-4 mb-4 mt-2">
                    <div className="flex-shrink-0 w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center">
                        {getPolicyIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black text-stone-900 dark:text-white tracking-tight truncate">
                            {policy.insurerName}
                        </h3>
                        <p className="text-sm font-mono text-stone-500 dark:text-stone-400 truncate">
                            {policy.policyNumber}
                        </p>
                        {/* Display plate number for motor policies */}
                        {policy.lineOfBusiness === 'motor' && policy.acordData?.vehicle?.plateNumber && (
                            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1.5">
                                <span>🚗</span>
                                {policy.acordData.vehicle.plateNumber}
                            </p>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                    {getStatusBadge()}
                </div>

                {/* Key Information Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Coverage Amount */}
                    {coverageAmount && (
                        <div className="bg-white dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
                            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                                {language === 'el' ? 'Κάλυψη' : 'Coverage'}
                            </p>
                            <p className="text-lg font-bold text-stone-900 dark:text-white">
                                {formatCurrency(coverageAmount)}
                            </p>
                        </div>
                    )}

                    {/* Expiry Date */}
                    <div className="bg-white dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                            {language === 'el' ? 'Λήγει' : 'Expires'}
                        </p>
                        <p className="text-lg font-bold text-stone-900 dark:text-white">
                            {formatDate(policy.endDate)}
                        </p>
                    </div>
                </div>

                {/* Days Until Expiry Warning */}
                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                    <div className={`mb-4 p-3 rounded-xl border ${daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                        daysLeft <= 30 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                            'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}>
                        <p className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-700 dark:text-red-300' :
                            daysLeft <= 30 ? 'text-amber-700 dark:text-amber-300' :
                                'text-blue-700 dark:text-blue-300'
                            }`}>
                            {daysLeft === 0 ? (language === 'el' ? '⚠️ Λήγει σήμερα!' : '⚠️ Expires today!') :
                                daysLeft === 1 ? (language === 'el' ? '⚠️ Λήγει αύριο!' : '⚠️ Expires tomorrow!') :
                                    `${daysLeft} ${language === 'el' ? 'ημέρες απομένουν' : 'days remaining'}`}
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onView?.()
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors active:scale-[0.98]"
                    aria-label={`${language === 'el' ? 'Προβολή λεπτομερειών για' : 'View details for'} ${policy.insurerName} ${policy.policyNumber}`}
                >
                    {language === 'el' ? 'Προβολή λεπτομερειών' : 'View Details'}
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        )
    }

    // Compact card variant (list view)
    return (
        <div
            onClick={onView}
            className="relative bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-900/50 transition-all cursor-pointer active:scale-[0.98]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView?.()
                }
            }}
            aria-label={`${policy.insurerName} ${language === 'el' ? 'συμβόλαιο' : 'policy'} ${policy.policyNumber}, ${language === 'el' ? 'λήγει' : 'expires'} ${formatDate(policy.endDate)}`}
        >
            {/* Status indicator */}
            <div className={`absolute top-0 left-4 right-4 h-0.5 rounded-b-full ${policy.status === 'active' ? 'bg-teal-500' :
                policy.status === 'expiring_soon' ? 'bg-amber-500' :
                    policy.status === 'action_needed' ? 'bg-red-500' :
                        'bg-stone-300 dark:bg-stone-600'
                }`} />

            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-teal-50 dark:bg-teal-900/20 rounded-lg flex items-center justify-center mt-0.5">
                    {getPolicyIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Insurer + Policy Number */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-stone-900 dark:text-white truncate">
                                {policy.insurerName}
                            </h4>
                            <p className="text-xs font-mono text-stone-500 dark:text-stone-400 truncate">
                                {policy.policyNumber}
                            </p>
                            {/* Display plate number for motor policies */}
                            {policy.lineOfBusiness === 'motor' && policy.acordData?.vehicle?.plateNumber && (
                                <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
                                    <span>🚗</span>
                                    {policy.acordData.vehicle.plateNumber}
                                </p>
                            )}
                        </div>
                        {getStatusBadge()}
                    </div>

                    {/* Coverage + Expiry */}
                    <div className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400">
                        {coverageAmount && (
                            <span className="font-semibold">
                                {formatCurrency(coverageAmount)}
                            </span>
                        )}
                        <span>•</span>
                        <span>
                            {language === 'el' ? 'Λήγει' : 'Expires'} {formatDate(policy.endDate)}
                        </span>
                    </div>

                    {/* Days warning */}
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                        <p className={`text-xs font-bold mt-2 ${daysLeft <= 7 ? 'text-red-600 dark:text-red-400' :
                            'text-amber-600 dark:text-amber-400'
                            }`}>
                            {daysLeft === 0 ? (language === 'el' ? 'Λήγει σήμερα' : 'Expires today') :
                                daysLeft === 1 ? (language === 'el' ? 'Λήγει αύριο' : 'Expires tomorrow') :
                                    `${daysLeft} ${language === 'el' ? 'ημέρες' : 'days'}`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
