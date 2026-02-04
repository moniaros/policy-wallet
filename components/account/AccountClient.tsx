"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    User,
    CreditCard,
    Users,
    Settings,
    Shield,
    Bell,
    Globe,
    Lock,
    Mail,
    Phone,
    Calendar,
    TrendingUp,
    Award,
    Sparkles,
    Target,
    ExternalLink,
    Loader2,
    ChevronRight,
    LogOut,
    Smartphone,
    Monitor,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Save,
    MapPin,
    ArrowLeft
} from 'lucide-react'
import {
    createBillingPortalSession,
    upgradeSubscription,
    updateProfile,
    updatePreferredLanguage,
    logoutSession,
    logoutAllSessions,
    updatePassword,
    toggleNotificationPreference,
    deleteAccount
} from '@/app/(protected)/account/actions'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { createClient } from '@/lib/supabase/client'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface AccountClientProps {
    initialData: {
        user: any
        currentPlan: any
        currentSubscription: any
        usageMetrics: any
        creditBalance: number
        referrals: any[]
        activeSessions: any[]
        availablePlans: any[]
        securityEvents: any[]
        notificationPreferences: any[]
        invoices: any[]
    }
    userLanguage?: string
}

type MenuSection = 'overview' | 'profile' | 'billing' | 'security' | 'notifications' | 'referrals'

export function AccountClient({ initialData, userLanguage = 'en' }: AccountClientProps) {
    const [activeSection, setActiveSection] = useState<MenuSection>('overview')
    const [isMobileView, setIsMobileView] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null)
    const [isPortalLoading, setIsPortalLoading] = useState(false)
    const lang = userLanguage === 'el' ? 'el' : 'en'
    const searchParams = useSearchParams()
    const router = useRouter()

    // Form states
    const [profileForm, setProfileForm] = useState({
        name: initialData.user?.name || '',
        phone: initialData.user?.phone_number || ''
    })

    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new: '',
        confirm: ''
    })

    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const upsell = searchParams.get('upsell')
        if (upsell === 'coverage') {
            setActiveSection('billing')
            toast.info(
                lang === 'el'
                    ? "Η πρόσβαση στην Ανάλυση Κάλυψης απαιτεί συνδρομή Plus ή Premium."
                    : "Access to Coverage Analysis requires a Plus or Premium subscription.",
                { duration: 6000 }
            )
        }
    }, [searchParams, lang])

    const handleOpenPortal = async () => {
        setIsPortalLoading(true)
        try {
            const res = await createBillingPortalSession()
            if (res.error) toast.error(res.error)
            else if (res.url) window.location.href = res.url
        } catch (err) {
            toast.error("Failed to open billing portal")
        } finally {
            setIsPortalLoading(false)
        }
    }

    const handleUpgrade = async (planId: string) => {
        setIsActionLoading(`upgrade-${planId}`)
        try {
            const res = await upgradeSubscription(planId)
            if (res.error) toast.error(res.error)
            else if (res.url) window.location.href = res.url
            else if (res.success) toast.success("Subscription updated!")
        } catch (err) {
            toast.error("Upgrade failed")
        } finally {
            setIsActionLoading(null)
        }
    }

    const onUpdateProfile = async () => {
        setIsActionLoading('profile')
        try {
            const res = await updateProfile(profileForm)
            if (res.error) toast.error(res.error)
            else toast.success(lang === 'el' ? "Το προφίλ ενημερώθηκε" : "Profile updated")
        } finally {
            setIsActionLoading(null)
        }
    }

    const onUpdateLanguage = async (newLang: 'el' | 'en') => {
        setIsActionLoading('lang')
        try {
            await updatePreferredLanguage(newLang)
            toast.success(lang === 'el' ? "Η γλώσσα άλλαξε" : "Language updated")
        } finally {
            setIsActionLoading(null)
        }
    }

    const onLogoutSession = async (sid: string) => {
        try {
            await logoutSession(sid)
            toast.success("Session terminated")
        } catch (e) {
            toast.error("Failed to logout session")
        }
    }

    const onToggleNotif = async (type: string, channel: string, current: boolean) => {
        try {
            await toggleNotificationPreference(type, channel, !current)
            toast.success("Preference updated")
        } catch (e) {
            toast.error("Failed to update preference")
        }
    }

    const onUpdatePassword = async () => {
        if (passwordForm.new !== passwordForm.confirm) {
            toast.error("Passwords do not match")
            return
        }
        if (!passwordForm.new || passwordForm.new.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        setIsActionLoading('password')
        try {
            const res = await updatePassword(passwordForm.new)
            if (res.error) toast.error(res.error)
            else {
                toast.success(lang === 'el' ? "Ο κωδικός άλλαξε" : "Password updated")
                setPasswordForm({ current: '', new: '', confirm: '' })
            }
        } finally {
            setIsActionLoading(null)
        }
    }

    const onSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const copy = {
        title: { el: 'Ο Λογαριασμός μου', en: 'My Account' },
        overview: { el: 'Επισκόπηση', en: 'Overview' },
        profile: { el: 'Προφίλ', en: 'Profile' },
        billing: { el: 'Συνδρομή & Πληρωμές', en: 'Billing & Plans' },
        security: { el: 'Ασφάλεια', en: 'Security' },
        notifications: { el: 'Ειδοποιήσεις', en: 'Notifications' },
        referrals: { el: 'Συστάσεις', en: 'Referrals' },
    }

    const MenuItem = ({ id, label, icon: Icon, color: colorClass }: { id: MenuSection, label: string, icon: any, color: string }) => (
        <button
            onClick={() => setActiveSection(id)}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group",
                activeSection === id
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-sm"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
            )}
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    activeSection === id ? "bg-amber-500 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                    <p className={cn(
                        "font-bold text-sm",
                        activeSection === id ? "text-amber-900 dark:text-amber-100" : "text-slate-700 dark:text-slate-200"
                    )}>{label}</p>
                </div>
            </div>
            <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                activeSection === id ? "text-amber-500 translate-x-1" : "text-slate-300"
            )} />
        </button>
    )

    const SectionHeader = ({ title, showBack = false }: { title: string, showBack?: boolean }) => (
        <div className="flex items-center gap-4 mb-8">
            {showBack && (
                <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
            )}
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                {title}
            </h2>
        </div>
    )

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Mobile Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl">
                                <Award className="absolute top-4 right-4 w-24 h-24 text-white/10 -mr-4 -mt-4 rotate-12" />
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-100 mb-1">Current Plan</p>
                                <h3 className="text-3xl font-black mb-4">{initialData.currentPlan?.name || 'Free Tier'}</h3>
                                <button
                                    onClick={() => setActiveSection('billing')}
                                    className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                >
                                    Manage Subscription
                                </button>
                            </div>
                            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Account Balance</p>
                                    <h3 className="text-4xl font-black mb-2">€{initialData.creditBalance || 0}</h3>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Syncing with Billing</span>
                                </div>
                            </div>
                        </div>

                        {/* Usage Quick View */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4 text-amber-500" />
                                Resource Usage
                            </h4>
                            <div className="space-y-4">
                                {initialData.usageMetrics?.map((m: any) => (
                                    <div key={m.usage_id}>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-slate-500 dark:text-slate-400 uppercase">{m.usage_type.replace('_', ' ')}</span>
                                            <span className="text-slate-900 dark:text-white">{m.amount_used} / {m.amount_limit}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (m.amount_used / (typeof m.amount_limit === 'number' ? m.amount_limit : 100)) * 100)}%` }}
                                                className="h-full bg-amber-500"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Menu Grid (Visible only on desktop in this column) */}
                        {!isMobileView && (
                            <div className="grid grid-cols-2 gap-4">
                                <MenuItem id="profile" label="Edit Profile" icon={User} color="amber" />
                                <MenuItem id="billing" label="Billing & Plans" icon={CreditCard} color="blue" />
                                <MenuItem id="security" label="Security" icon={Shield} color="red" />
                                <MenuItem id="notifications" label="Notifications" icon={Bell} color="green" />
                            </div>
                        )}
                    </motion.div>
                )
            case 'profile':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SectionHeader title={copy.profile[lang]} showBack={isMobileView} />
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 space-y-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-amber-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                                        {initialData.user?.name?.[0] || 'U'}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                                        <Smartphone className="w-4 h-4 text-amber-500" />
                                    </div>
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl font-black">{initialData.user?.name || 'Policyholder'}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Member since {new Date(initialData.user?.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black uppercase text-slate-400">Language Preference</h4>
                                <div className="flex gap-2">
                                    {['en', 'el'].map((l) => (
                                        <button
                                            key={l}
                                            onClick={() => onUpdateLanguage(l as any)}
                                            className={cn(
                                                "flex-1 p-4 rounded-2xl border text-sm font-black transition-all",
                                                lang === l
                                                    ? "bg-amber-500 border-amber-500 text-white shadow-lg"
                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <Globe className="w-4 h-4 mx-auto mb-1" />
                                            {l === 'el' ? 'Greek' : 'English'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={onUpdateProfile}
                                disabled={isActionLoading === 'profile'}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isActionLoading === 'profile' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Update Profile
                            </button>
                        </div>
                    </motion.div>
                )
            case 'billing':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SectionHeader title={copy.billing[lang]} showBack={isMobileView} />

                        <div className="space-y-6">
                            {/* Manage Billing */}
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="bg-amber-500 p-1.5 rounded-lg">
                                                <CreditCard className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black">Billing Portal</h3>
                                        </div>
                                        <p className="text-slate-400 text-sm max-w-md">Access your Stripe-powered billing center to manage cards, view tax info, and download historical invoices.</p>
                                    </div>
                                    <button
                                        onClick={handleOpenPortal}
                                        disabled={isPortalLoading}
                                        className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-white transition-all shadow-xl"
                                    >
                                        {isPortalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                                        Go to Portal
                                    </button>
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {initialData.availablePlans?.map((plan: any) => {
                                    const isCurrent = initialData.currentPlan?.plan_id === plan.plan_id
                                    return (
                                        <div
                                            key={plan.plan_id}
                                            className={cn(
                                                "relative bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 transition-all flex flex-col",
                                                isCurrent ? "border-amber-500 shadow-2xl scale-105 z-10" : "border-slate-100 dark:border-slate-800 shadow-xl opacity-80"
                                            )}
                                        >
                                            {isCurrent && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full border-4 border-white dark:border-slate-950">
                                                    Your current plan
                                                </div>
                                            )}
                                            <h4 className="text-2xl font-black mb-1">{plan.name}</h4>
                                            <div className="flex items-baseline gap-1 mb-8">
                                                <span className="text-4xl font-black">€{plan.price}</span>
                                                <span className="text-slate-400 text-sm">/{plan.billing_interval}</span>
                                            </div>

                                            <ul className="space-y-4 mb-10 flex-1">
                                                {Object.entries(plan.entitlements || {}).map(([key, val]: [string, any]) => (
                                                    <li key={key} className="flex items-start gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                        <div className="flex flex-col">
                                                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="text-[10px] uppercase text-slate-400 tracking-tighter">
                                                                {val === 'unlimited' ? '∞' : val === true ? 'Enabled' : val}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>

                                            <button
                                                onClick={() => handleUpgrade(plan.plan_id)}
                                                disabled={isCurrent || !!isActionLoading}
                                                className={cn(
                                                    "w-full py-4 rounded-2xl font-black text-sm transition-all",
                                                    isCurrent
                                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                        : "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 active:scale-95"
                                                )}
                                            >
                                                {isActionLoading === `upgrade-${plan.plan_id}` ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isCurrent ? "Current Plan" : "Upgrade Now")}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Recent Invoices */}
                            {initialData.invoices?.length > 0 && (
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Recent Invoices</h4>
                                    <div className="space-y-2">
                                        {initialData.invoices.map((inv: any) => (
                                            <div key={inv.invoice_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                                                        <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black">{inv.invoice_number}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(inv.issued_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black uppercase tracking-tighter">€{inv.amount_total} {inv.currency}</p>
                                                    <a href={inv.pdf_url} className="text-[10px] text-amber-600 font-black uppercase underline">Download</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )
            case 'security':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SectionHeader title={copy.security[lang]} showBack={isMobileView} />

                        <div className="space-y-6">
                            {/* Password Update */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-black">Change Password</h3>
                                </div>
                                <div className="space-y-4">
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={passwordForm.new}
                                        onChange={(e) => setPasswordForm(f => ({ ...f, new: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        value={passwordForm.confirm}
                                        onChange={(e) => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={onUpdatePassword}
                                        disabled={isActionLoading === 'password'}
                                        className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isActionLoading === 'password' && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Save New Password
                                    </button>
                                </div>
                            </div>

                            {/* Active Sessions */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                                            <Smartphone className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-black">Active Sessions</h3>
                                    </div>
                                    <button
                                        onClick={() => logoutAllSessions()}
                                        className="text-xs font-black text-red-500 uppercase tracking-widest hover:underline"
                                    >
                                        Log out all
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {initialData.activeSessions?.map((s) => (
                                        <div key={s.session_id} className="py-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                {s.device_type === 'mobile' ? <Smartphone className="w-5 h-5 text-slate-400" /> : <Monitor className="w-5 h-5 text-slate-400" />}
                                                <div>
                                                    <p className="text-sm font-bold">{s.device_name || 'Generic Device'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{s.location} • {s.ip_address}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onLogoutSession(s.session_id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl p-6 border border-red-100 dark:border-red-900/30">
                                <h4 className="text-red-600 dark:text-red-400 text-sm font-black uppercase mb-2">Danger Zone</h4>
                                <p className="text-red-500/70 text-xs font-bold mb-4">Permanently delete your account and all policy data. This cannot be undone.</p>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure? This is permanent.")) deleteAccount()
                                    }}
                                    className="w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-red-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )
            case 'notifications':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SectionHeader title={copy.notifications[lang]} showBack={isMobileView} />
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
                            {[
                                { id: 'policy_expiry', title: 'Policy Expiry', desc: 'Alerts when a policy is about to expire' },
                                { id: 'billing_updates', title: 'Billing & Invoices', desc: 'Payment confirmations and issues' },
                                { id: 'security_alerts', title: 'Security Alerts', desc: 'New logins or suspicious activity' }
                            ].map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black">{item.title}</h4>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{item.desc}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        {['email', 'push'].map(channel => {
                                            const pref = initialData.notificationPreferences?.find(p => p.event_type === item.id && p.channel === channel)
                                            const isEnabled = pref?.enabled ?? true
                                            return (
                                                <button
                                                    key={channel}
                                                    onClick={() => onToggleNotif(item.id, channel, isEnabled)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all",
                                                        isEnabled
                                                            ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                                                            : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                                                    )}
                                                >
                                                    {channel}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )
            case 'referrals':
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SectionHeader title={copy.referrals[lang]} showBack={isMobileView} />
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl text-center">
                            <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-6" />
                            <h3 className="text-3xl font-black mb-2">Share & Save</h3>
                            <p className="text-blue-100 mb-8 max-w-sm mx-auto">Refer a friend. When they start a premium subscription, you both get €10 credit.</p>
                            <div className="flex flex-col gap-2">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 font-mono text-sm tracking-widest uppercase border border-white/20">
                                    PW-{initialData.user?.user_id?.substring(0, 8) || 'REFCODE'}
                                </div>
                                <button className="bg-white text-blue-600 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 font-sans selection:bg-amber-500 selection:text-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16">

                {/* Visual Accent */}
                <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 z-50" />

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Navigation Rail / Sidebar */}
                    <motion.aside
                        className={cn(
                            "lg:w-80 space-y-2",
                            isMobileView && activeSection !== 'overview' ? "hidden" : "block"
                        )}
                    >
                        {/* User Summary Widget */}
                        <div className="mb-10 px-2 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                {initialData.user?.name?.[0] || 'U'}
                            </div>
                            <div>
                                <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                                    {initialData.user?.name || 'Policyholder'}
                                </h1>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {initialData.currentPlan?.name || 'Basic User'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <MenuItem id="overview" label="Dashboard" icon={Target} color="amber" />
                            <MenuItem id="profile" label="Personal Info" icon={User} color="amber" />
                            <MenuItem id="billing" label="Billing & Plan" icon={CreditCard} color="blue" />
                            <MenuItem id="security" label="Security" icon={Shield} color="red" />
                            <MenuItem id="notifications" label="Notifications" icon={Bell} color="green" />
                            <MenuItem id="referrals" label="Referrals" icon={Users} color="purple" />
                        </div>

                        <div className="pt-8 px-2">
                            <button
                                onClick={onSignOut}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-400 hover:text-red-500 transition-colors font-bold text-sm"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    </motion.aside>

                    {/* Main Stage */}
                    <main className={cn(
                        "flex-1",
                        isMobileView && activeSection === 'overview' ? "hidden" : "block"
                    )}>
                        <AnimatePresence mode="wait">
                            <div key={activeSection}>
                                {renderContent()}
                            </div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
                
                :root {
                    --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                
                body {
                    font-family: var(--font-sans);
                }
            `}</style>
        </div>
    )
}
