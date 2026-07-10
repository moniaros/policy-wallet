"use client"

import React, { useState } from 'react'
import { Shield, Lock, ChevronRight, FileText, Download, AlertCircle } from 'lucide-react'
import { ShareLink__EXT } from './types'

interface PublicShareViewProps {
    // In a real app, this would be fetched server-side based on the UUID
    linkMetadata?: {
        insurerName: string
        insurerLogo: string
        policyType: string
        expiresAt: string
        requiresOtp: boolean
    }
}

export function PublicShareView({ linkMetadata }: PublicShareViewProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Simulate OTP Validation
    const handleUnlock = () => {
        if (!otp) {
            setError('Please enter the access code.')
            return
        }
        setLoading(true)
        setError('')

        // Simulating network request limit (No latency binding concept but for UI demo)
        setTimeout(() => {
            if (otp === '1234') {
                setIsAuthenticated(true)
            } else {
                setError('Invalid access code.')
            }
            setLoading(false)
        }, 600) // Keep standard "no bloat" interaction speed
    }

    if (!linkMetadata) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-slate-900 font-bold text-lg">Link Expired or Invalid</h2>
                <p className="text-slate-500 text-sm mt-2">This secure link is no longer active.</p>
            </div>
        </div>
    )

    // 1. Secure Gate / OTP Wall
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
                <div className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                    <div className="bg-slate-900 p-6 text-center">
                        <Shield className="w-10 h-10 text-mint mx-auto mb-3" />
                        <h1 className="text-white font-bold text-lg">Secure Document Portal</h1>
                        <p className="text-slate-400 text-xs mt-1">
                            Provided by {linkMetadata.insurerName}
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-600">
                                    To access this {linkMetadata.policyType} document, please enter the one-time access code sent to your mobile.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Access Code</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        placeholder="0000"
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono tracking-widest text-center text-lg"
                                        maxLength={4}
                                    />
                                </div>
                                {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
                            </div>

                            <button
                                onClick={handleUnlock}
                                disabled={loading}
                                className="w-full py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-bold rounded shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Unlock Secure View'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> End-to-end encrypted session
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // 2. Minimalist Document View (Post-Auth)
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Minimal Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {linkMetadata.insurerLogo ? (
                            <img src={linkMetadata.insurerLogo} alt="" className="h-8 w-8 rounded object-contain" />
                        ) : (
                            <div className="h-8 w-8 bg-slate-200 rounded flex items-center justify-center font-bold text-xs text-slate-500">
                                LOGO
                            </div>
                        )}
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-none mb-1">
                                {linkMetadata.insurerName}
                            </h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                                Secure Shared View
                            </p>
                        </div>
                    </div>
                    <button className="text-xs font-medium text-slate-500 hover:text-slate-800">
                        Close Session
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 space-y-4">
                {/* Expiry Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-xs text-amber-800">
                        This link expires on <strong>{new Date(linkMetadata.expiresAt).toLocaleDateString()}</strong>. Download any necessary documents before this date.
                    </p>
                </div>

                {/* Document List (Simplified) */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-700">Available Documents</h2>
                        <span className="text-[10px] bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint px-2 py-0.5 rounded-full font-bold uppercase">
                            Verified
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-soft text-primary rounded flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Policy Schedule</p>
                                    <p className="text-xs text-slate-500">PDF • 2.4 MB</p>
                                </div>
                            </div>
                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary-soft rounded-full transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors opacity-75">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded flex items-center justify-center">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Coverage Summary</p>
                                    <p className="text-xs text-slate-500">PDF • 1.1 MB</p>
                                </div>
                            </div>
                            <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary-soft rounded-full transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-[10px] text-slate-400">
                        Powered by AgentRise • Secure Policy Sharing Protocol
                    </p>
                </div>
            </main>
        </div>
    )
}
