"use client"

import React, { useState, useRef } from 'react'
import { addCustomerManually, parsePolicyPdfWithGemini } from '@/app/(protected)/agent/actions'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type View = 'choice' | 'manual' | 'pdf' | 'parsing' | 'success'

export function AddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
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
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-12">
                    {view === 'choice' && (
                        <div className="space-y-10">
                            <header>
                                <div className="flex items-center gap-3 mb-4 text-teal-600">
                                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">CRM Entry</span>
                                </div>
                                <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">Add New <span className="text-stone-400 dark:text-stone-500 italic">Customer.</span></h2>
                                <p className="text-base text-stone-500 dark:text-stone-400 font-medium text-balance">Select how you want to ingest the customer data into your portfolio.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => setView('manual')}
                                    className="p-8 rounded-[40px] border border-stone-100 dark:border-stone-800 text-left transition-all bg-stone-50/50 dark:bg-stone-800/30 hover:bg-white dark:hover:bg-stone-800 hover:shadow-2xl hover:shadow-stone-900/5 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight mb-2">Manual Entry</h3>
                                    <p className="text-xs text-stone-400 font-medium leading-relaxed">Type in personal and policy details manually into the CRM.</p>
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-8 rounded-[40px] border border-stone-100 dark:border-stone-800 text-left transition-all bg-stone-50/50 dark:bg-stone-800/30 hover:bg-white dark:hover:bg-stone-800 hover:shadow-2xl hover:shadow-stone-900/5 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-teal-500/20 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight mb-2">Smart PDF Upload</h3>
                                    <p className="text-xs text-stone-400 font-medium leading-relaxed">Upload a policy PDF and let Gemini extract all details automatically.</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                            >
                                Nevermind, go back
                            </button>
                        </div>
                    )}

                    {view === 'parsing' && (
                        <div className="py-20 text-center">
                            <div className="relative w-24 h-24 mx-auto mb-10">
                                <div className="absolute inset-0 rounded-full border-4 border-teal-500/10 border-t-teal-500 animate-spin" />
                                <div className="absolute inset-4 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600">
                                    <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">Gemini is Thinking...</h2>
                            <p className="text-stone-400 font-medium">Extracting customer and policy data from your document.</p>
                        </div>
                    )}

                    {view === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="space-y-10">
                            <header className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter mb-1">Customer <span className="text-stone-400 italic">Details.</span></h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Manual Entry Protocol</p>
                                </div>
                                <button type="button" onClick={() => setView('choice')} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Change Method</button>
                            </header>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">First Name</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-14 px-6 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Last Name</label>
                                    <input
                                        required
                                        value={formData.surname}
                                        onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                        className="w-full h-14 px-6 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full h-14 px-6 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Phone Number</label>
                                    <input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-14 px-6 bg-stone-50 dark:bg-stone-800 border-none rounded-2xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-sm font-bold"
                                        placeholder="+30 690 000 0000"
                                    />
                                </div>
                            </div>

                            <div className="p-8 rounded-[32px] bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-800">
                                <label className="flex items-center gap-3 cursor-pointer mb-6">
                                    <input
                                        type="checkbox"
                                        checked={formData.addPolicy}
                                        onChange={e => setFormData({ ...formData, addPolicy: e.target.checked })}
                                        className="w-5 h-5 rounded-lg border-stone-300 text-teal-600 focus:ring-teal-500/30"
                                    />
                                    <span className="text-sm font-black text-stone-900 dark:text-white tracking-tight">Include Initial Policy Details</span>
                                </label>

                                {formData.addPolicy && (
                                    <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Insurer</label>
                                            <input
                                                required={formData.addPolicy}
                                                value={formData.policy.insurerName}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, insurerName: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold"
                                                placeholder="e.g. Allianz"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Policy Number</label>
                                            <input
                                                required={formData.addPolicy}
                                                value={formData.policy.policyNumber}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, policyNumber: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold"
                                                placeholder="POL-123456"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Line of Business</label>
                                            <select
                                                required={formData.addPolicy}
                                                value={formData.policy.lineOfBusiness}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, lineOfBusiness: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold appearance-none"
                                            >
                                                <option value="motor">Motor</option>
                                                <option value="health">Health</option>
                                                <option value="home">Home</option>
                                                <option value="life">Life</option>
                                                <option value="travel">Travel</option>
                                                <option value="liability">Liability</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Premium (€)</label>
                                            <input
                                                type="number"
                                                value={formData.policy.premiumAmount}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, premiumAmount: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Start Date</label>
                                            <input
                                                required={formData.addPolicy}
                                                type="date"
                                                value={formData.policy.startDate}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, startDate: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">End Date</label>
                                            <input
                                                required={formData.addPolicy}
                                                type="date"
                                                value={formData.policy.endDate}
                                                onChange={e => setFormData({ ...formData, policy: { ...formData.policy, endDate: e.target.value } })}
                                                className="w-full h-12 px-5 bg-white dark:bg-stone-800 border-none rounded-xl focus:ring-4 focus:ring-teal-500/10 outline-none transition-all text-xs font-bold"
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
                                    className="flex-1 px-8 py-5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] px-8 py-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-stone-900/10 hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Add to Pipeline'}
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'success' && (
                        <div className="py-20 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-teal-500 text-white flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-teal-500/20 scale-110">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">Customer <span className="text-stone-400 italic">Registered.</span></h2>
                            <p className="text-stone-500 dark:text-stone-400 font-medium mb-12 max-w-sm mx-auto">The customer has been added to your CRM. You can invite them to their digital wallet from their profile page at any time.</p>
                            <button
                                onClick={() => { reset(); onClose(); }}
                                className="px-12 py-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-stone-900/10 hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white transition-all"
                            >
                                Continue to CRM
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
