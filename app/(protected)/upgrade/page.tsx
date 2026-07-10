"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { PricingComparison } from '@/components/account/PricingComparison'
import { getSubscriptionCopy } from '@/lib/subscription-copy'
import { upgradeSubscription } from '../account/actions'
import { trackJourneyEvent } from '@/lib/journey/funnel'

export default function PricingPage() {
    const router = useRouter()
    const { language } = useLanguage()
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

    // In a real app, we would fetch the current plan from an API or Context
    const currentPlanId = 'ph-free'

    const handleSubscribe = async (planId: string) => {
        if (planId === currentPlanId) return

        setLoadingPlanId(planId)
        try {
            const result = await upgradeSubscription(planId)

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (result.url) {
                trackJourneyEvent('upgrade_started', {
                    source: 'protected_upgrade_page',
                    tier: planId,
                })
                toast.success(language === 'el' ? 'Μεταφορά στο Stripe...' : 'Redirecting to Stripe...')
                // Wait a moment for the toast
                setTimeout(() => {
                    window.location.href = result.url!
                }, 800)
            } else if (result.success) {
                trackJourneyEvent('upgrade_completed', {
                    source: 'protected_upgrade_page',
                    tier: planId,
                })
                toast.success(language === 'el' ? 'Το πλάνο ενημερώθηκε!' : 'Plan updated successfully!')
                router.refresh()
                router.back()
            }
        } catch (error) {
            toast.error(language === 'el' ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : "Something went wrong. Please try again.")
        } finally {
            setLoadingPlanId(null)
        }
    }

    const headingTitle = getSubscriptionCopy('headings.pricing.title', language)
    const headingSubtitle = getSubscriptionCopy('headings.pricing.subtitle', language)
    const secureText = getSubscriptionCopy('trust.secure', language)

    return (
        <div className="min-h-screen bg-white dark:bg-stone-950 pb-20 relative overflow-hidden">
            {/* High-Fidelity Background Patterns */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-primary/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#F8FAFC]/50 dark:bg-slate-900/20"></div>

                {/* Geometric Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                        backgroundSize: '32px 32px'
                    }}>
                </div>
            </div>

            {/* Header / Nav */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-100 dark:border-stone-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-bold text-sm">Back</span>
                    </button>
                    <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4 text-primary dark:text-mint" />
                        {secureText}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="pt-24 pb-16 text-center px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft dark:bg-primary/15 border border-primary/20 dark:border-primary/30 text-primary dark:text-mint text-xs font-black uppercase tracking-widest mb-8">
                        <Zap className="w-3.5 h-3.5" />
                        Unleash Full Potential
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-stone-900 dark:text-white mb-8 tracking-tighter leading-none">
                        {headingTitle}
                    </h1>
                    <p className="text-xl text-stone-500 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed font-bold">
                        {headingSubtitle}
                    </p>
                </motion.div>
            </div>

            <div className="relative z-10">
                {/* Pricing Comparison */}
                <PricingComparison
                    currentPlanId={currentPlanId}
                    onSelectPlan={handleSubscribe}
                    loadingPlanId={loadingPlanId}
                />
            </div>

            {/* Trust Signals / Logos */}
            <div className="mt-20 border-t border-stone-100 dark:border-stone-800 pt-16 relative z-10">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-10">
                        Trusted by industry leaders worldwide
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        {/* Mock Logos or SVG Patterns */}
                        <div className="text-xl font-black italic tracking-tighter">ALLIANZ</div>
                        <div className="text-xl font-black italic tracking-tighter text-primary dark:text-mint">AXA</div>
                        <div className="text-xl font-black italic tracking-tighter">METLIFE</div>
                        <div className="text-xl font-black italic tracking-tighter text-primary dark:text-mint">PWC</div>
                        <div className="text-xl font-black italic tracking-tighter">SWISS RE</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

