"use client"

import { useState } from 'react'
import type { SettingsProps } from './types'
import { deleteAccount } from '@/app/(protected)/account/actions'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, Globe, Bell, Lock, AlertTriangle, CheckCircle2, Zap, Loader2, ChevronRight, LogIn, LogOut, KeyRound, Mail } from 'lucide-react'
import { ProcessingHUD } from '@/components/ui/ProcessingHUD'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export function Settings({
    currentUser,
    activeSessions,
    securityEvents,
    notificationPreferences,
    onUpdateEmail,
    onUpdateProfile,
    onChangePassword,
    onUpdateLanguage,
    onToggleNotification,
    onLogoutSession,
    onLogoutAllSessions
}: SettingsProps) {
    const { t } = useLanguage()
    const [isEditingName, setIsEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState(currentUser.name || '')

    // Phone State
    const [isEditingPhone, setIsEditingPhone] = useState(false)
    const [phoneDraft, setPhoneDraft] = useState(currentUser.phone_number || '')

    // Email State
    const [isEditingEmail, setIsEditingEmail] = useState(false)
    const [emailDraft, setEmailDraft] = useState(currentUser.email || '')

    // Password State
    const [isEditingPassword, setIsEditingPassword] = useState(false)
    const [passwordDraft, setPasswordDraft] = useState('')

    const [isDeleting, setIsDeleting] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingMessage, setProcessingMessage] = useState('')
    const router = useRouter()

    const withProcessing = async (message: string, action: () => Promise<void>) => {
        setProcessingMessage(message)
        setIsProcessing(true)
        try {
            await action()
        } catch (error) {
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSaveName = () => {
        withProcessing(t.settings.updatingProfile, async () => {
            await onUpdateProfile?.({ name: nameDraft })
            setIsEditingName(false)
        })
    }

    const handleSavePhone = () => {
        withProcessing(t.settings.updatingPhone, async () => {
            await onUpdateProfile?.({ phone: phoneDraft })
            setIsEditingPhone(false)
        })
    }

    const handleSaveEmail = () => {
        if (emailDraft && emailDraft !== currentUser.email) {
            withProcessing(t.settings.updatingEmail, async () => {
                await onUpdateEmail?.(emailDraft)
                setIsEditingEmail(false)
            })
        } else {
            setIsEditingEmail(false)
        }
    }

    const handleSavePassword = () => {
        if (passwordDraft) {
            withProcessing(t.settings.securingPassword, async () => {
                await (onChangePassword as any)?.(passwordDraft)
                setIsEditingPassword(false)
                setPasswordDraft('')
            })
        } else {
            setIsEditingPassword(false)
        }
    }

    const handleLanguageUpdate = (lang: 'el' | 'en') => {
        withProcessing(t.settings.switchingLanguage, async () => {
            await onUpdateLanguage?.(lang)
        })
    }

    const handleDeleteAccount = async () => {
        if (confirm(t.settings.deleteAccountConfirm)) {
            setIsDeleting(true)
            setProcessingMessage(t.settings.finalizingDeletion)
            setIsProcessing(true)
            const res = await deleteAccount()
            if (res.success) {
                router.push('/')
            } else {
                toast.error(t.settings.deleteFailed)
                setIsDeleting(false)
                setIsProcessing(false)
            }
        }
    }

    // Helper for Notifications
    const isPreferenceEnabled = (eventType: string, channel: string) => {
        const pref = notificationPreferences.find(p => p.event_type === eventType && p.channel === channel)
        return pref ? pref.enabled : true
    }

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('el-GR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'desktop': return <Globe className="w-5 h-5" />
            case 'mobile': return <Smartphone className="w-5 h-5" />
            default: return <Shield className="w-5 h-5" />
        }
    }

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'login': return { Icon: LogIn, color: 'text-primary dark:text-mint bg-primary-soft dark:bg-primary/15' }
            case 'login_failed': return { Icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' }
            case 'logout': return { Icon: LogOut, color: 'text-black/45 dark:text-white/60 bg-black/5 dark:bg-black' }
            case 'password_change': return { Icon: KeyRound, color: 'text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/10' }
            case 'email_change': return { Icon: Mail, color: 'text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/10' }
            default: return { Icon: Bell, color: 'text-black/45 dark:text-white/60 bg-black/5 dark:bg-black' }
        }
    }

    const getEventLabel = (eventType: string) => {
        const labels: Record<string, string> = {
            login: t.settings.successfulLogin,
            login_failed: t.settings.loginFailed,
            logout: t.settings.systemSignOut,
            password_change: t.settings.credentialUpdate,
            email_change: t.settings.emailUpdate
        }
        return labels[eventType] || eventType
    }

    return (
        <div className="max-w-7xl mx-auto py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Account Identity & Communication */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Identity Matrix */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pw-card p-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.settings.identityMatrix}</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Name Edit */}
                            <div className="group">
                                <label className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-[0.2em] block mb-3">{t.settings.fullName}</label>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            autoFocus
                                            className="flex-1 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary transition-all outline-none"
                                        />
                                        <button onClick={handleSaveName} className="p-2 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-xl shadow-lg shadow-primary/25 active:scale-90 transition-transform">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setNameDraft(currentUser.name || '') }} className="p-2 border border-black/10 dark:border-white/15 rounded-xl active:scale-90 transition-transform">
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl group/item hover:border-primary/35 transition-all">
                                        <span className="text-sm font-black text-black dark:text-white tracking-tight">{currentUser.name || t.settings.setYourName}</span>
                                        <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover/item:opacity-100 text-[10px] font-black uppercase tracking-widest text-primary dark:text-mint transition-all">{t.billing.edit}</button>
                                    </div>
                                )}
                            </div>

                            {/* Email Edit */}
                            <div className="group">
                                <label className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-[0.2em] block mb-3">{t.settings.registeredEmail}</label>
                                {isEditingEmail ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={emailDraft}
                                            onChange={(e) => setEmailDraft(e.target.value)}
                                            className="flex-1 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary transition-all outline-none"
                                        />
                                        <button onClick={handleSaveEmail} className="p-2 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-xl shadow-lg shadow-primary/25 active:scale-90 transition-transform">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setIsEditingEmail(false); setEmailDraft(currentUser.email) }} className="p-2 border border-black/10 dark:border-white/15 rounded-xl active:scale-90 transition-transform">
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl group/item hover:border-primary/35 transition-all">
                                        <span className="text-sm font-black text-black dark:text-white tracking-tight">{currentUser.email}</span>
                                        <button onClick={() => setIsEditingEmail(true)} className="opacity-0 group-hover/item:opacity-100 text-[10px] font-black uppercase tracking-widest text-primary dark:text-mint transition-all">{t.billing.edit}</button>
                                    </div>
                                )}
                            </div>

                            {/* Language Matrix */}
                            <div className="group pt-6 border-t border-black/10 dark:border-white/15">
                                <label className="text-[10px] font-black text-black/45 dark:text-white/60 uppercase tracking-[0.2em] block mb-4">{t.settings.preferredLanguage}</label>
                                <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl">
                                    <button
                                        onClick={() => handleLanguageUpdate('el')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'el' ? 'bg-white dark:bg-black text-primary dark:text-mint shadow-md transform scale-[1.02]' : 'text-black/45 dark:text-white/60 hover:text-black/70 dark:hover:text-white/80'}`}
                                    >
                                        {t.settings.greek}
                                    </button>
                                    <button
                                        onClick={() => handleLanguageUpdate('en')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'en' ? 'bg-white dark:bg-black text-primary dark:text-mint shadow-md transform scale-[1.02]' : 'text-black/45 dark:text-white/60 hover:text-black/70 dark:hover:text-white/80'}`}
                                    >
                                        {t.settings.english}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Communication Preferences */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="pw-card p-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.settings.communicationControl}</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { id: 'policy_expiry', label: t.settings.policyExpiry, icon: AlertTriangle },
                                { id: 'security_alert', label: t.settings.securityAlert, icon: Shield },
                                { id: 'marketing', label: t.settings.innovationUpdates, icon: Zap }
                            ].map(pref => (
                                <div key={pref.id} className="flex items-center justify-between group p-3 hover:bg-black/5 dark:hover:bg-black/80 rounded-2xl transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-black border border-black/10 dark:border-white/15 flex items-center justify-center text-black/45 dark:text-white/60 group-hover:text-primary dark:group-hover:text-mint transition-all">
                                            <pref.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-black/80 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors">{pref.label}</span>
                                    </div>
                                    <button
                                        onClick={() => onToggleNotification?.(pref.id, 'email', !isPreferenceEnabled(pref.id, 'email'))}
                                        className={`w-11 h-6 rounded-full transition-all relative ${isPreferenceEnabled(pref.id, 'email') ? 'bg-primary' : 'bg-black/10 dark:bg-white/15'}`}
                                    >
                                        <motion.span
                                            animate={{ x: isPreferenceEnabled(pref.id, 'email') ? 22 : 2 }}
                                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full"
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Secondary Identity Actions */}
                    <div className="space-y-3">
                        <div className="p-6 bg-black rounded-[28px] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-mint/10 blur-3xl"></div>
                            <h4 className="text-xl font-black tracking-tight mb-4">{t.settings.securityFirst} <span className="text-white/70 italic">{t.settings.securityFirstSubtitle}</span></h4>
                            <p className="text-white/75 text-[10px] font-bold leading-relaxed mb-8 italic">
                                {t.settings.securityFirstDesc}
                            </p>
                            <button
                                onClick={() => withProcessing("Terminating all sessions...", async () => { await onLogoutAllSessions?.() })}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:border-red-500 transition-all text-white/80 hover:text-white"
                            >
                                {t.settings.masterSignOut}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Col: Sessions & Logs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Security Posture Score */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-black rounded-[28px] p-6 text-white relative overflow-hidden group shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-mint/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>

                        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                    <motion.circle
                                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        className="text-mint"
                                        initial={{ strokeDasharray: "365 365", strokeDashoffset: 365 }}
                                        animate={{ strokeDashoffset: 365 - (365 * 0.85) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black">85</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{t.settings.score}</span>
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-mint" />
                                    <h3 className="text-2xl font-black tracking-tight">{t.settings.accountShield}</h3>
                                </div>
                                <p className="text-white/75 text-sm font-medium leading-relaxed max-w-md">
                                    {t.settings.securityPosture} <span className="text-white font-black">{t.settings.excellent}</span>. We found <span className="text-mint underline decoration-mint/35">{t.settings.optimizations}</span> {t.settings.securityPostureDesc}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-6">
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">{t.settings.verified2FA}</span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">{t.settings.safeIP}</span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-mint">{t.settings.encryptionActive}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Active Sessions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="pw-card overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-black/10 dark:border-white/15 flex items-center justify-between bg-black/5 dark:bg-black/50">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-4 h-4 text-black/45 dark:text-white/60" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.settings.activeSessions}</h3>
                            </div>
                            <span className="px-3 py-1 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint text-[10px] font-black uppercase tracking-widest rounded-full">{activeSessions.length} {t.settings.total}</span>
                        </div>

                        <div className="divide-y divide-black/10 dark:divide-white/10">
                            {activeSessions.map((session) => (
                                <div key={session.session_id} className="px-6 py-5 group hover:bg-black/5 dark:hover:bg-black/80 transition-all">
                                    <div className="flex items-start gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-black flex items-center justify-center text-black/45 dark:text-white/60 group-hover:text-primary dark:group-hover:text-mint transition-all border border-transparent group-hover:border-primary/20">
                                            {getDeviceIcon(session.device_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-sm font-black text-black dark:text-white uppercase tracking-tight">
                                                    {session.device_name}
                                                </span>
                                                {session.is_current && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary text-white dark:text-[#1A2420] rounded-full">
                                                        {t.settings.activeNow}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold text-black/45 dark:text-white/60 uppercase tracking-widest flex items-center gap-2">
                                                <span>{session.location}</span>
                                                <span className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/25" />
                                                <span className="font-mono">{session.ip_address}</span>
                                            </div>
                                            <div className="text-[9px] font-medium text-black/45 dark:text-white/60 mt-2 italic flex items-center gap-1.5">
                                                <Globe className="w-3 h-3" />
                                                {t.settings.since} {formatDateTime(session.last_active_at)}
                                            </div>
                                        </div>
                                        {!session.is_current && (
                                            <button
                                                onClick={() => withProcessing(t.settings.revokeAccess + "...", async () => { await onLogoutSession?.(session.session_id) })}
                                                className="text-[9px] font-black uppercase tracking-widest text-black/45 dark:text-white/60 hover:text-red-500 hover:scale-105 transition-all pt-2"
                                            >
                                                {t.settings.revokeAccess}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Security Events Log */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="pw-card overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-black/10 dark:border-white/15 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Lock className="w-4 h-4 text-black/45 dark:text-white/60" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t.settings.auditTrail}</h3>
                            </div>
                            <button className="text-[9px] font-black text-primary dark:text-mint uppercase tracking-widest hover:underline">{t.settings.downloadReport}</button>
                        </div>

                        <div className="divide-y divide-black/10 dark:divide-white/10">
                            {securityEvents.slice(0, 5).map((event) => {
                                const config = getEventIcon(event.event_type)
                                return (
                                    <div key={event.event_id} className="px-6 py-4 hover:bg-black/5 dark:hover:bg-black/80 transition-all border-l-4 border-l-transparent hover:border-l-primary">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                                                <config.Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-tight">
                                                        {getEventLabel(event.event_type)}
                                                    </span>
                                                    {!event.success && (
                                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                            Alert
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-black/45 dark:text-white/60 uppercase tracking-widest flex items-center gap-2">
                                                    <span>{event.device_name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-black/10 dark:bg-white/25" />
                                                    <span>{formatDateTime(event.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-[9px] font-black text-black dark:text-white tracking-widest font-mono">{event.ip_address}</div>
                                                <div className="text-[8px] text-black/45 dark:text-white/60 font-bold uppercase tracking-widest">{event.location}</div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>

                    {/* Danger Zone */}
                    <div className="p-6 border-2 border-dashed border-red-500/10 bg-red-50/20 dark:bg-red-900/5 rounded-[28px] flex flex-col md:flex-row items-center justify-between gap-6 group">
                        <div className="max-w-md text-center md:text-left">
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-3">{t.settings.nuclearDeletion}</h4>
                            <p className="text-[11px] text-black/60 dark:text-white/60 font-bold leading-relaxed">
                                {t.settings.nuclearDesc}
                            </p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:shadow-red-600/40 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                            {isDeleting ? t.settings.processing : t.settings.deletePermanently}
                        </button>
                    </div>
                </div>
            </div>

            <ProcessingHUD
                isVisible={isProcessing}
                message={processingMessage}
            />
        </div>
    )
}






