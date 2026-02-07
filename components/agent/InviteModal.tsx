"use client"

import React, { useState } from 'react'
import {
    AccessScope,
    InviteModalProps
} from './types'
import { useLanguage } from '@/contexts/LanguageContext'

export function InviteModal({
    isOpen,
    onClose,
    onSendInvite
}: InviteModalProps) {
    const [email, setEmail] = useState('')
    const [scope, setScope] = useState<AccessScope>('upload_only')
    const [sending, setSending] = useState(false)

    if (!isOpen) return null

    const handleSend = async () => {
        if (!email) return
        setSending(true)
        await onSendInvite?.(email, scope)
        setSending(false)
        onClose?.()
    }

    const { t } = useLanguage()

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-12">
                    <header className="mb-10">
                        <div className="flex items-center gap-3 mb-4 text-teal-600">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.invite.growthProtocol}</span>
                        </div>
                        <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">{t.invite.title} <span className="text-stone-400 dark:text-stone-500 italic">{t.invite.subtitle}</span></h2>
                        <p className="text-base text-stone-500 dark:text-stone-400 font-medium">{t.invite.desc}</p>
                    </header>

                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3 block pl-2">{t.invite.emailLabel}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="customer@example.com"
                                className="w-full h-14 px-6 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-800 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/30 outline-none transition-all text-stone-900 dark:text-white font-black placeholder-stone-400 tracking-tight"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3 block pl-2">{t.invite.contextLabel}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setScope('upload_only')}
                                    className={`p-6 rounded-[28px] border text-left transition-all ${scope === 'upload_only' ? 'bg-white dark:bg-stone-900 border-teal-500 shadow-xl shadow-teal-500/5' : 'bg-stone-50/50 dark:bg-stone-800 border-transparent hover:bg-stone-100'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-4 ${scope === 'upload_only' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-tight mb-1">{t.invite.uploadOnly}</h3>
                                    <p className="text-[10px] text-stone-400 font-medium leading-tight">{t.invite.uploadDesc}</p>
                                </button>

                                <button
                                    onClick={() => setScope('portfolio')}
                                    className={`p-6 rounded-[28px] border text-left transition-all ${scope === 'portfolio' ? 'bg-white dark:bg-stone-900 border-amber-500 shadow-xl shadow-amber-500/5' : 'bg-stone-50/50 dark:bg-stone-800 border-transparent hover:bg-stone-100'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-4 ${scope === 'portfolio' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-stone-200 dark:bg-stone-700 text-stone-500'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-tight mb-1">{t.invite.fullPortfolio}</h3>
                                    <p className="text-[10px] text-stone-400 font-medium leading-tight text-balance">{t.invite.portfolioDesc}</p>
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-8 py-5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all font-mono"
                            >
                                {t.invite.cancel}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !email}
                                className="flex-[2] px-8 py-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-stone-900/10 hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {sending ? t.invite.dispatching : t.invite.dispatch}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
