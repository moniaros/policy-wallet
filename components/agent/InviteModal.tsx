"use client"

import React, { useState } from 'react'
import {
    AccessScope,
    InviteModalProps
} from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'

export function InviteModal({
    isOpen,
    onClose,
    onSendInvite
}: InviteModalProps) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(() => onClose?.(), isOpen)
    const [email, setEmail] = useState('')
    const [scope, setScope] = useState<AccessScope>('upload_only')
    const [sending, setSending] = useState(false)
    const [emailError, setEmailError] = useState(false)

    if (!isOpen) return null

    const handleSend = async () => {
        // Button onClick, not a form submit, so type="email" never validates —
        // an agent could send an invite to a mistyped address that goes nowhere.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setEmailError(true)
            return
        }
        setEmailError(false)
        setSending(true)
        try {
            await onSendInvite?.(email, scope)
            onClose?.()
        } catch {
            // Without this a transport failure skipped BOTH lines below: the
            // modal sat on "Sending…" forever and never closed. Keep it open so
            // the typed address is not lost, and let the caller's own toast
            // explain the failure.
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invite-title" tabIndex={-1} className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                <div className="p-12">
                    <header className="mb-10">
                        <div className="flex items-center gap-3 mb-4 text-primary dark:text-mint">
                            <div className="w-8 h-8 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <span className="text-kicker font-black uppercase tracking-[0.2em]">{t.invite.growthProtocol}</span>
                        </div>
                        <h2 id="invite-title" className="text-3xl font-black text-foreground tracking-tighter mb-2">{t.invite.title} <span className="text-neutral-500 dark:text-neutral-400 italic">{t.invite.subtitle}</span></h2>
                        <p className="text-base text-muted-foreground font-medium">{t.invite.desc}</p>
                    </header>

                    <div className="space-y-8">
                        <div>
                            <label htmlFor="invitemodal-f1" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-3 block pl-2">{t.invite.emailLabel}</label>
                            <input id="invitemodal-f1"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(false) }}
                                aria-invalid={emailError || undefined}
                                aria-describedby={emailError ? "invitemodal-f1-error" : undefined}
                                placeholder="customer@example.com"
                                className="pw-input tracking-tight"
                            />
                            {emailError && (
                                <p id="invitemodal-f1-error" role="alert" className="mt-2 pl-2 text-caption font-semibold text-red-700 dark:text-red-400">
                                    {t.invite.emailInvalid}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-3 block pl-2">{t.invite.contextLabel}</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setScope('upload_only')}
                                    className={`p-6 rounded-[28px] border text-left transition-all ${scope === 'upload_only' ? 'bg-white dark:bg-neutral-900 border-primary dark:border-mint shadow-xl shadow-primary/5' : 'bg-neutral-50/50 dark:bg-neutral-800 border-transparent hover:bg-neutral-100'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-4 ${scope === 'upload_only' ? 'bg-primary text-white dark:text-[#1A2420] shadow-lg shadow-primary/25' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-sm font-black text-foreground tracking-tight mb-1">{t.invite.uploadOnly}</h3>
                                    <p className="text-kicker text-neutral-500 dark:text-neutral-400 font-medium leading-tight">{t.invite.uploadDesc}</p>
                                </button>

                                <button
                                    onClick={() => setScope('portfolio')}
                                    className={`p-6 rounded-[28px] border text-left transition-all ${scope === 'portfolio' ? 'bg-white dark:bg-neutral-900 border-amber-500 shadow-xl shadow-amber-500/5' : 'bg-neutral-50/50 dark:bg-neutral-800 border-transparent hover:bg-neutral-100'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-4 ${scope === 'portfolio' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-sm font-black text-foreground tracking-tight mb-1">{t.invite.fullPortfolio}</h3>
                                    <p className="text-kicker text-neutral-500 dark:text-neutral-400 font-medium leading-tight text-balance">{t.invite.portfolioDesc}</p>
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-8 py-5 bg-muted text-foreground rounded-3xl text-kicker font-black uppercase tracking-widest hover:bg-neutral-200 transition-all font-mono"
                            >
                                {t.invite.cancel}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !email}
                                className="pw-primary-button flex-[2] bg-neutral-900 dark:text-neutral-900 text-kicker uppercase tracking-widest shadow-neutral-900/10"
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
