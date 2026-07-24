"use client"

import React, { useState, useRef } from 'react'
import { addCustomerManually, parsePolicyPdfWithGemini } from '@/app/(protected)/agent/actions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type View = 'choice' | 'manual' | 'pdf' | 'parsing' | 'success'

export function AddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const [view, setView] = useState<View>('choice')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Manual Form State
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        taxId: '',
        addPolicy: false,
        policy: {
            insurerName: '',
            policyNumber: '',
            lineOfBusiness: 'motor',
            startDate: '',
            endDate: '',
            premiumAmount: ''
        }
    })

    if (!isOpen) return null

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await addCustomerManually({
            name: formData.name,
            surname: formData.surname,
            email: formData.email,
            phone: formData.phone,
            taxId: formData.taxId,
            policy: formData.addPolicy ? {
                ...formData.policy,
                premiumAmount: formData.policy.premiumAmount ? parseFloat(formData.policy.premiumAmount) : undefined
            } : undefined
        })

        if ('error' in result) {
            setError(result.error as string)
        } else {
            setView('success')
            onSuccess?.()
        }
        setLoading(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setView('parsing')
        setLoading(true)

        const formDataObj = new FormData()
        formDataObj.append('file', file)

        const result = await parsePolicyPdfWithGemini(formDataObj)

        if ('error' in result) {
            setError(result.error as string)
            setView('choice')
        } else if ('success' in result && result.data) {
            const data = result.data
            setFormData(prev => ({
                ...prev,
                name: data.customerName || '',
                surname: data.customerSurname || '',
                email: data.customerEmail || '',
                addPolicy: true,
                policy: {
                    insurerName: data.insurerName || '',
                    policyNumber: data.policyNumber || '',
                    lineOfBusiness: data.lineOfBusiness || 'motor',
                    startDate: data.startDate || '',
                    endDate: data.endDate || '',
                    premiumAmount: data.premiumAmount?.toString() || ''
                }
            }))
            setView('manual')
        }
        setLoading(false)
    }

    const reset = () => {
        setView('choice')
        setFormData({
            name: '',
            surname: '',
            email: '',
            phone: '',
            taxId: '',
            addPolicy: false,
            policy: {
                insurerName: '',
                policyNumber: '',
                lineOfBusiness: 'motor',
                startDate: '',
                endDate: '',
                premiumAmount: ''
            }
        })
        setError(null)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-customer-title" tabIndex={-1} className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-12">
                    {view === 'choice' && (
                        <div className="space-y-10">
                            <header>
                                <div className="flex items-center gap-3 mb-4 text-primary dark:text-mint">
                                    <div className="w-8 h-8 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <span className="text-kicker font-black uppercase tracking-[0.2em]">{t.agentModals.addCustomer.kicker}</span>
                                </div>
                                <h2 id="add-customer-title" className="text-3xl font-black text-foreground tracking-tighter mb-2">{t.agentModals.addCustomer.title} <span className="text-neutral-500 dark:text-neutral-400 italic">{t.agentModals.addCustomer.titleAccent}</span></h2>
                                <p className="text-base text-muted-foreground font-medium text-balance">{t.agentModals.addCustomer.desc}</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => setView('manual')}
                                    className="p-8 rounded-[40px] border border-neutral-100 dark:border-neutral-800 text-left transition-all bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-2xl hover:shadow-neutral-900/5 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-lg font-black text-foreground tracking-tight mb-2">{t.agentModals.addCustomer.manualTitle}</h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">{t.agentModals.addCustomer.manualDesc}</p>
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-8 rounded-[40px] border border-neutral-100 dark:border-neutral-800 text-left transition-all bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-2xl hover:shadow-neutral-900/5 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary text-white dark:text-[#1A2420] flex items-center justify-center mb-6 shadow-xl shadow-primary/25 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-lg font-black text-foreground tracking-tight mb-2">{t.agentModals.addCustomer.pdfTitle}</h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">{t.agentModals.addCustomer.pdfDesc}</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-5 text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 transition-colors"
                            >
                                {t.agentModals.addCustomer.goBack}
                            </button>
                        </div>
                    )}

                    {view === 'parsing' && (
                        <div className="py-20 text-center">
                            <div className="relative w-24 h-24 mx-auto mb-10">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-mint">
                                    <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            <h2 id="add-customer-title" className="text-2xl font-black text-foreground tracking-tighter mb-2">{t.agentModals.addCustomer.analyzingTitle}</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium">{t.agentModals.addCustomer.analyzingDesc}</p>
                        </div>
                    )}

                    {view === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="space-y-10">
                            <header className="flex justify-between items-start">
                                <div>
                                    <h2 id="add-customer-title" className="text-2xl font-black text-foreground tracking-tighter mb-1">{t.agentModals.addCustomer.detailsTitle} <span className="text-neutral-500 dark:text-neutral-400 italic">{t.agentModals.addCustomer.detailsAccent}</span></h2>
                                    <p className="text-kicker font-black uppercase tracking-widest text-primary dark:text-mint">{t.agentModals.addCustomer.manualProtocol}</p>
                                </div>
                                <button type="button" onClick={() => setView('choice')} className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 transition-colors">{t.agentModals.addCustomer.changeMethod}</button>
                            </header>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label htmlFor="addcustomermodal-f1" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.firstName}</label>
                                    <input id="addcustomermodal-f1"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="pw-input"
                                        placeholder={t.agentModals.addCustomer.phFirstName}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="addcustomermodal-f2" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.lastName}</label>
                                    <input id="addcustomermodal-f2"
                                        required
                                        value={formData.surname}
                                        onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                        className="pw-input"
                                        placeholder={t.agentModals.addCustomer.phLastName}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="addcustomermodal-f3" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.emailAddress}</label>
                                    <input id="addcustomermodal-f3"
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="pw-input"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="addcustomermodal-f4" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.phoneNumber}</label>
                                    <input id="addcustomermodal-f4"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="pw-input"
                                        placeholder="+30 690 000 0000"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="addcustomermodal-f5" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.taxId}</label>
                                    <input id="addcustomermodal-f5"
                                        value={formData.taxId}
                                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                        className="pw-input"
                                        placeholder={t.agentModals.addCustomer.phTaxId}
                                    />
                                </div>
                            </div>

                            <div className="p-8 rounded-[32px] bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800">
                                <label className="flex items-center gap-3 cursor-pointer mb-6">
                                    <input
                                        type="checkbox"
                                        checked={formData.addPolicy}
                                        onChange={e => setFormData({ ...formData, addPolicy: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-neutral-300 text-primary focus:ring-primary/30"
                                    />
                                    <span className="text-sm font-black text-foreground tracking-tight">{t.agentModals.addCustomer.includePolicy}</span>
                                </label>

                                {formData.addPolicy && (
                                    <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f6" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.insurer}</label>
                                            <input id="addcustomermodal-f6"
                                                required={formData.addPolicy}
                                                value={formData.policy.insurerName}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, insurerName: e.target.value } })}
                                                className="pw-input"
                                                placeholder={t.agentModals.addCustomer.phInsurer}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f7" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.policyNumber}</label>
                                            <input id="addcustomermodal-f7"
                                                required={formData.addPolicy}
                                                value={formData.policy.policyNumber}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, policyNumber: e.target.value } })}
                                                className="pw-input"
                                                placeholder="POL-123456"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f8" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.lineOfBusiness}</label>
                                            <select id="addcustomermodal-f8"
                                                required={formData.addPolicy}
                                                value={formData.policy.lineOfBusiness}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, lineOfBusiness: e.target.value } })}
                                                className="pw-input appearance-none"
                                            >
                                                <option value="motor">{t.agentModals.addCustomer.lobMotor}</option>
                                                <option value="health">{t.agentModals.addCustomer.lobHealth}</option>
                                                <option value="home">{t.agentModals.addCustomer.lobHome}</option>
                                                <option value="life">{t.agentModals.addCustomer.lobLife}</option>
                                                <option value="travel">{t.agentModals.addCustomer.lobTravel}</option>
                                                <option value="liability">{t.agentModals.addCustomer.lobLiability}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f9" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.premium}</label>
                                            <input id="addcustomermodal-f9"
                                                type="number"
                                                value={formData.policy.premiumAmount}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, premiumAmount: e.target.value } })}
                                                className="pw-input"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f10" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.startDate}</label>
                                            <input id="addcustomermodal-f10"
                                                required={formData.addPolicy}
                                                type="date"
                                                value={formData.policy.startDate}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, startDate: e.target.value } })}
                                                className="pw-input"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="addcustomermodal-f11" className="text-kicker font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-1">{t.agentModals.addCustomer.endDate}</label>
                                            <input id="addcustomermodal-f11"
                                                required={formData.addPolicy}
                                                type="date"
                                                value={formData.policy.endDate}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, endDate: e.target.value } })}
                                                className="pw-input"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => { reset(); onClose(); }}
                                    className="flex-1 px-8 py-5 bg-muted text-foreground rounded-[24px] text-kicker font-black uppercase tracking-widest hover:bg-neutral-200 transition-all"
                                >
                                    {t.agentModals.addCustomer.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="pw-primary-button flex-[2] bg-neutral-900 dark:text-neutral-900 text-kicker uppercase tracking-widest shadow-neutral-900/10"
                                >
                                    {loading ? t.agentModals.addCustomer.processing : t.agentModals.addCustomer.addToPipeline}
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'success' && (
                        <div className="py-20 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-primary text-white dark:text-[#1A2420] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-primary/25 scale-110">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <h2 id="add-customer-title" className="text-3xl font-black text-foreground tracking-tighter mb-4 leading-tight">{t.agentModals.addCustomer.successTitle} <span className="text-neutral-500 dark:text-neutral-400 italic">{t.agentModals.addCustomer.successAccent}</span></h2>
                            <p className="text-muted-foreground font-medium mb-12 max-w-sm mx-auto">{t.agentModals.addCustomer.successDesc}</p>
                            <button
                                onClick={() => { reset(); onClose(); }}
                                className="px-12 py-5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[24px] text-kicker font-black uppercase tracking-widest shadow-xl shadow-neutral-900/10 hover:bg-primary dark:hover:bg-mint hover:text-white dark:hover:text-[#1A2420] transition-all"
                            >
                                {t.agentModals.addCustomer.continueToCrm}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
