"use client"

import { useState } from 'react'
import type { SettingsProps } from './types'
import { deleteAccount } from '@/app/(protected)/account/actions'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, Globe, Bell, Lock, AlertTriangle, CheckCircle2, Zap, Loader2, ChevronRight } from 'lucide-react'
import { ProcessingHUD } from '@/components/ui/ProcessingHUD'

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
        withProcessing("Updating profile name...", async () => {
            await onUpdateProfile?.({ name: nameDraft })
            setIsEditingName(false)
        })
    }

    const handleSavePhone = () => {
        withProcessing("Updating phone number...", async () => {
            await onUpdateProfile?.({ phone: phoneDraft })
            setIsEditingPhone(false)
        })
    }

    const handleSaveEmail = () => {
        if (emailDraft && emailDraft !== currentUser.email) {
            withProcessing("Updating email address...", async () => {
                await onUpdateEmail?.(emailDraft)
                setIsEditingEmail(false)
            })
        } else {
            setIsEditingEmail(false)
        }
    }

    const handleSavePassword = () => {
        if (passwordDraft) {
            withProcessing("Securing new password...", async () => {
                await (onChangePassword as any)?.(passwordDraft)
                setIsEditingPassword(false)
                setPasswordDraft('')
            })
        } else {
            setIsEditingPassword(false)
        }
    }

    const handleLanguageUpdate = (lang: 'el' | 'en') => {
        withProcessing(lang === 'el' ? "Αλλαγή γλώσσας..." : "Switching language...", async () => {
            await onUpdateLanguage?.(lang)
        })
    }

    const handleDeleteAccount = async () => {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            setIsDeleting(true)
            setProcessingMessage("Finalizing account deletion...")
            setIsProcessing(true)
            const res = await deleteAccount()
            if (res.success) {
                router.push('/')
            } else {
                alert("Failed to delete account")
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
            case 'login': return { icon: '🔓', color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' }
            case 'login_failed': return { icon: '⚠️', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' }
            case 'logout': return { icon: '🔒', color: 'text-stone-400 bg-stone-50 dark:bg-stone-800' }
            case 'password_change': return { icon: '🔑', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' }
            case 'email_change': return { icon: '✉️', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' }
            default: return { icon: '•', color: 'text-stone-400 bg-stone-50' }
        }
    }

    const getEventLabel = (eventType: string) => {
        const labels: Record<string, string> = {
            login: 'Successful Login',
            login_failed: 'Login Attempt Failed',
            logout: 'System Sign-out',
            password_change: 'Credential Update',
            email_change: 'Primary Email Update'
        }
        return labels[eventType] || eventType
    }

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Account Identity & Communication */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Identity Matrix */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Identity Matrix</h3>
                        </div>

                        <div className="space-y-8">
                            {/* Name Edit */}
                            <div className="group">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block mb-3">Full Name</label>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            autoFocus
                                            className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                                        />
                                        <button onClick={handleSaveName} className="p-2 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20 active:scale-90 transition-transform">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setNameDraft(currentUser.name || '') }} className="p-2 border border-stone-100 dark:border-stone-800 rounded-xl active:scale-90 transition-transform">
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900 border border-stone-50 dark:border-stone-800 rounded-2xl group/item hover:border-teal-500/30 transition-all">
                                        <span className="text-sm font-black text-stone-900 dark:text-white tracking-tight">{currentUser.name || 'Set your name'}</span>
                                        <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover/item:opacity-100 text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 transition-all">Edit</button>
                                    </div>
                                )}
                            </div>

                            {/* Email Edit */}
                            <div className="group">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block mb-3">Registered Email</label>
                                {isEditingEmail ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={emailDraft}
                                            onChange={(e) => setEmailDraft(e.target.value)}
                                            className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                                        />
                                        <button onClick={handleSaveEmail} className="p-2 bg-teal-500 text-white rounded-xl shadow-lg shadow-teal-500/20 active:scale-90 transition-transform">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setIsEditingEmail(false); setEmailDraft(currentUser.email) }} className="p-2 border border-stone-100 dark:border-stone-800 rounded-xl active:scale-90 transition-transform">
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900 border border-stone-50 dark:border-stone-800 rounded-2xl group/item hover:border-teal-500/30 transition-all">
                                        <span className="text-sm font-black text-stone-900 dark:text-white tracking-tight">{currentUser.email}</span>
                                        <button onClick={() => setIsEditingEmail(true)} className="opacity-0 group-hover/item:opacity-100 text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 transition-all">Edit</button>
                                    </div>
                                )}
                            </div>

                            {/* Language Matrix */}
                            <div className="group pt-8 border-t border-stone-50 dark:border-stone-800">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] block mb-4">Preferred Language</label>
                                <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 dark:bg-stone-900 border border-stone-50 dark:border-stone-800 rounded-2xl">
                                    <button
                                        onClick={() => handleLanguageUpdate('el')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'el' ? 'bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-md transform scale-[1.02]' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        Greek
                                    </button>
                                    <button
                                        onClick={() => handleLanguageUpdate('en')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'en' ? 'bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-md transform scale-[1.02]' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        English
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
                        className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] p-8 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Communication Control</h3>
                        </div>

                        <div className="space-y-6">
                            {[
                                { id: 'policy_expiry', label: 'Policy Expiry Warnings', icon: AlertTriangle },
                                { id: 'security_alert', label: 'Security Access Alerts', icon: Shield },
                                { id: 'marketing', label: 'Innovation Updates', icon: Zap }
                            ].map(pref => (
                                <div key={pref.id} className="flex items-center justify-between group p-3 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-teal-500 transition-all">
                                            <pref.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">{pref.label}</span>
                                    </div>
                                    <button
                                        onClick={() => onToggleNotification?.(pref.id, 'email', !isPreferenceEnabled(pref.id, 'email'))}
                                        className={`w-11 h-6 rounded-full transition-all relative ${isPreferenceEnabled(pref.id, 'email') ? 'bg-teal-500' : 'bg-stone-200 dark:bg-stone-700'}`}
                                    >
                                        <motion.span
                                            animate={{ x: isPreferenceEnabled(pref.id, 'email') ? 22 : 2 }}
                                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Secondary Identity Actions */}
                    <div className="space-y-4">
                        <div className="p-8 bg-stone-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl"></div>
                            <h4 className="text-xl font-black tracking-tight mb-4">Security <span className="text-stone-400 italic">First.</span></h4>
                            <p className="text-stone-400 text-[10px] font-bold leading-relaxed mb-8 italic">
                                We monitor every access point specifically to protect your insurance data portfolio.
                            </p>
                            <button
                                onClick={() => withProcessing("Terminating all sessions...", async () => { await onLogoutAllSessions?.() })}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:border-red-500 transition-all text-stone-400 hover:text-white"
                            >
                                Master Sign-out (All Devices)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Col: Sessions & Logs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Security Posture Score */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-stone-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>

                        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                    <motion.circle
                                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        className="text-teal-500"
                                        initial={{ strokeDasharray: "365 365", strokeDashoffset: 365 }}
                                        animate={{ strokeDashoffset: 365 - (365 * 0.85) }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black">85</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Score</span>
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                                    <h3 className="text-2xl font-black tracking-tight">Account Shield Active</h3>
                                </div>
                                <p className="text-stone-400 text-sm font-medium leading-relaxed max-w-md">
                                    Your security posture is <span className="text-white font-black">excellent</span>. We found <span className="text-teal-500 underline decoration-teal-500/30">three minor optimizations</span> to reach 100%.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-6">
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">2FA Verified</span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">Safe IP Tracked</span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-teal-400">Encryption Active</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Active Sessions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] shadow-sm overflow-hidden"
                    >
                        <div className="px-8 py-6 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-4 h-4 text-stone-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Active Sessions</h3>
                            </div>
                            <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-full">{activeSessions.length} total</span>
                        </div>

                        <div className="divide-y divide-stone-50 dark:divide-stone-800">
                            {activeSessions.map((session) => (
                                <div key={session.session_id} className="px-8 py-6 group hover:bg-stone-50/30 dark:hover:bg-stone-800/10 transition-all">
                                    <div className="flex items-start gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-teal-600 transition-all border border-transparent group-hover:border-teal-500/10">
                                            {getDeviceIcon(session.device_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">
                                                    {session.device_name}
                                                </span>
                                                {session.is_current && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-teal-500 text-white rounded shadow-sm">
                                                        Active Now
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                <span>{session.location}</span>
                                                <span className="w-1 h-1 rounded-full bg-stone-200" />
                                                <span className="font-mono">{session.ip_address}</span>
                                            </div>
                                            <div className="text-[9px] font-medium text-stone-400 mt-2 italic flex items-center gap-1.5">
                                                <Globe className="w-3 h-3" />
                                                Since {formatDateTime(session.last_active_at)}
                                            </div>
                                        </div>
                                        {!session.is_current && (
                                            <button
                                                onClick={() => withProcessing("Revoking access...", async () => { await onLogoutSession?.(session.session_id) })}
                                                className="text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-red-500 hover:scale-105 transition-all pt-2"
                                            >
                                                Revoke Access
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
                        className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[32px] shadow-sm overflow-hidden"
                    >
                        <div className="px-8 py-6 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Lock className="w-4 h-4 text-stone-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Audit Trail</h3>
                            </div>
                            <button className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline">Download Report</button>
                        </div>

                        <div className="divide-y divide-stone-50 dark:divide-stone-800">
                            {securityEvents.slice(0, 5).map((event) => {
                                const config = getEventIcon(event.event_type)
                                return (
                                    <div key={event.event_id} className="px-8 py-5 hover:bg-stone-50/20 dark:hover:bg-stone-800/10 transition-all border-l-4 border-l-transparent hover:border-l-teal-500">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${config.color} shadow-sm`}>
                                                {config.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[11px] font-black text-stone-900 dark:text-white uppercase tracking-tight">
                                                        {getEventLabel(event.event_type)}
                                                    </span>
                                                    {!event.success && (
                                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                            Alert
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span>{event.device_name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-stone-200" />
                                                    <span>{formatDateTime(event.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-[9px] font-black text-stone-900 dark:text-white tracking-widest font-mono">{event.ip_address}</div>
                                                <div className="text-[8px] text-stone-400 font-bold uppercase tracking-widest">{event.location}</div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>

                    {/* Danger Zone */}
                    <div className="p-8 border-2 border-dashed border-red-500/10 bg-red-50/20 dark:bg-red-900/5 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-8 group">
                        <div className="max-w-md text-center md:text-left">
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-3">Nuclear Deletion</h4>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold leading-relaxed">
                                Proceed with extreme caution. Deleting your account will <span className="text-red-600 group-hover:underline">irrevocably destroy</span> all policies, analytical data, and shared access models.
                            </p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:shadow-red-600/40 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                            {isDeleting ? "Processing..." : "Delete Permanently"}
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
