"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, CreditCard, Shield, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PricingPage() {
    const router = useRouter()
    const { language } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubscribe = async () => {
        setIsLoading(true)
        try {
            // Simulate Stripe processing delay
            await new Promise(r => setTimeout(r, 1500))

            // In a real implementation this would call a server action
            toast.success(language === 'el' ? 'Μεταφορά στο Stripe...' : 'Redirecting to Stripe...')

            setTimeout(() => {
                toast.success(language === 'el' ? 'Η πληρωμή ολοκληρώθηκε! (Προσομοίωση)' : 'Payment Successful! (Simulation)')
                router.back()
            }, 1000)

        } catch (error) {
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const t = {
        title: language === 'el' ? 'Αναβαθμίστε την Εμπειρία σας' : 'Upgrade Your Experience',
        subtitle: language === 'el' ? 'Ξεκλειδώστε όλη τη δύναμη του PolicyWallet' : 'Unlock the full power of PolicyWallet',
        planName: 'Premium',
        price: '€4.99',
        frequency: language === 'el' ? '/ μήνα' : '/ month',
        features: [
            language === 'el' ? '500 Ερωτήματα AI / μήνα' : '500 AI Questions / month',
            language === 'el' ? '50 Αναλύσεις Συμβολαίων / μήνα' : '50 Policy Analyses / month',
            language === 'el' ? 'Απεριόριστα Συμβόλαια' : 'Unlimited Policies',
            language === 'el' ? 'Ανίχνευση Κενών Ασφάλισης' : 'Gap Detection Analysis',
            language === 'el' ? 'Προτεραιότητα Υποστήριξης' : 'Priority Support'
        ],
        cta: language === 'el' ? 'Πληρωμή με Stripe' : 'Pay with Stripe',
        processing: language === 'el' ? 'Επεξεργασία...' : 'Processing...',
        secure: language === 'el' ? 'Ασφαλής πληρωμή μέσω Stripe' : 'Secure payment via Stripe'
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pt-24 pb-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-sm mb-6">
                    <Sparkles className="w-4 h-4" />
                    Premium Access
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">
                    {t.title}
                </h1>
                <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            <div className="max-w-md mx-auto relative">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-[34px] blur opacity-30 animate-pulse" />

                <div className="relative bg-white dark:bg-stone-900 rounded-[32px] overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800">
                    <div className="p-8 sm:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-2">{t.planName}</h2>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{t.price}</span>
                                    <span className="text-stone-500 font-medium">{t.frequency}</span>
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                                <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            {t.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-stone-700 dark:text-stone-300 font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSubscribe}
                            disabled={isLoading}
                            className="w-full py-4 px-6 bg-[#635BFF] hover:bg-[#5851E3] text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <CreditCard className="w-5 h-5 animate-pulse" />
                                    {t.processing}
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    {t.cta}
                                </>
                            )}
                        </button>

                        <p className="mt-6 text-xs text-center text-stone-500 flex items-center justify-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            {t.secure}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
