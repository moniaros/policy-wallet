"use client"

import type { SettingsProps } from './types'

export function Settings({
    currentUser,
    activeSessions,
    securityEvents,
    onUpdateEmail,
    onChangePassword,
    onUpdateLanguage,
    onLogoutSession,
    onLogoutAllSessions
}: SettingsProps) {
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
            case 'desktop':
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                )
            case 'mobile':
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )
            case 'tablet':
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )
            default:
                return (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" /></svg>
                )
        }
    }

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'login':
                return { icon: '🔓', color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' }
            case 'login_failed':
                return { icon: '⚠️', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' }
            case 'logout':
                return { icon: '🔒', color: 'text-stone-400 bg-stone-50 dark:bg-stone-800' }
            case 'password_change':
                return { icon: '🔑', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' }
            case 'email_change':
                return { icon: '✉️', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' }
            default:
                return { icon: '•', color: 'text-stone-400 bg-stone-50' }
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
        <div className="max-w-7xl mx-auto py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Col: Account Identity */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-10 shadow-sm">
                        <div className="flex items-center gap-3 mb-10">
                            <span className="w-8 h-px bg-stone-200" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Identity Matrix</h3>
                        </div>

                        <div className="space-y-10">
                            <div className="group">
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Registered Email</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-stone-900 dark:text-white tracking-tight">{currentUser.email}</span>
                                    <button onClick={() => onUpdateEmail?.(currentUser.email)} className="text-[9px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-500">Edit</button>
                                </div>
                            </div>

                            <div className="group">
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Access Credentials</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-stone-900 dark:text-white tracking-widest">••••••••</span>
                                    <button onClick={() => onChangePassword?.()} className="text-[9px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-500">Modify</button>
                                </div>
                            </div>

                            <div className="group pt-6 border-t border-stone-50 dark:border-stone-800">
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-4">Preferred Language</span>
                                <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700">
                                    <button
                                        onClick={() => onUpdateLanguage?.('el')}
                                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'el' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        Greek
                                    </button>
                                    <button
                                        onClick={() => onUpdateLanguage?.('en')}
                                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentUser.preferred_language === 'en' ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        English
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-stone-900 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 blur-3xl"></div>
                        <h4 className="text-xl font-black tracking-tight mb-4">Security <span className="text-stone-400 italic">First.</span></h4>
                        <p className="text-stone-500 text-xs font-medium leading-relaxed mb-8 italic">
                            We monitor every access point specifically to protect your insurance data portfolio.
                        </p>
                        <button
                            onClick={() => onLogoutAllSessions?.()}
                            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:border-red-500 transition-all text-stone-400 hover:text-white"
                        >
                            Master Sign-out (All Devices)
                        </button>
                    </div>
                </div>

                {/* Right Col: Sessions & Logs */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Active Sessions */}
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden flex flex-col">
                        <div className="px-10 py-8 border-b border-stone-50 dark:border-stone-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-px bg-stone-200" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Authorized Entry Points</h3>
                            </div>
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{activeSessions.length} active</span>
                        </div>

                        <div className="divide-y divide-stone-50 dark:divide-stone-800">
                            {activeSessions.map((session) => (
                                <div key={session.session_id} className="px-10 py-8 group hover:bg-stone-50/30 dark:hover:bg-stone-800/10 transition-all">
                                    <div className="flex items-start gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center text-stone-400 group-hover:text-teal-600 transition-all">
                                            {getDeviceIcon(session.device_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-3 mb-2">
                                                <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">
                                                    {session.device_name}
                                                </span>
                                                {session.is_current && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded">
                                                        current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                <span>{session.location}</span>
                                                <span className="w-1 h-1 rounded-full bg-stone-200" />
                                                <span>{session.ip_address}</span>
                                            </div>
                                            <div className="text-[9px] font-medium text-stone-400 mt-1 italic">
                                                Last seen activity: {formatDateTime(session.last_active_at)}
                                            </div>
                                        </div>
                                        {!session.is_current && (
                                            <button
                                                onClick={() => onLogoutSession?.(session.session_id)}
                                                className="text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-red-500 pt-2"
                                            >
                                                Terminate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Security Logs */}
                    <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] shadow-sm overflow-hidden">
                        <div className="px-10 py-8 border-b border-stone-50 dark:border-stone-800">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-px bg-stone-200" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Security Surveillance Log</h3>
                            </div>
                        </div>

                        <div className="divide-y divide-stone-50 dark:divide-stone-800">
                            {securityEvents.slice(0, 8).map((event) => {
                                const config = getEventIcon(event.event_type)
                                return (
                                    <div key={event.event_id} className="px-10 py-6 hover:bg-stone-50/20 dark:hover:bg-stone-800/10 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${config.color}`}>
                                                {config.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-tight">
                                                        {getEventLabel(event.event_type)}
                                                    </span>
                                                    {!event.success && (
                                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest border border-red-100 px-1.5 rounded">
                                                            Denied
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                    {event.device_name} • {formatDateTime(event.created_at)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{event.ip_address}</div>
                                                <div className="text-[8px] text-stone-300 font-medium">{event.location}</div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="p-8 bg-stone-50/50 dark:bg-stone-800/30 text-center border-t border-stone-50 dark:border-stone-800">
                            <button className="text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-stone-900 transition-colors">
                                Load Full Audit Trail
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
